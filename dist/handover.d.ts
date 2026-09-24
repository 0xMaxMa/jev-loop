/** A mode is scoped to one user command. Progress resets failures, not ownership. */
export declare class Handover {
    readonly available: boolean;
    failures: number;
    active: boolean;
    calls: number;
    constructor(available: boolean);
    progress(changed: boolean): void;
    enter(): boolean;
    get exhausted(): boolean;
    reset(): void;
}
