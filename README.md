# Jev Loop

Reusable automation core. This is not a conversational orchestrator, browser extension or hosted provider. Hosts supply decision clients, tools and ownership; adapters supply domain observations and actions.

```
Host (Gateway, MCP server, application)
  -> Core: observe -> decide -> execute -> repeat
       -> Jev client supplied by host
       -> domain adapter / tools
       -> Thinking module for bounded JSON subproblems
```

`runLoop` owns serial iteration, cycle limits, cancellation and bounded stage calls. An adapter implements `observe`, `decide` and `execute`. Decisions return `{action}` or `{result}`; execution returns a terminal result or undefined to observe again. No unknown/failed mutation is automatically retried. Domain adapters own freshness, scope, leases, receipts, terminal verification and precise recovery policy. Hosts persist checkpoints and reconcile uncertain work; restarting a loop alone is not durable resume.

`toolRegistry` validates tool identity, parses inputs, checks authorization, and requires a host checkpoint before mutating tools. It rechecks authorization after checkpointing. It does not generate selectors, code or shell commands. Existing adapters with stronger native dispatch guards can implement the same contract directly.

`thinkJson` is a shared, tool-free Thinking module supporting OpenAI chat and Anthropic messages APIs. The host supplies endpoint/model/credential per invocation. Input, output and output tokens are bounded; callers must validate the returned JSON against their operation-specific schema. It returns normalized available usage, not estimated billing. No credentials or page data are logged or persisted by this library. Hosts must apply consent and data-sharing policy before submitting observations to a provider.

## Example

```js
const { runLoop } = require('@0xmaxma/jev-loop');
const result = await runLoop({
  signal: abortController.signal,
  maxCycles: 60,
  observe: async ctx => device.observe(ctx.signal),
  decide: async (state, ctx) => chooser.choose(goal, state, ctx.signal),
  execute: async (action, ctx) => device.execute(action, ctx.signal),
});
```

There are no site-specific rules, product credentials, MCP endpoints or browser dependencies in core. A browser adapter can be used by Gateway; a desktop adapter can use the same loop from another host. Deploying as an MCP server is a separate host implementation, not a requirement.

## Integration and verification

The Remote Browser adapter implements browser observation/decision/action policy and calls this core. Gateway owns task lifecycle and injects inference/Thinking. Package consumers pin an immutable Git commit until an npm release is explicitly published. Node 22+, no runtime dependencies or install scripts. `npm test` covers two non-browser environments, cancellation, budgets, uncertain mutation handling, authorization and Thinking boundaries.

A timed-out adapter may still have an external side effect if it ignores cancellation. Core never retries it; the host/adapter must record and reconcile that uncertainty before further execution. Do not use automatic replay as crash recovery.
