import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runComputerUse,type ComputerUseDependencies} from '../logic/computer-use.ts';
function fixture(plan:string[]){
 let revision={revision:1,goal:'Create a note'},index=0;const calls:any[]=[];
 const state={generation:'g',application:'com.apple.Notes',controls:[{ref:'c1',label:'Note',role:'AXTextArea',actions:['type'],value:''}],apps:[{id:'com.apple.Notes',name:'Notes'}],truncated:false};
 const deps:ComputerUseDependencies={authorized:()=>true,latestGoal:()=>revision,beforeMutation:()=>{},thinking:async()=>({text:'milk'}),call:async(name,args)=>{calls.push({name,args});return name==='computer_acquire'?{lease_token:'lease'}:name==='computer_observe'?state:{state:'completed'};},evaluate:async req=>{const keys=Object.keys(req.questions.action.criteria),chosen=plan[index++]??'DONE';return {answers:{action:{choice:chosen,confidence:1,probabilities:Object.fromEntries(keys.map(k=>[k,k===chosen?1:0]))}}};}};
 return {deps,state,calls,update:(goal:string)=>revision={revision:revision.revision+1,goal}};
}
test('Computer Use invokes Thinking and guarded MCP actions, never reports unverified success',async()=>{
 const f=fixture(['type:c1','DONE']);const r=await runComputerUse({goal:'Create a note'},f.deps,new AbortController().signal);
 assert.equal(r.status,'needs_verification');assert.equal(r.steps,1);
 const actions=f.calls.filter(x=>x.name==='computer_action');assert.equal(actions.length,1);assert.equal(actions[0].args.text,'milk');assert.equal(actions[0].args.generation,'g');
});
test('a new goal during evaluation discards old decision before any action',async()=>{
 const f=fixture(['type:c1','DONE']),evaluate=f.deps.evaluate;let first=true;
 f.deps.evaluate=async(...args)=>{const r=await evaluate(...args);if(first){first=false;f.update('Stop editing; inspect the note');}return r;};
 const r=await runComputerUse({goal:'Create a note'},f.deps,new AbortController().signal);
 assert.equal(r.revision,2);assert.equal(f.calls.filter(x=>x.name==='computer_action').length,0);
});
test('a revision during Thinking cannot type obsolete text',async()=>{
 const f=fixture(['type:c1','DONE']);f.deps.thinking=async()=>{f.update('Inspect only');return {text:'obsolete'};};
 await runComputerUse({goal:'Create a note'},f.deps,new AbortController().signal);
 assert.equal(f.calls.filter(x=>x.name==='computer_action').length,0);
});
test('unknown mutation fences continuation and is not replayed',async()=>{
 const f=fixture(['type:c1']),call=f.deps.call;f.deps.call=async(...args)=>args[0]==='computer_action'?{state:'unknown'}:call(...args);
 const r=await runComputerUse({goal:'Create a note'},f.deps,new AbortController().signal);
 assert.equal(r.status,'needs_reconciliation');assert(r.operationId);
});
test('revoked authorization cannot dispatch even after successful inference',async()=>{
 const f=fixture(['type:c1']),evaluate=f.deps.evaluate;let allowed=true;f.deps.authorized=()=>allowed;
 f.deps.evaluate=async(...args)=>{const r=await evaluate(...args);allowed=false;return r;};
 const r=await runComputerUse({goal:'Create a note'},f.deps,new AbortController().signal);
 assert.equal(r.reason,'ACCESS_DENIED');assert.equal(f.calls.filter(x=>x.name==='computer_action').length,0);
});
test('independent verification is strict and partial observations cannot complete',async()=>{
 for(const truncated of [true,false]){const f=fixture(['DONE']);f.state.truncated=truncated;f.deps.verify=async()=>true;
 const r=await runComputerUse({goal:'Inspect'},f.deps,new AbortController().signal);assert.equal(r.status,truncated?'needs_verification':'succeeded');}
});
test('experience hints reach Jev and observed effects require independent completion to learn',async()=>{
 for(const verified of [true,false]){
  const f=fixture(['type:c1','DONE']),call=f.deps.call,evaluate=f.deps.evaluate;const outcomes:string[]=[];let state=structuredClone(f.state),hintSeen=false;
  f.deps.call=async(name,args,signal)=>{if(name==='computer_observe')return structuredClone(state);if(name==='computer_action')state={...state,generation:'g2',controls:[{...state.controls[0],value:'milk'}]};return call(name,args,signal);};
  f.deps.experience={select:async()=>[{when:{role:'text-area',state:'empty'},action:'type',expected:'value-changed',source:'pack',validation:'fixture',success:0,failure:0}],record:async(_c,_e,outcome)=>{outcomes.push(outcome);}};
  f.deps.evaluate=async(...args)=>{hintSeen=Array.isArray((args[0].state as any).experience)&&(args[0].state as any).experience.length>0;return evaluate(...args);};
  f.deps.verify=async()=>verified;
  await runComputerUse({goal:'Create a note'},f.deps,new AbortController().signal);
  assert(hintSeen);assert.deepEqual(outcomes,verified?['effect-only','verified-success']:['effect-only']);
 }
});

test('static app content and window title survive observation parsing and reach verification',async()=>{
 const f=fixture(['DONE']);Object.assign(f.state,{windowTitle:'September 2026',text:['23','Team meeting 10:00']});
 f.deps.verify=async state=>{assert.equal(state.windowTitle,'September 2026');assert.deepEqual(state.text,['23','Team meeting 10:00']);return true;};
 const r=await runComputerUse({goal:'Read this month'},f.deps,new AbortController().signal);assert.equal(r.status,'succeeded');
});
test('BLOCKED choice means no supported action, not an account or provider refusal',async()=>{
 const f=fixture(['BLOCKED']);const r=await runComputerUse({goal:'Inspect'},f.deps,new AbortController().signal);assert.equal(r.reason,'NO_SUPPORTED_ACTION');assert.equal(r.steps,0);
});
