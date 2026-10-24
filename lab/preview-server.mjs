import { createServer } from 'node:http';
import { readFile,realpath } from 'node:fs/promises';
import { resolve,sep,extname } from 'node:path';
import { prepare } from './prepare-preview.mjs';
import { APP_ORIGIN,DB_ORIGIN,allowedDatabaseRequest,labFetch,LAB_CSP } from './network.mjs';
const {pages}=prepare();
const root=await realpath(pages);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};
createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',LAB_CSP);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('X-KhamaKey-Environment','isolated-laboratory');
  try {
    if(req.headers.host!=='127.0.0.1:8080' || (req.headers.origin && req.headers.origin!==APP_ORIGIN)) {res.writeHead(403);res.end('Laboratory origin rejected');return;}
    const url=new URL(req.url,APP_ORIGIN);
    if(url.pathname.startsWith('/supabase/')) {
      const target=DB_ORIGIN+url.pathname.slice('/supabase'.length)+url.search;
      if(!allowedDatabaseRequest(target,req.method)){res.writeHead(403);res.end('Operation disabled in laboratory');return;}
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw Error('Request too large');chunks.push(chunk);}
      const headers=new Headers();for(const name of ['apikey','authorization','content-type','accept','prefer','range','x-client-info','x-supabase-api-version'])if(req.headers[name])headers.set(name,req.headers[name]);
      const response=await labFetch(target,{method:req.method,headers,body:req.method==='GET'?undefined:Buffer.concat(chunks)});
      for(const name of ['content-type','content-range','www-authenticate','x-supabase-api-version'])if(response.headers.has(name))res.setHeader(name,response.headers.get(name));
      res.writeHead(response.status);res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    let path=decodeURIComponent(url.pathname);if(path==='/')path='/moments';
    if(!extname(path))path+='.html';
    const file=await realpath(resolve(root,'.'+path));
    if(!file.startsWith(root+sep))throw Error('Outside preview');
    let data=await readFile(file);
    if(extname(file)==='.html') data=Buffer.from(data.toString().replace(/<body([^>]*)>/i,'<body$1><div style="background:#ffe8a3;color:#231800;padding:8px;text-align:center;font:14px sans-serif">LABORATORIO SEPARATO · solo account e contenuti di prova</div>'));
    res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.writeHead(200);res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404);res.end('Preview resource unavailable');}
}).listen(8080,'127.0.0.1',()=>console.log('Isolated preview: '+APP_ORIGIN+'/moments'));
