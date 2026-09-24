"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handover = void 0;
/** A mode is scoped to one user command. Progress resets failures, not ownership. */
class Handover {
    available;
    failures = 0;
    active = false;
    calls = 0;
    constructor(available) {
        this.available = available;
    }
    progress(changed) { this.failures = changed ? 0 : this.failures + 1; }
    enter() { if (this.available && !this.active && this.failures >= 3) {
        this.active = true;
        this.failures = 0;
        return true;
    } return false; }
    get exhausted() { return this.active && (this.failures >= 3 || this.calls >= 8); }
    reset() { this.failures = 0; this.active = false; this.calls = 0; }
}
exports.Handover = Handover;
