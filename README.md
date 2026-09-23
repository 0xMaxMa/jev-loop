# jev-loop-mcp for agents

Jev Loop owns automation decisions. Agents submit a goal through MCP; task-specific Logic observes state, chooses actions with Jev, requests Thinking when needed, and decides when to continue or hand control back. It is not a conversational orchestrator.

## Stack

```mermaid
flowchart TD
    A[Claude Code / Codex / Agent] -->|MCP| S[Jev Loop MCP Server]
    S --> C[Jev Loop Core]
    C --> L[Logic: Browser Use / Computer Use / Game]
    L --> J[Jev API · Decision model]
    C --> T[Thinking Module]
    T --> M[Configured thinking model]
    L --> P[MCP Client]
    P --> B[Remote Browser MCP tools]
    P --> D[Computer Use MCP tools]
    P --> G[Game MCP tools]
    classDef core fill:#f97316,stroke:#9a3412,stroke-width:4px,color:#111827,font-weight:bold;
    classDef supporting fill:#e2e8f0,stroke:#94a3b8,color:#0f172a;
    class C core;
    class A,S,L,J,T,M,P,B,D,G supporting;
```

- **Core:** serial iteration, cancellation, timeouts and Thinking call budgets.
- **Logic:** task-specific decisions. Browser Use and Computer Use ship here; Game remains a future implementation.
- **Jev API:** evaluates action/target candidates supplied by Logic. It is not the MCP transport.
- **Thinking Module:** shared assistance, invoked through `LoopContext.think()`. The host configures the model/provider; Logic describes the problem and validates the result.
- **MCP Client:** sends observation/action calls to tools. Hosts can inject an authenticated connection so credentials, authorization and durable pre-mutation checkpoints remain host-owned.
- **Remote tools:** expose structured state, stable targets, revisions, scoped actions and inspectable operation IDs. They do not own the decision loop or model credentials.

An extra adapter package is not required. Different MCP tool contracts may need mapping, but merely speaking MCP does not guarantee compatibility with a particular Logic. Browser Use currently implements a defined browser tool protocol; it does not automatically understand arbitrary browser servers or websites.

## Browser Use

Import `@0xmaxma/jev-loop/browser-use`. `runBrowserUse(input, dependencies, signal)` owns browser-specific observation normalization, Jev action-space construction, target selection, field requests, stale recovery, limits and completion handoff. `mcpBrowserTransport(invoke)` translates MCP content envelopes. There are no website-specific scripts.

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

The trusted operator module exports an async factory returning `{logics, authorize, timeoutMs?}`. A registered Logic has `id`, `inputSchema`, `parse(input)`, and `run(input, {signal, check})`. For Browser Use, the factory wraps the exported `runBrowserUse` with its host-configured connections and provider callbacks. Never accept module paths, credentials or executable code from tool arguments. `parse` validates inputs and Logic checks scope/cancellation before actions.

Agents discover `jev_run` and call `{logic, input}`. It returns a bounded JSON result, stays open for at most ten minutes, and supports MCP cancellation. This is not a standalone durable background-job server: task ownership, checkpointing and restart reconciliation belong to the host. A non-cooperative cancelled execution blocks another run on the same server until it settles.

`createLoopServer` from `@0xmaxma/jev-loop/mcp` supports embedded SDK transports as well as stdio. Use one instance per authenticated principal/conversation. Network exposure needs explicit host authentication; the CLI does not expose an unauthenticated HTTP listener.

## Core and Thinking API

`runLoop` accepts `observe`, `decide`, and `execute`; decisions return `{action}` or `{result}`, execution returns a terminal result or undefined to observe again. This is the internal execution contract used by task-specific Logic.

Pass `thinking(request, signal)` to Core. Logic requests assistance with `context.think(request)`; Core bounds calls with `maxThinkingCalls` (default 60) and `thinkingTimeoutMs` (default 15 seconds), and rejects late results after cancellation.

`thinkJson` from `@0xmaxma/jev-loop/thinking` implements tool-free OpenAI-chat or Anthropic-messages JSON assistance. Hosts provide endpoints/models/credentials and consent policy. Logic validates returned JSON for the task. Available usage is returned, not estimated billing. This module does not persist credentials or page contents.

`toolRegistry` optionally provides parsed tool inputs, authorization and mandatory host checkpoints for mutations. Logic with equivalent protocol guards can use them directly.

## Development and verification

