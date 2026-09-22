'use strict';
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

/** One server instance belongs to one authenticated host scope. Never share across principals. */
function createLoopServer({ adapters, authorize, signal, timeoutMs = 600000 }) {
  if (!Array.isArray(adapters) || !adapters.length || typeof authorize !== 'function' ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600000) throw Error('INVALID_HOST_CONFIG');
  const registry = new Map();
  for (const adapter of adapters) {
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(adapter.id) || registry.has(adapter.id) ||
        typeof adapter.run !== 'function' || typeof adapter.parse !== 'function') throw Error('INVALID_ADAPTER');
    registry.set(adapter.id, adapter);
  }
  const lifetime = new AbortController();
  const server = new Server({ name: 'jev-loop-mcp', version: '0.1.0' }, { capabilities: { tools: {} } });
  server.onclose = () => lifetime.abort();
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [{
    name: 'jev_run', description: 'Run a bounded automation goal with an installed domain adapter. Do not replay an interrupted action; inspect its receipt first.',
    inputSchema: { type: 'object', properties: {
      adapter: { type: 'string', enum: [...registry.keys()] },
      input: { type: 'object', description: 'Domain input validated by the installed adapter.' },
    }, required: ['adapter', 'input'], additionalProperties: false,
      oneOf: [...registry.values()].map(a => ({properties:{adapter:{const:a.id},input:a.inputSchema ?? {type:'object'}}})) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }] }));
  let active = false;
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const args = request.params.arguments;
    if (request.params.name !== 'jev_run' || !args || Object.keys(args).some(k => !['adapter', 'input'].includes(k)) ||
        typeof args.adapter !== 'string' || !args.input || typeof args.input !== 'object' || Array.isArray(args.input) ||
        Buffer.byteLength(JSON.stringify(args)) > 262144) throw Error('INVALID_REQUEST');
    const adapter = registry.get(args.adapter);
    if (!adapter) throw Error('UNKNOWN_ADAPTER');
    if (active) throw Error('LOOP_BUSY');
    const runSignal = AbortSignal.any([lifetime.signal, extra.signal, AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
    const check = () => { runSignal.throwIfAborted(); if (authorize(adapter.id) !== true) throw Error('ACCESS_DENIED'); };
    check();
    const input = adapter.parse(args.input);
    check();
    active = true;
    let abort;
    try {
      const cancelled = new Promise((_, reject) => {
        abort = () => reject(Error('LOOP_INTERRUPTED_RECONCILE_REQUIRED'));
        runSignal.addEventListener('abort', abort, { once: true });
        if (runSignal.aborted) abort();
      });
      const work = Promise.resolve().then(() => { check(); return adapter.run(input, { signal: runSignal, check }); });
      // A non-cooperative adapter must finish before this server accepts another mutation.
      void work.finally(() => { active = false; }).catch(() => {});
      const result = await Promise.race([work, cancelled]);
      check();
      const text = JSON.stringify(result);
      if (!text || Buffer.byteLength(text) > 1048576) throw Error('INVALID_ADAPTER_RESULT');
      return { content: [{ type: 'text', text }] };
    } catch {
      // Never expose provider credentials, page contents or arbitrary exception messages.
      return { isError: true, content: [{ type: 'text', text: 'LOOP_FAILED_OR_INTERRUPTED: inspect host receipts before retrying.' }] };
    } finally { if (abort) runSignal.removeEventListener('abort', abort); }
  });
  return server;
}
module.exports = { createLoopServer };
