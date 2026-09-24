const {test}=require('node:test'),assert=require('node:assert/strict');
const {thinkBrowserField,thinkBrowserRecovery}=require('../browser-thinking.cjs');
const config={baseUrl:'https://model.example/v1',model:'fixture',apiKey:'fixture'};
const response=value=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]}));
test('field thinking returns only a literal value',async()=>{
 assert.deepEqual(await thinkBrowserField(config,{goal:'Find place'},new AbortController().signal,async()=>response({text:'Osaka'})),{text:'Osaka'});
 await assert.rejects(()=>thinkBrowserField(config,{},new AbortController().signal,async()=>response({text:'Osaka',explanation:'Click next'})),/THINKING_INVALID_RESPONSE/);
});
test('recovery image is multimodal content, never encoded as ordinary page text',async()=>{
 for(const api of ['openai-chat','anthropic-messages']){
  await thinkBrowserRecovery({...config,api},{goal:'Find place',screenshot:{mimeType:'image/png',data:'aW1hZ2U='}},new AbortController().signal,async(_u,init)=>{
   const b=JSON.parse(init.body),content=b.messages.at(-1).content;
   assert.equal(content[0].type,'text');assert.equal(content[0].text.includes('aW1hZ2U='),false);
   assert.equal(content[1].type,api==='anthropic-messages'?'image':'image_url');
   const output={guidance:'Choose matching suggestion',fields:[]};return api==='anthropic-messages'?new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(output)}]})):response(output);
  });
 }
});
