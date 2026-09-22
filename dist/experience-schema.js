"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.Index = exports.Pack = exports.actionCapability = exports.Experience = exports.Pattern = exports.Effect = exports.Action = exports.State = exports.Role = exports.Capability = exports.PackId = exports.Category = exports.Logic = void 0;
exports.compareVersions = compareVersions;
exports.compatible = compatible;
const zod_1 = require("zod");
exports.Logic = zod_1.z.enum(['browser-use', 'computer-use', 'game-use']);
exports.Category = zod_1.z.enum(['web', 'app', 'os', 'game']);
const Version = zod_1.z.string().regex(/^\d{1,5}\.\d{1,5}\.\d{1,5}$/);
const Slug = zod_1.z.string().regex(/^[a-z0-9][a-z0-9.-]{0,79}$/);
exports.PackId = zod_1.z.string().regex(/^(web|app|os|game)\/[a-z0-9][a-z0-9.-]{0,79}$/);
exports.Capability = zod_1.z.enum(['observe', 'click', 'type', 'select', 'keypress', 'scroll', 'open-app', 'press', 'game-action']);
exports.Role = zod_1.z.enum(['input', 'searchbox', 'combobox', 'button', 'link', 'select', 'menu', 'text-area', 'checkbox', 'radio', 'window', 'application', 'game-control', 'viewport']);
exports.State = zod_1.z.enum(['any', 'empty', 'populated', 'expanded', 'collapsed', 'selected', 'unselected', 'available', 'obstacle-ahead', 'enemy-near', 'low-health', 'item-near', 'goal-visible']);
exports.Action = zod_1.z.enum(['click', 'type', 'select', 'press', 'enter', 'tab', 'escape', 'scroll-up', 'scroll-down', 'open-app', 'game-action', 'move-left', 'move-right', 'jump', 'interact', 'attack', 'defend', 'wait']);
exports.Effect = zod_1.z.enum(['value-changed', 'selection-changed', 'expanded-changed', 'application-changed', 'state-changed', 'goal-verified', 'position-changed', 'health-preserved', 'item-collected']);
exports.Pattern = zod_1.z.object({ role: exports.Role, state: exports.State }).strict();
exports.Experience = zod_1.z.object({ id: Slug, when: exports.Pattern, action: exports.Action, expected: exports.Effect }).strict();
const Target = zod_1.z.object({ id: zod_1.z.string().min(1).max(200), pathPrefixes: zod_1.z.array(zod_1.z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).max(120)).max(10).optional(), minVersion: Version.optional(), maxVersion: Version.optional() }).strict();
exports.actionCapability = { click: 'click', type: 'type', select: 'select', press: 'press', enter: 'keypress', tab: 'keypress', escape: 'keypress', 'scroll-up': 'scroll', 'scroll-down': 'scroll', 'open-app': 'open-app', 'game-action': 'game-action', 'move-left': 'game-action', 'move-right': 'game-action', jump: 'game-action', interact: 'game-action', attack: 'game-action', defend: 'game-action' };
exports.Pack = zod_1.z.object({ schemaVersion: zod_1.z.literal(1), id: exports.PackId, version: Version, logic: exports.Logic, contractVersion: zod_1.z.literal(1), category: exports.Category, target: Target, requires: zod_1.z.array(exports.Capability).min(1).max(12), validation: zod_1.z.enum(['fixture', 'live']), checks: zod_1.z.object({ runs: zod_1.z.number().int().min(3), passed: zod_1.z.number().int().min(3) }).strict(), experiences: zod_1.z.array(exports.Experience).min(1).max(100) }).strict().superRefine((p, c) => {
    if (p.checks.passed > p.checks.runs)
        c.addIssue({ code: 'custom', message: 'INVALID_CHECKS' });
    if (!p.id.startsWith(p.category + '/'))
        c.addIssue({ code: 'custom', message: 'CATEGORY_MISMATCH' });
    if (p.category === 'web') {
        try {
            const u = new URL(p.target.id);
            if (!['http:', 'https:'].includes(u.protocol) || u.origin !== p.target.id)
                c.addIssue({ code: 'custom', message: 'ORIGIN_REQUIRED' });
        }
        catch {
            c.addIssue({ code: 'custom', message: 'ORIGIN_REQUIRED' });
        }
        if (p.logic !== 'browser-use')
            c.addIssue({ code: 'custom', message: 'LOGIC_MISMATCH' });
    }
    else if (p.target.pathPrefixes)
        c.addIssue({ code: 'custom', message: 'PATH_ONLY_FOR_WEB' });
    if (['app', 'os'].includes(p.category) && p.logic !== 'computer-use')
        c.addIssue({ code: 'custom', message: 'LOGIC_MISMATCH' });
    if (p.category === 'game' && p.logic !== 'game-use')
        c.addIssue({ code: 'custom', message: 'LOGIC_MISMATCH' });
    if (new Set(p.experiences.map(e => e.id)).size !== p.experiences.length)
        c.addIssue({ code: 'custom', message: 'DUPLICATE_EXPERIENCE' });
    for (const e of p.experiences)
        if (exports.actionCapability[e.action] && !p.requires.includes(exports.actionCapability[e.action]))
            c.addIssue({ code: 'custom', message: 'MISSING_CAPABILITY' });
});
exports.Index = zod_1.z.object({ schemaVersion: zod_1.z.literal(1), packs: zod_1.z.array(zod_1.z.object({ id: exports.PackId, version: Version, sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/), logic: exports.Logic, category: exports.Category, target: Target, contractVersion: zod_1.z.literal(1), requires: zod_1.z.array(exports.Capability).max(12) }).strict()).max(2000) }).strict();
exports.Context = zod_1.z.object({ logic: exports.Logic, capabilities: zod_1.z.array(exports.Capability).max(12), identity: zod_1.z.object({ category: exports.Category, id: zod_1.z.string().min(1).max(200), version: Version.optional(), path: zod_1.z.string().max(4096).optional() }).strict(), controls: zod_1.z.array(exports.Pattern).max(2000) }).strict();
function compareVersions(a, b) { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++)
    if (x[i] !== y[i])
        return x[i] - y[i]; return 0; }
function compatible(entry, context) {
    if (entry.logic !== context.logic || entry.category !== context.identity.category || entry.target.id !== context.identity.id || entry.contractVersion !== 1 || entry.requires.some(c => !context.capabilities.includes(c)))
        return false;
    if (entry.target.pathPrefixes && !entry.target.pathPrefixes.some(p => context.identity.path === p || context.identity.path?.startsWith(p.endsWith('/') ? p : p + '/')))
        return false;
    if (entry.target.minVersion || entry.target.maxVersion) {
        if (!context.identity.version || !Version.safeParse(context.identity.version).success)
            return false;
        if (entry.target.minVersion && compareVersions(context.identity.version, entry.target.minVersion) < 0)
            return false;
        if (entry.target.maxVersion && compareVersions(context.identity.version, entry.target.maxVersion) > 0)
            return false;
    }
    return true;
}
