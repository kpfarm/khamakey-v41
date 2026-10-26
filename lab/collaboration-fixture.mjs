// Create an invitation using the real owner RPC, with no email delivery.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {APP_ORIGIN,LAB_REF} from './network.mjs';
import {validateSettings} from './prepare-preview.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const settings=JSON.parse(readFileSync(join(root,'.lab/settings.json'),'utf8'));
const fixture=JSON.parse(readFileSync(join(root,'.lab/test-accounts.json'),'utf8'));
validateSettings(settings);assert.equal(fixture.project,LAB_REF);
const account=fixture.accounts.find(x=>x.email==='lab-owner-a@example.invalid');
const tokenResponse=await fetch(APP_ORIGIN+'/supabase/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:settings.key,'Content-Type':'application/json'},body:JSON.stringify(account),signal:AbortSignal.timeout(45000)});
assert.equal(tokenResponse.status,200);const {access_token}=await tokenResponse.json();assert.ok(access_token);
async function request(path,body) {
 const r=await fetch(APP_ORIGIN+'/supabase/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:settings.key,Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 const data=await r.json();assert.equal(r.status,200,JSON.stringify({status:r.status,message:data.message}));return data;
}
const [event]=await request('moment_events?select=*&slug=eq.q7x5m9v3b2n8');assert.ok(event?.id);
const current=await request('rpc/list_moment_page_editors',{p_event_id:event.id});
assert.ok(!current.some(x=>x.email==='lab-owner-b@example.invalid'&&x.status==='accepted'),'B is already a collaborator; do not regenerate an accepted invitation');
const invite=await request('rpc/invite_moment_page_editor',{p_event_id:event.id,p_email:'lab-owner-b@example.invalid'});
assert.ok(invite.ok);assert.match(invite.invite_token,/^[a-f0-9]{32,128}$/);
writeFileSync(join(root,'.lab/collaboration-invite.json'),JSON.stringify({project:LAB_REF,eventId:event.id,url:APP_ORIGIN+'/moments.html?invite='+invite.invite_token},null,2));
writeFileSync(join(root,'.lab/collaboration-baseline.json'),JSON.stringify({project:LAB_REF,event},null,2));
console.log(JSON.stringify({project:LAB_REF,eventId:event.id,status:invite.status,email:'lab-owner-b@example.invalid',delivery:'local file only; no email'}));
