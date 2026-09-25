import type {ThinkingConfig} from './thinking';
export function thinkComputerField(config:ThinkingConfig,input:Record<string,unknown>,signal:AbortSignal,requestFetch?:typeof fetch):Promise<{text:string|null}>;
