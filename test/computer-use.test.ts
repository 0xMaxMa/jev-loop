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

test('shared interruption cancels reasoning but preserves an unknown desktop action',async()=>{
 for(const inFlight of [false,true]){
  const f=fixture(['type:c1']),control=new AbortController(),call=f.deps.call;f.deps.interruptSignal=control.signal;
  if(inFlight)f.deps.call=async(n,a,s)=>{if(n==='computer_action'){control.abort();return {state:'unknown'};}return call(n,a,s);};
  else f.deps.thinking=async()=>{control.abort();return new Promise(()=>{});};
  const r=await runComputerUse({goal:'Type note'},f.deps,new AbortController().signal);
  assert.equal(r.reason,inFlight?'OUTCOME_UNKNOWN':'REVISION_SUPERSEDED');
  if(!inFlight)assert(!f.calls.some(c=>c.name==='computer_action'));
 }
});
test('speech interrupts verification without waiting for the model or reporting stale success',async()=>{
 const f=fixture(['DONE']),control=new AbortController();f.deps.interruptSignal=control.signal;
 f.deps.verify=async(_s,_g,signal)=>{control.abort();assert.equal(signal.aborted,true);return new Promise(()=>{});};
 const r=await runComputerUse({goal:'Inspect note'},f.deps,new AbortController().signal);
 assert.equal(r.reason,'REVISION_SUPERSEDED');assert.equal(r.status,'cancelled');assert(f.calls.some(c=>c.name==='computer_release'));
});
test('speech after the durable fence clears only an undispatched operation',async()=>{
 const f=fixture(['type:c1']),control=new AbortController();f.deps.interruptSignal=control.signal;let operation='';
 f.deps.beforeMutation=id=>{operation=id;control.abort();};
 const r=await runComputerUse({goal:'Write note'},f.deps,new AbortController().signal);
 assert.equal(r.reason,'REVISION_SUPERSEDED');assert(!f.calls.some(c=>c.name==='computer_action'));
 assert(r.trace.events.some(e=>e.operationId===operation&&e.phase==='acted'&&e.outcome==='not_executed'));
});
test('speech during a confirmed desktop mutation waits for its result and never aborts the mutation',async()=>{
 const f=fixture(['type:c1']),control=new AbortController(),call=f.deps.call;f.deps.interruptSignal=control.signal;
 f.deps.call=async(n,a,s)=>{if(n==='computer_action'){control.abort();assert.equal(s.aborted,false);await new Promise(r=>setTimeout(r,10));return {state:'completed'};}return call(n,a,s);};
 const r=await runComputerUse({goal:'Write note'},f.deps,new AbortController().signal);
 assert.equal(r.reason,'REVISION_SUPERSEDED');assert.equal(r.steps,1);assert.equal(r.operationId,undefined);
 assert.equal(f.calls.filter(c=>c.name==='computer_release').length,1);
});

test('lost action reply reads the matching receipt and continues from observation without replay',async()=>{
 const f=fixture(['key:enter','DONE']),call=f.deps.call;let actions=0,reads=0,op='';
 f.deps.call=async(name,args,s)=>{
  if(name==='computer_action'){actions++;op=String(args.operation_id);throw Error('TRANSPORT_LOST');}
  if(name==='computer_operation_status'){reads++;assert.deepEqual(args,{operation_id:op});return {operation_id:op,state:'completed'};}
  return call(name,args,s);
 };
 const r=await runComputerUse({goal:'Search'},f.deps,new AbortController().signal);
 assert.equal(actions,1);assert.equal(reads,1);assert.equal(r.steps,1);assert.equal(r.operationId,undefined);
 assert(r.trace.events.some(e=>e.phase==='reconciling'));assert.equal(r.status,'needs_verification');
});
test('wrong operation receipt cannot clear the mutation fence',async()=>{
 const f=fixture(['key:enter']),call=f.deps.call;let actions=0;
 f.deps.call=async(name,args,s)=>name==='computer_action'?(actions++,{state:'unknown'}):name==='computer_operation_status'?{operation_id:'wrong',state:'completed'}:call(name,args,s);
 const r=await runComputerUse({goal:'Search'},f.deps,new AbortController().signal);
 assert.equal(actions,1);assert.equal(r.status,'needs_reconciliation');assert(r.operationId);
});
test('acquisition recovery preserves the old operation and never starts inference or actions',async()=>{
 const f=fixture(['key:enter']),operation='11111111-1111-4111-8111-111111111111';
 f.deps.call=async()=>({recovery_required:true,operation_id:operation});f.deps.evaluate=async()=>{throw Error('must not infer');};
 const r=await runComputerUse({goal:'Search'},f.deps,new AbortController().signal);
 assert.equal(r.operationId,operation);assert.equal(r.status,'needs_reconciliation');assert.equal(r.evaluations,0);assert.equal(r.steps,0);
});
test('prepared field values bypass Thinking only for a unique current app/field match',async()=>{
 for(const application of ['com.apple.Notes','com.other.App']){
  const f=fixture(['type:c1','DONE']);let calls=0;f.deps.thinking=async()=>{calls++;return {text:'fallback'};};
  await runComputerUse({goal:'Create a note',preparedInputs:[{application,label:'Note',text:'prepared'}]},f.deps,new AbortController().signal);
  assert.equal(calls,application==='com.apple.Notes'?0:1);
  assert.equal(f.calls.find(x=>x.name==='computer_action').args.text,application==='com.apple.Notes'?'prepared':'fallback');
 }
});
test('ambiguous prepared fields do not bypass Thinking',async()=>{
 const f=fixture(['type:c1','DONE']);f.state.controls.push({...f.state.controls[0],ref:'c2'});let calls=0;f.deps.thinking=async()=>{calls++;return {text:'fallback'};};
 await runComputerUse({goal:'Create a note',preparedInputs:[{application:'com.apple.Notes',label:'Note',text:'prepared'}]},f.deps,new AbortController().signal);assert.equal(calls,1);
});
test('completion captures visual evidence for the parent without requiring an inference model',async()=>{
 const f=fixture(['DONE']);(f.state as any).screenshotAvailable=true;let images=0;
 f.deps.snapshot=async()=>{images++;};delete f.deps.thinking;
 const result=await runComputerUse({goal:'Inspect'},f.deps,new AbortController().signal);assert.equal(result.status,'needs_verification');assert.equal(images,1);
});
test('missing field values attach a snapshot before asking the parent without Thinking',async()=>{
 const f=fixture(['type:c1']);(f.state as any).screenshotAvailable=true;delete f.deps.thinking;let captures=0;f.deps.snapshot=async()=>{captures++;};
 const result=await runComputerUse({goal:'Write a note'},f.deps,new AbortController().signal);assert.equal(result.status,'needs_input');assert.equal(captures,1);assert.equal(f.calls.filter(x=>x.name==='computer_action').length,0);
});

