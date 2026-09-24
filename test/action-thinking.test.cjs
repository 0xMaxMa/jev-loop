const {test}=require('node:test'),assert=require('node:assert/strict');
const {thinkAction,thinkChoices}=require('../action-thinking.cjs');
const config={baseUrl:'https://fixture.test/v1',model:'fixture',apiKey:'fixture'};
const request={goal:'Search milk',state:{},recentActions:[],actions:{'press:long-id':'Click Search','type:long-id':'Type into Search',WAIT:'Wait'},screenshot:{mimeType:'image/jpeg',data:'/9j/AA=='}};
const reply=o=>async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(o)}}]}));
const signal=()=>new AbortController().signal;
test('compact numeric choices and multiple questions share one call; long refs never emitted',async()=>{
 let calls=0;const result=await thinkAction(config,request,signal(),async(url,init)=>{calls++;const body=JSON.parse(init.body),input=JSON.parse(body.messages[1].content[0].text);assert.deepEqual(Object.keys(input.questions),['readiness','action']);assert.deepEqual(Object.keys(input.questions.action.criteria),['0','1','2','3']);assert.deepEqual(input.textActionIds,['1']);return reply({answers:{readiness:'0',action:'0'}})();});
 assert.equal(calls,1);assert.deepEqual(result,{action:'press:long-id',text:null});
});
test('typing alone permits literal text; verbose or extra fields are rejected',async()=>{
 assert.deepEqual(await thinkAction(config,request,signal(),reply({answers:{readiness:'0',action:'1'},text:'milk'})),{action:'type:long-id',text:'milk'});
 for(const bad of [{answers:{readiness:'0',action:'0'},text:'explanation'},{answers:{readiness:'0',action:'1'}},{answers:{readiness:'0',action:'0'},reasoning:'because'},{answers:{readiness:'0',action:'press:long-id'}},{answers:{action:'0'}},{answers:{readiness:'2',action:'0'}}])await assert.rejects(()=>thinkAction(config,request,signal(),reply(bad)),/THINKING_INVALID_RESPONSE/);
});
test('wait for user is a choice, not fabricated success',async()=>{
 assert.deepEqual(await thinkAction(config,request,signal(),reply({answers:{readiness:'2',action:'3'}})),{action:null,text:null});
});
test('generic independent questions return decoded choices with no free text',async()=>{
 const result=await thinkChoices(config,{screenshot:request.screenshot,questions:{visible:{instructions:'Is a menu visible?',criteria:{yes:'Visible',no:'Not visible'}},loading:{instructions:'Is content loading?',criteria:{yes:'Loading',no:'Ready'}}}},signal(),reply({answers:{visible:'0',loading:'1'}}));assert.deepEqual(result,{answers:{visible:'yes',loading:'no'}});
});
