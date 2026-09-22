# jev-loop-mcp for agents

Jev Loop owns automation decisions. Agents submit a goal through MCP; task-specific Logic observes state, chooses actions with Jev, requests Thinking when needed, and decides when to continue or hand control back. It is not a conversational orchestrator.

## Stack

```mermaid
flowchart TD
    A[Claude Code / Codex / Agent] -->|MCP| S[Jev Loop MCP Server]
    S --> C[Jev Loop Core]
    C --> L[Logic: Browser / Desktop / Game]
    L --> J[Jev API · Decision model]
    C --> T[Thinking Module]
    T --> M[Configured thinking model]
    L --> P[MCP Client]
    P --> B[Remote Browser MCP tools]
    P --> D[Desktop MCP tools]
    P --> G[Game MCP tools]
    classDef core fill:#f97316,stroke:#9a3412,stroke-width:4px,color:#111827,font-weight:bold;
    classDef supporting fill:#e2e8f0,stroke:#94a3b8,color:#0f172a;
    class C core;
    class A,S,L,J,T,M,P,B,D,G supporting;
```

- **Core:** serial iteration, cancellation, timeouts and Thinking call budgets.
- **Logic:** task-specific decisions. Browser Logic ships here; Desktop/Game illustrate future implementations, not available features.
- **Jev API:** evaluates action/target candidates supplied by Logic. It is not the MCP transport.
- **Thinking Module:** shared assistance, invoked through `LoopContext.think()`. The host configures the model/provider; Logic describes the problem and validates the result.
- **MCP Client:** sends observation/action calls to tools. Hosts can inject an authenticated connection so credentials, authorization and durable pre-mutation checkpoints remain host-owned.
- **Remote tools:** expose structured state, stable targets, revisions, scoped actions and inspectable operation IDs. They do not own the decision loop or model credentials.

An extra adapter package is not required. Different MCP tool contracts may need mapping, but merely speaking MCP does not guarantee compatibility with a particular Logic. Browser Logic currently implements a defined browser tool protocol; it does not automatically understand arbitrary browser servers or websites.

## Browser Logic

Import `@0xmaxma/jev-loop/browser`. `runBrowserTask(input, dependencies, signal)` owns browser-specific observation normalization, Jev action-space construction, target selection, field requests, stale recovery, limits and completion handoff. `mcpBrowserTransport(invoke)` translates MCP content envelopes. There are no website-specific scripts.

Dependencies provide authenticated MCP calls, Jev evaluation, host-configured Thinking for field values, progress, and optional independent verification. Missing text yields a field handoff; an unverified completion candidate is never reported as success. Mutations require scoped browser leases and unique operation IDs. Unknown outcomes are not replayed. Hosts persist and reconcile receipts across process restart.

Remote Browser installs no separate runner/adapter package: its server/extension provide tools, while this repository owns the browser decision implementation and unit tests.

## MCP hosting

Install the package and configure the agent's MCP client:

```json
{
  "mcpServers": {
    "jev-loop": {
      "command": "jev-loop-mcp",
      "args": ["--config", "/absolute/path/jev-host.mjs"]
    }
  }
}
```

The trusted operator module exports an async factory returning `{logics, authorize, timeoutMs?}`. A registered Logic has `id`, `inputSchema`, `parse(input)`, and `run(input, {signal, check})`. For Browser Logic, the factory wraps the exported `runBrowserTask` with its host-configured connections and provider callbacks. Never accept module paths, credentials or executable code from tool arguments. `parse` validates inputs and Logic checks scope/cancellation before actions.

Agents discover `jev_run` and call `{logic, input}`. It returns a bounded JSON result, stays open for at most ten minutes, and supports MCP cancellation. This is not a standalone durable background-job server: task ownership, checkpointing and restart reconciliation belong to the host. A non-cooperative cancelled execution blocks another run on the same server until it settles.

`createLoopServer` from `@0xmaxma/jev-loop/mcp` supports embedded SDK transports as well as stdio. Use one instance per authenticated principal/conversation. Network exposure needs explicit host authentication; the CLI does not expose an unauthenticated HTTP listener.

## Core and Thinking API

`runLoop` accepts `observe`, `decide`, and `execute`; decisions return `{action}` or `{result}`, execution returns a terminal result or undefined to observe again. This is the internal execution contract used by task-specific Logic.

Pass `thinking(request, signal)` to Core. Logic requests assistance with `context.think(request)`; Core bounds calls with `maxThinkingCalls` (default 60) and `thinkingTimeoutMs` (default 15 seconds), and rejects late results after cancellation.

`thinkJson` from `@0xmaxma/jev-loop/thinking` implements tool-free OpenAI-chat or Anthropic-messages JSON assistance. Hosts provide endpoints/models/credentials and consent policy. Logic validates returned JSON for the task. Available usage is returned, not estimated billing. This module does not persist credentials or page contents.

`toolRegistry` optionally provides parsed tool inputs, authorization and mandatory host checkpoints for mutations. Logic with equivalent protocol guards can use them directly.

## Development and verification

Node 22+. Run `npm ci`, `npm run build`, and `npm test`. Browser source is in `logic/browser.ts`; compiled JS/declarations are committed for immutable archive installs without install scripts. Core/MCP tests and Browser Logic unit tests live here. Remote tool/extension integration tests live with the MCP server implementation.

Tests cover cancellation, budgets, input validation, scoped actions, uncertain mutations, Thinking, independent stdio clients and browser decisions. Synthetic fixtures do not prove real-site success or latency. Never replay an uncertain mutation as crash recovery.
