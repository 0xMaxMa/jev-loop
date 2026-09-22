import {Pack,type ExperienceRecord} from './experience-schema.js';
/** The harness executes actual fixture/live cases and independently verifies each outcome.
 * No free-form summary or self-reported model success is accepted as training output.
 */
export async function trainExperiencePack(manifest:Omit<ReturnType<typeof Pack.parse>,'experiences'|'checks'>,records:ExperienceRecord[],executeAndVerify:(record:ExperienceRecord,trial:number)=>Promise<boolean>,trials=3){
 if(!Number.isInteger(trials)||trials<3||trials>100)throw Error('INVALID_TRAINING_BUDGET');
 const candidate=Pack.parse({...manifest,experiences:records,checks:{runs:3,passed:3}});let runs=0,passed=0;const accepted:ExperienceRecord[]=[];
 for(const record of candidate.experiences){let wins=0;for(let i=0;i<trials;i++){const ok=await executeAndVerify(record,i);if(typeof ok!=='boolean')throw Error('INVALID_VERIFIER_RESULT');runs++;if(ok){wins++;passed++;}}
 if(wins===trials)accepted.push(record);}
 if(!accepted.length)throw Error('NO_VERIFIED_EXPERIENCES');
 return Pack.parse({...candidate,experiences:accepted,checks:{runs,passed}});
}
