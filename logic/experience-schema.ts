import {z} from 'zod';
export const Logic=z.enum(['browser-use','computer-use','game-use']);
export const Category=z.enum(['web','app','os','game']);
const Version=z.string().regex(/^\d{1,5}\.\d{1,5}\.\d{1,5}$/);
const Slug=z.string().regex(/^[a-z0-9][a-z0-9.-]{0,79}$/);
export const PackId=z.string().regex(/^(web|app|os|game)\/[a-z0-9][a-z0-9.-]{0,79}$/);
export const Capability=z.enum(['observe','click','type','select','keypress','scroll','open-app','press','game-action']);
export const Role=z.enum(['input','searchbox','combobox','button','link','select','menu','text-area','checkbox','radio','window','application','game-control','viewport']);
export const State=z.enum(['any','empty','populated','expanded','collapsed','selected','unselected','available','obstacle-ahead','enemy-near','low-health','item-near','goal-visible']);
export const Action=z.enum(['click','type','select','press','enter','tab','escape','scroll-up','scroll-down','open-app','game-action','move-left','move-right','jump','interact','attack','defend','wait']);
export const Effect=z.enum(['value-changed','selection-changed','expanded-changed','application-changed','state-changed','goal-verified','position-changed','health-preserved','item-collected']);
export const Pattern=z.object({role:Role,state:State}).strict();
export const Experience=z.object({id:Slug,when:Pattern,action:Action,expected:Effect}).strict();
const Target=z.object({id:z.string().min(1).max(200),pathPrefixes:z.array(z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).max(120)).max(10).optional(),minVersion:Version.optional(),maxVersion:Version.optional()}).strict();
export const actionCapability:Record<string,string>={click:'click',type:'type',select:'select',press:'press',enter:'keypress',tab:'keypress',escape:'keypress','scroll-up':'scroll','scroll-down':'scroll','open-app':'open-app','game-action':'game-action','move-left':'game-action','move-right':'game-action',jump:'game-action',interact:'game-action',attack:'game-action',defend:'game-action'};
export const Pack=z.object({schemaVersion:z.literal(1),id:PackId,version:Version,logic:Logic,contractVersion:z.literal(1),category:Category,target:Target,requires:z.array(Capability).min(1).max(12),validation:z.enum(['fixture','live']),checks:z.object({runs:z.number().int().min(3),passed:z.number().int().min(3)}).strict(),experiences:z.array(Experience).min(1).max(100)}).strict().superRefine((p,c)=>{
 if(p.checks.passed>p.checks.runs)c.addIssue({code:'custom',message:'INVALID_CHECKS'});
 if(!p.id.startsWith(p.category+'/'))c.addIssue({code:'custom',message:'CATEGORY_MISMATCH'});
 if(p.category==='web'){
  try{const u=new URL(p.target.id);if(!['http:','https:'].includes(u.protocol)||u.origin!==p.target.id)c.addIssue({code:'custom',message:'ORIGIN_REQUIRED'});}catch{c.addIssue({code:'custom',message:'ORIGIN_REQUIRED'});}
  if(p.logic!=='browser-use')c.addIssue({code:'custom',message:'LOGIC_MISMATCH'});
 }else if(p.target.pathPrefixes)c.addIssue({code:'custom',message:'PATH_ONLY_FOR_WEB'});
 if(['app','os'].includes(p.category)&&p.logic!=='computer-use')c.addIssue({code:'custom',message:'LOGIC_MISMATCH'});
 if(p.category==='game'&&p.logic!=='game-use')c.addIssue({code:'custom',message:'LOGIC_MISMATCH'});
 if(new Set(p.experiences.map(e=>e.id)).size!==p.experiences.length)c.addIssue({code:'custom',message:'DUPLICATE_EXPERIENCE'});

 for(const e of p.experiences)if(actionCapability[e.action]&&!p.requires.includes(actionCapability[e.action] as any))c.addIssue({code:'custom',message:'MISSING_CAPABILITY'});
});
export const Index=z.object({schemaVersion:z.literal(1),packs:z.array(z.object({id:PackId,version:Version,sha256:z.string().regex(/^[a-f0-9]{64}$/),logic:Logic,category:Category,target:Target,contractVersion:z.literal(1),requires:z.array(Capability).max(12)}).strict()).max(2000)}).strict();
export type ExperienceRecord=z.infer<typeof Experience>;
export const Context=z.object({logic:Logic,capabilities:z.array(Capability).max(12),identity:z.object({category:Category,id:z.string().min(1).max(200),version:Version.optional(),path:z.string().max(4096).optional()}).strict(),controls:z.array(Pattern).max(2000)}).strict();
export type ExperienceContext=z.infer<typeof Context>;
export interface ExperienceHint {when:z.infer<typeof Pattern>;action:z.infer<typeof Action>;expected:z.infer<typeof Effect>;source:'pack'|'local';validation:'fixture'|'live';success:number;failure:number}
export interface ExperienceHooks {
 select(context:ExperienceContext,signal:AbortSignal):Promise<ExperienceHint[]>;
 record(context:ExperienceContext,experience:Omit<ExperienceRecord,'id'>,outcome:'verified-success'|'verified-failure'|'effect-only'|'unknown'|'infrastructure',evidenceId:string):Promise<void>;
}
export function compareVersions(a:string,b:string){const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;}
export function compatible(entry:z.infer<typeof Index>['packs'][number],context:ExperienceContext){
 if(entry.logic!==context.logic||entry.category!==context.identity.category||entry.target.id!==context.identity.id||entry.contractVersion!==1||entry.requires.some(c=>!context.capabilities.includes(c)))return false;
 if(entry.target.pathPrefixes&&!entry.target.pathPrefixes.some(p=>context.identity.path===p||context.identity.path?.startsWith(p.endsWith('/')?p:p+'/')))return false;
 if(entry.target.minVersion||entry.target.maxVersion){if(!context.identity.version||!Version.safeParse(context.identity.version).success)return false;
 if(entry.target.minVersion&&compareVersions(context.identity.version,entry.target.minVersion)<0)return false;
 if(entry.target.maxVersion&&compareVersions(context.identity.version,entry.target.maxVersion)>0)return false;}
 return true;
}
