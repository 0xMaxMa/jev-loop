import type { ActionThinkingRequest, ActionThinkingDecision } from '../action-thinking';
import { BrowserTraceEvent, BrowserTrace } from "./browser-trace.js";
import { z } from "zod";
export declare const BROWSER_USE_CONTRACT_VERSION: 1;
export declare class BrowserUseInputError extends Error {
    readonly code = "INVALID_INPUT";
    constructor();
}
export declare const BrowserObservation: z.ZodObject<{
    protocol_version: z.ZodLiteral<1>;
    generation: z.ZodString;
    url: z.ZodString;
    title: z.ZodString;
    text: z.ZodString;
    viewport_text: z.ZodOptional<z.ZodString>;
    elements: z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        label: z.ZodString;
        context: z.ZodOptional<z.ZodString>;
        value_now: z.ZodOptional<z.ZodString>;
        value_text: z.ZodOptional<z.ZodString>;
        type: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
        tag: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodString>;
        value_truncated: z.ZodOptional<z.ZodBoolean>;
        checked: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
        selected: z.ZodOptional<z.ZodString>;
        expanded: z.ZodOptional<z.ZodString>;
        disabled: z.ZodOptional<z.ZodBoolean>;
        readonly: z.ZodOptional<z.ZodBoolean>;
        sensitive: z.ZodOptional<z.ZodBoolean>;
        operations: z.ZodArray<z.ZodEnum<["CLICK", "TYPE_TEXT", "SELECT"]>, "many">;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            ref: z.ZodString;
            label: z.ZodString;
            disabled: z.ZodBoolean;
            selected: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            ref: string;
            label: string;
            selected: boolean;
            disabled: boolean;
        }, {
            ref: string;
            label: string;
            selected: boolean;
            disabled: boolean;
        }>, "many">>;
        options_truncated: z.ZodOptional<z.ZodBoolean>;
        in_viewport: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        ref: string;
        label: string;
        tag: string;
        operations: ("CLICK" | "TYPE_TEXT" | "SELECT")[];
        value?: string | undefined;
        options?: {
            ref: string;
            label: string;
            selected: boolean;
            disabled: boolean;
        }[] | undefined;
        type?: string | undefined;
        context?: string | undefined;
        value_now?: string | undefined;
        value_text?: string | undefined;
        role?: string | undefined;
        value_truncated?: boolean | undefined;
        checked?: string | boolean | undefined;
        selected?: string | undefined;
        expanded?: string | undefined;
        disabled?: boolean | undefined;
        readonly?: boolean | undefined;
        sensitive?: boolean | undefined;
        options_truncated?: boolean | undefined;
        in_viewport?: boolean | undefined;
    }, {
        ref: string;
        label: string;
        tag: string;
        operations: ("CLICK" | "TYPE_TEXT" | "SELECT")[];
        value?: string | undefined;
        options?: {
            ref: string;
            label: string;
            selected: boolean;
            disabled: boolean;
        }[] | undefined;
        type?: string | null | undefined;
        context?: string | undefined;
        value_now?: string | undefined;
        value_text?: string | undefined;
        role?: string | undefined;
        value_truncated?: boolean | undefined;
        checked?: string | boolean | undefined;
        selected?: string | undefined;
        expanded?: string | undefined;
        disabled?: boolean | undefined;
        readonly?: boolean | undefined;
        sensitive?: boolean | undefined;
        options_truncated?: boolean | undefined;
        in_viewport?: boolean | undefined;
    }>, "many">;
    scroll: z.ZodObject<{
        y: z.ZodOptional<z.ZodNumber>;
        up: z.ZodBoolean;
        down: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        up: boolean;
        down: boolean;
        y?: number | undefined;
    }, {
        up: boolean;
        down: boolean;
        y?: number | undefined;
    }>;
    truncated: z.ZodObject<{
        text: z.ZodBoolean;
        elements: z.ZodBoolean;
        viewport_elements: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        text: boolean;
        elements: boolean;
        viewport_elements?: boolean | undefined;
    }, {
        text: boolean;
        elements: boolean;
        viewport_elements?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    protocol_version: 1;
    generation: string;
    url: string;
    title: string;
    text: string;
    elements: {
        ref: string;
        label: string;
        tag: string;
        operations: ("CLICK" | "TYPE_TEXT" | "SELECT")[];
        value?: string | undefined;
        options?: {
            ref: string;
            label: string;
            selected: boolean;
            disabled: boolean;
        }[] | undefined;
        type?: string | undefined;
        context?: string | undefined;
        value_now?: string | undefined;
        value_text?: string | undefined;
        role?: string | undefined;
        value_truncated?: boolean | undefined;
        checked?: string | boolean | undefined;
        selected?: string | undefined;
        expanded?: string | undefined;
        disabled?: boolean | undefined;
        readonly?: boolean | undefined;
        sensitive?: boolean | undefined;
        options_truncated?: boolean | undefined;
        in_viewport?: boolean | undefined;
    }[];
    scroll: {
        up: boolean;
        down: boolean;
        y?: number | undefined;
    };
    truncated: {
        text: boolean;
        elements: boolean;
        viewport_elements?: boolean | undefined;
    };
    viewport_text?: string | undefined;
}, {
    protocol_version: 1;
    generation: string;
    url: string;
    title: string;
    text: string;
    elements: {
        ref: string;
        label: string;
        tag: string;
        operations: ("CLICK" | "TYPE_TEXT" | "SELECT")[];
        value?: string | undefined;
        options?: {
            ref: string;
            label: string;
            selected: boolean;
            disabled: boolean;
        }[] | undefined;
        type?: string | null | undefined;
        context?: string | undefined;
        value_now?: string | undefined;
        value_text?: string | undefined;
        role?: string | undefined;
        value_truncated?: boolean | undefined;
        checked?: string | boolean | undefined;
        selected?: string | undefined;
        expanded?: string | undefined;
        disabled?: boolean | undefined;
        readonly?: boolean | undefined;
        sensitive?: boolean | undefined;
        options_truncated?: boolean | undefined;
        in_viewport?: boolean | undefined;
    }[];
    scroll: {
        up: boolean;
        down: boolean;
        y?: number | undefined;
    };
    truncated: {
        text: boolean;
        elements: boolean;
        viewport_elements?: boolean | undefined;
    };
    viewport_text?: string | undefined;
}>;
export type Observation = z.infer<typeof BrowserObservation>;
export type ChoiceQuestion = {
    type: "choice";
    instructions: string;
    criteria: Record<string, string>;
};
export type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
export type EvaluationRequest = {
    requestId: string;
    state: {
        [key: string]: JsonValue;
    };
    questions: Record<string, ChoiceQuestion>;
};
export type EvaluationResponse = {
    model: string;
    answers: Record<string, unknown>;
};
export type BrowserScope = {
    device_id: string;
    grant_id: string;
    tab_id: string;
};
export type BrowserToolCall = (name: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>;
export type FieldTextRequest = {
    goal: string;
    field: Observation["elements"][number];
    page: {
        url: string;
        title: string;
        text: string;
    };
    recent_actions?: unknown[];
};
export type BrowserRecoveryRequest = {
    goal: string;
    reason: string;
    page: Observation;
    recent_actions: unknown[];
    supplied_fields: Array<{
        label: string;
        text: string;
    }>;
    screenshot?: {
        mimeType: 'image/png';
        data: string;
    };
};
export type BrowserRecoveryPlan = {
    guidance: string | null;
    fields: Array<{
        label: string;
        text: string;
    }>;
};
export type BrowserUseDependencies = {
    decideAction?: (request: ActionThinkingRequest, signal: AbortSignal) => Promise<ActionThinkingDecision>;
    /** Optional tool-free reasoning. Suggestions never execute actions or replace the goal. */
    recover?: (request: BrowserRecoveryRequest, signal: AbortSignal) => Promise<BrowserRecoveryPlan>;
    snapshot?: (leaseToken: string, signal: AbortSignal) => Promise<{
        mimeType: 'image/png';
        data: string;
    }>;
    /** Private host sink; events contain no page text, labels or field values. */
    trace?: (event: BrowserTraceEvent) => void;
    interruptSignal?: AbortSignal;
    call: BrowserToolCall;
    evaluate: (request: EvaluationRequest, signal: AbortSignal) => Promise<EvaluationResponse>;
    /** Host-owned Thinking implementation; no provider credentials live in this adapter. */
    resolveFieldText?: (request: FieldTextRequest, signal: AbortSignal) => Promise<{
        text: string | null;
    }>;
    /** Trusted code, independent of the chooser. No verifier means needs_verification. */
    verify?: (observation: Observation, signal: AbortSignal) => Promise<boolean>;
    progress?: (event: BrowserUseProgress) => void | Promise<void>;
};
export type BrowserUseProgress = {
    contractVersion: 1;
    phase: "evaluating" | "decided" | "acting" | "acted";
    steps: number;
    evaluations: number;
    requestId?: string;
    operationId?: string;
    model?: string;
    decision_ms?: number;
    operation_confidence?: number;
    target_confidence?: number;
};
declare const Input: z.ZodObject<{
    contractVersion: z.ZodDefault<z.ZodLiteral<1>>;
    goal: z.ZodString;
    startUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    scope: z.ZodObject<{
        device_id: z.ZodString;
        grant_id: z.ZodString;
        tab_id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        device_id: string;
        grant_id: string;
        tab_id: string;
    }, {
        device_id: string;
        grant_id: string;
        tab_id: string;
    }>;
    fields: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        text: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        label: string;
        text: string;
    }, {
        label: string;
        text: string;
    }>, "many">>;
    maxStaleRetries: z.ZodDefault<z.ZodNumber>;
    maxTextCalls: z.ZodDefault<z.ZodNumber>;
    yieldAfterAction: z.ZodDefault<z.ZodBoolean>;
    maxSteps: z.ZodDefault<z.ZodNumber>;
    maxEvaluations: z.ZodDefault<z.ZodNumber>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    operationConfidence: z.ZodDefault<z.ZodNumber>;
    targetConfidence: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    contractVersion: 1;
    goal: string;
    scope: {
        device_id: string;
        grant_id: string;
        tab_id: string;
    };
    fields: {
        label: string;
        text: string;
    }[];
    maxStaleRetries: number;
    maxTextCalls: number;
    yieldAfterAction: boolean;
    maxSteps: number;
    maxEvaluations: number;
    timeoutMs: number;
    operationConfidence: number;
    targetConfidence: number;
    startUrl?: string | undefined;
}, {
    goal: string;
    scope: {
        device_id: string;
        grant_id: string;
        tab_id: string;
    };
    contractVersion?: 1 | undefined;
    startUrl?: string | undefined;
    fields?: {
        label: string;
        text: string;
    }[] | undefined;
    maxStaleRetries?: number | undefined;
    maxTextCalls?: number | undefined;
    yieldAfterAction?: boolean | undefined;
    maxSteps?: number | undefined;
    maxEvaluations?: number | undefined;
    timeoutMs?: number | undefined;
    operationConfidence?: number | undefined;
    targetConfidence?: number | undefined;
}>;
export type BrowserUseInput = z.input<typeof Input>;
export type BrowserUseResult = {
    contractVersion: 1;
    trace?: BrowserTrace;
    lastEvaluation?: {
        requestId: string;
        model?: string;
    };
    lastConfirmedAction?: {
        operationId: string;
        operation: string;
        outcome: "confirmed";
    };
    fieldRequest?: {
        ref: string;
        label: string;
        reason: "missing" | "ambiguous";
    };
    status: "succeeded" | "blocked" | "cancelled" | "failed" | "needs_verification";
    reason: string;
    steps: number;
    evaluations: number;
    staleRetries: number;
    textCalls: number;
    lastAction?: {
        operationId: string;
        operation: string;
        outcome: "confirmed" | "unknown" | "not_executed";
    };
    observation?: Observation;
};
export declare function decisionQuestions(page: Observation, goal?: string, exhaustedTextFields?: Set<string>): {
    questions: Record<string, ChoiceQuestion>;
    targets: Map<string, {
        element: Observation["elements"][number];
        option?: string;
    }>;
};
/** Run inside the gateway-owned task lifecycle; this function creates no queue or key store. */
export declare function runBrowserUse(raw: BrowserUseInput, deps: BrowserUseDependencies, signal: AbortSignal): Promise<BrowserUseResult>;
/** Adapt an authenticated MCP client. Principal scope and cancellation stay with its owner. */
export declare function mcpBrowserTransport(invoke: (name: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<{
    content: unknown[];
    isError?: boolean;
}>): BrowserToolCall;
export {};
