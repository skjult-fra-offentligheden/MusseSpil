import type Phaser from 'phaser';
import type { NPC } from '../NPCgeneral/npc';

export interface DialogueController {
    startDialogue(
        sourceId: string,
        startDialogueNodeId?: string,
        speakerContext?: NPC | any
    ): void;
    endDialogue(options?: { saveState?: boolean }): void;
    isDialogueActive(): boolean;
    update(): void;
    getCurrentNpc(): NPC | null;
    setScene?(scene: Phaser.Scene): void;
}
