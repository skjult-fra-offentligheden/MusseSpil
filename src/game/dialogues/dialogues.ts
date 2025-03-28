// src/interfaces/Dialogues.ts
import { Clue } from "../classes/clue"
import { npcMemory } from "../../data/npcMemory";

export interface DialogueOption {
    id: string;
    text: string;
    speaker?: string;
    nextDialogueId?: string;
    callbackId?: string; 
    clue?: Clue;
    condition?: (gameState: gameState, npcMemory: npcMemory) => boolean;
    effect?: (gameState: gameState, npcMemory: npcMemory) => void;
}

export interface DialogueNode {
    id: string;
    speaker?: string;
    text: string;
    options: DialogueOption[];
    condition?: (gameState: gameState, npcMemory: npcMemory) => boolean;
}
