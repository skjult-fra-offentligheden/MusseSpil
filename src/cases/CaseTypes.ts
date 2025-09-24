// src/cases/CaseTypes.ts
import type { ItemId } from '../data/items/AllItemConfig'; // "clueGlue" | "blueCheese" | "cluePhone" | "coke"

export type Condition =
    | { kind: 'flag'; id: string; value?: boolean }
    | { kind: 'counterAtLeast'; id: string; count: number }
    | { kind: 'all'; of: Condition[] }
    | { kind: 'any'; of: Condition[] };

export interface CaseEventRule {
    whenItem: ItemId;                           // which item use triggers this rule
    setFlags?: string[];                        // flags to set -> true
    addCounters?: { id: string; by: number }[]; // bump counters
    requireWitness?: string | null;             // npcId that must be within sensory range (optional)
    when?: Condition;                        // optional extra condition (all must be true)
}

export interface CaseCrime {
    id: string;                 // "cocainePossession"
    label: string;              // UI label
    suspectId: string;          // npcId
    unlockWhen: Condition;      // when this crime appears in Accusation UI
}

export interface CaseFailState {
    id: string;
    message: string;
    when: Condition;            // ends scene if true
}

export interface CaseSceneConfig {
    id: string;
    suspects: string[];         // the npcIds in the room (helps with validation)
    eventRules: CaseEventRule[];
    crimes: CaseCrime[];
    failStates: CaseFailState[];
    unlockWhen?: Condition;
}
