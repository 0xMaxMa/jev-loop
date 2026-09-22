import type { ExperienceContext, ExperienceHooks, ExperienceRecord, ExperienceHint } from './experience-schema.js';
export type Pattern = ExperienceRecord['when'];
/** OS/tool roles normalize to compact semantic categories; no labels or values persist. */
export declare function controlPattern(control: {
    role?: string;
    tag?: string;
    type?: string;
    value?: string;
    expanded?: string | boolean;
    selected?: string | boolean;
    checked?: unknown;
}): Pattern;
export declare class ExperienceRun {
    private hooks?;
    private candidates;
    constructor(hooks?: ExperienceHooks | undefined);
    hints(context: ExperienceContext, signal: AbortSignal): Promise<ExperienceHint[]>;
    effect(context: ExperienceContext, experience: Omit<ExperienceRecord, 'id'>, id: string): Promise<void>;
    reset(): void;
    verified(): Promise<void>;
}
export declare function browserExperience(page: {
    url: string;
    elements: Array<{
        role?: string;
        tag?: string;
        type?: string;
        value?: string;
        expanded?: string | boolean;
        selected?: string | boolean;
        checked?: unknown;
        sensitive?: boolean;
        in_viewport?: boolean;
    }>;
}): ExperienceContext;
export declare function computerExperiences(state: {
    application: string;
    platform?: {
        os: string;
        osVersion: string;
        appVersion?: string;
    };
    controls: Array<{
        role?: string;
        value?: string;
        sensitive?: boolean;
    }>;
}): ExperienceContext[];
