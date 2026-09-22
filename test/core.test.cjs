const {test}=require('node:test'),assert=require('node:assert/strict');
const {runLoop,toolRegistry}=require('../index.cjs');
const {thinkJson}=require('../thinking.cjs');
test('same core runs two unrelated tool environments without browser knowledge',async()=>{
 for(const domain of ['desktop','warehouse']){
  let state=0,checkpoints=0;const tools=toolRegistry([{id:domain+'.advance',mutating:true,parse:x=>x,authorize:()=>true,execute:async()=>++state}]);
  const result=await runLoop({signal:new AbortController().signal,observe:async()=>state,decide:async s=>s===3?{result:s}:{action:domain+'.advance'},execute:async(id,ctx)=>{await tools.call(id,{}, {...ctx,beforeMutation:()=>{checkpoints++;}});}});
  assert.equal(result,3);assert.equal(checkpoints,3);
 }
});
test('cancelled decision cannot dispatch even when provider ignores abort',async()=>{
 const abort=new AbortController();let executed=0;
 const p=runLoop({signal:abort.signal,observe:async()=>0,decide:async()=>{await new Promise(r=>setTimeout(r,25));return {action:'go'};},execute:async()=>++executed});
 setTimeout(()=>abort.abort(),5);await assert.rejects(p);await new Promise(r=>setTimeout(r,40));assert.equal(executed,0);
});
test('unknown mutation is never automatically retried',async()=>{
 let calls=0;await assert.rejects(runLoop({signal:new AbortController().signal,observe:async()=>0,decide:async()=>({action:'go'}),execute:async()=>{calls++;throw Error('OUTCOME_UNKNOWN');}}),/OUTCOME_UNKNOWN/);assert.equal(calls,1);
});
test('cycle and stage budgets bound unproductive or stuck adapters',async()=>{
 let calls=0;await assert.rejects(runLoop({maxCycles:2,signal:new AbortController().signal,observe:async()=>0,decide:async()=>({action:'wait'}),execute:async()=>{calls++;}}),/LOOP_CYCLE_BUDGET/);assert.equal(calls,2);
 await assert.rejects(runLoop({stageTimeoutMs:5,signal:new AbortController().signal,observe:()=>new Promise(()=>{}),decide:async()=>({result:true}),execute:async()=>{}}),/LOOP_STAGE_TIMEOUT/);
});
test('tools require authorization and mutation checkpoints, including after revocation',async()=>{
 let allowed=true,calls=0;const tools=toolRegistry([{id:'write',mutating:true,parse:x=>x,authorize:()=>allowed,execute:async()=>++calls}]),signal=new AbortController().signal;
 await assert.rejects(tools.call('write',{}, {signal}),/CHECKPOINT/);
 await assert.rejects(tools.call('write',{}, {signal,beforeMutation:()=>{allowed=false;}}),/ACCESS_DENIED/);assert.equal(calls,0);
});
test('thinking is tool-free JSON and returns bounded usage',async()=>{
 const r=await thinkJson({baseUrl:'https://models.example/v1',model:'small',apiKey:'secret'},{instruction:'Return JSON',input:{goal:'test'}},new AbortController().signal,async(url,init)=>{
  assert.equal(url,'https://models.example/v1/chat/completions');const body=JSON.parse(init.body);assert.equal(body.tools,undefined);assert.equal(body.stream,false);
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"value":42}'}}],usage:{prompt_tokens:3,completion_tokens:2,private:'omit'}}));
 });assert.deepEqual(r.output,{value:42});assert.deepEqual(r.usage,{prompt_tokens:3,completion_tokens:2});
});
test('thinking rejects code/prose, truncated JSON and credential-bearing URLs',async()=>{
 const config={baseUrl:'https://models.example/v1',model:'small',apiKey:'secret'},request={instruction:'Return JSON',input:{}},signal=new AbortController().signal;
 await assert.rejects(thinkJson({...config,baseUrl:'https://user:password@models.example/v1'},request,signal),/INVALID_CONFIG/);
 await assert.rejects(thinkJson(config,request,signal,async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"ok":true}'}}]}))),/INVALID_RESPONSE/);
});
