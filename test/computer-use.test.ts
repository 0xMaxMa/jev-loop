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
test('experience hooks are ignored by the basic computer loop',async()=>{
 for(const verified of [true,false]){
  const f=fixture(['type:c1','DONE']),call=f.deps.call,evaluate=f.deps.evaluate;const outcomes:string[]=[];let state=structuredClone(f.state),hintSeen=false;
  f.deps.call=async(name,args,signal)=>{if(name==='computer_observe')return structuredClone(state);if(name==='computer_action')state={...state,generation:'g2',controls:[{...state.controls[0],value:'milk'}]};return call(name,args,signal);};
  (f.deps as any).experience={select:async()=>[{when:{role:'text-area',state:'empty'},action:'type',expected:'value-changed',source:'pack',validation:'fixture',success:0,failure:0}],record:async(_c:unknown,_e:unknown,outcome:string)=>{outcomes.push(outcome);}};
  f.deps.evaluate=async(...args)=>{hintSeen=Array.isArray((args[0].state as any).experience)&&(args[0].state as any).experience.length>0;return evaluate(...args);};
  f.deps.verify=async()=>verified;
  await runComputerUse({goal:'Create a note'},f.deps,new AbortController().signal);
  assert.equal(hintSeen,false);assert.deepEqual(outcomes,[]);
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

test('fresh satisfied field values progress without repeated typing or reopening current app',async()=>{
 const f=fixture(['type:c1','key:enter','DONE']);f.state.controls[0].value='milk';let count=0;
 const evaluate=f.deps.evaluate;f.deps.evaluate=async(...args)=>{const criteria=args[0].questions.action.criteria;assert.equal(Object.hasOwn(criteria,'open:com.apple.Notes'),false);if(count++>0)assert.equal(Object.hasOwn(criteria,'type:c1'),false);return evaluate(...args);};
 const r=await runComputerUse({goal:'Search milk'},f.deps,new AbortController().signal);
 assert.equal(r.steps,1);const actions=f.calls.filter(x=>x.name==='computer_action');assert.equal(actions.length,1);assert.equal(actions[0].args.kind,'key');
});

test('typed search advances to Enter with focused state and within-run action feedback',async()=>{
 const f=fixture([]);let state={...f.state,controls:[{...f.state.controls[0],role:'AXTextField',label:'Search',focused:false}],focusedControl:{ref:'other',role:'AXButton',label:'Other'}};let submitted=false;const events:any[]=[];
 f.deps.progress=e=>events.push(e);
 f.deps.call=async(name,args)=>{f.calls.push({name,args});if(name==='computer_acquire')return {lease_token:'l'};if(name==='computer_observe')return structuredClone(state);if(name==='computer_action'){if(args.kind==='type'){state.controls[0].value=String(args.text);state.controls[0].focused=true;state.focusedControl={ref:'c1',role:'AXTextField',label:'Search'};}if(args.kind==='key'){assert.equal(args.key,'enter');assert.equal(state.controls[0].focused,true);submitted=true;}return {state:'completed'};}return {};};
 f.deps.evaluate=async req=>{const input=req.state as any;let choice='DONE';if(!state.controls[0].value)choice='type:c1';else if(!submitted){assert.equal(input.desktop.focusedControl.ref,'c1');assert.equal(input.recentActions.at(-1).action,'type');assert.equal(input.recentActions.at(-1).changed,true);assert.equal(Object.hasOwn(req.questions.action.criteria,'type:c1'),false);choice='key:enter';}return {answers:{action:{choice,confidence:1,probabilities:Object.fromEntries(Object.keys(req.questions.action.criteria).map(k=>[k,k===choice?1:0]))}}};};
 f.deps.verify=async()=>submitted;
 const r=await runComputerUse({goal:'Search for milk'},f.deps,new AbortController().signal);
 assert.equal(r.status,'succeeded');assert.equal(r.steps,2);assert.equal(r.evaluations,3);
 assert.ok(events.some(e=>e.phase==='thinking'));assert.ok(events.some(e=>e.phase==='acted'&&e.key==='enter'&&e.outcome==='completed'));assert.ok(events.some(e=>e.phase==='observed'&&e.changed));
 assert.equal(JSON.stringify(r.trace).includes('milk'),false);assert.equal(JSON.stringify(r.trace).includes('Search'),false);
});
test('unchanged successful dispatches are observed and not offered endlessly',async()=>{
 const f=fixture([]);f.state.controls=[{ref:'c1',label:'Continue',role:'AXButton',actions:['press'] as any,value:''}];let decision=0;
 f.deps.evaluate=async req=>{const c=req.questions.action.criteria;decision++;if(decision>2)assert.equal(Object.hasOwn(c,'press:c1'),false);const choice=decision<=2?'press:c1':'BLOCKED';return {answers:{action:{choice,confidence:1,probabilities:Object.fromEntries(Object.keys(c).map(k=>[k,k===choice?1:0]))}}};};
 const r=await runComputerUse({goal:'Continue'},f.deps,new AbortController().signal);assert.equal(r.steps,2);assert.equal(r.reason,'NO_SUPPORTED_ACTION');assert.equal(r.trace.events.filter(e=>e.phase==='observed'&&e.changed===false).length,2);
});
test('trace sink errors cannot turn a confirmed action into an unknown mutation',async()=>{
 const f=fixture(['type:c1','DONE']);f.deps.progress=()=>{throw Error('sink offline');};const r=await runComputerUse({goal:'Draft a note'},f.deps,new AbortController().signal);assert.equal(r.status,'needs_verification');assert.equal(r.steps,1);assert.equal(r.operationId,undefined);
});
