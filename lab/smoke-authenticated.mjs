// Real laboratory Auth/API smoke. No browser state or production credentials are read.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import assert from 'node:assert/strict';
import {APP_ORIGIN,WORKER_ORIGIN,LAB_REF} from './network.mjs';
import {validateSettings} from './prepare-preview.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const settings=JSON.parse(readFileSync(join(root,'.lab/settings.json'),'utf8'));
const fixture=JSON.parse(readFileSync(join(root,'.lab/test-accounts.json'),'utf8'));
validateSettings(settings);
assert.equal(fixture.project,LAB_REF);
assert.equal(fixture.accounts.length,2);
for(const account of fixture.accounts) assert.match(account.email,/^lab-owner-[ab]@example\.invalid$/);
const checks=[];
function record(item) { checks.push(item); writeFileSync(join(root,'.lab/authenticated-smoke.json'),JSON.stringify({project:LAB_REF,complete:false,checks},null,2)); console.log(JSON.stringify(item)); }
function stage(name) { console.log(JSON.stringify({stage:name})); }
async function request(path,token,body,origin=APP_ORIGIN) {
 const headers={apikey:settings.key};
 if(token)headers.Authorization='Bearer '+token;
 if(body && !(body instanceof FormData))headers['Content-Type']='application/json';
 const r=await fetch(origin+path,{method:body?'POST':'GET',headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=null;}
 return {status:r.status,data};
}
async function signIn(account) {
 const r=await request('/supabase/auth/v1/token?grant_type=password',null,account);
 assert.equal(r.status,200,'Laboratory password sign-in failed');
 assert.ok(r.data?.access_token);
 record({check:'real Auth sign-in '+account.email,status:200});
 return r.data.access_token;
}
stage('real Auth A and B');
const [a,b]=await Promise.all(fixture.accounts.map(signIn));
stage('read owned event and local image');
const own=await request('/supabase/rest/v1/moment_events?select=id,title,slug,page_state&slug=eq.q7x5m9v3b2n8',a);
assert.equal(own.status,200);assert.equal(own.data?.length,1);
const event=own.data[0];
assert.equal(event.title,'LAB · Salvato dal browser');
assert.equal(event.page_state.subtitle,'Immagine sintetica, nessun contenuto cliente');
const media=new URL(event.page_state.cover_url);
assert.equal(media.origin,WORKER_ORIGIN);
const file=await fetch(media,{signal:AbortSignal.timeout(45000)});
assert.equal(file.status,200);assert.equal((await file.arrayBuffer()).byteLength,1026);
record({check:'saved title, subtitle and 1026-byte local image survive reload',status:200});
stage('cross-account reads and writes');
const before=await request('/supabase/rest/v1/moment_media_usage?select=bytes_used,file_count&event_id=eq.'+event.id,a);
const other=await request('/supabase/rest/v1/moment_events?select=id&id=eq.'+event.id,b);
assert.equal(other.status,200);assert.deepEqual(other.data,[]);
record({check:'second account cannot read first account event',status:200});
const save=await request('/supabase/rest/v1/rpc/save_my_moment_page',b,{p_event_id:event.id,p_title:'UNAUTHORIZED LAB ATTEMPT',p_moment_type:'free',p_description:'',p_page_state:{},p_public_visible:true,p_pin_enabled:false,p_pin_hash:null,p_expected_updated_at:null});
assert.ok(save.status>=400);
assert.match(save.data?.message||'',/non trovato per questo account/);
record({check:'cross-account save rejected',status:save.status});
const form=new FormData();form.append('scope','moments');form.append('scopeId',event.id);form.append('clientMime','image/png');form.append('file',new Blob([readFileSync(join(root,'.lab/upload-diagnostic.png'))],{type:'image/png'}),'upload-diagnostic.png');
stage('cross-account upload');
const upload=await request('/api/media/upload',b,form,WORKER_ORIGIN);
assert.equal(upload.status,403);
record({check:'cross-account upload rejected before R2 write',status:403});
const after=await request('/supabase/rest/v1/moment_media_usage?select=bytes_used,file_count&event_id=eq.'+event.id,a);
assert.deepEqual(after.data,before.data);
const unchanged=await request('/supabase/rest/v1/moment_events?select=title&id=eq.'+event.id,a);
assert.equal(unchanged.data[0].title,event.title);
record({check:'original content and usage unchanged after rejected operations',status:200});
writeFileSync(join(root,'.lab/authenticated-smoke.json'),JSON.stringify({project:LAB_REF,complete:true,checks},null,2));
console.log(JSON.stringify({project:LAB_REF,checks},null,2));
