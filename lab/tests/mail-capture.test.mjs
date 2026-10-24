import test from 'node:test';
import assert from 'node:assert/strict';
import {labMailFetch,capturedMailSnapshot,LAB_MAIL_KEY} from '../mail-network.mjs';
import {allowedWorkerRoute} from '../network.mjs';
const payload={from:'Laboratory <no-reply@example.invalid>',to:['lab-owner-b@example.invalid'],subject:'Lab',text:'Artificial only',html:'<p>Artificial only</p>',tags:[{name:'type',value:'moments_ownership_transfer'}]};
const send=(body=payload,key=LAB_MAIL_KEY)=>labMailFetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(body)});
test('mail capture never calls the external network, success and simulated failure',async()=>{
 const real=globalThis.fetch;globalThis.fetch=()=>{throw Error('No network may be used');};
 try{assert.equal((await send()).status,200);assert.equal(capturedMailSnapshot().at(-1).delivery,'captured-not-sent');assert.equal((await send({...payload,to:['lab-mail-failure@example.invalid']})).status,503);}finally{globalThis.fetch=real;}
});
test('mail capture refuses real credentials, recipients and unrelated mail',async()=>{
 await assert.rejects(send(payload,'real-credential-must-never-reach-provider'),/rejected/);
 for(const body of [{...payload,to:['customer@example.com']},{...payload,to:[...payload.to,...payload.to]},{...payload,tags:[]},{...payload,from:'real@example.com'}])await assert.rejects(send(body),/Only artificial/);
});
test('mail capture refuses alternate provider routes; default routes remain closed',async()=>{
 await assert.rejects(labMailFetch('https://api.resend.com/emails?redirect=evil'),/rejected/);
 assert.equal(allowedWorkerRoute('/api/moment/transfer','POST'),false);
 assert.equal(allowedWorkerRoute('/api/moment/transfer','POST',{localTransferMail:true}),true);
 assert.equal(allowedWorkerRoute('/api/moment/invite','POST',{localTransferMail:true}),false);
});
