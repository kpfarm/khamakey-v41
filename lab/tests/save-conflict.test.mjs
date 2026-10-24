import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
// Execute the actual save RPC block, isolating only the surrounding DOM work.
const source=readFileSync(new URL('../../pages/moments.js',import.meta.url),'utf8');
const begin=source.indexOf('    const savePayload = {',source.indexOf('async function saveMoment('));
const end=source.indexOf('    if(error){',begin);
assert.ok(begin>0 && end>begin,'Save RPC boundaries must remain explicit');
async function run({failure=null,adminMode=false}={}) {
 const calls=[];let refreshes=0;
 const state={title:'Unsaved local draft',type:'free',description:'keep this draft'};
 const row={id:'test-event',updated_at:'2026-01-01T00:00:00Z'};
 const context=vm.createContext({state,row,adminMode,publicVisible:true,pinEnabled:true,pinHash:null,
  supabase:{rpc:async(name,payload)=>{calls.push({name,payload});return calls.length===1&&failure?{data:null,error:failure}:{data:[{result_event_id:row.id}],error:null};}},
  refreshEventUpdatedAt:async()=>{refreshes++;row.updated_at='2026-01-01T00:00:01Z';}
 });
 const result=await vm.runInContext('(async()=>{'+source.slice(begin,end)+'return {saveData,error};})()',context);
 return {calls,refreshes,state,row,result};
}
test('stale save never resubmits an old draft using a newer timestamp',async()=>{
 const failure={message:'CONFLICT_STALE_SAVE: another editor saved'};
 const r=await run({failure});
 assert.equal(r.calls.length,1,'A conflict must not silently overwrite the newer remote save');
 assert.equal(r.refreshes,0);
 assert.equal(r.result.error,failure);
 assert.equal(r.state.title,'Unsaved local draft');
 assert.equal(r.row.updated_at,'2026-01-01T00:00:00Z');
});
test('successful owner save keeps the expected timestamp and payload',async()=>{
 const r=await run();assert.equal(r.calls.length,1);assert.equal(r.calls[0].name,'save_my_moment_page');
 assert.equal(r.calls[0].payload.p_expected_updated_at,'2026-01-01T00:00:00Z');
 assert.equal(r.calls[0].payload.p_page_state,r.state);assert.equal(r.result.error,null);
});
test('admin save retains its separate RPC',async()=>{
 const r=await run({adminMode:true});assert.equal(r.calls.length,1);assert.equal(r.calls[0].name,'admin_save_moment_page');
});
test('unrelated save errors propagate without another write',async()=>{
 const failure={message:'unavailable'};const r=await run({failure});assert.equal(r.calls.length,1);assert.equal(r.result.error,failure);
});
