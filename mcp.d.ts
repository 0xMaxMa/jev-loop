import { Server } from '@modelcontextprotocol/sdk/server/index.js';
export interface TaskLogic {
  id: string;
  inputSchema?: Record<string, unknown>;
  parse(input: Record<string, unknown>): unknown;
  run(input: any, context: { signal: AbortSignal; check(): void }): Promise<unknown>;
}
/** Scope each server instance to one authenticated principal/conversation. */
export declare function createLoopServer(options: {
  logics: TaskLogic[];
  authorize(logicId: string): boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Server;
