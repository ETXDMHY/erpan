import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const stable = new URL('../operit/stable/phone10-mobile-voice.js', import.meta.url);
const file = new URL(process.env.SYNC_CANDIDATE || '../operit/phone10-mobile-voice.js', import.meta.url);
function fixture(messages, after = null) {
  const sandbox = { exports: {} }; vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  const events = [], calls = [];
  const request = {version:1,id:'aaf0592b-907c-4010-9540-ef17c3744b21',nonce:'77c57434-3fdc-42d7-9c34-81d1bc186828',kind:'observe',chatId:'chosen',after};
  const env = { emit(e) {events.push(e);return true;}, cancel(){throw Error('must not cancel O');}, chat: {
    agentStatus(id){calls.push(['status',id]);return {chatId:id,isIdle:true,isProcessing:false};},
    getMessages(id,options){calls.push(['read',id,options.limit]);return {chatId:id,messages};},
    async sendMessageStreaming(){throw Error('must not call model');}
  }};
  env.status = id => env.chat.agentStatus(id);
  env.readMessages = (id, options) => env.chat.getMessages(id, options);
  return {events,calls,request,env,run:()=>sandbox.exports.runRequest(request,env)};
}
const ai=(timestamp,content)=>({sender:'ai',timestamp,content});
test('stream observation exposes canonical partial text synchronously without advancing cursor',()=>{
  const f=fixture([ai(11,'第一句。')],10);f.request.kind='observe_stream';
  f.env.status=()=>({chatId:'chosen',isIdle:false,isProcessing:true,state:'receiving'});
  assert.equal(f.run(),undefined);
  assert.equal(f.events.find(e=>e.type==='chunk')?.text,'第一句。');
  assert.equal(f.events.find(e=>e.type==='message_start')?.finished,false);
  assert.equal(f.events.find(e=>e.type==='snapshot')?.cursor,10);
});
test('stream baseline is silent, completed replies carry finish, and error discards partials',()=>{
  for(const mode of ['baseline','finished','error']){
    const f=fixture([ai(11,'正文')],mode==='baseline'?null:10);f.request.kind='observe_stream';
    if(mode==='error')f.env.status=()=>({chatId:'chosen',state:'error',isIdle:false,isProcessing:false});
    f.run();
    assert.equal(f.events.at(-1)?.type,'complete');
    assert.equal(f.events.find(e=>e.type==='snapshot')?.cursor,11);
    assert.equal(f.events.filter(e=>e.type==='chunk').length,mode==='finished'?1:0);
    if(mode==='finished')assert.equal(f.events.find(e=>e.type==='message_start').finished,true);
  }
});
test('observe uses the host history reader without entering the generic tool callback bridge',async()=>{
  const f=fixture([],10);
  f.env.chat.getMessages=()=>{throw Error('generic callback path must not be used');};
  f.env.readMessages=()=>({chatId:'chosen',messages:[ai(11,'new reply')]});
  await f.run();assert.equal(f.events.at(-1).type,'complete');
  assert.equal(f.events.find(e=>e.type==='chunk').text,'new reply');
});
test('listen baseline returns cursor without exposing historical text',async()=>{
  const f=fixture([ai(10,'private old text')]);await f.run();
  assert.equal(f.events.find(e=>e.type==='snapshot')?.cursor,10);
  assert.equal(f.events.at(-1).type,'complete');
  assert.ok(!JSON.stringify(f.events).includes('private old text'));
});
test('listen receives only newer AI messages once, ordered, and split below Binder limit',async()=>{
  const f=fixture([ai(13,'后一句'),{sender:'user',timestamp:12,content:'不要读我'},ai(11,'a'.repeat(18000)),ai(10,'旧')],10);
  await f.run();assert.deepEqual(f.events.filter(e=>e.type==='message_start').map(e=>e.timestamp),[11,13]);
  assert.ok(f.events.filter(e=>e.type==='chunk').every(e=>e.text.length<=8192));
  f.request.after=13;f.events.length=0;await f.run();assert.equal(f.events.filter(e=>e.type==='chunk').length,0);
});
test('processing snapshot neither speaks partial response nor advances its cursor',async()=>{
  const f=fixture([ai(11,'partial')],10);f.env.chat.agentStatus=()=>({chatId:'chosen',isIdle:false,isProcessing:true});
  await f.run();assert.equal(f.events.find(e=>e.type==='snapshot')?.cursor,10);assert.equal(f.events.filter(e=>e.type==='chunk').length,0);
});
test('wrong chat and unavailable API fail visibly without raw data',async()=>{
  for(const broken of ['wrong','missing']){
    const f=fixture([],10);
    if(broken==='wrong')f.env.chat.getMessages=()=>({chatId:'other',messages:[ai(12,'secret')]});
    else delete f.env.chat.getMessages;
    await f.run();assert.equal(f.events.at(-1).type,'error');assert.ok(!JSON.stringify(f.events).includes('secret'));
  }
});
test('a turn beginning while the snapshot is read cannot expose partial speech',async()=>{
  const f=fixture([ai(11,'partial')],10);let n=0;
  f.env.chat.agentStatus=()=>({chatId:'chosen',isIdle:n++===0,isProcessing:n>1});
  await f.run();assert.equal(f.events.filter(e=>e.type==='chunk').length,0);
  assert.equal(f.events.find(e=>e.type==='snapshot').cursor,10);
});
test('failed partials are skipped and stop acknowledgement never cancels user model work',async()=>{
  const f=fixture([ai(11,'failed partial')],10);
  f.env.chat.agentStatus=()=>({chatId:'chosen',state:'error',isIdle:false,isProcessing:false});
  await f.run();assert.equal(f.events.find(e=>e.type==='snapshot').cursor,11);
  assert.equal(f.events.filter(e=>e.type==='chunk').length,0);
  const stopped=fixture([ai(11,'hello')],10);stopped.env.emit=()=>false;
  await stopped.run();
});
test('host reads MAIN runtime state, independent of O floating chat service',()=>{
  let slot, state = {className:'com.ai.assistance.operit.data.model.InputProcessingState$Receiving'};
  const sandbox={exports:{},Java:{type(name){
    if(name.endsWith('ChatRuntimeHolder'))return {getStatic:()=>({getInstance:()=>({getCore(value){slot=value;return {
      getInputProcessingStateByChatId:()=>({getValue:()=>({chosen:state})})
    };}})})};
    if(name.endsWith('ChatRuntimeSlot'))return {getStatic: value=>value};
    throw Error('unexpected class');
  }}};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox);
  assert.equal(sandbox.readMainStatus({},'chosen').isProcessing,true);assert.equal(slot,'MAIN');
  state={className:'com.ai.assistance.operit.data.model.InputProcessingState$Completed'};
  assert.equal(sandbox.readMainStatus({},'chosen').isIdle,true);
  state={className:'unknown'};assert.throws(()=>sandbox.readMainStatus({},'chosen'));
});
