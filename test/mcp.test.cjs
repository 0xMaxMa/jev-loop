const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
const { createLoopServer } = require('../mcp.cjs');
async function connect(t, options) {
  const server = createLoopServer(options);
  const client = new Client({name:'test-agent',version:'1'});
  const [a,b] = InMemoryTransport.createLinkedPair();
  await server.connect(b); await client.connect(a);
  t.after(async()=>{await client.close();await server.close();});
  return client;
}
test('agent discovers and invokes a domain adapter over MCP',async t=>{
  const client=await connect(t,{authorize:()=>true,adapters:[{id:'desktop',parse:x=>{assert.equal(x.goal,'open');return x;},run:async(x,c)=>{c.check();return {status:'completed',goal:x.goal};}}]});
  assert.equal((await client.listTools()).tools[0].name,'jev_run');
  const result=await client.callTool({name:'jev_run',arguments:{adapter:'desktop',input:{goal:'open'}}});
  assert.deepEqual(JSON.parse(result.content[0].text),{status:'completed',goal:'open'});
});
test('denied and unknown adapters never execute',async t=>{
  let count=0;
  const client=await connect(t,{authorize:()=>false,adapters:[{id:'browser',parse:x=>x,run:async()=>{count++;}}]});
  await assert.rejects(client.callTool({name:'jev_run',arguments:{adapter:'browser',input:{}}}));
  await assert.rejects(client.callTool({name:'jev_run',arguments:{adapter:'other',input:{}}}));
  assert.equal(count,0);
});
test('timeout does not replay or admit another run while old work is uncertain',async t=>{
  let count=0,finish;
  const client=await connect(t,{timeoutMs:30,authorize:()=>true,adapters:[{id:'game',parse:x=>x,run:()=>{count++;return new Promise(r=>{finish=r;});}}]});
  const result=await client.callTool({name:'jev_run',arguments:{adapter:'game',input:{}}});
  assert.equal(result.isError,true);
  await assert.rejects(client.callTool({name:'jev_run',arguments:{adapter:'game',input:{}}}));
  assert.equal(count,1);finish({status:'unknown'});
});
test('adapter rechecks revoked authorization before action',async t=>{
  let allowed=true,actions=0;
  const client=await connect(t,{authorize:()=>allowed,adapters:[{id:'browser',parse:x=>x,run:async(_,c)=>{allowed=false;c.check();actions++;}}]});
  const result=await client.callTool({name:'jev_run',arguments:{adapter:'browser',input:{}}});
  assert.equal(result.isError,true);assert.equal(actions,0);
});
test('standalone stdio CLI supports an independent MCP client',async t=>{
  const {mkdtemp,writeFile,rm}=require('node:fs/promises');
  const {join}=require('node:path');
  const {tmpdir}=require('node:os');
  const {StdioClientTransport}=require('@modelcontextprotocol/sdk/client/stdio.js');
  const dir=await mkdtemp(join(tmpdir(),'jev-stdio-'));
  const config=join(dir,'host.mjs');
  await writeFile(config,'export default () => ({authorize:()=>true,adapters:[{id:"fixture",parse:x=>x,run:async x=>({status:"completed",goal:x.goal})}]});');
  const client=new Client({name:'independent-agent',version:'1'});
  try {
    await client.connect(new StdioClientTransport({command:process.execPath,args:[require.resolve('../cli.cjs'),'--config',config],stderr:'pipe'}));
    assert.equal((await client.listTools()).tools[0].name,'jev_run');
    const response=await client.callTool({name:'jev_run',arguments:{adapter:'fixture',input:{goal:'test stdio'}}});
    assert.equal(JSON.parse(response.content[0].text).status,'completed');
  } finally {await client.close();await rm(dir,{recursive:true,force:true});}
});
