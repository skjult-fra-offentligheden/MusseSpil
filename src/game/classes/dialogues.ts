// src/interfaces/Dialogues.ts
import { Body } from '../classes/body';

export interface DialogueOption {
    id: string;
    text: string;
    nextDialogueId?: string;
    callback?: (this: Body) => void; // Optional: For triggering events like starting a quest
}

export interface DialogueNode {
    id: string;
    text: string;
    options: DialogueOption[];
}
