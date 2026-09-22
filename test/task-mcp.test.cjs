const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {Client}=require('@modelcontextprotocol/sdk/client/index.js');const {InMemoryTransport}=require('@modelcontextprotocol/sdk/inMemory.js');const {createTaskServer}=require('../task-mcp.cjs');
async function connect(t,options){const server=createTaskServer(options),client=new Client({name:'test-agent',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);t.after(async()=>{await client.close();await server.close();});return async(name,args)=>{const r=await client.callTool({name,arguments:args});return r.isError?{error:r.content[0].text}:JSON.parse(r.content[0].text);};}
const tick=()=>new Promise(r=>setImmediate(r));
test('background task accepts concurrent revision and stop through MCP',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jev-tasks-'));let ctx;
 const call=await connect(t,{directory:dir,scope:'user/conversation',authorize:()=>true,run:async(_,c)=>{ctx=c;await new Promise(r=>c.signal.addEventListener('abort',r,{once:true}));return {status:'cancelled',reason:'CANCELLED'};}});
 const task=await call('jev_start',{goal:'Create a shopping note'});await tick();assert.equal(task.status,'running');
 assert.equal((await call('jev_update',{task_id:task.id,goal:'Create a shopping note with milk',expected_revision:1})).revision,2);
 assert.equal(ctx.latestGoal().goal,'Create a shopping note with milk');
 assert.equal((await call('jev_update',{task_id:task.id,goal:'old',expected_revision:1})).error,'REVISION_CONFLICT');
 await call('jev_stop',{task_id:task.id});await tick();assert.equal((await call('jev_status',{task_id:task.id})).status,'cancelled');
});
test('scope isolation and unknown operation block new jobs',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jev-scope-'));
 const call=await connect(t,{directory:dir,scope:'a',authorize:()=>true,run:async(_,c)=>{c.beforeMutation('operation',{});return {status:'needs_reconciliation',reason:'OUTCOME_UNKNOWN'};}});
 const other=await connect(t,{directory:dir,scope:'b',authorize:()=>true,run:async()=>({status:'succeeded',reason:'VERIFIED'})});
 const task=await call('jev_start',{goal:'Open app'});await tick();assert.equal((await other('jev_status',{task_id:task.id})).error,'TASK_REQUEST_FAILED');
 assert.equal((await call('jev_start',{goal:'Try again'})).error,'RECONCILIATION_REQUIRED');
});
test('host restart marks persisted running work for reconciliation without dispatch',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jev-restart-')),scope='s';const {createHash,randomUUID}=require('node:crypto'),id=randomUUID(),scoped=path.join(dir,createHash('sha256').update(scope).digest('hex'));
 fs.mkdirSync(scoped);fs.writeFileSync(path.join(scoped,id+'.json'),JSON.stringify({id,status:'running',revision:1,goal:'Old goal'}));let calls=0;
 const call=await connect(t,{directory:dir,scope,authorize:()=>true,run:async()=>{calls++;}});
 assert.equal((await call('jev_status',{task_id:id})).status,'needs_reconciliation');assert.equal(calls,0);
});
