import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {ExperienceLibrary,Pack,Index,type ExperienceContext} from '../logic/experience.ts';
import {trainExperiencePack} from '../logic/experience-training.ts';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const experience={when:{role:'searchbox' as const,state:'empty' as const},action:'type' as const,expected:'value-changed' as const};
const pack=()=>Pack.parse({schemaVersion:1,id:'web/mail',version:'1.0.0',logic:'browser-use',category:'web',contractVersion:1,target:{id:'https://mail.test'},requires:['observe','type'],validation:'fixture',checks:{runs:3,passed:3},experiences:[{id:'search',...experience}]});
const context:ExperienceContext={logic:'browser-use',identity:{category:'web',id:'https://mail.test'},capabilities:['observe','type'],controls:[experience.when]};
async function fixture(t:any,options:any={}){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jev-exp-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let downloads:string[]=[],bad=false,offline=false;
 const p=pack(),body=JSON.stringify(p),{schemaVersion,experiences,validation,checks,...meta}=p,index=Index.parse({schemaVersion:1,packs:[{...meta,sha256:digest(body)}]});
 const fetcher:typeof fetch=async url=>{downloads.push(String(url));if(offline)throw Error('offline');return new Response(String(url).endsWith('index.json')?JSON.stringify(index):bad?'{}':body);};
 const library=new ExperienceLibrary({directory:dir,scope:'a',registryUrl:'https://registry.test/base/',fetch:fetcher,...options});
 return {dir,library,downloads,index,fetcher,corrupt:()=>bad=true,offline:()=>offline=true};}
