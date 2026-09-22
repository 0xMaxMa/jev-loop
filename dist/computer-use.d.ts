import { z } from 'zod';
export declare const COMPUTER_USE_CONTRACT_VERSION = 1;
export declare const ComputerObservation: z.ZodObject<{
    generation: z.ZodString;
    application: z.ZodString;
    controls: z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        label: z.ZodString;
        role: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
        actions: z.ZodArray<z.ZodEnum<["press", "type"]>, "many">;
        sensitive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        ref: string;
        label: string;
        role: string;
        actions: ("type" | "press")[];
        value?: string | undefined;
        sensitive?: boolean | undefined;
    }, {
        ref: string;
        label: string;
        role: string;
        actions: ("type" | "press")[];
        value?: string | undefined;
        sensitive?: boolean | undefined;
    }>, "many">;
    truncated: z.ZodBoolean;
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
    }[];
    apps: {
        id: string;
        name: string;
    }[];
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
    }[];
    apps: {
        id: string;
        name: string;
    }[];
}>;
export type ComputerState = z.infer<typeof ComputerObservation>;
export interface GoalRevision {
    revision: number;
    goal: string;
}
export interface ComputerUseDependencies {
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
    thinking?: (request: unknown, signal: AbortSignal) => Promise<unknown>;
    latestGoal?: () => GoalRevision;
    authorized: () => boolean;
    beforeMutation: (operationId: string, action: unknown) => Promise<void> | void;
    progress?: (event: Record<string, unknown>) => void;
    verify?: (state: ComputerState, goal: string, signal: AbortSignal) => Promise<boolean>;
}
export interface ComputerUseResult {
    status: 'succeeded' | 'needs_verification' | 'needs_input' | 'blocked' | 'cancelled' | 'needs_reconciliation';
    reason: string;
    revision: number;
    steps: number;
    operationId?: string;
    observation?: ComputerState;
}
export declare function runComputerUse(raw: unknown, deps: ComputerUseDependencies, signal: AbortSignal): Promise<ComputerUseResult>;
