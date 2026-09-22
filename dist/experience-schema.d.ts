import { z } from 'zod';
export declare const Logic: z.ZodEnum<["browser-use", "computer-use", "game-use"]>;
export declare const Category: z.ZodEnum<["web", "app", "os", "game"]>;
export declare const PackId: z.ZodString;
export declare const Capability: z.ZodEnum<["observe", "click", "type", "select", "keypress", "scroll", "open-app", "press", "game-action"]>;
export declare const Role: z.ZodEnum<["input", "searchbox", "combobox", "button", "link", "select", "menu", "text-area", "checkbox", "radio", "window", "application", "game-control", "viewport"]>;
export declare const State: z.ZodEnum<["any", "empty", "populated", "expanded", "collapsed", "selected", "unselected", "available", "obstacle-ahead", "enemy-near", "low-health", "item-near", "goal-visible"]>;
export declare const Action: z.ZodEnum<["click", "type", "select", "press", "enter", "tab", "escape", "scroll-up", "scroll-down", "open-app", "game-action", "move-left", "move-right", "jump", "interact", "attack", "defend", "wait"]>;
export declare const Effect: z.ZodEnum<["value-changed", "selection-changed", "expanded-changed", "application-changed", "state-changed", "goal-verified", "position-changed", "health-preserved", "item-collected"]>;
export declare const Pattern: z.ZodObject<{
    role: z.ZodEnum<["input", "searchbox", "combobox", "button", "link", "select", "menu", "text-area", "checkbox", "radio", "window", "application", "game-control", "viewport"]>;
    state: z.ZodEnum<["any", "empty", "populated", "expanded", "collapsed", "selected", "unselected", "available", "obstacle-ahead", "enemy-near", "low-health", "item-near", "goal-visible"]>;
}, "strict", z.ZodTypeAny, {
    role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
    state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
}, {
    role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
    state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
}>;
export declare const Experience: z.ZodObject<{
    id: z.ZodString;
    when: z.ZodObject<{
        role: z.ZodEnum<["input", "searchbox", "combobox", "button", "link", "select", "menu", "text-area", "checkbox", "radio", "window", "application", "game-control", "viewport"]>;
        state: z.ZodEnum<["any", "empty", "populated", "expanded", "collapsed", "selected", "unselected", "available", "obstacle-ahead", "enemy-near", "low-health", "item-near", "goal-visible"]>;
    }, "strict", z.ZodTypeAny, {
        role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
        state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
    }, {
        role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
        state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
    }>;
    action: z.ZodEnum<["click", "type", "select", "press", "enter", "tab", "escape", "scroll-up", "scroll-down", "open-app", "game-action", "move-left", "move-right", "jump", "interact", "attack", "defend", "wait"]>;
    expected: z.ZodEnum<["value-changed", "selection-changed", "expanded-changed", "application-changed", "state-changed", "goal-verified", "position-changed", "health-preserved", "item-collected"]>;
}, "strict", z.ZodTypeAny, {
    expected: "value-changed" | "selection-changed" | "expanded-changed" | "application-changed" | "state-changed" | "goal-verified" | "position-changed" | "health-preserved" | "item-collected";
    id: string;
    when: {
        role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
        state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
    };
    action: "click" | "type" | "select" | "open-app" | "press" | "game-action" | "enter" | "tab" | "escape" | "scroll-up" | "scroll-down" | "move-left" | "move-right" | "jump" | "interact" | "attack" | "defend" | "wait";
}, {
    expected: "value-changed" | "selection-changed" | "expanded-changed" | "application-changed" | "state-changed" | "goal-verified" | "position-changed" | "health-preserved" | "item-collected";
    id: string;
    when: {
        role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
        state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
    };
    action: "click" | "type" | "select" | "open-app" | "press" | "game-action" | "enter" | "tab" | "escape" | "scroll-up" | "scroll-down" | "move-left" | "move-right" | "jump" | "interact" | "attack" | "defend" | "wait";
}>;
export declare const actionCapability: Record<string, string>;
export declare const Pack: z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    version: z.ZodString;
    logic: z.ZodEnum<["browser-use", "computer-use", "game-use"]>;
    contractVersion: z.ZodLiteral<1>;
    category: z.ZodEnum<["web", "app", "os", "game"]>;
    target: z.ZodObject<{
        id: z.ZodString;
        pathPrefixes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        minVersion: z.ZodOptional<z.ZodString>;
        maxVersion: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        pathPrefixes?: string[] | undefined;
        minVersion?: string | undefined;
        maxVersion?: string | undefined;
    }, {
        id: string;
        pathPrefixes?: string[] | undefined;
        minVersion?: string | undefined;
        maxVersion?: string | undefined;
    }>;
    requires: z.ZodArray<z.ZodEnum<["observe", "click", "type", "select", "keypress", "scroll", "open-app", "press", "game-action"]>, "many">;
    validation: z.ZodEnum<["fixture", "live"]>;
    checks: z.ZodObject<{
        runs: z.ZodNumber;
        passed: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        runs: number;
        passed: number;
    }, {
        runs: number;
        passed: number;
    }>;
    experiences: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        when: z.ZodObject<{
            role: z.ZodEnum<["input", "searchbox", "combobox", "button", "link", "select", "menu", "text-area", "checkbox", "radio", "window", "application", "game-control", "viewport"]>;
            state: z.ZodEnum<["any", "empty", "populated", "expanded", "collapsed", "selected", "unselected", "available", "obstacle-ahead", "enemy-near", "low-health", "item-near", "goal-visible"]>;
        }, "strict", z.ZodTypeAny, {
            role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
            state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
        }, {
            role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
            state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
        }>;
        action: z.ZodEnum<["click", "type", "select", "press", "enter", "tab", "escape", "scroll-up", "scroll-down", "open-app", "game-action", "move-left", "move-right", "jump", "interact", "attack", "defend", "wait"]>;
        expected: z.ZodEnum<["value-changed", "selection-changed", "expanded-changed", "application-changed", "state-changed", "goal-verified", "position-changed", "health-preserved", "item-collected"]>;
    }, "strict", z.ZodTypeAny, {
        expected: "value-changed" | "selection-changed" | "expanded-changed" | "application-changed" | "state-changed" | "goal-verified" | "position-changed" | "health-preserved" | "item-collected";
        id: string;
        when: {
            role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
            state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
        };
        action: "click" | "type" | "select" | "open-app" | "press" | "game-action" | "enter" | "tab" | "escape" | "scroll-up" | "scroll-down" | "move-left" | "move-right" | "jump" | "interact" | "attack" | "defend" | "wait";
    }, {
        expected: "value-changed" | "selection-changed" | "expanded-changed" | "application-changed" | "state-changed" | "goal-verified" | "position-changed" | "health-preserved" | "item-collected";
        id: string;
        when: {
            role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
            state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
        };
        action: "click" | "type" | "select" | "open-app" | "press" | "game-action" | "enter" | "tab" | "escape" | "scroll-up" | "scroll-down" | "move-left" | "move-right" | "jump" | "interact" | "attack" | "defend" | "wait";
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    validation: "fixture" | "live";
    id: string;
    schemaVersion: 1;
    version: string;
    logic: "browser-use" | "computer-use" | "game-use";
    contractVersion: 1;
    category: "web" | "app" | "os" | "game";
    target: {
        id: string;
        pathPrefixes?: string[] | undefined;
        minVersion?: string | undefined;
        maxVersion?: string | undefined;
    };
    requires: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
    checks: {
        runs: number;
        passed: number;
    };
    experiences: {
        expected: "value-changed" | "selection-changed" | "expanded-changed" | "application-changed" | "state-changed" | "goal-verified" | "position-changed" | "health-preserved" | "item-collected";
        id: string;
        when: {
            role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
            state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
        };
        action: "click" | "type" | "select" | "open-app" | "press" | "game-action" | "enter" | "tab" | "escape" | "scroll-up" | "scroll-down" | "move-left" | "move-right" | "jump" | "interact" | "attack" | "defend" | "wait";
    }[];
}, {
    validation: "fixture" | "live";
    id: string;
    schemaVersion: 1;
    version: string;
    logic: "browser-use" | "computer-use" | "game-use";
    contractVersion: 1;
    category: "web" | "app" | "os" | "game";
    target: {
        id: string;
        pathPrefixes?: string[] | undefined;
        minVersion?: string | undefined;
        maxVersion?: string | undefined;
    };
    requires: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
    checks: {
        runs: number;
        passed: number;
    };
    experiences: {
        expected: "value-changed" | "selection-changed" | "expanded-changed" | "application-changed" | "state-changed" | "goal-verified" | "position-changed" | "health-preserved" | "item-collected";
        id: string;
        when: {
            role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
            state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
        };
        action: "click" | "type" | "select" | "open-app" | "press" | "game-action" | "enter" | "tab" | "escape" | "scroll-up" | "scroll-down" | "move-left" | "move-right" | "jump" | "interact" | "attack" | "defend" | "wait";
    }[];
}>, {
    validation: "fixture" | "live";
    id: string;
    schemaVersion: 1;
    version: string;
    logic: "browser-use" | "computer-use" | "game-use";
    contractVersion: 1;
    category: "web" | "app" | "os" | "game";
    target: {
        id: string;
        pathPrefixes?: string[] | undefined;
        minVersion?: string | undefined;
        maxVersion?: string | undefined;
    };
    requires: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
    checks: {
        runs: number;
        passed: number;
    };
    experiences: {
        expected: "value-changed" | "selection-changed" | "expanded-changed" | "application-changed" | "state-changed" | "goal-verified" | "position-changed" | "health-preserved" | "item-collected";
        id: string;
        when: {
            role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
            state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
        };
        action: "click" | "type" | "select" | "open-app" | "press" | "game-action" | "enter" | "tab" | "escape" | "scroll-up" | "scroll-down" | "move-left" | "move-right" | "jump" | "interact" | "attack" | "defend" | "wait";
    }[];
}, {
    validation: "fixture" | "live";
    id: string;
    schemaVersion: 1;
    version: string;
    logic: "browser-use" | "computer-use" | "game-use";
    contractVersion: 1;
    category: "web" | "app" | "os" | "game";
    target: {
        id: string;
        pathPrefixes?: string[] | undefined;
        minVersion?: string | undefined;
        maxVersion?: string | undefined;
    };
    requires: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
    checks: {
        runs: number;
        passed: number;
    };
    experiences: {
        expected: "value-changed" | "selection-changed" | "expanded-changed" | "application-changed" | "state-changed" | "goal-verified" | "position-changed" | "health-preserved" | "item-collected";
        id: string;
        when: {
            role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
            state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
        };
        action: "click" | "type" | "select" | "open-app" | "press" | "game-action" | "enter" | "tab" | "escape" | "scroll-up" | "scroll-down" | "move-left" | "move-right" | "jump" | "interact" | "attack" | "defend" | "wait";
    }[];
}>;
export declare const Index: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    packs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
        sha256: z.ZodString;
        logic: z.ZodEnum<["browser-use", "computer-use", "game-use"]>;
        category: z.ZodEnum<["web", "app", "os", "game"]>;
        target: z.ZodObject<{
            id: z.ZodString;
            pathPrefixes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            minVersion: z.ZodOptional<z.ZodString>;
            maxVersion: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            pathPrefixes?: string[] | undefined;
            minVersion?: string | undefined;
            maxVersion?: string | undefined;
        }, {
            id: string;
            pathPrefixes?: string[] | undefined;
            minVersion?: string | undefined;
            maxVersion?: string | undefined;
        }>;
        contractVersion: z.ZodLiteral<1>;
        requires: z.ZodArray<z.ZodEnum<["observe", "click", "type", "select", "keypress", "scroll", "open-app", "press", "game-action"]>, "many">;
    }, "strict", z.ZodTypeAny, {
        id: string;
        version: string;
        logic: "browser-use" | "computer-use" | "game-use";
        contractVersion: 1;
        category: "web" | "app" | "os" | "game";
        target: {
            id: string;
            pathPrefixes?: string[] | undefined;
            minVersion?: string | undefined;
            maxVersion?: string | undefined;
        };
        requires: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
        sha256: string;
    }, {
        id: string;
        version: string;
        logic: "browser-use" | "computer-use" | "game-use";
        contractVersion: 1;
        category: "web" | "app" | "os" | "game";
        target: {
            id: string;
            pathPrefixes?: string[] | undefined;
            minVersion?: string | undefined;
            maxVersion?: string | undefined;
        };
        requires: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
        sha256: string;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    schemaVersion: 1;
    packs: {
        id: string;
        version: string;
        logic: "browser-use" | "computer-use" | "game-use";
        contractVersion: 1;
        category: "web" | "app" | "os" | "game";
        target: {
            id: string;
            pathPrefixes?: string[] | undefined;
            minVersion?: string | undefined;
            maxVersion?: string | undefined;
        };
        requires: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
        sha256: string;
    }[];
}, {
    schemaVersion: 1;
    packs: {
        id: string;
        version: string;
        logic: "browser-use" | "computer-use" | "game-use";
        contractVersion: 1;
        category: "web" | "app" | "os" | "game";
        target: {
            id: string;
            pathPrefixes?: string[] | undefined;
            minVersion?: string | undefined;
            maxVersion?: string | undefined;
        };
        requires: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
        sha256: string;
    }[];
}>;
export type ExperienceRecord = z.infer<typeof Experience>;
export declare const Context: z.ZodObject<{
    logic: z.ZodEnum<["browser-use", "computer-use", "game-use"]>;
    capabilities: z.ZodArray<z.ZodEnum<["observe", "click", "type", "select", "keypress", "scroll", "open-app", "press", "game-action"]>, "many">;
    identity: z.ZodObject<{
        category: z.ZodEnum<["web", "app", "os", "game"]>;
        id: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        category: "web" | "app" | "os" | "game";
        path?: string | undefined;
        version?: string | undefined;
    }, {
        id: string;
        category: "web" | "app" | "os" | "game";
        path?: string | undefined;
        version?: string | undefined;
    }>;
    controls: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["input", "searchbox", "combobox", "button", "link", "select", "menu", "text-area", "checkbox", "radio", "window", "application", "game-control", "viewport"]>;
        state: z.ZodEnum<["any", "empty", "populated", "expanded", "collapsed", "selected", "unselected", "available", "obstacle-ahead", "enemy-near", "low-health", "item-near", "goal-visible"]>;
    }, "strict", z.ZodTypeAny, {
        role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
        state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
    }, {
        role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
        state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    logic: "browser-use" | "computer-use" | "game-use";
    capabilities: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
    identity: {
        id: string;
        category: "web" | "app" | "os" | "game";
        path?: string | undefined;
        version?: string | undefined;
    };
    controls: {
        role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
        state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
    }[];
}, {
    logic: "browser-use" | "computer-use" | "game-use";
    capabilities: ("observe" | "click" | "type" | "select" | "keypress" | "scroll" | "open-app" | "press" | "game-action")[];
    identity: {
        id: string;
        category: "web" | "app" | "os" | "game";
        path?: string | undefined;
        version?: string | undefined;
    };
    controls: {
        role: "select" | "input" | "searchbox" | "combobox" | "button" | "link" | "menu" | "text-area" | "checkbox" | "radio" | "window" | "application" | "game-control" | "viewport";
        state: "any" | "empty" | "populated" | "expanded" | "collapsed" | "selected" | "unselected" | "available" | "obstacle-ahead" | "enemy-near" | "low-health" | "item-near" | "goal-visible";
    }[];
}>;
export type ExperienceContext = z.infer<typeof Context>;
export interface ExperienceHint {
    when: z.infer<typeof Pattern>;
    action: z.infer<typeof Action>;
    expected: z.infer<typeof Effect>;
    source: 'pack' | 'local';
    validation: 'fixture' | 'live';
    success: number;
    failure: number;
}
export interface ExperienceHooks {
    select(context: ExperienceContext, signal: AbortSignal): Promise<ExperienceHint[]>;
    record(context: ExperienceContext, experience: Omit<ExperienceRecord, 'id'>, outcome: 'verified-success' | 'verified-failure' | 'effect-only' | 'unknown' | 'infrastructure', evidenceId: string): Promise<void>;
}
export declare function compareVersions(a: string, b: string): number;
export declare function compatible(entry: z.infer<typeof Index>['packs'][number], context: ExperienceContext): boolean;
