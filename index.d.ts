export interface LoopContext { cycle:number; signal:AbortSignal }
export class LoopError extends Error { code:string; constructor(code:string) }
export function runLoop<S,D,R>(options:{signal:AbortSignal;maxCycles?:number;stageTimeoutMs?:number;observe(context:LoopContext):Promise<S>;decide(state:S,context:LoopContext):Promise<{action:D}|{result:R}>;execute(action:D,context:LoopContext):Promise<R|undefined>}):Promise<R>;
export interface ToolContext {signal:AbortSignal;beforeMutation?:(toolId:string,input:unknown)=>void|Promise<void>}
export interface LoopTool {id:string;mutating?:boolean;parse(input:unknown):unknown;authorize(input:unknown,context:ToolContext):boolean|Promise<boolean>;execute(input:unknown,context:ToolContext):Promise<unknown>}
export function toolRegistry(tools:LoopTool[]):{ids():string[];call(id:string,input:unknown,context:ToolContext):Promise<unknown>};
