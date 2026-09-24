const {test}=require('node:test'),assert=require('node:assert/strict'),{thinkJson}=require('../thinking.cjs');
for(const api of ['openai-chat','anthropic-messages'])test('Thinking sends bounded native image content: '+api,async()=>{
 let body;await thinkJson({api,baseUrl:'https://example.test/v1',model:'vision',apiKey:'test'},{instruction:'Inspect evidence',input:{goal:'Read'},images:[{mimeType:'image/jpeg',data:'/9j/AA=='}]},new AbortController().signal,async(_,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify(api==='openai-chat'?{choices:[{finish_reason:'stop',message:{content:'{"verified":true}'}}]}:{stop_reason:'end_turn',content:[{type:'text',text:'{"verified":true}'}]}));});
 const content=body.messages.at(-1).content;assert.equal(content[0].type,'text');assert.equal(content[1].type,api==='openai-chat'?'image_url':'image');
});
test('Thinking rejects oversized images before network access',async()=>{await assert.rejects(thinkJson({},{instruction:'x',input:{},images:[{mimeType:'image/jpeg',data:'a'.repeat(160001)}]},new AbortController().signal),/INVALID_IMAGE/);});
