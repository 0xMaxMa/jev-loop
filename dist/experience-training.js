"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainExperiencePack = trainExperiencePack;
const experience_schema_js_1 = require("./experience-schema.js");
/** The harness executes actual fixture/live cases and independently verifies each outcome.
 * No free-form summary or self-reported model success is accepted as training output.
 */
async function trainExperiencePack(manifest, records, executeAndVerify, trials = 3) {
    if (!Number.isInteger(trials) || trials < 3 || trials > 100)
        throw Error('INVALID_TRAINING_BUDGET');
    const candidate = experience_schema_js_1.Pack.parse({ ...manifest, experiences: records, checks: { runs: 3, passed: 3 } });
    let runs = 0, passed = 0;
    const accepted = [];
    for (const record of candidate.experiences) {
        let wins = 0;
        for (let i = 0; i < trials; i++) {
            const ok = await executeAndVerify(record, i);
            if (typeof ok !== 'boolean')
                throw Error('INVALID_VERIFIER_RESULT');
            runs++;
            if (ok) {
                wins++;
                passed++;
            }
        }
        if (wins === trials)
            accepted.push(record);
    }
    if (!accepted.length)
        throw Error('NO_VERIFIED_EXPERIENCES');
    return experience_schema_js_1.Pack.parse({ ...candidate, experiences: accepted, checks: { runs, passed } });
}
