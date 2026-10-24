// Laboratory-only orchestration for owner/editor and stale-save checks.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {APP_ORIGIN,WORKER_ORIGIN,LAB_REF} from './network.mjs';
import {validateSettings} from './prepare-preview.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const settings=JSON.parse(readFileSync(join(root,'.lab/settings.json'),'utf8'));
const fixture=JSON.parse(readFileSync(join(root,'.lab/test-accounts.json'),'utf8'));
const baseline=JSON.parse(readFileSync(join(root,'.lab/collaboration-baseline.json'),'utf8'));
validateSettings(settings);assert.equal(fixture.project,LAB_REF);assert.equal(baseline.project,LAB_REF);
const mode=process.argv[2];
assert.ok(['inspect','remote-before','remote-after','upload','revoke','restore'].includes(mode));
async function login(email) {
 const account=fixture.accounts.find(x=>x.email===email);assert.ok(account);
 const r=await fetch(APP_ORIGIN+'/supabase/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:settings.key,'Content-Type':'application/json'},body:JSON.stringify(account),signal:AbortSignal.timeout(45000)});
 assert.equal(r.status,200);const data=await r.json();assert.ok(data.access_token);return data.access_token;
}
const [a,b]=await Promise.all(['lab-owner-a@example.invalid','lab-owner-b@example.invalid'].map(login));
async function call(token,path,body) {
 const r=await fetch(APP_ORIGIN+'/supabase/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:settings.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 return {status:r.status,data:await r.json()};
}
async function event(token) {
 return call(token,'moment_events?select=*&id=eq.'+baseline.event.id);
}
async function save(token,e,{title=e.title,state=e.page_state}={}) {
 return call(token,'rpc/save_my_moment_page',{p_event_id:e.id,p_title:title,p_moment_type:e.moment_type,p_description:e.description,p_page_state:state,p_public_visible:e.public_visible,p_pin_enabled:e.pin_enabled,p_pin_hash:null,p_expected_updated_at:e.updated_at});
}
if(mode==='inspect') {
 const own=await event(a),other=await event(b);
 const list=await call(a,'rpc/list_moment_page_editors',{p_event_id:baseline.event.id});
 console.log(JSON.stringify({ownerTitle:own.data[0]?.title,subtitle:own.data[0]?.page_state?.subtitle,editorCanRead:other.data.length===1,members:list.data.map(x=>({email:x.email,status:x.status}))}));
} else if(mode==='remote-before'||mode==='remote-after') {
 const e=(await event(a)).data[0];assert.ok(e);
 const title=mode==='remote-before'?'LAB · Titolo recente A prima del fix':'LAB · Titolo recente A protetto';
 const state={...e.page_state,title};
 const r=await save(a,e,{title,state});assert.equal(r.status,200);
 console.log(JSON.stringify({mode,title,status:r.status}));
} else if(mode==='upload') {
 const visible=await event(b);assert.equal(visible.data.length,1);
 const form=new FormData();form.append('scope','moments');form.append('scopeId',baseline.event.id);form.append('clientMime','image/png');form.append('file',new Blob([readFileSync(join(root,'.lab/upload-diagnostic.png'))],{type:'image/png'}),'collaborator-test.png');
 const r=await fetch(WORKER_ORIGIN+'/api/media/upload',{method:'POST',headers:{Authorization:'Bearer '+b},body:form,signal:AbortSignal.timeout(45000)});assert.equal(r.status,200);const data=await r.json();
 writeFileSync(join(root,'.lab/collaborator-upload.json'),JSON.stringify({project:LAB_REF,data},null,2));
 console.log(JSON.stringify({acceptedCollaboratorUpload:r.status}));
} else if(mode==='revoke') {
 const r=await call(a,'rpc/revoke_moment_page_editor',{p_event_id:baseline.event.id,p_email:'lab-owner-b@example.invalid'});assert.equal(r.status,200);
 const rows=await event(b);assert.deepEqual(rows.data,[]);
 const forbiddenInvite=await call(b,'rpc/invite_moment_page_editor',{p_event_id:baseline.event.id,p_email:'lab-outsider@example.invalid'});assert.ok(forbiddenInvite.status>=400);
 const denied=await save(b,{...baseline.event,updated_at:null});assert.ok(denied.status>=400);assert.match(denied.data.message,/non trovato per questo account/);
 const form=new FormData();form.append('scope','moments');form.append('scopeId',baseline.event.id);form.append('clientMime','image/png');form.append('file',new Blob([readFileSync(join(root,'.lab/upload-diagnostic.png'))],{type:'image/png'}),'revoked-test.png');
 const blocked=await fetch(WORKER_ORIGIN+'/api/media/upload',{method:'POST',headers:{Authorization:'Bearer '+b},body:form,signal:AbortSignal.timeout(45000)});assert.equal(blocked.status,403);
 const own=await event(a);assert.equal(own.data.length,1);
 console.log(JSON.stringify({revocation:'passed',existingEditorTokenReadDenied:true,existingEditorTokenSaveStatus:denied.status,existingEditorTokenUploadStatus:blocked.status,ownerAccessPreserved:true}));
} else {
 const e=(await event(a)).data[0];assert.ok(e);
 // Restore only this workflow's artificial fixture, never real customer content.
 const r=await save(a,{...baseline.event,updated_at:e.updated_at});assert.equal(r.status,200);
 console.log(JSON.stringify({restoredArtificialFixture:true,title:baseline.event.title,status:r.status}));
}
