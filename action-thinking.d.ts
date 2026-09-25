import type {ThinkingConfig} from './thinking';
export interface ActionThinkingRequest {
 goal:string; actions:Record<string,string>; state:unknown; recentActions:unknown[];
 screenshot?:{mimeType:'image/png'|'image/jpeg';data:string};
}
export interface ActionThinkingDecision {action:string|null;text:string|null}
export function thinkAction(config:ThinkingConfig,request:ActionThinkingRequest & Record<string,unknown>,signal:AbortSignal,requestFetch?:typeof fetch):Promise<ActionThinkingDecision>;
export function thinkChoices(config:ThinkingConfig,request:{screenshot:{mimeType:'image/png'|'image/jpeg';data:string};questions:Record<string,{instructions:string;criteria:Record<string,string>}>;[key:string]:unknown},signal:AbortSignal,requestFetch?:typeof fetch):Promise<{answers:Record<string,string>;text?:string}>;
