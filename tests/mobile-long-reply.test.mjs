import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('a tool wait beyond two minutes can return narration and finish the same request', async context => {
  context.mock.timers.enable({apis:['setTimeout']});
  const sandbox = {exports:{}};
  vm.runInNewContext(fs.readFileSync(new URL('../operit/phone10-mobile-voice.js',import.meta.url),'utf8'),sandbox);
  const events = [], calls = [];
  const request = {version:1,id:'aaf0592b-907c-4010-9540-ef17c3744b21',
    nonce:'77c57434-3fdc-42d7-9c34-81d1bc186828',kind:'reply',chatId:'tutorial',text:'开始讲解'};
  const env = {
    claim:()=>true, state:()=> 'claimed', started(){}, mark(){}, release(){},
    emit:event=>{events.push(event);return true;}, cancel:id=>calls.push(['cancel',id]),
    chat:{sendMessageStreaming(text,chatId,role,sender,options){
      calls.push(['send',text,chatId]);
      options.onIntermediateResult({type:'start',chatId});
      options.onIntermediateResult({type:'chunk',chatId,chunk:'开始操作。'});
      // Model the existing O API's deadline while advancing time without model calls.
      return new Promise((resolve,reject)=>{
        const deadline=setTimeout(()=>reject(Error('Timeout waiting for AI reply')),options.timeout_ms);
        setTimeout(()=>{
          clearTimeout(deadline);
          options.onIntermediateResult({type:'chunk',chatId,chunk:'操作完成。'});
          resolve({chatId,aiResponse:'开始操作。操作完成。'});
        },140000);
      });
    }}
  };
  const run = sandbox.exports.runRequest(request,env);
  context.mock.timers.tick(140001);
  await run;
  assert.equal(events.at(-1).type,'complete');
  assert.equal(events.filter(e=>e.type==='chunk').map(e=>e.text).join(''),'开始操作。操作完成。');
  assert.deepEqual(calls,[['send','开始讲解','tutorial']]);
});
