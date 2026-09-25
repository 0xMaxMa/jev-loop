import type { ActionThinkingRequest, ActionThinkingDecision } from '../action-thinking';
import { z } from 'zod';
export declare const COMPUTER_USE_CONTRACT_VERSION = 1;
export declare const ComputerObservation: z.ZodObject<{
    supportedActions: z.ZodOptional<z.ZodArray<z.ZodEnum<["scroll:up", "scroll:down", "navigate:back", "navigate:forward"]>, "many">>;
    screenshotAvailable: z.ZodOptional<z.ZodBoolean>;
    generation: z.ZodString;
    application: z.ZodString;
    controls: z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        label: z.ZodString;
        role: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
        focused: z.ZodOptional<z.ZodBoolean>;
        actions: z.ZodArray<z.ZodEnum<["press", "type"]>, "many">;
        sensitive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        ref: string;
        label: string;
        role: string;
        actions: ("type" | "press")[];
        value?: string | undefined;
        sensitive?: boolean | undefined;
        focused?: boolean | undefined;
    }, {
        ref: string;
        label: string;
        role: string;
        actions: ("type" | "press")[];
        value?: string | undefined;
        sensitive?: boolean | undefined;
        focused?: boolean | undefined;
    }>, "many">;
    focusedControl: z.ZodOptional<z.ZodObject<{
        ref: z.ZodOptional<z.ZodString>;
        role: z.ZodString;
        label: z.ZodString;
        sensitive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        role: string;
        ref?: string | undefined;
        sensitive?: boolean | undefined;
    }, {
        label: string;
        role: string;
        ref?: string | undefined;
        sensitive?: boolean | undefined;
    }>>;
    windowTitle: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    truncated: z.ZodBoolean;
    platform: z.ZodOptional<z.ZodObject<{
        os: z.ZodString;
        osVersion: z.ZodString;
        appVersion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        os: string;
        osVersion: string;
        appVersion?: string | undefined;
    }, {
        os: string;
        osVersion: string;
        appVersion?: string | undefined;
    }>>;
    apps: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    generation: string;
    truncated: boolean;
    application: string;
    controls: {
        ref: string;
        label: string;
        role: string;
        actions: ("type" | "press")[];
        value?: string | undefined;
        sensitive?: boolean | undefined;
        focused?: boolean | undefined;
    }[];
    apps: {
        id: string;
        name: string;
    }[];
    text?: string[] | undefined;
    supportedActions?: ("scroll:up" | "scroll:down" | "navigate:back" | "navigate:forward")[] | undefined;
    screenshotAvailable?: boolean | undefined;
    focusedControl?: {
        label: string;
        role: string;
        ref?: string | undefined;
        sensitive?: boolean | undefined;
    } | undefined;
    windowTitle?: string | undefined;
    platform?: {
        os: string;
        osVersion: string;
        appVersion?: string | undefined;
    } | undefined;
}, {
    generation: string;
    truncated: boolean;
    application: string;
    controls: {
        ref: string;
        label: string;
        role: string;
        actions: ("type" | "press")[];
        value?: string | undefined;
        sensitive?: boolean | undefined;
        focused?: boolean | undefined;
    }[];
    apps: {
        id: string;
        name: string;
    }[];
    text?: string[] | undefined;
    supportedActions?: ("scroll:up" | "scroll:down" | "navigate:back" | "navigate:forward")[] | undefined;
    screenshotAvailable?: boolean | undefined;
    focusedControl?: {
        label: string;
        role: string;
        ref?: string | undefined;
        sensitive?: boolean | undefined;
    } | undefined;
    windowTitle?: string | undefined;
    platform?: {
        os: string;
        osVersion: string;
        appVersion?: string | undefined;
    } | undefined;
}>;
export type ComputerState = z.infer<typeof ComputerObservation>;
export interface GoalRevision {
    revision: number;
    goal: string;
}
/** Structural diagnostics only: no typed text, window contents or private field labels. */
export interface ComputerProgress {
    sequence: number;
    round: number;
    at: number;
    revision: number;
    steps: number;
    evaluations: number;
    phase: 'observing' | 'observed' | 'evaluating' | 'decided' | 'thinking' | 'verifying' | 'acting' | 'acted' | 'waiting' | 'reconciling' | 'terminal';
    application?: string;
    appId?: string;
    action?: 'open' | 'press' | 'type' | 'key' | 'scroll' | 'navigate' | 'WAIT' | 'DONE' | 'BLOCKED';
    key?: string;
    ref?: string;
    role?: string;
    focused?: boolean;
    operationId?: string;
    requestId?: string;
    confidence?: number;
    elapsedMs?: number;
    outcome?: 'completed' | 'not_executed' | 'unknown';
    changed?: boolean;
    reason?: string;
    status?: ComputerUseResult['status'];
}
export interface ComputerUseDependencies {
    decideAction?: (request: ActionThinkingRequest, signal: AbortSignal) => Promise<ActionThinkingDecision>;
    interruptSignal?: AbortSignal;
    call(name: string, args: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
    evaluate(request: {
        state: unknown;
        questions: Record<string, {
            type: 'choice';
            instructions: string;
            criteria: Record<string, string>;
        }>;
        requestId: string;
    }, signal: AbortSignal): Promise<{
        answers: Record<string, unknown>;
    }>;
    observation?: (state: ComputerState) => void;
    snapshot?: (state: ComputerState, signal: AbortSignal) => Promise<void>;
    thinking?: (request: unknown, signal: AbortSignal) => Promise<unknown>;
    latestGoal?: () => GoalRevision;
    authorized: () => boolean;
    beforeMutation: (operationId: string, action: unknown) => Promise<void> | void;
    progress?: (event: ComputerProgress) => void;
    verify?: (state: ComputerState, goal: string, signal: AbortSignal) => Promise<boolean>;
}
export interface ComputerUseResult {
    status: 'succeeded' | 'needs_verification' | 'needs_input' | 'blocked' | 'cancelled' | 'needs_reconciliation';
    reason: string;
    revision: number;
    steps: number;
    evaluations: number;
    trace: {
        events: ComputerProgress[];
        truncated: boolean;
    };
    operationId?: string;
    observation?: ComputerState;
}
export declare function runComputerUse(raw: unknown, deps: ComputerUseDependencies, signal: AbortSignal): Promise<ComputerUseResult>;
