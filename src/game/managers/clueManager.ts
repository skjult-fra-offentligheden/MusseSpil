import { Clue } from "../classes/clue";

export class ClueManager {
    private clues: Map<string, Clue>;

    constructor() {
        this.clues = new Map < string, Clue >
    }

    addClue(clue: Clue): void {
        if (this.clues.has(clue.id) === false) {
            this.clues.set(clue.id, clue);
        }
    }

    getAllClues(): Clue[] {
        return Array.from(this.clues.values());
    }

    hasClue(clueId: string): boolean {
        return this.clues.has(clueId);
    }

    getClue(clueId: string): Clue | undefined {
        return this.clues.get(clueId);
    }
}

