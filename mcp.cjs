'use strict';
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

/** One server instance belongs to one authenticated host scope. Never share across principals. */
function createLoopServer({ logics, authorize, signal, timeoutMs = 600000 }) {
  if (!Array.isArray(logics) || !logics.length || typeof authorize !== 'function' ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600000) throw Error('INVALID_HOST_CONFIG');
  const registry = new Map();
  for (const logic of logics) {
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(logic.id) || registry.has(logic.id) ||
        typeof logic.run !== 'function' || typeof logic.parse !== 'function') throw Error('INVALID_LOGIC');
    registry.set(logic.id, logic);
  }
  const lifetime = new AbortController();
  const server = new Server({ name: 'jev-loop-mcp', version: '0.1.0' }, { capabilities: { tools: {} } });
  server.onclose = () => lifetime.abort();
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [{
    name: 'jev_run', description: 'Run a bounded automation goal with an installed domain logic. Do not replay an interrupted action; inspect its receipt first.',
    inputSchema: { type: 'object', properties: {
      logic: { type: 'string', enum: [...registry.keys()] },
      input: { type: 'object', description: 'Domain input validated by the installed logic.' },
    }, required: ['logic', 'input'], additionalProperties: false,
      oneOf: [...registry.values()].map(a => ({properties:{logic:{const:a.id},input:a.inputSchema ?? {type:'object'}}})) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }] }));
  let active = false;
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const args = request.params.arguments;
    if (request.params.name !== 'jev_run' || !args || Object.keys(args).some(k => !['logic', 'input'].includes(k)) ||
        typeof args.logic !== 'string' || !args.input || typeof args.input !== 'object' || Array.isArray(args.input) ||
        Buffer.byteLength(JSON.stringify(args)) > 262144) throw Error('INVALID_REQUEST');
    const logic = registry.get(args.logic);
    if (!logic) throw Error('UNKNOWN_LOGIC');
    if (active) throw Error('LOOP_BUSY');
    const runSignal = AbortSignal.any([lifetime.signal, extra.signal, AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
    const check = () => { runSignal.throwIfAborted(); if (authorize(logic.id) !== true) throw Error('ACCESS_DENIED'); };
    let abort;
    try {
      check();
      const input = logic.parse(args.input);
      check();
      active = true;
      const cancelled = new Promise((_, reject) => {
        abort = () => reject(Error('LOOP_INTERRUPTED_RECONCILE_REQUIRED'));
        runSignal.addEventListener('abort', abort, { once: true });
        if (runSignal.aborted) abort();
      });
      const work = Promise.resolve().then(() => { check(); return logic.run(input, { signal: runSignal, check }); });
      // A non-cooperative logic must finish before this server accepts another mutation.
      void work.finally(() => { active = false; }).catch(() => {});
      const result = await Promise.race([work, cancelled]);
      check();
      const text = JSON.stringify(result);
      if (!text || Buffer.byteLength(text) > 1048576) throw Error('INVALID_LOGIC_RESULT');
      return { content: [{ type: 'text', text }] };
    } catch {
      // Never expose provider credentials, page contents or arbitrary exception messages.
      return { isError: true, content: [{ type: 'text', text: 'LOOP_FAILED_OR_INTERRUPTED: inspect host receipts before retrying.' }] };
    } finally { if (abort) runSignal.removeEventListener('abort', abort); }
  });
  return server;
}
module.exports = { createLoopServer };
