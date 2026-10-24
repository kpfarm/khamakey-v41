import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {NAV_MESSAGES_IT,NAV_MESSAGES_EN} from '../../pages/moments-i18n-nav.js';
import {SAVE_MESSAGES_IT,SAVE_MESSAGES_EN} from '../../pages/moments-i18n-save.js';
const source=readFileSync(new URL('../../pages/moments.js',import.meta.url),'utf8');
function block(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
const readiness=block('function giftReadyMessage(','function renderGiftReadyLine(');
for(const [locale,messages] of [['it',NAV_MESSAGES_IT],['en',NAV_MESSAGES_EN]]){
 for(const [name,published,dirty,key] of [
  ['private draft',false,false,'overview.gift.publish_first'],
  ['unsaved draft',false,true,'overview.gift.save_first'],
  ['unsaved published page',true,true,'overview.gift.save_first'],
  ['saved published page',true,false,'overview.gift.ready']
 ])test(locale+': complete content on '+name+' has truthful sharing status',()=>{
  const ctx={editorDirty:dirty,giftReadyMissing:()=>[],t:k=>messages[k]};
  const result=vm.runInNewContext(readiness+';giftReadyMessage({}, {public_visible:'+published+'});',ctx);
  assert.equal(result,messages[key]);assert.ok(result);
 });
}
test('missing content still gives the next content action',()=>{
 const result=vm.runInNewContext(readiness+';giftReadyMessage({}, {public_visible:false});',{editorDirty:false,giftReadyMissing:()=>['la copertina'],t:(k,args)=>k+':'+(args?.what||'')});assert.equal(result,'overview.gift.missing.one:la copertina');
});
const feedback=block('function showEditorSaveFeedback(','function mediaNounForKind(');
for(const dirty of [false,true])test('save acknowledgement preserves remaining unsaved edits: '+dirty,()=>{
 const classes={},node={classList:{toggle:(k,v)=>classes[k]=v}};
 vm.runInNewContext(feedback+';showEditorSaveFeedback("Saved version", "ok");',{editorDirty:dirty,t:k=>k,setStatus(){},document:{getElementById:id=>id==='editorSaveStatus'?node:null,querySelector:()=>null}});
 assert.equal(node.textContent,dirty?'shell.unsaved':'shell.saved');assert.equal(classes.dirty,dirty);
});
const persist=block('async function persistMediaToPage(','async function saveMoment(');
for(const [name,ok,dirty,switchPage] of [['success',true,false,false],['save failed',false,true,false],['new edits after saved file',true,true,false],['switched page',false,true,true]])test('uploaded file feedback: '+name,async()=>{
 const form={id:'A'},notices=[],operations=[];
 const ctx={activeId:'A',rows:[{id:'A'}],editorDirty:dirty,liveEditorForm:()=>form,formEventId:f=>f?.id,showEditorOperation:(...a)=>operations.push(a),showMediaUploadNotice:(...a)=>notices.push(a),t:k=>k,saveMoment:async(e,row,options)=>{assert.equal(row.id,'A');assert.equal(options.fromMedia,true);if(switchPage)ctx.activeId='B';return ok;}};
 const result=await vm.runInNewContext(persist+';persistMediaToPage({id:"A"},{id:"A"});',ctx);
 assert.equal(result,ok);assert.equal(operations[0][0],'save.linking_file');
 if(switchPage){assert.equal(operations.length,1);assert.equal(notices.length,0);}
 else if(!ok){assert.equal(operations.at(-1)[0],'save.upload_not_saved');assert.equal(notices.length,0);}
 else{assert.equal(operations.at(-1)[0],'');assert.equal(notices[0][0],dirty?'save.upload_saved_more_edits':'save.upload_saved');}
});
test('all file phase messages exist in Italian and English',()=>{
 for(const dict of [SAVE_MESSAGES_IT,SAVE_MESSAGES_EN])for(const k of ['save.uploading_file','save.linking_file','save.upload_not_saved','save.upload_saved_more_edits'])assert.ok(dict[k]);
});