Node 22+. Run `npm ci`, `npm run build`, and `npm test`. Browser source is in `logic/browser-use.ts`; compiled JS/declarations are committed for immutable archive installs without install scripts. Core/MCP tests and Browser Use unit tests live here. Remote tool/extension integration tests live with the MCP server implementation.

Tests cover cancellation, budgets, input validation, scoped actions, uncertain mutations, Thinking, independent stdio clients and browser decisions. Synthetic fixtures do not prove real-site success or latency. Never replay an uncertain mutation as crash recovery.

Browser Use retries `STALE_OBSERVATION` from read-only observations within the shared stale-recovery budget, including initial navigation and post-action reads. A confirmed navigation/click is never repeated to recover its observation. Persistent stale reads stop as `STALE_RETRY_BUDGET`; consent and other errors are not retried by this path.

### Dense browser observations

Browser Use may act on an observed, supported control even when the observation
omits other elements. Each mutation still validates the current generation and
actual node; omitted elements never become invented targets. Search/filter inputs
and scrolling can narrow the next observation. A truncated viewport (including
older observations without viewport completeness metadata) cannot establish DONE:
it returns a verification candidate for the supervising agent to inspect. There is
no automatic replay of unknown mutations or unbounded retry.

## Computer Use

Import `@0xmaxma/jev-loop/computer-use` and call `runComputerUse`. This logic uses
structured application/control observations from an MCP computer tool server; it
never assumes screenshots can be sent directly to Jev. The host supplies Jev,
Thinking, authorization and a durable `beforeMutation` callback. The tool contract
is `computer_acquire`, `computer_observe`, `computer_action`,
`computer_operation_status`, `computer_release`. Controls support observed press
and text replacement; approved app IDs support open; navigation keys are bounded.
Computer Use is platform-independent at this boundary; OS accessibility adapters
belong in the tool server.

`latestGoal()` returns a complete goal and monotonically increasing revision.
Revisions are checked after evaluation and Thinking, and before dispatch. Obsolete
decisions are discarded. A new goal does not replay an action already sent to the
OS. Authorization and cancellation are checked before each action. Unknown outcomes
return `needs_reconciliation`; partial observations do not prove completion.

## Background MCP tasks and live instructions

`createTaskServer` from `@0xmaxma/jev-loop/tasks` exposes `jev_start`, `jev_update`,
`jev_status`, `jev_stop`. It is an optional host-side task facility, separate from
the bounded foreground `jev_run` server. The operator supplies an absolute private
storage directory, a trusted authenticated scope, authorization and a `run` callback.
Never obtain the scope or directory from model tool arguments. Use the Gateway's
existing task service when embedding into Gateway rather than adding a competing queue.

Start returns an accepted task ID. Update requires the expected revision and full
revised goal, and only changes the same active task. Stop interrupts future actions.
State and pre-mutation checkpoints are durably recorded. Host restart marks unfinished
work `needs_reconciliation`, blocks new jobs in that scope, and does not replay it.
Only one host process can own a scope at once. The physical-device MCP server must
also enforce exclusivity across all scopes. Unknown outcomes require explicit
host/operator reconciliation; this module does not infer that it is safe to clear them.

### Breaking API rename

The canonical web logic is **Browser Use**, shared by compatible local and remote
browser MCP servers. Import `/browser-use`, `runBrowserUse` and
`BROWSER_USE_CONTRACT_VERSION`. The old `/browser` export and `runBrowserTask`
name are removed, with no aliases. Deploy matching consumers and package versions
together. Computer Use uses `/computer-use` and `runComputerUse`.

## Experience Library and Learning Module

Experience Packs are compact, versioned JSON data grouped by `web/`, `app/`,
`os/`, and `game/`. They suggest semantic actions from observed control states;
no pack executes code, stores coordinates, overrides consent or replays a script.
Core/Logic handles ordinary control flow without a mandatory general pack.

```mermaid
flowchart TD
  Agent[Claude Code / Codex / Agent] --> MCP[Jev Loop MCP]
  MCP --> Core[Jev Loop core]
  Core --> Logic[Browser Use / Computer Use / game Logic]
  Logic --> Tools[MCP tools]
  Core --> Think[Thinking Module]
  Logic <--> Library[Experience Library]
  Library --> Registry[Trusted Experience Pack registry]
  Logic --> Learning[Learning Module]
  Learning --> Library
  style Core fill:#9333ea,color:#fff,stroke:#581c87,stroke-width:4px
```

