"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceEvent = void 0;
const zod_1 = require("zod");
/** Safe structural events. Rich target labels and typed values remain ephemeral. */
exports.TraceEvent = zod_1.z.object({
    version: zod_1.z.literal(1), sequence: zod_1.z.number().int().positive(), at: zod_1.z.number().int().nonnegative(),
    phase: zod_1.z.enum(['decision', 'dispatch', 'action', 'effect', 'field', 'recovery', 'terminal']),
    requestId: zod_1.z.string().uuid().optional(), operationId: zod_1.z.string().uuid().optional(),
    operation: zod_1.z.string().regex(/^[A-Z_]{1,32}$/).optional(),
    model: zod_1.z.string().max(200).optional(), elapsedMs: zod_1.z.number().nonnegative().optional(),
    outcome: zod_1.z.enum(['confirmed', 'unknown', 'not_executed']).optional(),
    targetRef: zod_1.z.string().max(100).optional(),
    cause: zod_1.z.string().regex(/^[A-Z][A-Z_0-9]{2,80}$/).optional(),
    reason: zod_1.z.string().regex(/^[A-Z][A-Z_0-9]{2,80}$/).optional(),
    status: zod_1.z.enum(['succeeded', 'blocked', 'cancelled', 'failed', 'needs_verification']).optional(),
    steps: zod_1.z.number().int().nonnegative().optional(), evaluations: zod_1.z.number().int().nonnegative().optional(),
    staleRetries: zod_1.z.number().int().nonnegative().optional(), consecutiveStale: zod_1.z.number().int().nonnegative().optional(),
    effect: zod_1.z.enum(['value-changed', 'selection-changed', 'expanded-changed']).optional(),
    pageChanged: zod_1.z.boolean().optional(), valueMatched: zod_1.z.boolean().optional(), optionCount: zod_1.z.number().int().nonnegative().optional(),
    recoveryCalls: zod_1.z.number().int().nonnegative().optional(), fieldsUpdated: zod_1.z.number().int().nonnegative().optional(),
    effectObserved: zod_1.z.boolean().optional(), verified: zod_1.z.boolean().optional(),
}).strict();
