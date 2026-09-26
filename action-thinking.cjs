'use strict';
const {thinkJson}=require('./thinking.cjs');
const {reasoningInstructions}=require('./reasoning-instructions.cjs');
/** Independent choice questions share one inference. Never a queue of future actions. */
async function thinkChoices(config,request,signal,requestFetch){
 const {screenshot,questions,...input}=request;
 if(!screenshot||!questions||typeof questions!=='object'||Array.isArray(questions)||Object.keys(questions).length<1||Object.keys(questions).length>8)throw Error('THINKING_INVALID_INPUT');
 for(const q of Object.values(questions))if(!q||typeof q.instructions!=='string'||!q.criteria||typeof q.criteria!=='object'||Array.isArray(q.criteria)||!Object.keys(q.criteria).length||Object.keys(q.criteria).length>1000||Object.values(q.criteria).some(v=>typeof v!=='string'))throw Error('THINKING_INVALID_INPUT');
 const ids={},compact={};
 for(const [qid,q] of Object.entries(questions)){
  ids[qid]=Object.keys(q.criteria);
  compact[qid]={instructions:q.instructions,criteria:Object.fromEntries(ids[qid].map((id,i)=>[String(i),q.criteria[id]]))};
 }
 const textActionIds=(ids.action??[]).flatMap((id,i)=>/^(type:|TYPE_TEXT:)/.test(id)?[String(i)]:[]);
 const {output}=await thinkJson(config,{instruction:reasoningInstructions+' Inspect the latest screenshot, original user goal, available choices and recent outcomes. Answer every question in ONE response. Return ONLY {"answers":{"question_id":"numeric choice ID"}}. No markdown, prose, reasoning, probabilities or additional keys. If and only if answers.action is one of textActionIds, add a top-level "text" containing the exact literal value to type (max 2000 characters). Never include text for other actions. Choose the offered wait-for-user option if a user fact is missing or no grounded next step exists. Do not repeat ineffective actions. Never invent coordinates, tools or permissions. DONE is only a completion candidate. These questions concern the SAME current frame; never plan a batch of future clicks.',input:{...input,questions:compact,textActionIds},images:[screenshot]},signal,requestFetch);
 const answers=output.answers,typing=answers&&typeof answers.action==='string'&&textActionIds.includes(answers.action);
 if(Object.keys(output).sort().join(',')!==(typing?'answers,text':'answers')||!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).sort().join(',')!==Object.keys(questions).sort().join(',')||Object.entries(compact).some(([id,q])=>typeof answers[id]!=='string'||!Object.hasOwn(q.criteria,answers[id]))||typing&&!(typeof output.text==='string'&&output.text.length<=2000))throw Error('THINKING_INVALID_RESPONSE');
 return {...output,answers:Object.fromEntries(Object.entries(answers).map(([id,code])=>[id,ids[id][Number(code)]]))};
}
async function thinkAction(config,request,signal,requestFetch){
 const {actions,state,recentActions,...context}=request;
 // The image and action catalogue carry targets; do not duplicate entire AX/DOM trees.
 const page=state?.page??state?.desktop??state??{};
 const input={...context,state:{application:page.application,windowTitle:page.windowTitle,url:page.url,title:page.title,focusedControl:page.focusedControl,text:JSON.stringify(page.text??page.visibleText??'').slice(0,4000)},recentActions:(recentActions??[]).slice(-8).map(a=>JSON.parse(JSON.stringify(a,(k,v)=>typeof v==='string'?v.slice(0,300):v)))};
 if(!actions||typeof actions!=='object')throw Error('THINKING_INVALID_INPUT');
 const output=await thinkChoices(config,{...input,questions:{
  readiness:{instructions:'Is there a grounded action now? LOADING only for a transient UI transition. NEEDS_INPUT if required user information or a supported way forward is missing.',criteria:{READY:'Can act on the current screen',LOADING:'Wait for the screen to settle',NEEDS_INPUT:'Wait for a new user instruction'}},
  action:{instructions:'Choose ONE next action for the original goal, consistent with readiness. When loading, choose the wait action. When user input is needed, choose wait for the next user instruction. Return literal text only when selecting a typing action.',criteria:{...Object.fromEntries(Object.entries(actions).map(([id,description])=>[id,String(description).slice(0,180)])),WAIT_INPUT:'Wait for the next user instruction'}}
 }},signal,requestFetch);
 const {readiness,action}=output.answers;
 if(readiness==='LOADING'&&action!=='WAIT'||readiness==='NEEDS_INPUT'&&action!=='WAIT_INPUT')throw Error('THINKING_INVALID_RESPONSE');
 return {action:action==='WAIT_INPUT'?null:action,text:output.text??null};
}
module.exports={thinkAction,thinkChoices};
