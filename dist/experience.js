"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceLibrary = exports.ExperienceConfig = exports.DEFAULT_EXPERIENCE_REGISTRY = exports.compatible = exports.Experience = exports.Index = exports.Pack = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const experience_schema_js_1 = require("./experience-schema.js");
var experience_schema_js_2 = require("./experience-schema.js");
Object.defineProperty(exports, "Pack", { enumerable: true, get: function () { return experience_schema_js_2.Pack; } });
Object.defineProperty(exports, "Index", { enumerable: true, get: function () { return experience_schema_js_2.Index; } });
Object.defineProperty(exports, "Experience", { enumerable: true, get: function () { return experience_schema_js_2.Experience; } });
Object.defineProperty(exports, "compatible", { enumerable: true, get: function () { return experience_schema_js_2.compatible; } });
exports.DEFAULT_EXPERIENCE_REGISTRY = 'https://raw.githubusercontent.com/0xMaxMa/jev-loop/main/experience-packs/';
const hash = (v) => (0, node_crypto_1.createHash)('sha256').update(v).digest('hex');
const stable = (v) => JSON.stringify(v);
const Options = zod_1.z.object({ directory: zod_1.z.string().refine(node_path_1.default.isAbsolute), scope: zod_1.z.string().min(1).max(500), registryUrl: zod_1.z.string().default(exports.DEFAULT_EXPERIENCE_REGISTRY), enabled: zod_1.z.boolean().default(true), autoDownload: zod_1.z.boolean().default(true), maxRecords: zod_1.z.number().int().min(1).max(2000).default(500), maxHints: zod_1.z.number().int().min(1).max(10).default(5), maxHintBytes: zod_1.z.number().int().min(128).max(8192).default(2048), maxPacks: zod_1.z.number().int().min(1).max(200).default(50), recordTtlDays: zod_1.z.number().int().min(1).max(365).default(90), downloadTimeoutMs: zod_1.z.number().int().min(10).max(10000).default(1500), runId: zod_1.z.string().min(1).max(200).optional(), indexTtlMs: zod_1.z.number().int().min(0).max(86400000).default(3600000) }).strict();
exports.ExperienceConfig = Options.omit({ directory: true, scope: true, runId: true });
const LocalRecord = zod_1.z.object({ key: zod_1.z.string(), contextKey: zod_1.z.string(), logic: experience_schema_js_1.Logic, experience: experience_schema_js_1.Experience.omit({ id: true }), success: zod_1.z.number().int().nonnegative().max(1000000), failure: zod_1.z.number().int().nonnegative().max(1000000), effects: zod_1.z.number().int().nonnegative().max(1000000), updatedAt: zod_1.z.number(), evidence: zod_1.z.array(zod_1.z.string().regex(/^[a-f0-9]{64}$/)).max(32) }).strict();
const LibraryFile = zod_1.z.object({ version: zod_1.z.literal(1), records: zod_1.z.array(LocalRecord).max(2000), seen: zod_1.z.array(zod_1.z.string().regex(/^[a-f0-9]{64}$/)).max(2000), pending: zod_1.z.array(zod_1.z.object({ run: zod_1.z.string(), key: zod_1.z.string() })).max(2000).default([]) }).strict();
/** Structured, scoped experience. No page text, typed values, code or arbitrary downloads. */
class ExperienceLibrary {
    options;
    root;
    local;
    indexPath;
    base;
    fetch;
    now;
    event;
    queue = Promise.resolve();
    index;
    loading;
    constructor(raw) {
        const { fetch: fetcher, now, onEvent, ...options } = raw;
        this.options = Options.parse(options);
        this.base = new URL(this.options.registryUrl.endsWith('/') ? this.options.registryUrl : this.options.registryUrl + '/');
        if (this.base.username || this.base.password || this.base.search || this.base.hash || (this.base.protocol !== 'https:' && !(this.base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(this.base.hostname))))
            throw Error('INVALID_REGISTRY_URL');
        this.root = node_path_1.default.join(this.options.directory, 'packs', hash(this.base.href));
        this.local = node_path_1.default.join(this.options.directory, 'local', hash(this.options.scope) + '.json');
        this.indexPath = node_path_1.default.join(this.root, 'index.json');
        this.fetch = fetcher ?? globalThis.fetch;
        this.now = now ?? Date.now;
        this.event = onEvent ?? (() => { });
    }
    emit(type, packId, code) { try {
        this.event({ type, ...(packId ? { packId } : {}), ...(code ? { code } : {}) });
    }
    catch { /* telemetry does not decide actions */ } }
    async read(p, limit) { const stat = await promises_1.default.stat(p); if (stat.size > limit)
        throw Error('CACHE_TOO_LARGE'); return promises_1.default.readFile(p, 'utf8'); }
    async atomic(p, value) {
        await promises_1.default.mkdir(node_path_1.default.dirname(p), { recursive: true, mode: 0o700 });
        const tmp = p + '.' + (0, node_crypto_1.randomUUID)() + '.tmp';
        let fd;
        try {
            fd = await promises_1.default.open(tmp, 'wx', 0o600);
            await fd.writeFile(value);
            await fd.sync();
            await fd.close();
            fd = undefined;
            await promises_1.default.rename(tmp, p);
        }
        finally {
            await fd?.close();
            await promises_1.default.rm(tmp, { force: true });
        }
    }
    async download(relative, limit, signal) {
        const url = new URL(relative, this.base);
        if (url.origin !== this.base.origin || !url.pathname.startsWith(this.base.pathname))
            throw Error('REGISTRY_PATH_DENIED');
        const response = await this.fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(this.options.downloadTimeoutMs)]), redirect: 'error', headers: { accept: 'application/json' } });
        if (!response.ok) {
            await response.body?.cancel();
            throw Error('REGISTRY_UNAVAILABLE');
        }
        if (!response.body)
            throw Error('EMPTY_REGISTRY_RESPONSE');
        const reader = response.body.getReader();
        let size = 0;
        const chunks = [];
        try {
            for (;;) {
                const r = await reader.read();
                if (r.done)
                    break;
                size += r.value.byteLength;
                if (size > limit)
                    throw Error('REGISTRY_RESPONSE_TOO_LARGE');
                chunks.push(r.value);
            }
        }
        finally {
            await reader.cancel();
        }
        return Buffer.concat(chunks).toString('utf8');
    }
    async registry(signal) {
        if (!this.index) {
            try {
                const cached = JSON.parse(await this.read(this.indexPath, 1048576));
                this.index = { at: cached.at, value: experience_schema_js_1.Index.parse(cached.value) };
            }
            catch { /* cold or invalid cache */ }
        }
        if (this.index && this.now() - this.index.at < this.options.indexTtlMs)
            return this.index.value;
        if (!this.options.autoDownload)
            return this.index?.value ?? { schemaVersion: 1, packs: [] };
        if (!this.loading)
            this.loading = (async () => { try {
                const value = experience_schema_js_1.Index.parse(JSON.parse(await this.download('index.json', 1048576, signal)));
                this.index = { at: this.now(), value };
                await this.atomic(this.indexPath, stable(this.index));
                return value;
            }
            catch {
                this.emit('unavailable', undefined, 'REGISTRY_UNAVAILABLE');
                return this.index?.value ?? { schemaVersion: 1, packs: [] };
            }
            finally {
                this.loading = undefined;
            } })();
        return this.loading;
    }
    async pack(entry, signal) {
        const filename = entry.sha256 + '.json', p = node_path_1.default.join(this.root, filename);
        let text;
        try {
            text = await this.read(p, 65536);
            if (hash(text) !== entry.sha256)
                throw Error('CHECKSUM');
        }
        catch {
            if (!this.options.autoDownload)
                return;
            text = await this.download(`packs/${entry.id}/${entry.version}.json`, 65536, signal);
            if (hash(text) !== entry.sha256)
                throw Error('PACK_CHECKSUM_MISMATCH');
        }
        const pack = experience_schema_js_1.Pack.parse(JSON.parse(text));
        const { experiences: _, validation: __, schemaVersion: ___, checks: _____, ...meta } = pack;
        const { sha256: ____, ...indexed } = entry;
        if (stable(meta) !== stable(indexed)) {
            // Object key order is not part of the manifest contract.
            for (const key of Object.keys(indexed))
                if (stable(meta[key]) !== stable(indexed[key]))
                    throw Error('PACK_METADATA_MISMATCH');
        }
        await this.atomic(p, text);
        await this.prunePacks();
        this.emit('ready', pack.id);
        return pack;
    }
    async prunePacks() { const entries = (await promises_1.default.readdir(this.root)).filter(n => /^[a-f0-9]{64}\.json$/.test(n)); if (entries.length <= this.options.maxPacks)
        return; const times = await Promise.all(entries.map(async (n) => ({ n, time: (await promises_1.default.stat(node_path_1.default.join(this.root, n))).mtimeMs }))); times.sort((a, b) => b.time - a.time); await Promise.all(times.slice(this.options.maxPacks).map(x => promises_1.default.rm(node_path_1.default.join(this.root, x.n), { force: true }))); }
    contextKey(c) { return hash(stable({ logic: c.logic, category: c.identity.category, id: c.identity.id, version: c.identity.version ?? '', path: c.identity.path ?? '' })); }
    async localFile() { try {
        return LibraryFile.parse(JSON.parse(await this.read(this.local, 2097152)));
    }
    catch {
        return { version: 1, records: [], seen: [], pending: [] };
    } }
    matches(when, context) { return context.controls.some(c => c.role === when.role && (when.state === 'any' || c.state === when.state)); }
    async select(context, signal) {
        if (!this.options.enabled || signal.aborted)
            return [];
        try {
            context = experience_schema_js_1.Context.parse(context);
            const index = await this.registry(signal), matched = index.packs.filter(p => (0, experience_schema_js_1.compatible)(p, context)).sort((a, b) => (0, experience_schema_js_1.compareVersions)(b.version, a.version));
            const latest = [...new Map(matched.map(p => p.id).map(id => [id, matched.find(p => p.id === id)])).values()].slice(0, 3);
            const hints = [];
            for (const entry of latest) {
                if (signal.aborted)
                    break;
                try {
                    const pack = await this.pack(entry, signal);
                    if (pack)
                        for (const e of pack.experiences)
                            if (this.matches(e.when, context))
                                hints.push({ when: e.when, action: e.action, expected: e.expected, source: 'pack', validation: pack.validation, success: 0, failure: 0 });
                }
                catch {
                    this.emit('rejected', entry.id, 'PACK_INVALID');
                }
            }
            const local = await this.localFile(), contextKey = this.contextKey(context), cutoff = this.now() - this.options.recordTtlDays * 86400000;
            // Only independently verified successes promote a local experience.
            for (const r of local.records)
                if (r.contextKey === contextKey && r.updatedAt >= cutoff && r.success >= 3 && r.success > r.failure * 2 && this.matches(r.experience.when, context))
                    hints.push({ ...r.experience, source: 'local', validation: 'live', success: r.success, failure: r.failure });
            // A locally observed failure suppresses the same pack recipe, without rewriting it.
            const failures = local.records.filter(r => r.contextKey === contextKey && r.updatedAt >= cutoff && r.failure >= 3 && r.failure >= r.success);
            const unique = new Map();
            for (const h of hints.sort((a, b) => (b.success - b.failure) - (a.success - a.failure))) {
                const k = stable([h.when, h.action, h.expected]);
                if (failures.some(r => stable([r.experience.when, r.experience.action, r.experience.expected]) === k))
                    continue;
                if (!unique.has(k))
                    unique.set(k, h);
            }
            const selected = [];
            for (const hint of unique.values()) {
                if (selected.length >= this.options.maxHints)
                    break;
                if (Buffer.byteLength(stable([...selected, hint])) <= this.options.maxHintBytes)
                    selected.push(hint);
            }
            return selected;
        }
        catch {
            this.emit('unavailable', undefined, 'EXPERIENCE_UNAVAILABLE');
            return [];
        }
    }
    async record(context, raw, outcome, evidenceId) {
        if (!this.options.enabled || ['unknown', 'infrastructure'].includes(outcome))
            return;
        context = experience_schema_js_1.Context.parse(context);
        zod_1.z.enum(['verified-success', 'verified-failure', 'effect-only', 'unknown', 'infrastructure']).parse(outcome);
        const experience = experience_schema_js_1.Experience.omit({ id: true }).parse(raw);
        if (typeof evidenceId !== 'string' || !evidenceId || evidenceId.length > 200)
            throw Error('INVALID_EVIDENCE');
        const contextKey = this.contextKey(context), key = hash(stable({ contextKey, experience })), evidence = hash(evidenceId);
        await this.mutate(async (file) => {
            if (file.seen.includes(evidence))
                return;
            let r = file.records.find(r => r.key === key);
            if (!r) {
                r = { key, contextKey, logic: context.logic, experience, success: 0, failure: 0, effects: 0, updatedAt: this.now(), evidence: [] };
                file.records.push(r);
            }
            if (outcome === 'verified-success')
                r.success = Math.min(1000000, r.success + 1);
            else if (outcome === 'verified-failure')
                r.failure = Math.min(1000000, r.failure + 1);
            else
                r.effects = Math.min(1000000, r.effects + 1);
            r.updatedAt = this.now();
            r.evidence = [...r.evidence, evidence].slice(-32);
            file.seen = [...file.seen, evidence].slice(-2000);
            if (outcome === 'effect-only' && this.options.runId) {
                const run = hash(this.options.runId);
                if (!file.pending.some(p => p.run === run && p.key === key))
                    file.pending.push({ run, key });
            }
        });
    }
    /** Call only after the host has committed independent, scoped completion evidence. */
    async verifyRun(runId) {
        if (!this.options.enabled)
            return;
        zod_1.z.string().min(1).max(200).parse(runId);
        const run = hash(runId);
        await this.mutate(async (file) => {
            for (const p of file.pending.filter(p => p.run === run)) {
                const r = file.records.find(r => r.key === p.key), evidence = hash('verified:' + run + ':' + p.key);
                if (r && !file.seen.includes(evidence)) {
                    r.success = Math.min(1000000, r.success + 1);
                    r.updatedAt = this.now();
                    file.seen.push(evidence);
                }
            }
            file.pending = file.pending.filter(p => p.run !== run);
        });
    }
    async mutate(fn) {
        const task = this.queue.then(async () => {
            await promises_1.default.mkdir(node_path_1.default.dirname(this.local), { recursive: true, mode: 0o700 });
            const lock = this.local + '.lock';
            let locked = false;
            for (let i = 0; i < 10; i++) {
                try {
                    await promises_1.default.mkdir(lock);
                    locked = true;
                    await promises_1.default.writeFile(node_path_1.default.join(lock, 'owner'), String(process.pid));
                    break;
                }
                catch (e) {
                    if (e.code !== 'EEXIST')
                        throw e;
                    try {
                        const pid = Number(await promises_1.default.readFile(node_path_1.default.join(lock, 'owner'), 'utf8'));
                        if (Number.isInteger(pid) && pid > 0) {
                            try {
                                process.kill(pid, 0);
                            }
                            catch (e) {
                                if (e.code === 'ESRCH')
                                    await promises_1.default.rm(lock, { recursive: true, force: true });
                            }
                        }
                    }
                    catch {
                        try {
                            if (Date.now() - (await promises_1.default.stat(lock)).mtimeMs > 30000)
                                await promises_1.default.rm(lock, { recursive: true, force: true });
                        }
                        catch { /* another writer removed the lock */ }
                    }
                    await new Promise(r => setTimeout(r, 10));
                }
            }
            if (!locked) {
                this.emit('unavailable', undefined, 'EXPERIENCE_BUSY');
                return;
            }
            try {
                const file = await this.localFile(), cutoff = this.now() - this.options.recordTtlDays * 86400000;
                file.records = file.records.filter(r => r.updatedAt >= cutoff);
                await fn(file);
                file.records.sort((a, b) => b.updatedAt - a.updatedAt);
                file.records = file.records.slice(0, this.options.maxRecords);
                file.seen = file.seen.slice(-2000);
                file.pending = file.pending.filter(p => file.records.some(r => r.key === p.key)).slice(-2000);
                await this.atomic(this.local, stable(file));
            }
            finally {
                await promises_1.default.rm(lock, { recursive: true, force: true });
            }
        });
        this.queue = task.catch(() => { });
        await task;
    }
    async stats() { const file = await this.localFile(); const valid = file.records.filter(r => r.updatedAt >= this.now() - this.options.recordTtlDays * 86400000); return { records: valid.length, active: valid.filter(r => r.success >= 3 && r.success > r.failure * 2).length, scopeHash: hash(this.options.scope) }; }
}
exports.ExperienceLibrary = ExperienceLibrary;