The Learning Module shares validation, deduplication, scoring, expiry and storage.
Knowledge remains scoped by Logic, actual target identity/version/path, and the
host's authenticated user scope. A browser experience cannot become a game or
OS experience. The game category and gridworld fixture are supported; this does
not supply a native game controller or packs for arbitrary commercial games.

```js
const {ExperienceLibrary} = require('@0xmaxma/jev-loop/experience');
const experience = new ExperienceLibrary({
  directory: '/absolute/private/experience',
  scope: authenticatedPrincipalAndConversation,
});
// Add `experience` to runBrowserUse or runComputerUse dependencies.
```

Browser Use derives the origin/path from a fresh observation. Computer Use derives
app identity and optional OS/app version from the tool server's `platform` metadata
(`os`, `osVersion`, optional `appVersion`, numeric x.y.z). A game integration supplies
its observed game ID/version and semantic controls to `select()`/`record()`.
Neither model text nor page content can choose a registry URL or local directory.

By default, the library downloads the registry index from
`https://raw.githubusercontent.com/0xMaxMa/jev-loop/main/experience-packs/`, selects
the newest compatible version per pack, verifies SHA-256 and strict schemas, then
caches it. It never calls npm or executes downloaded files. Registry URLs are
operator configuration; HTTPS is required except loopback development. Redirects
are rejected. Requests contain no provider credentials, chat, page content or
private experience. Registry access can reveal which public pack was requested.
Use an internal registry or `autoDownload:false` when outbound access is unwanted.
Checksums detect corruption; trust still rests on the configured registry owner.

`enabled:false` disables reads/writes/downloads. `autoDownload:false` uses existing
cache and local experience only. Defaults: index refresh 1h, each download timeout
1.5s, 50 cached packs, 500 local records, 90-day record lifetime, at most five hints
and 2KiB of hints. Options are validated with exported `ExperienceConfig`. Registry
failure falls back to cached/local knowledge and never blocks a user action by
requiring a download. Cold downloads may add their bounded timeout to a decision.

### Structured learning, not prose memory

An experience contains only `when:{role,state}`, `action`, and `expected`, plus a
short ID in distributed packs. Local records add bounded success/failure/effect
counters, timestamps and hashed evidence/context IDs. They retain no labels,
field values, URLs, conversation text, screenshots or provider keys.

A confirmed dispatch is not learning success. Browser/Computer Use records a
specific observed effect (for example an input actually changing to the requested
value). It promotes those records only after independent whole-goal verification.
Three distinct verified runs activate a local hint; failures lower confidence and
can suppress a matching pack hint. Unknown outcomes and infrastructure failures
are neutral. Integrations may record a `verified-failure` only with independent
negative evidence, not simply because a request timed out. Current built-in loops
automatically collect demonstrated positive effects; they do not label all earlier
actions as failures when a later step fails.

For parent verification after execution ends, construct the library with the
host-owned `runId`; effects are staged durably. Call `verifyRun(runId)` only **after**
committing independent completion evidence for that same authenticated task. It is
idempotent and promotes each experience once per run. Missing verification leaves
only neutral effects. Local data is never uploaded or merged into public packs.
The host can remove its private library directory to reset learning.

### Pre-training and publishing packs

`trainExperiencePack` from `/experience-training` accepts structured candidate
records and a host-owned `executeAndVerify` function. Each accepted record must
pass at least three trials returning the boolean `true`; failed candidates are
excluded. The verifier must actually test the expected effect. Record `validation`
as `fixture` for synthetic tests, or `live` only when verified in the real target.
Publish validated JSON, an exact compatible identity/version/tool set, and its
SHA-256 in the registry index. There are no install hooks or free-text instructions.

`npm run build:packs` reproducibly creates five **fixture-validated starter packs**:
Gmail, Google Flights, Apple Notes, macOS, and gridworld. These exercise basic
control patterns. They are not live-trained navigation guides and do not establish
that arbitrary tasks on those products will succeed. A pack can improve action
selection immediately; broad proficiency requires observed, verified experience.

### Desktop observation evidence

Computer Use observations include a bounded `windowTitle` and `text` list from accessibility static text/heading nodes, in addition to interactive controls. These fields remain untrusted app content and reach both decisions and independent verification. `NO_SUPPORTED_ACTION` means the decision engine chose no supported next step; it is not a provider or account refusal. A partial observation still cannot prove goal completion.
