export interface ThinkingConfig {api?:'openai-chat'|'anthropic-messages';baseUrl:string;model:string;apiKey:string}
export function thinkJson(config:ThinkingConfig,request:{instruction:string;input:unknown},signal:AbortSignal,requestFetch?:typeof fetch):Promise<{output:Record<string,unknown>;model:string;usage:Record<string,number>}>;
