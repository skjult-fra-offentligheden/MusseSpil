// npcTemplate.ts (or in a shared types file)

import { DialogueNode } from "../../game/dialogues/dialogues"; // Assuming this is your dialogue structure
import { Player } from "../../game/classes/player"; // For interaction context
// You might need to import ItemConfig if NPCs can directly give/take specific items via callbacks
// import { ItemConfig } from "./itemTemplate";

// Define possible NPC states for more complex AI or reactions
export type NPCMentalState = 'neutral' | 'friendly' | 'suspicious' | 'hostile' | 'scared' | 'quest_giver';
export type NPCMovementType = 'idle' | 'patrol' | 'random' | 'scripted'; // 'scripted' for cutscenes/specific paths

// For reactions, we might want a more structured approach than just item IDs
export interface NPCReactionTrigger {
    eventType: string; // e.g., 'itemUsedFromInventory', 'playerSaidKeyword', 'clueDiscoveredNearby'
    condition?: (data: any, npc: NPC_Instance_Type, player?: Player) => boolean; // Optional condition to check before reacting
    itemId?: string;    // If eventType is item-related
    keyword?: string;   // If eventType is dialogue-related
    // ... other potential trigger conditions
}

export interface NPCReactionAction {
    type: 'speak' | 'giveItem' | 'changeState' | 'moveTo' | 'startQuest' | 'attack';
    text?: string;          // For 'speak'
    itemIdToGive?: string;  // For 'giveItem'
    newState?: NPCMentalState; // For 'changeState'
    targetPosition?: { x: number, y: number }; // For 'moveTo'
    questId?: string;       // For 'startQuest'
    // ... other action parameters
}

export interface NPCReaction {
    trigger: NPCReactionTrigger;
    actions: NPCReactionAction[]; // An NPC might perform multiple actions in response
    priority?: number; // If multiple reactions could trigger, higher priority wins
    cooldown?: number; // How long before this reaction can trigger again
    once?: boolean;    // Can this reaction only happen once?
}

export interface NPCAnimationConfig {
    atlasKey: string;                       // The texture key of the atlas/spritesheet (e.g., "cop2")
    definitions: NPCAnimationDefinition[];  // Array of all animations to create for this atlas

    // Convenience keys for the NPC class to easily reference which animation to play
    idleKey: string;                        // e.g., "cop2_idle_anim" (must match a keyName in definitions)
    walkLeftKey?: string;                   // e.g., "cop2_walk_left_anim"
    walkRightKey?: string;                  // e.g., "cop2_walk_right_anim"
    // Add specific reaction animations if needed
    reactSurprised?: string;
    reactAngry?: string;
    talk?: string;
}
export interface NPCAnimationDefinition {
    keyName: string;      // The global key for this animation (e.g., "cop2_idle_anim")
    frameNames: string[]; // Array of frame names from the atlas (e.g., ["cop_idle_0.png", "cop_idle_1.png"])
    frameRate: number;
    repeat: number;       // -1 for loop
    yoyo?: boolean;
}

export interface NPCAnimationSet { // <<< You named this NPCAnimationConfig, which is okay.
    atlasKey: string;         // The name of the spritesheet/atlas, e.g., "cop2"
    definitions: NPCAnimationDefinition[]; // A list of all animations to create for this NPC type

    // Easy names for the NPC class to use when it wants to play an animation
    idleKey: string;          // Will store a keyName from 'definitions', e.g., "cop2_idle_anim"
    walkLeftKey?: string;
    walkRightKey?: string;
}

export interface NPCConfig {
    // --- Core Identification & Display ---
    npcId: string;              // Unique identifier (e.g., "cop2", "rockerMouse_unique")
    displayName: string;        // Name shown in UI/dialogue
    textureKey: string;         // Atlas key or spritesheet key
    initialFrame?: string | number; // Starting frame
    defaultScale?: number;
    description?: string;       // Brief description for player inspection or internal notes

    // --- Dialogue & Interaction ---

    dialogues: DialogueNode[];  // NPC's own dialogue tree(s)
    maxInteractionDistance?: number; // How close player needs to be

    // --- Behavior & AI ---
    movementType: NPCMovementType;
    speed: number;
    patrolPoints?: { x: number; y: number }[];
    moveArea?: { x: number; y: number; width: number; height: number }; // For random movement
    initialMentalState?: NPCMentalState;
    sensoryRange?: number;      // For reacting to player item use, etc.
    faction?: string;           // e.g., "police", "gang_A", "civilians"

    // --- Animations ---
    animations: NPCAnimationConfig;

    // --- Reactions (could be more structured) ---
    // This is simpler, maps item ID to a single text response
    simpleReactions?: Record<string, string>; // Key: itemId, Value: reaction text
    // Or the more complex reactions array:
    detailedReactions?: NPCReaction[];

    // --- NPC-Specific Methods/Callbacks (Optional, for highly unique NPCs) ---
    // These would be functions defined directly in the NPC's config object.
    // 'this' context would be the NPC instance if called correctly.

    /** Called when this NPC is first created and added to the scene */
    onSpawn?: (this: NPC_Instance_Type, scene: Phaser.Scene) => void;

    /** Called every frame by the NPC's update loop */
    onUpdate?: (this: NPC_Instance_Type, time: number, delta: number) => void; // Allows custom update logic

    /** Called when dialogue with this NPC starts */
    onDialogueStart?: (this: NPC_Instance_Type, player: Player) => void;

    /** Called when dialogue with this NPC ends */
    onDialogueEnd?: (this: NPC_Instance_Type, player: Player) => void;

    /** Custom handler for global events, if more specific than simpleReactions */
    handleGlobalEvent?: (this: NPC_Instance_Type, eventName: string, eventData: any, gameContext: any) => boolean; // Returns true if handled

    // --- NPC Memory / State (Initial values) ---
    // These would be the starting points for the npcMemory object you have
    initialMemory?: {
        events_happened?: Record<string, boolean | number | string>;
        reputation_criminals?: number;
        reputation_cops?: number;
        reputation_civilians?: number;
        // visitedDialogues is usually managed at runtime
    };
}

// You'd need to define NPC_Instance_Type to be your actual NPC class instance type
// This is tricky if NPCConfig is used BY the NPC class constructor.
// Often, these methods are implemented in a subclass if they are complex,
// or the NPC class calls them if they are present on its config.
type NPC_Instance_Type = any; // Replace 'any' with your actual NPC class type if possible after definition