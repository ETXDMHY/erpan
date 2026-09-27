import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const file=new URL(process.env.SYNC_CANDIDATE||'../operit/phone10-mobile-voice.js',import.meta.url);
function fixture(){
 const events=[],sandbox={exports:{}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox);
 const request={version:1,id:'aaf0592b-907c-4010-9540-ef17c3744b21',nonce:'77c57434-3fdc-42d7-9c34-81d1bc186828',kind:'observe',chatId:'chosen',after:10};
 const env={status:()=>({chatId:'chosen',isIdle:true,isProcessing:false}),readMessages:()=>({chatId:'chosen',messages:[{timestamp:11,sender:'ai',content:'hello'}]}),emit:e=>{events.push(e);return true;},cancel(){throw Error('listener must not cancel chat');}};
 return {events,sandbox,request,env};
}
test('observe completes protocol before returning without a pending JS promise',()=>{
 const f=fixture(),result=f.sandbox.exports.runRequest(f.request,f.env);
 assert.equal(result,undefined);
 assert.deepEqual(f.events.map(e=>e.type),['message_start','chunk','message_end','snapshot','complete']);
});
test('observe URI receiver and exported entry finish synchronously',()=>{
 const f=fixture(),completions=[];
 f.sandbox.host=()=>f.env;f.sandbox.phone10Diag=()=>{};f.sandbox.complete=r=>completions.push(r);
 f.sandbox.Java={getApplicationContext:()=>({getContentResolver:()=>({openInputStream:()=>({})})}),type(name){
   if(name==='android.net.Uri')return {parse:()=>({getLastPathSegment:()=>f.request.id})};
   if(name==='java.util.Scanner')return {newInstance:()=>({useDelimiter(){return this;},next:()=>JSON.stringify(f.request),close(){}})};
   throw Error(name);
 }};
 const result=f.sandbox.exports.receive({event:JSON.stringify({uri:'content://com.huigu.phone10.mobile.operit/request/'+f.request.id})});
 assert.equal(result?.status,'HANDLED');assert.equal(completions.length,1);assert.equal(f.events.at(-1)?.type,'complete');
});
