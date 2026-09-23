/** Supersede reasoning promptly; never abort a dispatched mutation through this signal. */
export declare function checkInterruption(signal?: AbortSignal): void;
export declare function interruptible<T>(operation: (signal: AbortSignal) => Promise<T>, signal: AbortSignal, interrupt?: AbortSignal): Promise<T>;
