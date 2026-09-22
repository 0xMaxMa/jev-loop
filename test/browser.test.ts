import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  decisionQuestions,
  runBrowserTask,
  mcpBrowserTransport,
  type Observation,
  type AdapterDependencies,
} from "../logic/browser.ts";
const scope = { device_id: "device", grant_id: "grant", tab_id: "tab" };
const snapshot = (): Observation => ({
  protocol_version: 1,
  generation: "g1",
  url: "https://fixture.test",
  title: "Fixture",
  text: "Not submitted",
  elements: [
    {
      ref: "e0",
      label: "Name",
      tag: "input",
      operations: ["CLICK", "TYPE_TEXT"],
    },
    { ref: "e1", label: "Submit", tag: "button", operations: ["CLICK"] },
  ],
  scroll: { up: false, down: false },
  truncated: { text: false, elements: false },
});
function fixture(plan: string[]) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const page = snapshot();
  let i = 0;
  const deps: AdapterDependencies = {
    call: async (name, args) => {
      calls.push({ name, args });
      if (name === "browser_task_acquire")
        return {
          state: "completed",
          result: { protocol_version: 1, lease_token: randomUUID() },
        };
      if (name.startsWith("browser_task_"))
        return { state: "completed", result: {} };
      if (name === "page_observe") return structuredClone(page);
      page.text = "Submitted";
      page.generation = "g2";
      return {
        state: "completed",
        result: { ok: true, observation: structuredClone(page) },
      };
    },
    evaluate: async (request) => {
      const operation = plan[i++] ?? "DONE";
      return {
        model: "test-jev",
        answers: Object.fromEntries(
          Object.entries(request.questions).map(([key, q]) => {
            const keys = Object.keys(q.criteria),
              selected = key === "operation" ? operation : keys[0];
            return [
              key,
              {
                choice: selected,
                confidence: 0.95,
                probabilities: Object.fromEntries(
                  keys.map((k) => [k, k === selected ? 1 : 0]),
                ),
              },
            ];
          }),
        ),
      };
    },
  };
  return { deps, calls, page };
}
test("verified success uses one multi-question evaluation per step and releases ownership", async () => {
  const f = fixture(["TYPE_TEXT", "DONE"]);
  let verified = false;
  f.deps.verify = async (page) => {
    verified = true;
    return page.text === "Submitted";
  };
  const r = await runBrowserTask(
    { goal: "Submit name", scope, fields: [{ label: "Name", text: "ส้ม" }] },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.status, "succeeded");
  assert.equal(r.evaluations, 2);
  assert.equal(r.steps, 1);
  assert(verified);
  assert.equal(f.calls.filter((c) => c.name === "page_type").length, 1);
  assert.equal(f.calls.find((c) => c.name === "page_type")?.args.text, "ส้ม");
  assert.equal(f.calls.at(-1)?.name, "browser_task_release");
  assert(
    f.calls
      .filter((c) => c.name !== "browser_task_acquire")
      .every((c) => c.args.lease_token),
  );
});
test("DONE without a verifier is an explicit verification handoff", async () => {
  const f = fixture(["DONE"]);
  const r = await runBrowserTask(
    { goal: "Done", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.status, "needs_verification");
  assert.equal(f.calls.filter((c) => c.name === "page_observe").length, 2);
});
test("missing and ambiguous field text never executes a type operation", async () => {
  for (const fields of [
    [],
    [
      { label: "Name", text: "a" },
      { label: "Name", text: "b" },
    ],
  ]) {
    const f = fixture(["TYPE_TEXT"]);
    const r = await runBrowserTask(
      { goal: "Enter name", scope, fields },
      f.deps,
      new AbortController().signal,
    );
    assert.equal(r.reason, "FIELD_TEXT_REQUIRED");
    assert(!f.calls.some((c) => c.name === "page_type"));
  }
});
test("low target confidence blocks even with confident operation", async () => {
  const f = fixture(["CLICK"]),
    evaluate = f.deps.evaluate;
  f.deps.evaluate = async (req, s) => {
    const r = await evaluate(req, s);
    (r.answers.click_target as { confidence: number }).confidence = 0.1;
    return r;
  };
  const r = await runBrowserTask(
    { goal: "Click", scope, targetConfidence: 0.8 },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "LOW_TARGET_CONFIDENCE");
  assert(!f.calls.some((c) => c.name === "page_click"));
});
test("malformed unused heads are rejected as an invalid contract", async () => {
  const f = fixture(["CLICK"]),
    evaluate = f.deps.evaluate;
  f.deps.evaluate = async (req, s) => {
    const r = await evaluate(req, s);
    r.answers.type_text_target = { choice: "invented" };
    return r;
  };
  const r = await runBrowserTask(
    { goal: "Click", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.status, "failed");
  assert(!f.calls.some((c) => c.name === "page_click"));
});
test("unknown mutation outcome never retries and is preserved", async () => {
  const f = fixture(["CLICK"]);
  const call = f.deps.call;
  f.deps.call = async (n, a, s) =>
    n === "page_click" ? { error: "OUTCOME_UNKNOWN" } : call(n, a, s);
  const r = await runBrowserTask(
    { goal: "Click", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "OUTCOME_UNKNOWN");
  assert.equal(r.lastAction?.outcome, "unknown");
  assert.equal(r.evaluations, 1);
});
test("confirmed mutation survives missing post-action observation without replay", async () => {
  const f = fixture(["CLICK", "DONE"]),
    call = f.deps.call;
  f.deps.call = async (n, a, s) =>
    n === "page_click"
      ? {
          state: "completed",
          result: { ok: true, observation_error: "STALE_OBSERVATION" },
        }
      : call(n, a, s);
  const r = await runBrowserTask(
    { goal: "Click", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.lastAction?.outcome, "confirmed");
  assert.equal(r.steps, 1);
  assert.equal(r.status, "needs_verification");
});
test("cancellation during noncooperative inference releases ownership and ignores late answer", async () => {
  const f = fixture(["CLICK"]),
    controller = new AbortController();
  f.deps.evaluate = async () => {
    controller.abort();
    return new Promise(() => {});
  };
  const r = await runBrowserTask(
    { goal: "Click", scope },
    f.deps,
    controller.signal,
  );
  assert.equal(r.status, "cancelled");
  assert(!f.calls.some((c) => c.name === "page_click"));
  assert.equal(f.calls.at(-1)?.name, "browser_task_release");
});
test("revocation after inference is rejected by the action boundary", async () => {
  const f = fixture(["CLICK"]),
    call = f.deps.call;

  f.deps.call = async (n, a, s) =>
    n === "page_click"
      ? { error: "TASK_OWNERSHIP_LOST", action_executed: false }
      : call(n, a, s);
  const r = await runBrowserTask(
    { goal: "Click", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "TASK_OWNERSHIP_LOST");
  assert(!f.calls.some((c) => c.name === "page_click"));
});
test("no progress and budgets bound action loops", async () => {
  const f = fixture(["CLICK", "CLICK", "CLICK", "CLICK", "CLICK"]);
  const r = await runBrowserTask(
    { goal: "Click", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "NO_PROGRESS");
  assert.equal(r.steps, 4);
  const g = fixture(["CLICK", "CLICK"]);
  const b = await runBrowserTask(
    { goal: "Click", scope, maxSteps: 1 },
    g.deps,
    new AbortController().signal,
  );
  assert.equal(b.reason, "ACTION_BUDGET");
  assert.equal(b.steps, 1);
});
test("candidate filtering excludes sensitive, disabled and truncated selects", () => {
  const p = snapshot();
  p.elements[0].sensitive = true;
  p.elements[1].disabled = true;
  p.elements.push({
    ref: "e2",
    label: "Select",
    tag: "select",
    operations: ["SELECT"],
    options_truncated: true,
    options: [{ ref: "o1", label: "One", disabled: false, selected: false }],
  });
  assert.deepEqual(
    Object.keys(decisionQuestions(p).questions.operation.criteria),
    ["WAIT", "DONE", "BLOCKED"],
  );
});
test("MCP adapter parses tool envelopes but fails closed for image-only/errors", async () => {
  const call = mcpBrowserTransport(async () => ({
    content: [
      { type: "text", text: '{"state":"completed","result":{"ok":true}}' },
    ],
  }));
  assert.deepEqual(await call("test", {}, new AbortController().signal), {
    state: "completed",
    result: { ok: true },
  });
  const bad = mcpBrowserTransport(async () => ({
    isError: true,
    content: [{ type: "text", text: "{}" }],
  }));
  await assert.rejects(
    bad("test", {}, new AbortController().signal),
    /BROWSER_TOOL_FAILURE/,
  );
});

test("deadline terminates a noncooperative evaluator without an action", async () => {
  const f = fixture([]);
  f.deps.evaluate = async () => new Promise(() => {});
  const r = await runBrowserTask(
    { goal: "Wait", scope, timeoutMs: 1000 },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "TASK_DEADLINE");
  assert.equal(r.status, "blocked");
  assert(!f.calls.some((c) => c.name === "page_click"));
  assert.equal(f.calls.at(-1)?.name, "browser_task_release");
});
test("false DONE remains unverified, including after a completed action", async () => {
  const f = fixture(["CLICK", "DONE"]);
  f.deps.verify = async () => false;
  const r = await runBrowserTask(
    { goal: "Find result", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.status, "needs_verification");
  assert.equal(r.reason, "VERIFICATION_FAILED");
  assert.equal(r.lastAction?.outcome, "confirmed");
});
test("verifier output must be a strict boolean and malformed replies never replay", async () => {
  for (const verdict of [
    true,
    false,
    "false",
    { verified: false },
    1,
    null,
    undefined,
  ]) {
    const f = fixture(["CLICK", "DONE"]);
    f.deps.verify = (async () => verdict) as AdapterDependencies["verify"];
    const r = await runBrowserTask(
      { goal: "Verify once", scope },
      f.deps,
      new AbortController().signal,
    );
    assert.equal(
      r.status,
      verdict === true
        ? "succeeded"
        : verdict === false
          ? "needs_verification"
          : "failed",
    );
    assert.equal(
      r.reason,
      verdict === true
        ? "VERIFIED"
        : verdict === false
          ? "VERIFICATION_FAILED"
          : "INVALID_CONTRACT",
    );
    assert.equal(f.calls.filter((c) => c.name === "page_click").length, 1);
    assert.equal(r.lastAction?.outcome, "confirmed");
    assert.equal(f.calls.at(-1)?.name, "browser_task_release");
  }
});
test("oversized decision input is rejected before paid inference without dropping candidates", async () => {
  const f = fixture([]);
  f.page.elements = Array.from({ length: 150 }, (_, i) => ({
    ref: "e" + i,
    label: "Field " + i,
    tag: "input",
    value: "x".repeat(2000),
    operations: ["TYPE_TEXT"],
  }));
  f.deps.evaluate = async () => {
    throw Error("SHOULD_NOT_EVALUATE");
  };
  const r = await runBrowserTask(
    { goal: "Fill fields", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "EVALUATION_INPUT_TOO_LARGE");
  assert.equal(r.evaluations, 0);
});

test("structured gateway errors preserve safe codes without leaking provider body", async () => {
  const f = fixture([]);
  f.deps.evaluate = async () => {
    throw Object.assign(Error("provider body with private detail"), {
      code: "RATE_LIMITED",
    });
  };
  const r = await runBrowserTask(
    { goal: "Find", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "RATE_LIMITED");
  assert(!JSON.stringify(r).includes("private detail"));
});

test("oversized Choice candidate set hands off without paid inference or silent loss", async () => {
  const f = fixture([]);
  f.page.elements = Array.from({ length: 3 }, (_, i) => ({
    ref: "e" + i,
    label: "Menu " + i,
    tag: "select",
    operations: ["SELECT"],
    options: Array.from({ length: 100 }, (_, j) => ({
      ref: "o" + j,
      label: "Choice " + j,
      disabled: false,
      selected: false,
    })),
  }));
  f.deps.evaluate = async () => {
    throw Error("SHOULD_NOT_EVALUATE");
  };
  const r = await runBrowserTask(
    { goal: "Select", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "ACTION_SPACE_TOO_LARGE");
  assert.equal(r.evaluations, 0);
});

test("inference receives applicable explicit field values but excludes sensitive and offscreen bindings", async () => {
  const f = fixture(["DONE"]);
  f.page.elements.push(
    {
      ref: "secret",
      label: "Password",
      tag: "input",
      sensitive: true,
      operations: [],
    },
    {
      ref: "offscreen",
      label: "Other",
      tag: "input",
      in_viewport: false,
      operations: ["TYPE_TEXT"],
    },
  );
  const evaluate = f.deps.evaluate;
  f.deps.evaluate = async (request, signal) => {
    assert.deepEqual(
      (request.state as { supplied_field_values: unknown })
        .supplied_field_values,
      [{ label: "Name", text: "Som" }],
    );
    assert(!JSON.stringify(request).includes("private-value"));
    return evaluate(request, signal);
  };
  const result = await runBrowserTask(
    {
      scope,
      goal: "Fill the provided details",
      fields: [
        { label: "Name", text: "Som" },
        { label: "Password", text: "private-value" },
        { label: "Other", text: "private-value" },
      ],
    },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(result.status, "needs_verification");
});

test("stale recovery requires explicit non-execution, uses a fresh decision and unique operation", async () => {
  const f = fixture(["CLICK", "TYPE_TEXT", "DONE"]),
    call = f.deps.call;
  let rejectedId: unknown;
  f.deps.call = async (n, a, s) => {
    if (n === "page_click") {
      rejectedId = a.operation_id;
      f.page.generation = "fresh";
      return { error: "STALE_OBSERVATION", action_executed: false };
    }
    return call(n, a, s);
  };
  const r = await runBrowserTask(
    { goal: "Fill", scope, fields: [{ label: "Name", text: "Som" }] },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.staleRetries, 1);
  assert.equal(r.steps, 1);
  assert.equal(r.evaluations, 3);
  const action = f.calls.find((c) => c.name === "page_type")!;
  assert.equal(action.args.generation, "fresh");
  assert.notEqual(action.args.operation_id, rejectedId);
});

test("stale retries are bounded and uncertain stale mutations never retry", async () => {
  for (const known of [true, false]) {
    const f = fixture(Array(10).fill("CLICK")),
      call = f.deps.call;
    f.deps.call = async (n, a, s) =>
      n === "page_click"
        ? {
            error: "STALE_OBSERVATION",
            ...(known ? { action_executed: false } : {}),
          }
        : call(n, a, s);
    const r = await runBrowserTask(
      { goal: "Click", scope, maxStaleRetries: 2 },
      f.deps,
      new AbortController().signal,
    );
    assert.equal(r.reason, known ? "STALE_RETRY_BUDGET" : "OUTCOME_UNKNOWN");
    assert.equal(r.evaluations, known ? 3 : 1);
    assert.equal(r.steps, 0);
  }
});

test("text helper fills missing values; supplied text bypasses helper", async () => {
  for (const supplied of [true, false]) {
    const f = fixture(["TYPE_TEXT", "DONE"]);
    let helperCalls = 0;
    f.deps.resolveFieldText = async (req) => {
      helperCalls++;
      assert.equal(req.field.ref, "e0");
      assert.equal(req.goal, "Enter Som");
      return { text: "Som" };
    };
    const r = await runBrowserTask(
      {
        goal: "Enter Som",
        scope,
        fields: supplied ? [{ label: "Name", text: "Provided" }] : [],
      },
      f.deps,
      new AbortController().signal,
    );
    assert.equal(helperCalls, supplied ? 0 : 1);
    assert.equal(r.textCalls, helperCalls);
    assert.equal(
      f.calls.find((c) => c.name === "page_type")?.args.text,
      supplied ? "Provided" : "Som",
    );
  }
});

test("helper null, malformed output, budget and cancellation never type", async () => {
  for (const mode of ["null", "malformed", "budget", "cancel"]) {
    const f = fixture(["TYPE_TEXT"]),
      controller = new AbortController();
    f.deps.resolveFieldText = async () => {
      if (mode === "cancel") {
        controller.abort();
        return new Promise(() => {});
      }
      return mode === "malformed" ? { text: "x".repeat(2001) } : { text: null };
    };
    const r = await runBrowserTask(
      { goal: "Enter", scope, maxTextCalls: mode === "budget" ? 0 : 1 },
      f.deps,
      controller.signal,
    );
    assert(!f.calls.some((c) => c.name === "page_type"));
    assert.equal(
      r.reason,
      {
        null: "FIELD_TEXT_REQUIRED",
        malformed: "INVALID_CONTRACT",
        budget: "TEXT_BUDGET",
        cancel: "TASK_CANCELLED",
      }[mode],
    );
  }
});

test("staleness after helper re-reads context; text budget spans recovery", async () => {
  const f = fixture(["TYPE_TEXT", "TYPE_TEXT"]),
    call = f.deps.call;
  f.deps.resolveFieldText = async () => ({ text: "Som" });
  f.deps.call = async (n, a, s) =>
    n === "page_type"
      ? { error: "STALE_OBSERVATION", action_executed: false }
      : call(n, a, s);
  const r = await runBrowserTask(
    { goal: "Fill", scope, maxTextCalls: 1 },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "TEXT_BUDGET");
  assert.equal(r.staleRetries, 1);
  assert.equal(r.textCalls, 1);
});

test("confidence policy comparison keeps target gate and independent verification", async () => {
  for (const operationConfidence of [0.8, 0]) {
    const f = fixture(["CLICK", "DONE"]),
      evaluate = f.deps.evaluate;
    f.deps.evaluate = async (req, s) => {
      const answer = await evaluate(req, s);
      (answer.answers.operation as { confidence: number }).confidence = 0.75;
      return answer;
    };
    f.deps.verify = async () => false;
    const r = await runBrowserTask(
      { goal: "Click", scope, operationConfidence },
      f.deps,
      new AbortController().signal,
    );
    assert.equal(
      r.reason,
      operationConfidence ? "LOW_OPERATION_CONFIDENCE" : "VERIFICATION_FAILED",
    );
    assert.equal(r.steps, operationConfidence ? 0 : 1);
  }
});

test("v1 contract preserves correlation and missing-field handoff", async () => {
  const f = fixture(["TYPE_TEXT"]);
  const events: import("../logic/browser.ts").AdapterProgress[] = [];
  f.deps.progress = (e) => {
    events.push(e);
  };
  const r = await runBrowserTask(
    { contractVersion: 1, goal: "Enter name", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.contractVersion, 1);
  assert.deepEqual(r.fieldRequest, {
    ref: "e0",
    label: "Name",
    reason: "missing",
  });
  assert.equal(events[0].phase, "evaluating");
  assert.equal(events[0].requestId, r.lastEvaluation?.requestId);
  assert.equal(r.lastEvaluation?.model, "test-jev");
});

test("confirmed action survives subsequent uncertainty and progress failures", async () => {
  const f = fixture(["CLICK", "CLICK"]),
    call = f.deps.call;
  let attempts = 0;
  f.deps.call = async (n, a, s) =>
    n === "page_click" && ++attempts === 2
      ? { error: "OUTCOME_UNKNOWN" }
      : call(n, a, s);
  f.deps.progress = () => {
    throw Error("presentation failure");
  };
  const r = await runBrowserTask(
    { goal: "Click", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(r.reason, "OUTCOME_UNKNOWN");
  assert.equal(r.lastConfirmedAction?.outcome, "confirmed");
  assert.equal(r.lastAction?.outcome, "unknown");
  assert.notEqual(
    r.lastAction?.operationId,
    r.lastConfirmedAction?.operationId,
  );
});

test("unsupported contract version rejects before callbacks", async () => {
  let calls = 0;
  const f = fixture([]);
  f.deps.call = async () => {
    calls++;
    return {};
  };
  await assert.rejects(
    runBrowserTask(
      { contractVersion: 2, goal: "Test", scope } as never,
      f.deps,
      new AbortController().signal,
    ),
    (e) => (e as { code: string }).code === "INVALID_INPUT",
  );
  assert.equal(calls, 0);
});

test("async progress rejection or a stalled observer cannot interrupt browser work", async () => {
  for (const mode of ["reject", "stall"] as const) {
    const f = fixture(["CLICK", "DONE"]);
    let reports = 0;
    f.deps.progress = async () => {
      reports++;
      if (mode === "reject") throw Error("SYNTHETIC_PROGRESS_WRITE_FAILED");
      return new Promise<void>(() => {});
    };
    f.deps.verify = async () => true;
    const result = await runBrowserTask(
      { goal: "Click", scope },
      f.deps,
      new AbortController().signal,
    );
    // Give any unhandled rejection a chance to surface in node:test.
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(result.status, "succeeded");
    assert.equal(result.steps, 1);
    assert.equal(result.lastConfirmedAction?.outcome, "confirmed");
    assert.equal(reports, 6);
    assert.equal(f.calls.filter((c) => c.name === "page_click").length, 1);
    assert.equal(f.calls.at(-1)?.name, "browser_task_release");
  }
});

test("explicit start URL navigates under the acquired lease before Jev evaluation", async () => {
  const f = fixture(["DONE"]);
  const result = await runBrowserTask(
    { goal: "Open requested page", scope, startUrl: "https://www.google.com/" },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(result.status, "needs_verification");
  assert.equal(result.steps, 1);
  assert.equal(result.evaluations, 1);
  const navigation = f.calls.find((c) => c.name === "tab_navigate")!;
  assert.equal(navigation.args.url, "https://www.google.com/");
  assert.equal(typeof navigation.args.lease_token, "string");
  assert.ok(
    f.calls.findIndex((c) => c.name === "tab_navigate") <
      f.calls.findIndex((c) => c.name === "page_observe"),
  );
  assert.equal(result.lastConfirmedAction?.operation, "NAVIGATE");
});
test("navigation timeout is unknown, is never replayed and releases ownership", async () => {
  const f = fixture(["DONE"]),
    call = f.deps.call;
  f.deps.call = async (name, args, signal) => {
    if (name === "tab_navigate") {
      f.calls.push({ name, args });
      throw Error("TIMEOUT");
    }
    return call(name, args, signal);
  };
  const result = await runBrowserTask(
    { goal: "Open page", scope, startUrl: "https://www.google.com/" },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(result.reason, "OUTCOME_UNKNOWN");
  assert.equal(result.evaluations, 0);
  assert.equal(f.calls.filter((c) => c.name === "tab_navigate").length, 1);
  assert.equal(f.calls.at(-1)?.name, "browser_task_release");
});
test("new tab without explicit URL reports setup requirement, not malformed protocol", async () => {
  const f = fixture(["DONE"]),
    call = f.deps.call;
  f.deps.call = (name, args, signal) =>
    name === "page_observe"
      ? Promise.resolve({ native_new_tab: true })
      : call(name, args, signal);
  const result = await runBrowserTask(
    { goal: "Open page", scope },
    f.deps,
    new AbortController().signal,
  );
  assert.equal(result.reason, "START_URL_REQUIRED");
  assert.equal(result.evaluations, 0);
});
test("non-web URLs and embedded credentials cannot be used for initial navigation", async () => {
  for (const startUrl of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://user:password@example.com",
  ]) {
    const f = fixture(["DONE"]);
    await assert.rejects(() =>
      runBrowserTask(
        { goal: "Open page", scope, startUrl },
        f.deps,
        new AbortController().signal,
      ),
    );
    assert.equal(f.calls.length, 0);
  }
});

test("offscreen truncation permits complete viewport decisions; legacy or clipped viewport blocks", async () => {
  for (const viewport of [false, true, undefined]) {
    const f = fixture(["DONE"]);
    f.page.truncated = {text:false,elements:true,...(viewport===undefined?{}:{viewport_elements:viewport})};
    f.deps.verify = async () => true;
    const result = await runBrowserTask({goal:"Inspect current viewport",scope},f.deps,new AbortController().signal);
    assert.equal(result.evaluations,viewport===false?1:0);
    assert.equal(result.reason,viewport===false?"VERIFIED":"OBSERVATION_TRUNCATED");
  }
});

test("empty SPA observation is refreshed before evaluation without replaying navigation", async()=>{
 const f=fixture(["DONE"]), original=f.deps.call;let reads=0,evaluations=0;
 f.deps.call=async(...args)=>{if(args[0]==="page_observe" && ++reads<3)return {...snapshot(),text:"",viewport_text:"",elements:[]};return original(...args);};
 const evaluate=f.deps.evaluate;f.deps.evaluate=async(...args)=>{evaluations++;return evaluate(...args);};
 f.deps.verify=async()=>true;
 const result=await runBrowserTask({goal:"Read results",scope,startUrl:"https://fixture.test"},f.deps,new AbortController().signal);
 assert.equal(result.status,"succeeded");assert.equal(evaluations,1);assert(reads>=3);
 assert.equal(f.calls.filter(c=>c.name==="tab_navigate").length,1);
});
test("persistently empty page stops with no paid evaluation",async()=>{
 const f=fixture(["DONE"]);f.page.text="";f.page.elements=[];
 const result=await runBrowserTask({goal:"Read results",scope},f.deps,new AbortController().signal);
 assert.equal(result.reason,"PAGE_CONTENT_UNAVAILABLE");assert.equal(result.evaluations,0);
 assert.equal(f.calls.filter(c=>c.name==="page_observe").length,6);
});


test("default chooser executes validated argmax without a confidence stop", async () => {
  const f=fixture(["CLICK","DONE"]), evaluate=f.deps.evaluate;
  f.deps.evaluate=async(req,s)=>{const r=await evaluate(req,s);(r.answers.operation as {confidence:number}).confidence=0.6; if(r.answers.click_target)(r.answers.click_target as {confidence:number}).confidence=0.6;return r;};
  f.deps.verify=async()=>true;
  const r=await runBrowserTask({goal:"Click",scope},f.deps,new AbortController().signal);
  assert.equal(r.status,"succeeded");assert.equal(r.steps,1);
});

test("cancel during initial navigation preserves uncertainty and cancelled status",async()=>{
 const f=fixture(["DONE"]),controller=new AbortController(),call=f.deps.call;
 f.deps.call=async(...args)=>{if(args[0]==="tab_navigate"){controller.abort();throw Error("cancelled");}return call(...args);};
 const r=await runBrowserTask({goal:"Open page",scope,startUrl:"https://fixture.test"},f.deps,controller.signal);
 assert.equal(r.status,"cancelled");assert.equal(r.reason,"OUTCOME_UNKNOWN");assert.equal(r.lastAction?.outcome,"unknown");
});
