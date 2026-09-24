"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInterruption = checkInterruption;
exports.interruptible = interruptible;
/** Supersede reasoning promptly; never abort a dispatched mutation through this signal. */
function checkInterruption(signal) {
    if (signal?.aborted)
        throw Error('REVISION_SUPERSEDED');
}
async function interruptible(operation, signal, interrupt) {
    checkInterruption(interrupt);
    signal.throwIfAborted();
    const combined = interrupt ? AbortSignal.any([signal, interrupt]) : signal;
    let stop = () => { };
    try {
        return await Promise.race([
            Promise.resolve().then(() => { checkInterruption(interrupt); return operation(combined); }),
            new Promise((_, reject) => { stop = () => reject(Error(interrupt?.aborted ? 'REVISION_SUPERSEDED' : 'TASK_CANCELLED')); combined.addEventListener('abort', stop, { once: true }); if (combined.aborted)
                stop(); })
        ]);
    }
    finally {
        combined.removeEventListener('abort', stop);
    }
}
