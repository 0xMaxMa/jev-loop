'use strict';
const {thinkJson}=require('./thinking.cjs');
const {reasoningInstructions:policy}=require('./reasoning-instructions.cjs');
async function thinkBrowserField(config,input,signal,requestFetch){
 const {output}=await thinkJson(config,{instruction:policy+' Return exactly {"text":string|null}: the literal value to type into the selected field. Use prepared facts, field meaning, current page and recent actions. For search/autocomplete, give only a concise query, not a sentence explaining it. If the value requires a missing user fact or ambiguous decision, return null. Maximum 2000 characters. Do not put reasoning or next steps in text.',input},signal,requestFetch);
 if(Object.keys(output).length!==1||!Object.hasOwn(output,'text')||!(output.text===null||typeof output.text==='string'&&output.text.trim()&&output.text.length<=2000))throw Error('THINKING_INVALID_RESPONSE');
 return output;
}
// Keep literal values intact; omit whole records when the observation exceeds the
// transport budget and explicitly tell reasoning that its context is incomplete.
function boundedRecoveryInput(raw){
 const input=structuredClone(raw);
 if(Buffer.byteLength(JSON.stringify(input))<=60000)return input;
 input.input_truncated=true;
 if(input.page){
  input.page.text=(input.page.viewport_text??input.page.text??'').slice(0,6000);
  delete input.page.viewport_text;
  input.page.truncated={...input.page.truncated,text:true};
 }
 const size=()=>Buffer.byteLength(JSON.stringify(input));
 for(const list of [input.recent_actions,input.page?.elements,input.supplied_fields]){
  while(size()>60000&&Array.isArray(list)&&list.length){if(list===input.recent_actions)list.shift();else list.pop();if(list===input.page?.elements)input.page.truncated.elements=true;}
 }
 while(size()>60000&&input.page?.text?.length)input.page.text=input.page.text.slice(0,Math.floor(input.page.text.length/2));
 return input;
}
async function thinkBrowserRecovery(config,request,signal,requestFetch){
 const {screenshot,...raw}=request;
 const input=boundedRecoveryInput(raw);
 const {output}=await thinkJson(config,{instruction:policy+' The browser loop has stopped making progress. Inspect observed controls, current values, page feedback and recent actions. Return exactly {"guidance":string|null,"fields":[{"label":string,"text":string}]}. Guidance is a short next-step suggestion (max 1000 characters), never a new goal. Fields are exact literal values for uniquely identified visible editable fields, max 12 fields and 2000 characters each. Use exact observed labels. Do not repeat a rejected query unchanged. A search alias may be used only if it unambiguously denotes the same requested entity. If there is no grounded way forward or a user fact is missing, return null guidance and an empty fields array. When input_truncated is true, missing controls or facts are unknown; never invent them or infer absence from omitted data. Loading does not prove failure, and lack of a supported action does not prove site blocking.',input,...(screenshot?{images:[screenshot]}:{})},signal,requestFetch);
 if(Object.keys(output).sort().join(',')!=='fields,guidance'||!(output.guidance===null||typeof output.guidance==='string'&&output.guidance.length<=1000)||!Array.isArray(output.fields)||output.fields.length>12||output.fields.some(f=>!f||Object.keys(f).sort().join(',')!=='label,text'||typeof f.label!=='string'||!f.label.trim()||f.label.length>250||typeof f.text!=='string'||!f.text.trim()||f.text.length>2000))throw Error('THINKING_INVALID_RESPONSE');
 return output;
}
module.exports={thinkBrowserField,thinkBrowserRecovery};
