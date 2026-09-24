import type {ThinkingConfig} from './thinking';
export function thinkBrowserField(config:ThinkingConfig,input:unknown,signal:AbortSignal,requestFetch?:typeof fetch):Promise<{text:string|null}>;
export function thinkBrowserRecovery(config:ThinkingConfig,input:Record<string,unknown>,signal:AbortSignal,requestFetch?:typeof fetch):Promise<{guidance:string|null;fields:Array<{label:string;text:string}>}>;
