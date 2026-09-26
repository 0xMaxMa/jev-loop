"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handover = void 0;
/** One fallback decision per command; a new command starts with Jev again. */
class Handover {
    available;
    failures = 0;
    active = false;
    calls = 0;
    constructor(available) {
        this.available = available;
    }
    progress(changed) { this.failures = changed ? 0 : this.failures + 1; }
    enter() { if (this.available && !this.active && this.calls === 0 && this.failures >= 3) {
        this.active = true;
        this.failures = 0;
        return true;
    } return false; }
    complete() { this.active = false; this.failures = 0; }
    get exhausted() { return this.calls > 0 && this.failures >= 3; }
    reset() { this.failures = 0; this.active = false; this.calls = 0; }
}
exports.Handover = Handover;
