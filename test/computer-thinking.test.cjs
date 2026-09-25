const {test}=require('node:test'),assert=require('node:assert/strict');
const {thinkComputerField}=require('../computer-thinking.cjs');
const config={baseUrl:'https://model.example/v1',model:'fixture',apiKey:'fixture'};
const response=value=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]}));
test('desktop reasoning owns field instructions and keeps images separate from literals',async()=>{
 const answer=await thinkComputerField(config,{goal:'Search Bangkok',control:{label:'Search'},screenshot:{mimeType:'image/jpeg',data:'/9j/AA=='}},new AbortController().signal,async(_u,init)=>{
 const body=JSON.parse(init.body);assert.match(body.messages[0].content,/unchanged screen/);assert.match(body.messages[0].content,/reference time and timezone/);assert.equal(body.messages[1].content[1].type,'image_url');assert.equal(body.messages[1].content[0].text.includes('/9j/AA=='),false);return response({text:'Bangkok'});
 });assert.deepEqual(answer,{text:'Bangkok'});
});
test('desktop reasoning hands off missing facts and rejects explanations outside the schema',async()=>{
 assert.deepEqual(await thinkComputerField(config,{},new AbortController().signal,async()=>response({text:null})),{text:null});
 await assert.rejects(()=>thinkComputerField(config,{},new AbortController().signal,async()=>response({text:'Bangkok',explanation:'next'})),/THINKING_INVALID_RESPONSE/);
});
