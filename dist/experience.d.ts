import { z } from 'zod';
import { type ExperienceContext, type ExperienceHooks, type ExperienceHint, type ExperienceRecord } from './experience-schema.js';
export { Pack, Index, Experience, compatible } from './experience-schema.js';
export type { ExperienceContext, ExperienceHooks, ExperienceHint, ExperienceRecord } from './experience-schema.js';
export declare const DEFAULT_EXPERIENCE_REGISTRY = "https://raw.githubusercontent.com/0xMaxMa/jev-loop/main/experience-packs/";
export declare const ExperienceConfig: z.ZodObject<Omit<{
    directory: z.ZodEffects<z.ZodString, string, string>;
    scope: z.ZodString;
    registryUrl: z.ZodDefault<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    autoDownload: z.ZodDefault<z.ZodBoolean>;
    maxRecords: z.ZodDefault<z.ZodNumber>;
    maxHints: z.ZodDefault<z.ZodNumber>;
    maxHintBytes: z.ZodDefault<z.ZodNumber>;
    maxPacks: z.ZodDefault<z.ZodNumber>;
    recordTtlDays: z.ZodDefault<z.ZodNumber>;
    downloadTimeoutMs: z.ZodDefault<z.ZodNumber>;
    runId: z.ZodOptional<z.ZodString>;
    indexTtlMs: z.ZodDefault<z.ZodNumber>;
}, "scope" | "directory" | "runId">, "strict", z.ZodTypeAny, {
    registryUrl: string;
    enabled: boolean;
    autoDownload: boolean;
    maxRecords: number;
    maxHints: number;
    maxHintBytes: number;
    maxPacks: number;
    recordTtlDays: number;
    downloadTimeoutMs: number;
    indexTtlMs: number;
}, {
    registryUrl?: string | undefined;
    enabled?: boolean | undefined;
    autoDownload?: boolean | undefined;
    maxRecords?: number | undefined;
    maxHints?: number | undefined;
    maxHintBytes?: number | undefined;
    maxPacks?: number | undefined;
    recordTtlDays?: number | undefined;
    downloadTimeoutMs?: number | undefined;
    indexTtlMs?: number | undefined;
}>;
export type ExperienceConfigInput = z.input<typeof ExperienceConfig>;
export interface ExperienceOptions {
    directory: string;
    scope: string;
    registryUrl?: string;
    enabled?: boolean;
    autoDownload?: boolean;
    maxRecords?: number;
    maxHints?: number;
    maxHintBytes?: number;
    maxPacks?: number;
    recordTtlDays?: number;
    downloadTimeoutMs?: number;
    indexTtlMs?: number;
    runId?: string;
    fetch?: typeof fetch;
    now?: () => number;
    onEvent?: (event: {
        type: string;
        packId?: string;
        code?: string;
    }) => void;
}
/** Structured, scoped experience. No page text, typed values, code or arbitrary downloads. */
export declare class ExperienceLibrary implements ExperienceHooks {
    private options;
    private root;
    private local;
    private indexPath;
    private base;
    private fetch;
    private now;
    private event;
    private queue;
    private index?;
    private loading?;
    constructor(raw: ExperienceOptions);
    private emit;
    private read;
    private atomic;
    private download;
    private registry;
    private pack;
    private prunePacks;
    private contextKey;
    private localFile;
    private matches;
    select(context: ExperienceContext, signal: AbortSignal): Promise<ExperienceHint[]>;
    record(context: ExperienceContext, raw: Omit<ExperienceRecord, 'id'>, outcome: 'verified-success' | 'verified-failure' | 'effect-only' | 'unknown' | 'infrastructure', evidenceId: string): Promise<void>;
    /** Call only after the host has committed independent, scoped completion evidence. */
    verifyRun(runId: string): Promise<void>;
    private mutate;
    stats(): Promise<{
        records: number;
        verifiedSuccesses: number;
        verifiedFailures: number;
        observedEffects: number;
        active: number;
        scopeHash: string;
    }>;
}
