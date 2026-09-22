'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {Server}=require('@modelcontextprotocol/sdk/server/index.js');
const {CallToolRequestSchema,ListToolsRequestSchema}=require('@modelcontextprotocol/sdk/types.js');
/** Host supplies a trusted scope, authorization, durable directory and Computer/Browser Use implementation. */
function createTaskServer({scope,directory,authorize,run}) {
 if(typeof scope!=='string'||!scope||!path.isAbsolute(directory)||typeof authorize!=='function'||typeof run!=='function')throw Error('INVALID_HOST_CONFIG');
 const dir=path.join(directory,createHash('sha256').update(scope).digest('hex'));
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const lock=path.join(dir,'owner.json');
 const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}};
 if(fs.existsSync(lock)){const owner=JSON.parse(fs.readFileSync(lock,'utf8'));if(!Number.isInteger(owner.pid)||owner.pid<1||alive(owner.pid))throw Error('SCOPE_BUSY');fs.unlinkSync(lock);}
 const lockId=randomUUID();fs.writeFileSync(lock,JSON.stringify({pid:process.pid,id:lockId}),{flag:'wx',mode:0o600});
 const file=id=>{if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id))throw Error('INVALID_TASK');return path.join(dir,id+'.json');};
 const write=t=>{const dest=file(t.id),tmp=dest+'.tmp';const fd=fs.openSync(tmp,'w',0o600);try{fs.writeFileSync(fd,JSON.stringify(t));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,dest);const dd=fs.openSync(dir,'r');try{fs.fsyncSync(dd);}finally{fs.closeSync(dd);}};
 const read=id=>JSON.parse(fs.readFileSync(file(id),'utf8'));
 for(const name of fs.readdirSync(dir)){if(!/^[0-9a-f-]{36}\.json$/.test(name))continue;const t=read(name.slice(0,-5));if(['running','stopping'].includes(t.status)){t.status='needs_reconciliation';t.reason='PROCESS_INTERRUPTED';write(t);}}
 let active,closed=false;
 const server=new Server({name:'jev-loop-tasks',version:'0.1.0'},{capabilities:{tools:{}}});
 const schemas={
  jev_start:{goal:{type:'string'}},jev_update:{task_id:{type:'string'},goal:{type:'string'},expected_revision:{type:'integer'}},jev_status:{task_id:{type:'string'}},jev_stop:{task_id:{type:'string'}}
 };
 server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:Object.entries(schemas).map(([name,properties])=>({name,description:({jev_start:'Start a durable scoped goal. Returns immediately; inspect jev_status for actual completion.',jev_update:'Replace the complete goal of the running task at the next safe action boundary. Include previous requirements that still apply.',jev_status:'Read a task in this authenticated host scope. Unknown actions require reconciliation, never blind replay.',jev_stop:'Cancel further actions. An already dispatched action may still finish; inspect status.'})[name],inputSchema:{type:'object',properties,required:Object.keys(properties),additionalProperties:false}}))}));
 server.setRequestHandler(CallToolRequestSchema,async(req)=>{
  try {
   if(closed||authorize()!==true)throw Error('ACCESS_DENIED');
   const name=req.params.name,a=req.params.arguments??{},schema=schemas[name];
   if(!schema||Object.keys(a).some(k=>!(k in schema))||Object.keys(schema).some(k=>!(k in a))||Buffer.byteLength(JSON.stringify(a))>20000)throw Error('INVALID_REQUEST');
   if('goal' in a&&(typeof a.goal!=='string'||!a.goal.trim()||a.goal.length>16000))throw Error('INVALID_GOAL');
   let t;
   if(name==='jev_start'){
    if(active)throw Error('LOOP_BUSY');
    // An unresolved predecessor fences new work even after host restart.
    for(const n of fs.readdirSync(dir)){if(/^[0-9a-f-]{36}\.json$/.test(n)&&read(n.slice(0,-5)).status==='needs_reconciliation')throw Error('RECONCILIATION_REQUIRED');}
    t={id:randomUUID(),goal:a.goal,revision:1,status:'running',steps:0,createdAt:Date.now()};write(t);
    const controller=new AbortController(),task=t;active={task,controller};
    void Promise.resolve().then(()=>run({goal:task.goal,revision:task.revision},{signal:controller.signal,latestGoal:()=>({goal:task.goal,revision:task.revision}),authorized:()=>!closed&&authorize()===true,beforeMutation:(operationId,action)=>{if(controller.signal.aborted||authorize()!==true)throw Error('ACCESS_DENIED');task.pending={operationId,action};write(task);},progress:event=>{if(event.operationId===task.pending?.operationId)delete task.pending;task.progress=event;task.steps=event.steps;write(task);}})).then(result=>{
     if(task.pending && result.status!=='needs_reconciliation') {task.status='needs_reconciliation';task.reason='OUTCOME_REQUIRES_INSPECTION';}
     else {task.status=result.status;task.reason=result.reason;}
     task.result=result;task.finishedAt=Date.now();write(task);
    }).catch(()=>{task.status=task.pending?'needs_reconciliation':controller.signal.aborted?'cancelled':'blocked';task.reason=task.pending?'OUTCOME_UNKNOWN':'EXECUTION_FAILED';write(task);}).finally(()=>{active=undefined;if(closed)unlock();});
   } else {
    t=read(a.task_id);
    if(name==='jev_update'){
     if(!active||active.task.id!==t.id||active.controller.signal.aborted||t.status!=='running')throw Error('TASK_NOT_RUNNING');
     if(!Number.isInteger(a.expected_revision)||a.expected_revision!==t.revision)throw Error('REVISION_CONFLICT');
     t={...active.task,goal:a.goal,revision:t.revision+1};write(t);Object.assign(active.task,t);
    } else if(name==='jev_stop'){
     if(active?.task.id===t.id){active.task.status='stopping';write(active.task);active.controller.abort();t=active.task;}
    }
   }
   // Return a snapshot, never an object that the background loop can mutate later.
   return {content:[{type:'text',text:JSON.stringify(t)}]};
  } catch(e){return {isError:true,content:[{type:'text',text:e instanceof Error&&/^[A-Z_]+$/.test(e.message)?e.message:'TASK_REQUEST_FAILED'}]};}
 });
 const unlock=()=>{try{if(JSON.parse(fs.readFileSync(lock,'utf8')).id===lockId)fs.unlinkSync(lock);}catch{}};
 server.onclose=()=>{closed=true;if(active)active.controller.abort();else unlock();};
 return server;
}
module.exports={createTaskServer};
