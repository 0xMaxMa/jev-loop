import { Server } from '@modelcontextprotocol/sdk/server/index.js';
export interface DomainAdapter {
  id: string;
  parse(input: Record<string, unknown>): unknown;
  run(input: any, context: { signal: AbortSignal; check(): void }): Promise<unknown>;
}
/** Scope each server instance to one authenticated principal/conversation. */
export declare function createLoopServer(options: {
  adapters: DomainAdapter[];
  authorize(adapterId: string): boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Server;
