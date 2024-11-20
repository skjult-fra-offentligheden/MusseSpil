// src/interfaces/Dialogues.ts
import { Clue } from "../classes/clue"
export interface DialogueOption {
    id: string;
    text: string;
    speaker?: string;
    nextDialogueId?: string;
    callbackId?: string; 
    clue?: Clue;
}

export interface DialogueNode {
    id: string;
    speaker?: string;
    text: string;
    options: DialogueOption[];
}
