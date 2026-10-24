// Real database + original Worker, artificial mail capture; explicit phases only.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {DB_ORIGIN,APP_ORIGIN,WORKER_ORIGIN,LAB_REF,labFetch} from './network.mjs';
import {LAB_EVENT as id} from './mail-network.mjs';
import {validateSettings} from './prepare-preview.mjs';
const read=n=>JSON.parse(readFileSync(new URL('../.lab/'+n,import.meta.url),'utf8'));
const write=(n,v)=>writeFileSync(new URL('../.lab/'+n,import.meta.url),JSON.stringify(v,null,2));
const settings=read('settings.json'),fixture=read('test-accounts.json');validateSettings(settings);assert.equal(fixture.project,LAB_REF);
const mode=process.argv[2];assert.ok(['failure-and-guard','capture'].includes(mode));
const A='lab-owner-a@example.invalid',B='lab-owner-b@example.invalid',checks=[];
const pass=check=>{checks.push(check);console.log(JSON.stringify({check,passed:true}));};
async function login(email){const account=fixture.accounts.find(x=>x.email===email);assert.ok(account);const r=await labFetch(DB_ORIGIN+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:settings.key,'Content-Type':'application/json'},body:JSON.stringify(account),signal:AbortSignal.timeout(45000)});assert.equal(r.status,200);return(await r.json()).access_token;}
const [a,b]=await Promise.all([A,B].map(login));
async function api(token,path,body){const r=await labFetch(DB_ORIGIN+'/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:settings.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});return{status:r.status,data:await r.json()};}
const rpc=(token,name,body)=>api(token,'rpc/'+name,body);
const state=()=>rpc(a,'get_moment_ownership_transfer',{p_event_id:id});
async function worker(token,email=B,extra={}){const r=await fetch(WORKER_ORIGIN+'/api/moment/transfer',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({event_id:id,email,locale:'it',...extra}),signal:AbortSignal.timeout(45000)});return{status:r.status,data:await r.json()};}
if(mode==='failure-and-guard'){
 const e=(await api(a,'moment_events?select=*&id=eq.'+id)).data[0];assert.equal(e?.owner_email,A);assert.notEqual((await state()).data.status,'pending');
 write('transfer-mail-baseline.json',{project:LAB_REF,event:e});
 assert.equal((await worker(null)).status,401);pass('Worker requires login');
 assert.equal((await worker(a,'customer@example.com')).status,403);pass('local wrapper refuses real recipients');
 assert.equal((await worker(a,B,{event_id:'00000000-0000-0000-0000-000000000001'})).status,403);pass('local wrapper refuses other event ids');
 assert.equal((await worker(b)).status,400);pass('nonowner cannot send a transfer via Worker');
 const failure=await worker(a,'lab-mail-failure@example.invalid');assert.equal(failure.status,500);assert.match(failure.data.error,/annullato/);assert.equal((await state()).data.status,'cancelled');pass('simulated mail failure cancels its own pending invite');
 const request=async()=>{const r=await rpc(a,'request_moment_ownership_transfer',{p_event_id:id,p_email:B});assert.equal(r.status,200);assert.ok(r.data.invite_token);return r.data.invite_token;};
 const old=await request(),latest=await request();
 const current=(token,t)=>rpc(token,'moment_ownership_transfer_is_current',{p_event_id:id,p_token:t});
 assert.equal((await current(a,old)).data,false);assert.equal((await current(a,latest)).data,true);assert.equal((await current(b,latest)).data,false);pass('v183 current guard checks token and ownership');
 const abandon=(token,t)=>rpc(token,'abandon_unsent_moment_ownership_transfer',{p_event_id:id,p_token:t});
 assert.equal((await abandon(a,old)).data.status,'kept');assert.equal((await current(a,latest)).data,true);pass('failure cleanup for older token preserves newer request');
 assert.equal((await abandon(b,latest)).status,400);assert.equal((await current(a,latest)).data,true);pass('nonowner cleanup cannot cancel current request');
 assert.equal((await rpc(a,'cancel_moment_ownership_transfer',{p_event_id:id})).data.ok,true);pass('guard diagnostic pending request cancelled');
 const after=(await api(a,'moment_events?select=*&id=eq.'+id)).data[0];assert.deepEqual(after,e);pass('negative tests leave original event fully unchanged');
}else{
 const r=await fetch(WORKER_ORIGIN+'/__lab/transfer-mailbox',{signal:AbortSignal.timeout(45000)});assert.equal(r.status,200);const box=await r.json();assert.equal(box.environment,'local-capture-no-delivery');
 const mail=box.messages.filter(m=>m.delivery==='captured-not-sent'&&m.payload.to[0]===B).at(-1);assert.ok(mail,'No successful browser-generated transfer capture');
 assert.match(mail.payload.subject,/Moment/i);assert.ok(mail.payload.html&&mail.payload.text);
 const found=mail.payload.text.match(/http:\/\/127\.0\.0\.1:8080\/moments\.html\?transfer=([a-f0-9]{48})/);assert.ok(found);const url=found[0],token=found[1];assert.ok(mail.payload.html.includes(url));pass('captured mail contains matching local link in HTML and text');
 assert.doesNotMatch(mail.payload.html+mail.payload.text,/https:\/\/(app|link)\.khamakeymoments\.com/);pass('captured transfer links contain no production origin');
 const peek=await rpc(b,'peek_moment_ownership_transfer',{p_token:token});assert.equal(peek.data.status,'pending');assert.equal(peek.data.to_email,B);pass('captured link identifies pending recipient B');
 const before=read('transfer-mail-baseline.json');assert.equal(before.project,LAB_REF);const e=(await api(a,'moment_events?select=*&id=eq.'+id)).data[0];assert.deepEqual(e,before.event);pass('browser request has not changed owner or contents');
 const coverUrl=WORKER_ORIGIN+'/cdn/moments/'+id+'/images/8256f09c-893b-4067-a0fc-c3edd1ce3bb0.png';const media=await fetch(coverUrl);assert.equal(media.status,200);const coverHash=createHash('sha256').update(Buffer.from(await media.arrayBuffer())).digest('hex');
 write('transfer-fixture.json',{project:LAB_REF,event:e,token,url,coverUrl,coverHash});write('transfer-mail-capture.json',{project:LAB_REF,mail});pass('local captured link ready for browser acceptance; zero real delivery');
}
write('transfer-mail-'+mode+'-report.json',{project:LAB_REF,checks});