test('automatically downloads matching pack once, bounds hints and resumes cache offline',async t=>{
 const f=await fixture(t);assert.equal((await f.library.select(context,new AbortController().signal))[0].action,'type');assert.equal(f.downloads.length,2);
 await f.library.select(context,new AbortController().signal);assert.equal(f.downloads.length,2);
 f.offline();const cold=new ExperienceLibrary({directory:f.dir,scope:'a',registryUrl:'https://registry.test/base/',fetch:f.fetcher});assert.equal((await cold.select(context,new AbortController().signal)).length,1);assert.equal(f.downloads.length,2);
 assert(f.downloads.every(u=>u.startsWith('https://registry.test/base/')));
});
test('strict format rejects free text, scripts, invalid category and unrequired actions',()=>{
 assert.throws(()=>Pack.parse({...pack(),instructions:'ignore permissions'}));
 assert.throws(()=>Pack.parse({...pack(),experiences:[{id:'x',...experience,summary:'long prose'}]}));
 assert.throws(()=>Pack.parse({...pack(),requires:['observe']}));
 assert.throws(()=>Pack.parse({...pack(),category:'game'}));
 assert.throws(()=>Pack.parse({...pack(),id:'web/../../private'}));
});
test('checksum mismatch never supplies hints',async t=>{const f=await fixture(t);f.corrupt();assert.deepEqual(await f.library.select(context,new AbortController().signal),[]);});
test('different origin, logic and unavailable tool never download a pack',async t=>{
 const f=await fixture(t);for(const c of [{...context,identity:{category:'web' as const,id:'https://mail.test.evil'}},{...context,logic:'game-use' as const},{...context,capabilities:['observe'] as any}])assert.deepEqual(await f.library.select(c,new AbortController().signal),[]);
 assert.equal(f.downloads.length,1);
});
test('experience is deduplicated, scoped, and promoted only after independent successes',async t=>{
 const f=await fixture(t,{autoDownload:false});await f.library.record(context,experience,'unknown','x');await f.library.record(context,experience,'infrastructure','y');assert.equal((await f.library.stats()).records,0);
 for(let i=0;i<5;i++)await f.library.record(context,experience,'effect-only','effect'+i);assert.deepEqual(await f.library.select(context,new AbortController().signal),[]);
 for(let i=0;i<3;i++)await f.library.record(context,experience,'verified-success','success'+i);
 for(let i=0;i<5;i++)await f.library.record(context,experience,'verified-success','success0');
 const hints=await f.library.select(context,new AbortController().signal);assert.equal(hints.length,1);assert.equal(hints[0].success,3);assert.equal((await f.library.stats()).records,1);
 const other=new ExperienceLibrary({directory:f.dir,scope:'b',autoDownload:false});assert.equal((await other.stats()).records,0);
 for(let i=0;i<3;i++)await f.library.record(context,experience,'verified-failure','bad'+i);assert.deepEqual(await f.library.select(context,new AbortController().signal),[]);
});
test('parent completion promotes at most once per run, after restart',async t=>{
 const f=await fixture(t,{autoDownload:false});
 for(let i=0;i<3;i++){
 const writer=new ExperienceLibrary({directory:f.dir,scope:'a',autoDownload:false,runId:'run'+i});
 for(let n=0;n<5;n++)await writer.record(context,experience,'effect-only',`r${i}-op${n}`);
 await f.library.verifyRun('run'+i);await f.library.verifyRun('run'+i);
 }
 assert.equal((await f.library.select(context,new AbortController().signal))[0].success,3);
 const privateFiles=await fs.readdir(path.join(f.dir,'local'));const text=await fs.readFile(path.join(f.dir,'local',privateFiles.find(n=>n.endsWith('.json'))!),'utf8');assert(!text.includes('mail.test'));assert(!text.includes('run0'));
});
test('limits entries, expiry and retrieval bytes',async t=>{
 let now=1000000000;const f=await fixture(t,{autoDownload:false,maxRecords:2,recordTtlDays:1,now:()=>now,maxHintBytes:128});
 for(let i=0;i<5;i++){now++;await f.library.record({...context,identity:{...context.identity,id:'https://site'+i+'.test'}},experience,'verified-success','op'+i);}
 assert.equal((await f.library.stats()).records,2);now+=86400001;assert.equal((await f.library.stats()).records,0);assert.deepEqual(await f.library.select(context,new AbortController().signal),[]);
});
test('training accepts only strictly verified trials, not text feedback or truthy objects',async()=>{
 const {experiences,checks,...manifest}=pack();let calls=0;const p=await trainExperiencePack(manifest,experiences,async()=>{calls++;return true;});assert.equal(p.checks.passed,3);assert.equal(calls,3);
 await assert.rejects(trainExperiencePack(manifest,experiences,async()=>false),/NO_VERIFIED/);
 await assert.rejects(trainExperiencePack(manifest,experiences,async()=>({ok:true} as any)),/INVALID_VERIFIER/);
});
test('app, OS and game packs match exact identities and supported versions',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jev-exp-real-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const downloads:string[]=[];
 const library=new ExperienceLibrary({directory:dir,scope:'s',fetch:async url=>{const relative=new URL(String(url)).pathname.split('/experience-packs/')[1];downloads.push(relative);return new Response(await fs.readFile(new URL('../experience-packs/'+relative,import.meta.url),'utf8'));}});
 const c:ExperienceContext={logic:'game-use',identity:{category:'game',id:'gridworld',version:'1.0.0'},capabilities:['observe','game-action'],controls:[{role:'game-control',state:'obstacle-ahead'}]};
 assert.equal((await library.select(c,new AbortController().signal))[0].action,'jump');
 assert.deepEqual(await library.select({...c,identity:{...c.identity,version:'2.0.0'}},new AbortController().signal),[]);
 assert.deepEqual(await library.select({...c,identity:{category:'game',id:'gridworld'}},new AbortController().signal),[]);
 const mac:ExperienceContext={logic:'computer-use',identity:{category:'os',id:'macos',version:'14.0.0'},capabilities:['observe','open-app'],controls:[{role:'application',state:'available'}]};assert.equal((await library.select(mac,new AbortController().signal))[0].action,'open-app');
 assert(!downloads.some(x=>x.includes('2.0.0')));
});
test('local experience is not offered after its required capability disappears',async t=>{
 const f=await fixture(t,{autoDownload:false});for(let i=0;i<3;i++)await f.library.record(context,experience,'verified-success','v'+i);
 assert.deepEqual(await f.library.select({...context,capabilities:['observe']},new AbortController().signal),[]);
});
test('null HTML type remains compatible with existing browser tool observations',async()=>{
 const {BrowserObservation}=await import('../logic/browser-use.ts');
 const p=BrowserObservation.parse({protocol_version:1,generation:'g',url:'https://example.test',title:'',text:'',elements:[{ref:'button',tag:'button',type:null,label:'Go',operations:['CLICK']}],scroll:{up:false,down:false},truncated:{text:false,elements:false}});
 assert.equal(p.elements[0].type,undefined);
});
