#!/usr/bin/env node
'use strict';
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { createLoopServer } = require('./mcp.cjs');
(async () => {
  if (process.argv.length !== 4 || process.argv[2] !== '--config') throw Error('Usage: jev-loop-mcp --config /absolute/path/host.mjs');
  // Trusted operator configuration, never a module path supplied in a tool call.
  const config = await import(pathToFileURL(resolve(process.argv[3])).href);
  const server = createLoopServer(await config.default());
  await server.connect(new StdioServerTransport());
  const stop = () => { void server.close().finally(() => process.exit(0)); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
})().catch(() => { process.stderr.write('Jev Loop MCP startup failed. Check the trusted host configuration.\n'); process.exitCode = 1; });
