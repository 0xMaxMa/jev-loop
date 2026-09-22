import { Pack, type ExperienceRecord } from './experience-schema.js';
/** The harness executes actual fixture/live cases and independently verifies each outcome.
 * No free-form summary or self-reported model success is accepted as training output.
 */
export declare function trainExperiencePack(manifest: Omit<ReturnType<typeof Pack.parse>, 'experiences' | 'checks'>, records: ExperienceRecord[], executeAndVerify: (record: ExperienceRecord, trial: number) => Promise<boolean>, trials?: number): Promise<{
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
