// Explicit phases for artificial fixtures only; never sends mail or logs tokens.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DB_ORIGIN,LAB_REF,APP_ORIGIN,WORKER_ORIGIN,labFetch} from './network.mjs';
import {validateSettings} from './prepare-preview.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const load=name=>JSON.parse(readFileSync(join(root,'.lab',name),'utf8'));
const settings=load('settings.json'),fixture=load('test-accounts.json'),baseline=load('collaboration-baseline.json');
validateSettings(settings);assert.equal(fixture.project,LAB_REF);assert.equal(baseline.project,LAB_REF);
assert.equal(baseline.event.id,'46d02893-9668-4583-9ffd-64615c8f80c9');
const mode=process.argv[2];assert.ok(['original','prepare','verify','restore'].includes(mode));
const A='lab-owner-a@example.invalid',B='lab-owner-b@example.invalid',id=baseline.event.id;
const report=[];
const passed=(check,extra={})=>{report.push({check,...extra});console.log(JSON.stringify({check,passed:true,...extra}));};
async function login(email){
 const account=fixture.accounts.find(x=>x.email===email);assert.ok(account);
 const r=await labFetch(DB_ORIGIN+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:settings.key,'Content-Type':'application/json'},body:JSON.stringify(account),signal:AbortSignal.timeout(45000)});
 assert.equal(r.status,200);const d=await r.json();assert.ok(d.access_token);return d.access_token;
}
const [a,b]=await Promise.all([A,B].map(login));
async function call(token,path,body){
 const r=await labFetch(DB_ORIGIN+'/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:settings.key,Authorization:'Bearer '+(token||settings.key),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 return {status:r.status,data:await r.json()};
}
const rpc=(token,name,body)=>call(token,'rpc/'+name,body);
async function event(token){const r=await call(token,'moment_events?select=*&id=eq.'+id);assert.equal(r.status,200);return r.data;}
async function request(token,email){const r=await rpc(token,'request_moment_ownership_transfer',{p_event_id:id,p_email:email});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.ok,true);assert.match(r.data.invite_token,/^[a-f0-9]{48}$/);return r.data.invite_token;}
const use=(token,name,link)=>rpc(token,name+'_moment_ownership_transfer',{p_token:link});
function unchanged(before,after){for(const key of Object.keys(before)){if(['owner_email','account_id','updated_at'].includes(key))continue;assert.deepEqual(after[key],before[key],key+' changed');}}
async function save(token,e){return rpc(token,'save_my_moment_page',{p_event_id:id,p_title:e.title,p_moment_type:e.moment_type,p_description:e.description,p_page_state:e.page_state,p_public_visible:e.public_visible,p_pin_enabled:e.pin_enabled,p_pin_hash:null,p_expected_updated_at:e.updated_at});}
if(mode==='original'){
 assert.equal((await event(a))[0]?.owner_email,A);
 const r=await rpc(a,'request_moment_ownership_transfer',{p_event_id:id,p_email:B});
 assert.equal(r.status,200);assert.equal(r.data.ok,true);
 passed('original RPC accepts valid recipient email',{status:r.status});
 assert.equal((await event(a))[0]?.owner_email,A);passed('pending request preserves ownership');
 const cancel=await rpc(a,'cancel_moment_ownership_transfer',{p_event_id:id});assert.equal(cancel.data.ok,true);passed('diagnostic request cancelled');
}else if(mode==='prepare'){
 const before=(await event(a))[0];assert.equal(before?.owner_email,A);assert.deepEqual(await event(b),[]);
 const state=await rpc(a,'get_moment_ownership_transfer',{p_event_id:id});assert.equal(state.status,200);assert.notEqual(state.data.status,'pending');
 for(const [token,email,error] of [[a,A,'TRANSFER_SELF'],[a,'not-an-email','TRANSFER_EMAIL'],[b,A,'TRANSFER_OWNER_ONLY']]){
  const r=await rpc(token,'request_moment_ownership_transfer',{p_event_id:id,p_email:email});assert.equal(r.status,400);assert.equal(r.data.message,error);passed(error+' rejected');
 }
 const invalid=await use(b,'accept','0'.repeat(48));assert.equal(invalid.data.ok,false);assert.equal(invalid.data.status,'invalid');passed('unknown token rejected');
 let link=await request(a,B);
 const wrong=await use(a,'accept',link);assert.equal(wrong.data.status,'mismatch');assert.equal(wrong.data.ok,false);passed('wrong account cannot accept');
 const cancelled=await rpc(a,'cancel_moment_ownership_transfer',{p_event_id:id});assert.equal(cancelled.data.ok,true);
 const stale=await use(b,'accept',link);assert.equal(stale.data.ok,false);assert.equal(stale.data.status,'invalid');passed('cancel invalidates token');
 link=await request(a,B);const declined=await use(b,'decline',link);assert.equal(declined.data.ok,true);
 assert.equal((await use(b,'accept',link)).data.ok,false);passed('decline invalidates token');
 const old=await request(a,B);link=await request(a,B);assert.equal((await use(b,'accept',old)).data.ok,false);passed('new request invalidates previous token');
 unchanged(before,(await event(a))[0]);assert.deepEqual(await event(b),[]);passed('pending transfer preserves owner and contents');
 // Read synthetic cover from the known local upload report, never remote customer media.
 const coverUrl='http://127.0.0.1:8787/cdn/moments/'+id+'/images/8256f09c-893b-4067-a0fc-c3edd1ce3bb0.png';
 const media=await fetch(coverUrl,{signal:AbortSignal.timeout(45000)});assert.equal(media.status,200);
 const coverHash=createHash('sha256').update(Buffer.from(await media.arrayBuffer())).digest('hex');
 writeFileSync(join(root,'.lab/transfer-fixture.json'),JSON.stringify({project:LAB_REF,event:before,token:link,url:APP_ORIGIN+'/moments?transfer='+link,coverUrl,coverHash},null,2));
 passed('pending browser fixture ready; no email sent');
}else if(mode==='verify'){
 const f=load('transfer-fixture.json');assert.equal(f.project,LAB_REF);
 const current=(await event(b))[0];assert.equal(current?.owner_email,B);unchanged(f.event,current);passed('browser acceptance moved ownership; all other event fields preserved');
 assert.deepEqual(await event(a),[]);passed('previous owner cannot read using an existing valid account');
 const denied=await save(a,{...f.event,updated_at:current.updated_at});assert.ok(denied.status>=400);passed('previous owner save denied',{status:denied.status});
 const form=new FormData();form.append('scope','moments');form.append('scopeId',id);form.append('clientMime','image/png');form.append('file',new Blob([readFileSync(join(root,'.lab/upload-diagnostic.png'))],{type:'image/png'}),'transfer-denied.png');
 const upload=await fetch(WORKER_ORIGIN+'/api/media/upload',{method:'POST',headers:{Authorization:'Bearer '+a},body:form,signal:AbortSignal.timeout(45000)});assert.equal(upload.status,403);passed('previous owner upload denied',{status:upload.status});
 const saved=await save(b,current);assert.equal(saved.status,200);unchanged(f.event,(await event(b))[0]);passed('new owner can save without losing contents');
 const replay=await use(b,'accept',f.token);assert.equal(replay.data.ok,false);passed('accepted token cannot be reused');
 const media=await fetch(f.coverUrl,{signal:AbortSignal.timeout(45000)});assert.equal(media.status,200);assert.equal(createHash('sha256').update(Buffer.from(await media.arrayBuffer())).digest('hex'),f.coverHash);passed('same synthetic cover URL and bytes');
 const nfc=await fetch(WORKER_ORIGIN+'/k/LABA20261024',{redirect:'manual',signal:AbortSignal.timeout(45000)});assert.equal(nfc.status,302);assert.equal(new URL(nfc.headers.get('location'),WORKER_ORIGIN).pathname,'/m/'+current.slug);passed('same NFC redirect and public slug');
 const gated=await fetch(WORKER_ORIGIN+'/m/'+current.slug,{signal:AbortSignal.timeout(45000)});const html=await gated.text();assert.match(html,/pin/i);assert.doesNotMatch(html,/LAB · Salvato dal browser/);passed('public page still PIN gated');
}else{
 const f=load('transfer-fixture.json');assert.equal(f.project,LAB_REF);const current=(await event(b))[0];assert.equal(current?.owner_email,B);unchanged(f.event,current);
 const link=await request(b,A);const accepted=await use(a,'accept',link);assert.equal(accepted.data.ok,true);
 const restored=(await event(a))[0];assert.equal(restored.owner_email,A);unchanged(f.event,restored);assert.deepEqual(await event(b),[]);passed('reverse transfer restores artificial owner A without content changes');
 const denied=await save(b,{...restored});assert.ok(denied.status>=400);passed('B token issued before reverse transfer cannot save after transfer',{status:denied.status});
}
writeFileSync(join(root,'.lab/transfer-'+mode+'-report.json'),JSON.stringify({project:LAB_REF,mode,checks:report},null,2));
