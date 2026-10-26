import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

// All network is replaced here; unexpected endpoints fail instead of going online.
export function makeHarness(options = {}) {
  const objects = new Map((options.objects || []).map(o=>[o.key,{...o}]));
  const calls = [], logs = [], deleted = [];
  let puts = 0;
  const storage = {
    async put(key,stream,metadata) {
      const size = (await new Response(stream).arrayBuffer()).byteLength;
      objects.set(key,{key,size,...metadata}); puts++;
      if (options.afterPut) options.afterPut(objects,key);
    },
    async head(key) { return objects.get(key) || null; },
    async delete(key) { deleted.push(key); objects.delete(key); },
    async list({prefix}) {
      if (options.listFails) throw new Error('simulated R2 list failure');
      return {objects:[...objects.values()].filter(o=>o.key.startsWith(prefix)),truncated:false};
    }
  };
  const reply = (data,status=200)=>new Response(JSON.stringify(data),{status});
  const fakeFetch = async (input,init={}) => {
    const url = new URL(input);
    if (url.origin !== 'https://supabase.lab.invalid') throw new Error('External network forbidden: '+url.origin);
    const name = url.pathname.split('/').pop();
    calls.push({path:url.pathname,body:init.body ? JSON.parse(init.body) : null});
    if (url.pathname === '/auth/v1/user') return reply(options.invalidSession ? {} : {id:'lab-user',email:'lab@example.invalid'});
    if (url.pathname === '/rest/v1/platform_members') return reply([]);
    if (!url.pathname.startsWith('/rest/v1/rpc/')) throw new Error('Unexpected test URL: '+url.pathname);
    if (name === 'check_rate_limit') {
      if (options.rateUnavailable) return reply({message:'rate unavailable'},503);
      return reply(options.rateAllowed !== false);
    }
    if (name === 'moment_can_edit_event') return reply(options.allowed !== false);
    if (name === 'get_moment_entitlements') {
      if (options.entitlementsUnavailable) return reply({message:'unavailable'},503);
      return reply({plan_key:'moments_free',bytes_used:options.bytesUsed || 0,limits:{storage_mb:250,...options.limits}});
    }
    if (name === 'set_moment_media_usage' || name === 'record_moment_media_bytes') return reply({ok:true});
    throw new Error('Unexpected RPC in isolated test: '+name);
  };
  const source = readFileSync(new URL('../../worker/worker.js',import.meta.url),'utf8').replace('export default {','const worker = {');
  const context = vm.createContext({Request,Response,Headers,File,Blob,FormData,URL,URLSearchParams,TextEncoder,TextDecoder,crypto:webcrypto,fetch:fakeFetch,console:{error:(...args)=>logs.push(args.map(String).join(' ')),log:()=>{}},setTimeout,clearTimeout,btoa,atob});
  vm.runInContext(source,context,{filename:'worker/worker.js'});
  const handle = vm.runInContext('handleMediaUpload',context);
  const env = {MEDIA:storage,SUPABASE_URL:'https://supabase.lab.invalid',SUPABASE_PUBLISHABLE_KEY:'lab-not-a-real-key'};
  if (options.noStorage) delete env.MEDIA;
  return {
    objects,calls,logs,deleted,get puts(){return puts;},
    async upload({name='test.png',mime='image/png',size=128,token='lab-token',replaceUrl,missingFile=false}={}) {
      const form = new FormData();
      if (!missingFile) form.set('file',new File([new Uint8Array(size)],name,{type:mime}));
      form.set('scope','moments'); form.set('scopeId','lab-event'); form.set('clientMime',mime);
      if (replaceUrl) form.set('replaceUrl',replaceUrl);
      const response = await handle(new Request('https://worker.lab.invalid/api/media/upload',{method:'POST',headers:token ? {Authorization:'Bearer '+token} : {},body:form}),env);
      return {status:response.status,body:await response.json()};
    }
  };
}
