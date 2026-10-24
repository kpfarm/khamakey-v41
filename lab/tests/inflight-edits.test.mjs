import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../pages/moments.js',import.meta.url),'utf8');
const mark=source.slice(source.indexOf('function markEditorDirty('),source.indexOf('function shouldLivePreview('));
const ackStart=source.indexOf('    const saveRow =',source.indexOf('async function saveMoment('));
const ack=source.slice(ackStart,source.indexOf('    lastSavedMomentType =',ackStart));
function context(){
 const form={isConnected:true};
 const ctx=vm.createContext({formNode:form,suppressDirtyUi:false,historyRestore:false,saveInFlight:true,editorEditEpoch:7,epochAtSave:7,editorDirty:false,historyBurst:null,historyBurstField:null,savedEditorSnapshot:'old saved version',persistedSnapshot:'sent version',saveData:[{result_updated_at:'new-version'}],row:{id:'lab'},lastPreviewHash:'',scheduleHowEmptyHintRefresh(){},historyTargetIsText:()=>false,scheduleHistorySeal(){},document:{getElementById:()=>form},formSnapshotForDirty:()=> 'newer local text',pinFieldsDirty:()=>false,updateSaveStatus(){},clearTimeout(){},clearEditorDraft(){},resetEditorHistory(){},capturePinBaseline(){}});
 vm.runInContext(mark,ctx);return ctx;
}
test('typing during a pending save remains dirty before a network failure',()=>{
 const ctx=context();vm.runInContext('markEditorDirty(formNode,{immediate:true});',ctx);assert.equal(ctx.editorDirty,true);assert.equal(ctx.editorEditEpoch,8);
});
test('save acknowledgement cannot mark newer local text as saved',()=>{
 const ctx=context();vm.runInContext('markEditorDirty(formNode,{immediate:true});',ctx);vm.runInContext(ack,ctx);assert.equal(ctx.editorDirty,true);assert.equal(ctx.savedEditorSnapshot,'sent version');assert.equal(ctx.lastPreviewHash,'sent version');
});
test('unchanged form still becomes clean after successful save',()=>{
 const ctx=context();vm.runInContext(ack,ctx);assert.equal(ctx.editorDirty,false);assert.equal(ctx.savedEditorSnapshot,'newer local text');
});
test('suppressed programmatic changes do not simulate user typing',()=>{
 const ctx=context();ctx.suppressDirtyUi=true;vm.runInContext('markEditorDirty(formNode,{immediate:true});',ctx);assert.equal(ctx.editorEditEpoch,7);assert.equal(ctx.editorDirty,false);
});
