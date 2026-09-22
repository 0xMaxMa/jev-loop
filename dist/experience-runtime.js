"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceRun = void 0;
exports.controlPattern = controlPattern;
exports.browserExperience = browserExperience;
exports.computerExperiences = computerExperiences;
/** OS/tool roles normalize to compact semantic categories; no labels or values persist. */
function controlPattern(control) {
    const raw = (control.role ?? control.tag ?? '').toLowerCase();
    const roles = { input: 'input', textbox: 'input', axtextfield: 'input', searchbox: 'searchbox', combobox: 'combobox', axcombobox: 'combobox', textarea: 'text-area', axtextarea: 'text-area', button: 'button', axbutton: 'button', link: 'link', a: 'link', axlink: 'link', select: 'select', axpopupbutton: 'select', menu: 'menu', checkbox: 'checkbox', axcheckbox: 'checkbox', radio: 'radio', axradiobutton: 'radio' };
    const role = control.type === 'search' ? 'searchbox' : roles[raw] ?? 'button';
    let state = 'available';
    if (control.expanded === true || control.expanded === 'true')
        state = 'expanded';
    else if (control.selected === true || control.selected === 'true' || control.checked === true)
        state = 'selected';
    else if (control.value !== undefined)
        state = control.value ? 'populated' : 'empty';
    else if (control.expanded === false || control.expanded === 'false')
        state = 'collapsed';
    return { role, state };
}
class ExperienceRun {
    hooks;
    candidates = [];
    constructor(hooks) {
        this.hooks = hooks;
    }
    async hints(context, signal) { try {
        return await this.hooks?.select(context, signal) ?? [];
    }
    catch {
        return [];
    } }
    async effect(context, experience, id) { if (!this.hooks)
        return; try {
        await this.hooks.record(context, experience, 'effect-only', id + ':effect');
        this.candidates.push({ context, experience, id });
        this.candidates = this.candidates.slice(-50);
    }
    catch { /* learning cannot fail a user action */ } }
    reset() { this.candidates = []; }
    async verified() { const unique = new Set(); for (const c of this.candidates) {
        const key = JSON.stringify([c.context.logic, c.context.identity, c.experience]);
        if (unique.has(key))
            continue;
        unique.add(key);
        try {
            await this.hooks?.record(c.context, c.experience, 'verified-success', c.id + ':goal');
        }
        catch { }
    } this.candidates = []; }
}
exports.ExperienceRun = ExperienceRun;
function browserExperience(page) {
    const url = new URL(page.url);
    return { logic: 'browser-use', identity: { category: 'web', id: url.origin, path: url.pathname }, capabilities: ['observe', 'click', 'type', 'select', 'scroll'], controls: page.elements.filter(c => !c.sensitive && c.in_viewport !== false).map(controlPattern) };
}
function computerExperiences(state) {
    const base = { logic: 'computer-use', capabilities: ['observe', 'press', 'type', 'keypress', 'open-app'], controls: state.controls.filter(c => !c.sensitive).map(controlPattern) };
    return [{ ...base, identity: { category: 'app', id: state.application, ...(state.platform?.appVersion ? { version: state.platform.appVersion } : {}) } }, ...(state.platform ? [{ ...base, identity: { category: 'os', id: state.platform.os, version: state.platform.osVersion }, controls: [{ role: 'application', state: 'available' }] }] : [])];
}
