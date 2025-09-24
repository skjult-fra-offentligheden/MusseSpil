import { Clue } from "../classes/clue";
import { GameState } from "../managers/GameState";

export type ClueCategory = "evidence" | "people" | "places" | "timeline";
export class ClueManager {
    private clues: Map<string, Clue>;
    private gameState: GameState;
    private game: Phaser.Game;
    constructor(allClueData: Record<string, any>, gameState: GameState, scene: Phaser.Scene) {
        this.clues = new Map<string, Clue>();

        //console.log("Initializing Scene-Specific ClueManager with data:", allClueData);
        this.gameState = gameState;

        this.game = scene.game;
        for (const clueId in allClueData) {
            if (Object.prototype.hasOwnProperty.call(allClueData, clueId)) {
                const rawClue = allClueData[clueId];
                // Ensure category is valid if pre-loading
                if (!rawClue.id || !rawClue.title || !rawClue.description || !rawClue.category /*|| !this.isValidCategory(rawClue.category)*/) {
                    console.warn(`[ClueManager Constructor] Clue data for '${clueId}' missing required fields or invalid category. Skipping.`);
                    continue;
                }
                const clue: Clue = {
                    id: rawClue.id, title: rawClue.title, description: rawClue.description,
                    category: rawClue.category as ClueCategory, // Cast if sure it's valid
                    imageKey: rawClue.imageKey || undefined,
                    foundAt: rawClue.foundAt || undefined, relatedNPCs: rawClue.relatedNPCs || [],
                    discovered: this.gameState.isClueDiscovered(rawClue.id)
                };
                this.clues.set(clue.id, clue);
            }
        }
        console.log(`[ClueManager] Initialized. ${this.clues.size} clues loaded.`);
    }

    // Generic addClue (can be private if you only want category-specific adds)
    public addClue(clueData: Clue): boolean {
        if (!this.isValidCategory(clueData.category)) {
            console.error(`[ClueManager addClue] Invalid category: "${clueData.category}" for clue ID "${clueData.id}". Clue not added.`);
            return false;
        }
        if (!this.clues.has(clueData.id)) {
            this.clues.set(clueData.id, clueData);
            console.log(`[ClueManager addClue] Added new clue: ${clueData.id} - "${clueData.title}" in category "${clueData.category}"`);
            // Optionally discover it immediately or require a separate discoverClue call
            // if (!clueData.discovered) { this.discoverClue(clueData.id); }
            return true;
        } else {
            console.warn(`[ClueManager addClue] Clue with ID ${clueData.id} already exists. New data ignored. Use updateClue if modification is intended.`);
            return false;
        }
    }

    public addEvidenceClue(data: Omit<Clue, 'category' | 'discovered'> & { discovered?: boolean }): Clue | undefined {
        const clueToAdd: Clue = {
            ...data,
            category: 'evidence',
            discovered: data.discovered !== undefined ? data.discovered : false // Default to not discovered
        };
        if (this.addClue(clueToAdd)) {
            return this.getClue(clueToAdd.id);
        }
        return undefined;
    }

    public updateClueDetails(clueId: string, newDetails: { title?: string, description?: string, imageKey?: string }): boolean {
        const clue = this.clues.get(clueId);

        if (!clue) {
            console.error(`[ClueManager] Attempted to update non-existent clue ID: ${clueId}`);
            return false;
        }

        // Update the properties that have been provided
        if (newDetails.title !== undefined) {
            clue.title = newDetails.title;
        }
        if (newDetails.description !== undefined) {
            clue.description = newDetails.description;
        }
        if (newDetails.imageKey !== undefined) {
            clue.imageKey = newDetails.imageKey;
        }
        this.game.events.emit('clueUpdated', clue);
        console.log(`[ClueManager] Details for clue '${clueId}' have been updated.`);

        return true;
    }

    public addPeopleClue(data: Omit<Clue, 'category' | 'discovered'> & { discovered?: boolean }): Clue | undefined {
        const clueToAdd: Clue = {
            ...data,
            category: 'people',
            discovered: data.discovered !== undefined ? data.discovered : false
        };
        if (this.addClue(clueToAdd)) {
            return this.getClue(clueToAdd.id);
        }
        return undefined;
    }

    public addPlacesClue(data: Omit<Clue, 'category' | 'discovered'> & { discovered?: boolean }): Clue | undefined {
        const clueToAdd: Clue = {
            ...data,
            category: 'places',
            discovered: data.discovered !== undefined ? data.discovered : false
        };
        if (this.addClue(clueToAdd)) {
            return this.getClue(clueToAdd.id);
        }
        return undefined;
    }

    public addTimelineClue(data: Omit<Clue, 'category' | 'discovered'> & { discovered?: boolean }): Clue | undefined {
        const clueToAdd: Clue = {
            ...data,
            category: 'timeline',
            discovered: data.discovered !== undefined ? data.discovered : false
        };
        if (this.addClue(clueToAdd)) {
            return this.getClue(clueToAdd.id);
        }
        return undefined;
    }


    discoverClue(clueId: string): boolean {
        const clue = this.clues.get(clueId);
        if (clue) {
            if (!clue.discovered) {
                clue.discovered = true;
                this.gameState.markClueAsDiscovered(clueId);
                console.log(`[ClueManager] Clue discovered: ${clueId} - "${clue.title}"`);
                // Optional: Emit an event if needed elsewhere
                // this.scene.events.emit('clueDiscovered', clue); // Need scene ref if emitting here
                return true;
            }
            console.log(`[ClueManager] Clue already discovered: ${clueId}`);
            return false; // Already discovered, state didn't change
        } else {
            console.error(`[ClueManager] Attempted to discover unknown clue ID: ${clueId}`);
            return false;
        }
    }

    isDiscovered(clueId: string): boolean {
        const clue = this.clues.get(clueId);
        return clue ? clue.discovered : false;
    }

    hasClue(clueId: string): boolean {
        return this.clues.has(clueId);
    }


    getClue(clueId: string): Clue | undefined {
        return this.clues.get(clueId);
    }

    public getAllClues(): Clue[] {
        return Array.from(this.clues.values());
    }
    private isValidCategory(category: string): category is ClueCategory {
        const validCategories: ClueCategory[] = ["evidence", "people", "places", "timeline"];
        return validCategories.includes(category as ClueCategory);
    }
}

