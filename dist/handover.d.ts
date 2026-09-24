/** One fallback decision per command; a new command starts with Jev again. */
export declare class Handover {
    readonly available: boolean;
    failures: number;
    active: boolean;
    calls: number;
    constructor(available: boolean);
    progress(changed: boolean): void;
    enter(): boolean;
    complete(): void;
    get exhausted(): boolean;
    reset(): void;
}
