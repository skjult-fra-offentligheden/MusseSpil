// src/interfaces/Dialogues.ts
import { Clue } from "../classes/clue"
export interface DialogueOption {
    id: string;
    text: string;
    nextDialogueId?: string;
    callbackId?: string; 
    clue?: Clue;
}

export interface DialogueNode {
    id: string;
    text: string;
    options: DialogueOption[];
}
