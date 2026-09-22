import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Pack,Index,Experience,Pattern,Logic,Context,actionCapability,compatible,compareVersions,type ExperienceContext,type ExperienceHooks,type ExperienceHint,type ExperienceRecord} from './experience-schema.js';
export {Pack,Index,Experience,compatible} from './experience-schema.js';
export type {ExperienceContext,ExperienceHooks,ExperienceHint,ExperienceRecord} from './experience-schema.js';
export const DEFAULT_EXPERIENCE_REGISTRY='https://raw.githubusercontent.com/0xMaxMa/jev-loop/main/experience-packs/';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const stable=(v:unknown):string=>JSON.stringify(v);
const Options=z.object({directory:z.string().refine(path.isAbsolute),scope:z.string().min(1).max(500),registryUrl:z.string().default(DEFAULT_EXPERIENCE_REGISTRY),enabled:z.boolean().default(true),autoDownload:z.boolean().default(true),maxRecords:z.number().int().min(1).max(2000).default(500),maxHints:z.number().int().min(1).max(10).default(5),maxHintBytes:z.number().int().min(128).max(8192).default(2048),maxPacks:z.number().int().min(1).max(200).default(50),recordTtlDays:z.number().int().min(1).max(365).default(90),downloadTimeoutMs:z.number().int().min(10).max(10000).default(1500),runId:z.string().min(1).max(200).optional(),indexTtlMs:z.number().int().min(0).max(86400000).default(3600000)}).strict();
export const ExperienceConfig=Options.omit({directory:true,scope:true,runId:true});
export type ExperienceConfigInput=z.input<typeof ExperienceConfig>;
const LocalRecord=z.object({key:z.string(),contextKey:z.string(),logic:Logic,experience:Experience.omit({id:true}),success:z.number().int().nonnegative().max(1000000),failure:z.number().int().nonnegative().max(1000000),effects:z.number().int().nonnegative().max(1000000),updatedAt:z.number(),evidence:z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(32)}).strict();
const LibraryFile=z.object({version:z.literal(1),records:z.array(LocalRecord).max(2000),seen:z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(2000),pending:z.array(z.object({run:z.string(),key:z.string()})).max(2000).default([])}).strict();
export interface ExperienceOptions {directory:string;scope:string;registryUrl?:string;enabled?:boolean;autoDownload?:boolean;maxRecords?:number;maxHints?:number;maxHintBytes?:number;maxPacks?:number;recordTtlDays?:number;downloadTimeoutMs?:number;indexTtlMs?:number;runId?:string;fetch?:typeof fetch;now?:()=>number;onEvent?:(event:{type:string;packId?:string;code?:string})=>void}
/** Structured, scoped experience. No page text, typed values, code or arbitrary downloads. */
export class ExperienceLibrary implements ExperienceHooks {
 private options:z.infer<typeof Options>;private root:string;private local:string;private indexPath:string;private base:URL;private fetch:typeof fetch;private now:()=>number;private event:NonNullable<ExperienceOptions['onEvent']>;
 private queue:Promise<unknown>=Promise.resolve();private index?:{at:number;value:z.infer<typeof Index>};private loading?:Promise<z.infer<typeof Index>>;
 constructor(raw:ExperienceOptions){const {fetch:fetcher,now,onEvent,...options}=raw;this.options=Options.parse(options);this.base=new URL(this.options.registryUrl.endsWith('/')?this.options.registryUrl:this.options.registryUrl+'/');
 if(this.base.username||this.base.password||this.base.search||this.base.hash||(this.base.protocol!=='https:'&&!(this.base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(this.base.hostname))))throw Error('INVALID_REGISTRY_URL');
 this.root=path.join(this.options.directory,'packs',hash(this.base.href));this.local=path.join(this.options.directory,'local',hash(this.options.scope)+'.json');this.indexPath=path.join(this.root,'index.json');this.fetch=fetcher??globalThis.fetch;this.now=now??Date.now;this.event=onEvent??(()=>{});}
 private emit(type:string,packId?:string,code?:string){try{this.event({type,...(packId?{packId}:{}),...(code?{code}:{})});}catch{/* telemetry does not decide actions */}}
 private async read(p:string,limit:number){const stat=await fs.stat(p);if(stat.size>limit)throw Error('CACHE_TOO_LARGE');return fs.readFile(p,'utf8');}
 private async atomic(p:string,value:string){await fs.mkdir(path.dirname(p),{recursive:true,mode:0o700});const tmp=p+'.'+randomUUID()+'.tmp';let fd;
 try{fd=await fs.open(tmp,'wx',0o600);await fd.writeFile(value);await fd.sync();await fd.close();fd=undefined;await fs.rename(tmp,p);}finally{await fd?.close();await fs.rm(tmp,{force:true});}}
 private async download(relative:string,limit:number,signal:AbortSignal){const url=new URL(relative,this.base);if(url.origin!==this.base.origin||!url.pathname.startsWith(this.base.pathname))throw Error('REGISTRY_PATH_DENIED');
 const response=await this.fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(this.options.downloadTimeoutMs)]),redirect:'error',headers:{accept:'application/json'}});
 if(!response.ok){await response.body?.cancel();throw Error('REGISTRY_UNAVAILABLE');}if(!response.body)throw Error('EMPTY_REGISTRY_RESPONSE');const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>limit)throw Error('REGISTRY_RESPONSE_TOO_LARGE');chunks.push(r.value);}}finally{await reader.cancel();}return Buffer.concat(chunks).toString('utf8');}
 private async registry(signal:AbortSignal){
 if(!this.index){try{const cached=JSON.parse(await this.read(this.indexPath,1048576));this.index={at:cached.at,value:Index.parse(cached.value)};}catch{/* cold or invalid cache */}}
 if(this.index&&this.now()-this.index.at<this.options.indexTtlMs)return this.index.value;
 if(!this.options.autoDownload)return this.index?.value??{schemaVersion:1 as const,packs:[]};
 if(!this.loading)this.loading=(async()=>{try{const value=Index.parse(JSON.parse(await this.download('index.json',1048576,signal)));this.index={at:this.now(),value};await this.atomic(this.indexPath,stable(this.index));return value;}catch{this.emit('unavailable',undefined,'REGISTRY_UNAVAILABLE');return this.index?.value??{schemaVersion:1 as const,packs:[]};}finally{this.loading=undefined;}})();
 return this.loading;
 }
 private async pack(entry:z.infer<typeof Index>['packs'][number],signal:AbortSignal){const filename=entry.sha256+'.json',p=path.join(this.root,filename);let text:string;
 try{text=await this.read(p,65536);if(hash(text)!==entry.sha256)throw Error('CHECKSUM');}catch{
  if(!this.options.autoDownload)return;
  text=await this.download(`packs/${entry.id}/${entry.version}.json`,65536,signal);if(hash(text)!==entry.sha256)throw Error('PACK_CHECKSUM_MISMATCH');
 }
 const pack=Pack.parse(JSON.parse(text));const {experiences:_,validation:__,schemaVersion:___,checks:_____,...meta}=pack;
 const {sha256:____,...indexed}=entry;if(stable(meta)!==stable(indexed)){
  // Object key order is not part of the manifest contract.
  for(const key of Object.keys(indexed))if(stable((meta as any)[key])!==stable((indexed as any)[key]))throw Error('PACK_METADATA_MISMATCH');
 }
 await this.atomic(p,text);await this.prunePacks();this.emit('ready',pack.id);return pack;
 }
 private async prunePacks(){const entries=(await fs.readdir(this.root)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));if(entries.length<=this.options.maxPacks)return;const times=await Promise.all(entries.map(async n=>({n,time:(await fs.stat(path.join(this.root,n))).mtimeMs})));times.sort((a,b)=>b.time-a.time);await Promise.all(times.slice(this.options.maxPacks).map(x=>fs.rm(path.join(this.root,x.n),{force:true})));}
 private contextKey(c:ExperienceContext){return hash(stable({logic:c.logic,category:c.identity.category,id:c.identity.id,version:c.identity.version??'',path:c.identity.path??''}));}
 private async localFile(){try{return LibraryFile.parse(JSON.parse(await this.read(this.local,2097152)));}catch{return {version:1 as const,records:[],seen:[],pending:[]};}}
 private matches(when:z.infer<typeof Pattern>,context:ExperienceContext){return context.controls.some(c=>c.role===when.role&&(when.state==='any'||c.state===when.state));}
 async select(context:ExperienceContext,signal:AbortSignal):Promise<ExperienceHint[]>{if(!this.options.enabled||signal.aborted)return [];
 try{
 context=Context.parse(context);
 const index=await this.registry(signal),matched=index.packs.filter(p=>compatible(p,context)).sort((a,b)=>compareVersions(b.version,a.version));
 const latest=[...new Map(matched.map(p=>p.id).map(id=>[id,matched.find(p=>p.id===id)!])).values()].slice(0,3);
 const hints:ExperienceHint[]=[];
 for(const entry of latest){if(signal.aborted)break;try{const pack=await this.pack(entry,signal);if(pack)for(const e of pack.experiences)if(this.matches(e.when,context))hints.push({when:e.when,action:e.action,expected:e.expected,source:'pack',validation:pack.validation,success:0,failure:0});}catch{this.emit('rejected',entry.id,'PACK_INVALID');}}
 const local=await this.localFile(),contextKey=this.contextKey(context),cutoff=this.now()-this.options.recordTtlDays*86400000;
 // Only independently verified successes promote a local experience.
 for(const r of local.records)if(r.contextKey===contextKey&&r.updatedAt>=cutoff&&r.success>=3&&r.success>r.failure*2&&this.matches(r.experience.when,context))hints.push({...r.experience,source:'local',validation:'live',success:r.success,failure:r.failure});
 // A locally observed failure suppresses the same pack recipe, without rewriting it.
 const failures=local.records.filter(r=>r.contextKey===contextKey&&r.updatedAt>=cutoff&&r.failure>=3&&r.failure>=r.success);
 const unique=new Map<string,ExperienceHint>();
 for(const h of hints.filter(h=>!actionCapability[h.action]||context.capabilities.includes(actionCapability[h.action] as any)).sort((a,b)=>(b.success-b.failure)-(a.success-a.failure))){const k=stable([h.when,h.action,h.expected]);if(failures.some(r=>stable([r.experience.when,r.experience.action,r.experience.expected])===k))continue;if(!unique.has(k))unique.set(k,h);}
 const selected:ExperienceHint[]=[];for(const hint of unique.values()){if(selected.length>=this.options.maxHints)break;if(Buffer.byteLength(stable([...selected,hint]))<=this.options.maxHintBytes)selected.push(hint);}
 return selected;
 }catch{this.emit('unavailable',undefined,'EXPERIENCE_UNAVAILABLE');return [];}}
 async record(context:ExperienceContext,raw:Omit<ExperienceRecord,'id'>,outcome:'verified-success'|'verified-failure'|'effect-only'|'unknown'|'infrastructure',evidenceId:string){
 if(!this.options.enabled||['unknown','infrastructure'].includes(outcome))return;
 context=Context.parse(context);z.enum(['verified-success','verified-failure','effect-only','unknown','infrastructure']).parse(outcome);
 const experience=Experience.omit({id:true}).parse(raw);if(typeof evidenceId!=='string'||!evidenceId||evidenceId.length>200)throw Error('INVALID_EVIDENCE');
 const contextKey=this.contextKey(context),key=hash(stable({contextKey,experience})),evidence=hash(evidenceId);
 await this.mutate(async file=>{
 if(file.seen.includes(evidence))return;
 let r=file.records.find(r=>r.key===key);if(!r){r={key,contextKey,logic:context.logic,experience,success:0,failure:0,effects:0,updatedAt:this.now(),evidence:[]};file.records.push(r);}
 if(outcome==='verified-success')r.success=Math.min(1000000,r.success+1);else if(outcome==='verified-failure')r.failure=Math.min(1000000,r.failure+1);else r.effects=Math.min(1000000,r.effects+1);
 r.updatedAt=this.now();r.evidence=[...r.evidence,evidence].slice(-32);file.seen=[...file.seen,evidence].slice(-2000);
 if(outcome==='effect-only'&&this.options.runId){const run=hash(this.options.runId);if(!file.pending.some(p=>p.run===run&&p.key===key))file.pending.push({run,key});}
 });
 }
 /** Call only after the host has committed independent, scoped completion evidence. */
 async verifyRun(runId:string){if(!this.options.enabled)return;z.string().min(1).max(200).parse(runId);const run=hash(runId);
 await this.mutate(async file=>{
  for(const p of file.pending.filter(p=>p.run===run)){const r=file.records.find(r=>r.key===p.key),evidence=hash('verified:'+run+':'+p.key);if(r&&!file.seen.includes(evidence)){r.success=Math.min(1000000,r.success+1);r.updatedAt=this.now();file.seen.push(evidence);}}
  file.pending=file.pending.filter(p=>p.run!==run);
 });}
 private async mutate(fn:(file:z.infer<typeof LibraryFile>)=>Promise<void>){
 const task=this.queue.then(async()=>{
 await fs.mkdir(path.dirname(this.local),{recursive:true,mode:0o700});const lock=this.local+'.lock';let locked=false;
 for(let i=0;i<10;i++){try{await fs.mkdir(lock);locked=true;await fs.writeFile(path.join(lock,'owner'),String(process.pid));break;}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
 try{const pid=Number(await fs.readFile(path.join(lock,'owner'),'utf8'));if(Number.isInteger(pid)&&pid>0){try{process.kill(pid,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')await fs.rm(lock,{recursive:true,force:true});}}}catch{try{if(Date.now()-(await fs.stat(lock)).mtimeMs>30000)await fs.rm(lock,{recursive:true,force:true});}catch{/* another writer removed the lock */}}
 await new Promise(r=>setTimeout(r,10));}}
 if(!locked){this.emit('unavailable',undefined,'EXPERIENCE_BUSY');return;}
 try{
 const file=await this.localFile(),cutoff=this.now()-this.options.recordTtlDays*86400000;file.records=file.records.filter(r=>r.updatedAt>=cutoff);
 await fn(file);file.records.sort((a,b)=>b.updatedAt-a.updatedAt);file.records=file.records.slice(0,this.options.maxRecords);let bytes=0;file.records=file.records.filter(r=>(bytes+=Buffer.byteLength(stable(r))+1)<=1500000);file.seen=file.seen.slice(-2000);file.pending=file.pending.filter(p=>file.records.some(r=>r.key===p.key)).slice(-2000);
 await this.atomic(this.local,stable(file));
 }finally{await fs.rm(lock,{recursive:true,force:true});}
 });this.queue=task.catch(()=>{});await task;
 }
 async stats(){const file=await this.localFile();const valid=file.records.filter(r=>r.updatedAt>=this.now()-this.options.recordTtlDays*86400000);return {records:valid.length,verifiedSuccesses:valid.reduce((n,r)=>n+r.success,0),verifiedFailures:valid.reduce((n,r)=>n+r.failure,0),observedEffects:valid.reduce((n,r)=>n+r.effects,0),active:valid.filter(r=>r.success>=3&&r.success>r.failure*2).length,scopeHash:hash(this.options.scope)};}
}
