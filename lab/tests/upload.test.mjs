import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHarness } from './harness.mjs';

for (const [name,mime,type] of [['test.png','image/png','image'],['test.mp4','video/mp4','video'],['voice.m4a','audio/mp4','audio'],['letter.pdf','application/pdf','pdf']]) {
  test('authorized '+type+' upload returns a usable URL and records usage',async()=>{
    const h=makeHarness(); const r=await h.upload({name,mime});
    assert.equal(r.status,200,JSON.stringify(r.body)+' '+h.logs.join(' '));
    assert.equal(r.body.ok,true); assert.equal(r.body.type,type); assert.equal(h.puts,1);
    assert.ok(r.body.url.startsWith('https://worker.lab.invalid/cdn/moments/lab-event/'));
    assert.equal(r.body.file_count,1); assert.equal(r.body.bytes_used,128);
    assert.equal(h.calls.filter(c=>c.path.endsWith('/set_moment_media_usage')).length,1);
  });
}
for (const [label,options,upload,status,code] of [
  ['missing login',{}, {token:''},401],
  ['invalid session',{invalidSession:true},{},401],
  ['other page permission',{allowed:false},{},403],
  ['rate limit',{rateAllowed:false},{},429],
  ['unavailable limiter',{rateUnavailable:true},{},503],
  ['unavailable entitlements',{entitlementsUnavailable:true},{},503,'entitlements_unavailable'],
  ['storage quota',{bytesUsed:250*1024*1024},{},413,'storage_quota'],
  ['file size',{limits:{max_image_mb:0.001}},{size:2048},413,'file_too_large'],
  ['unsupported format',{}, {name:'x.txt',mime:'text/plain'},400],
  ['missing file',{}, {missingFile:true},400],
  ['missing storage',{noStorage:true},{},503],
  ['video object cap',{limits:{video_clips:0,letter_videos:0}},{name:'x.mp4',mime:'video/mp4'},413,'plan_kind_limit']
]) {
  test(label+' is rejected before any storage write',async()=>{
    const h=makeHarness(options); const r=await h.upload(upload);
    assert.equal(r.status,status,JSON.stringify(r.body)); if(code) assert.equal(r.body.code,code);
    assert.equal(h.puts,0); assert.equal(h.objects.size,0);
  });
}
test('post-upload video race rolls back only the new object',async()=>{
  const other='moments/lab-event/videos/concurrent.mp4';
  const h=makeHarness({limits:{video_clips:1,letter_videos:0},afterPut:objects=>objects.set(other,{key:other,size:2})});
  const r=await h.upload({name:'x.mp4',mime:'video/mp4'});
  assert.equal(r.status,413,JSON.stringify(r.body)); assert.equal(r.body.code,'plan_kind_limit');
  assert.deepEqual([...h.objects.keys()],[other]); assert.equal(h.deleted.length,1);
});
test('post-upload storage race rolls back only the new object',async()=>{
  const other='moments/lab-event/images/concurrent.png';
  const h=makeHarness({limits:{storage_mb:1},afterPut:objects=>objects.set(other,{key:other,size:1024*1024})});
  const r=await h.upload(); assert.equal(r.status,413); assert.equal(r.body.code,'storage_quota');
  assert.deepEqual([...h.objects.keys()],[other]);
});
test('replacement preserves the existing object until a successful new upload',async()=>{
  const old='moments/lab-event/images/old.png';
  const h=makeHarness({objects:[{key:old,size:64}]});
  const r=await h.upload({replaceUrl:'https://worker.lab.invalid/cdn/'+old});
  assert.equal(r.status,200,JSON.stringify(r.body)); assert.deepEqual(h.deleted,[old]);
  assert.equal(h.objects.size,1); assert.equal(r.body.bytes_used,128);
});
test('failed pre-check replacement leaves the old object intact',async()=>{
  const old='moments/lab-event/images/old.png';
  const h=makeHarness({objects:[{key:old,size:64}],rateAllowed:false});
  assert.equal((await h.upload({replaceUrl:'https://worker.lab.invalid/cdn/'+old})).status,429);
  assert.ok(h.objects.has(old)); assert.equal(h.deleted.length,0);
});
test('R2 accounting outage uses the existing fallback without losing a legitimate file',async()=>{
  const h=makeHarness({listFails:true}); const r=await h.upload();
  assert.equal(r.status,200,JSON.stringify(r.body)); assert.equal(h.objects.size,1);
  assert.ok(h.calls.some(c=>c.path.endsWith('/record_moment_media_bytes')));
});
