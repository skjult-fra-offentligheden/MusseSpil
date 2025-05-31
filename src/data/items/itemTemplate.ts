/* ↓  same union you already use elsewhere */
export type EvidencePhase = 'full' | 'half' | 'empty' | string;

/* art for one resolution */
export interface PhasedArt {
    full: string; // Path to 'full' state art
    half?: string; // Path to 'half' state art (optional)
    empty?: string; // Path to 'empty' state art (optional)
    [status: string]: string | undefined; // Allows for other custom states like 'broken', 'active', etc.
}

export interface DialogueOption { // Renamed from what you had to avoid conflict if you use DialogueNode elsewhere
    id: string;
    text: string;
    nextDialogueId?: string;
    callbackId?: string;
}
/* dialog node exactly like the ones you load today */
export interface DialogueNode {
    id: string;
    text: string;
    options: DialogueOption[];
}

export interface Collectible {
    collect(): void;
}

/* everything about ONE item */
export interface ItemConfig {
    id: string;
    name: string;
    clueId?: string;          // if this item also creates a clue
    art: {
        small: string | PhaseArt;     // 32×32
        large: string | PhaseArt;     // 64×64
    };
    defaultScale?: number;
    description: string;
    collectible: boolean;
    dialogue: DialogueNode[];
    initialStatus: EvidencePhase; // The status the item starts with (e.g., 'full')
    timesUsed: number;
    currentStatus: EvidencePhase;
    clueCategory?: string;    // e.g., "Weapon", "Document", "Personal Effect"
    clueFoundAt?: string;     // Specific location if different from general scene, or a note
    clueRelatedNPCs?: string[]; // NPCs directly tied to this clue if known at definition

    getArt: (this: ItemConfig, size: 'small' | 'large') => string;
    use: (this: ItemConfig, params?: any) => {
        newStatus: EvidencePhase; // The status of the item after use
        message?: string;         // A message to display to the player
        artChanged: boolean;      // Did the item's visual representation change?
        consumed?: boolean;       // Was the item fully consumed/depleted?
    };
    resetState?: (this: ItemConfig) => void;
    handleCallback?: (this: ItemConfig, callbackId: string, gameContext: any) => void;
    onCollect?: (this: ItemConfig, gameContext: any) => {
        collected: boolean;
        message?: string;
    };

}