test('three blocked Jev decisions hand over once; direct actions never ask Jev again',async()=>{
 const f=fixture(['BLOCKED','BLOCKED','BLOCKED']);let decisions=0,reads=0;
 Object.assign(f.state,{screenshotAvailable:true});
 f.deps.snapshot=async()=>{};
 f.deps.decideAction=async req=>{decisions++;assert.equal(req.goal,'Search milk');return decisions===1?{action:'type:c1',text:'milk'}:{action:'DONE',text:null};};
 const call=f.deps.call;f.deps.call=async(n,a,s)=>{const r=await call(n,a,s);if(n==='computer_observe')return {...f.state,generation:'fresh-'+(++reads)};if(n==='computer_action'){assert.equal(a.generation,'fresh-'+reads);f.state.controls[0].value='milk';}return r;};
 const r=await runComputerUse({goal:'Search milk'},f.deps,new AbortController().signal);
 assert.equal(r.evaluations,3);assert.equal(decisions,2);assert.equal(r.steps,1);assert.equal(r.status,'needs_verification');
 assert.equal(f.calls.filter(c=>c.name==='computer_action').length,1);
 assert.equal(r.trace.events.filter(e=>e.reason==='THINKING_TAKEOVER').length,1);
});
test('three progressing actions do not trigger Thinking takeover',async()=>{
 const f=fixture(['key:down','key:down','key:down','DONE']);let count=0;const call=f.deps.call;
 f.deps.call=async(n,a,s)=>{if(n==='computer_action')f.state.controls[0].value=String(++count);return call(n,a,s);};
 f.deps.decideAction=async()=>{throw Error('unexpected takeover');};
 const r=await runComputerUse({goal:'Move down'},f.deps,new AbortController().signal);assert.equal(r.steps,3);assert.equal(r.status,'needs_verification');assert(!r.trace.events.some(e=>e.reason==='THINKING_TAKEOVER'));
});
test('unknown result never hands over or replays even after two no-effect actions',async()=>{
 const f=fixture(['key:down','key:down','key:up']);let actions=0;const call=f.deps.call;
 f.deps.call=async(n,a,s)=>n==='computer_action'&&++actions===3?{state:'unknown'}:call(n,a,s);
 f.deps.decideAction=async()=>{throw Error('must not run');};
 const r=await runComputerUse({goal:'Move'},f.deps,new AbortController().signal);assert.equal(r.status,'needs_reconciliation');assert.equal(f.calls.filter(c=>c.name==='computer_action').length,2);
});
test('Thinking takeover is bounded and returns waiting input, not a new Jev loop',async()=>{
 const f=fixture(['BLOCKED','BLOCKED','BLOCKED']);let calls=0;
 f.deps.decideAction=async()=>{calls++;return {action:'WAIT',text:null};};
 const r=await runComputerUse({goal:'Continue'},f.deps,new AbortController().signal);assert.equal(r.reason,'THINKING_WAITING_INPUT');assert.equal(r.status,'needs_input');assert.equal(calls,3);assert.equal(r.evaluations,3);
});
test('new navigation actions are offered only when native observation advertises them',async()=>{
 const f=fixture(['scroll:down','navigate:back','DONE']);Object.assign(f.state,{supportedActions:['scroll:down','navigate:back']});
 const r=await runComputerUse({goal:'Scroll then back'},f.deps,new AbortController().signal);assert.equal(r.steps,2);
 assert.deepEqual(f.calls.filter(c=>c.name==='computer_action').map(c=>[c.args.kind,c.args.direction]),[['scroll','down'],['navigate','back']]);
});
test('new command during direct Thinking discards its old action',async()=>{
 const f=fixture(['BLOCKED','BLOCKED','BLOCKED','DONE']);f.deps.decideAction=async()=>{f.update('Inspect only');return {action:'type:c1',text:'old'};};
 const r=await runComputerUse({goal:'Type'},f.deps,new AbortController().signal);assert.equal(r.revision,2);assert.equal(r.steps,0);
});
