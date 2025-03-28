// src/managers/DialogueManager.ts
import Phaser from 'phaser';
import { DialogueNode, DialogueOption } from '../dialogues/dialogues';
import { NPC } from '../NPCgeneral/npc';
import { ClueManager } from '../managers/clueManager';
import { Clue } from '../classes/clue';
import { InventoryManager } from '../managers/itemMananger';
import { CallbackHandler } from '../managers/CallBackManager';
import { GameState } from '../managers/GameState';
import { DialogueUI } from '../dialogues/dialogueUI';

export class DialogueManager {
    private scene: Phaser.Scene;
    private isActive: boolean = false;
    private currentDialogues: DialogueNode[] = [];
    private currentNpcId: string = '';
    private currentNpc: NPC | null = null;
    private clueManager: ClueManager;
    private cluesData: { [key: string]: Clue };
    private currentDialogueNode!: DialogueNode;
    private selectedOptionIndex: number = 0;
    private dialoguesData: { [npcId: string]: DialogueNode };
    private inventoryManager: InventoryManager;
    private callbackHandler: CallbackHandler;
    private dialogueUI: DialogueUI;

    constructor(
        scene: Phaser.Scene,
        dialoguesData: { [npcId: string]: DialogueNode },
        clueManager: ClueManager,
        cluesData: { [key: string]: Clue },
        inventoryManager: InventoryManager
    ) {
        this.scene = scene;
        this.dialoguesData = dialoguesData;
        this.clueManager = clueManager;
        this.cluesData = cluesData;
        this.inventoryManager = inventoryManager;

        this.dialogueUI = new DialogueUI(scene);
        this.callbackHandler = new CallbackHandler(scene, clueManager, inventoryManager, cluesData);

        // Keyboard input setup delegated to DialogueUI where applicable
        this.scene.events.on('start', () => this.reset());
        this.scene.events.on('resume', () => this.reset());
    }

    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
        this.dialogueUI.setScene(scene); // Update UI scene if changed
    }

    public startDialogue(
        npcId: string,
        startDialogueId: string = 'greeting',
        npcInstance?: NPC,
        dialogueData?: DialogueNode[],
        context?: any
    ) {
        if (this.isActive) return;
        this.isActive = true;
        this.currentNpcId = npcId;
        this.currentNpc = npcInstance;

        // Load dialogues
        this.currentDialogues = (npcInstance && npcInstance.dialogues)
            ? npcInstance.dialogues
            : this.dialoguesData[npcId] || [];

        // Filter dialogues based on conditions
        if (npcInstance && npcInstance.npcMemory) {
            this.currentDialogues = this.currentDialogues.filter(node =>
                !node.condition || node.condition(GameState.getInstance(), npcInstance.npcMemory)
            );
        }

        const startDialogue = this.getDialogueById(startDialogueId);
        if (startDialogue) {
            this.callbackHandler.setContext(context);
            this.currentDialogueNode = startDialogue;
            this.dialogueUI.showDialogue(startDialogue, this.handleOptionSelection.bind(this), this.handleExitTalk.bind(this));
        } else {
            console.warn(`Dialogue ID "${startDialogueId}" not found for NPC "${npcId}".`);
            this.isActive = false;
        }
    }

    private getDialogueById(id: string): DialogueNode | undefined {
        return this.currentDialogues.find(d => d.id === id);
    }

    private handleOptionSelection(option: DialogueOption) {
        if (option.callbackId) {
            this.callbackHandler.handleCallback(option.callbackId);
        }

        if (option.nextDialogueId) {
            const nextDialogue = this.getDialogueById(option.nextDialogueId);
            if (nextDialogue) {
                this.currentDialogueNode = nextDialogue;
                this.dialogueUI.showDialogue(nextDialogue, this.handleOptionSelection.bind(this), this.handleExitTalk.bind(this));
                return;
            } else {
                console.warn(`Next dialogue ID "${option.nextDialogueId}" not found.`);
            }
        }

        this.endDialogue();
    }

    private handleExitTalk() {
        this.endDialogue();
    }

    public endDialogue() {
        console.log("Before emitting 'dialogueEnded'", this.currentNpcId);
        console.time("test");
        this.isActive = false;
        this.currentNpc = null;
        this.dialogueUI.hideDialogue();
        this.scene.physics.world.resume();
        this.scene.events.emit('dialogueEnded', this.currentNpcId);
        console.timeEnd("test");
        console.log("Listener count for 'dialogueEnded':", this.scene.events.listenerCount('dialogueEnded') );
    
    }

    public getCurrentNpc(): NPC | null {
        return this.currentNpc;
    }

    public isDialogueActive(): boolean {
        return this.isActive;
    }

    public reset(): void {
        this.isActive = false;
        this.currentNpc = null;
        this.currentNpcId = '';
        this.dialogueUI.reset();
    }

    public update() {
        if (this.isActive) {
            this.dialogueUI.handleInput(this.currentDialogueNode, this.handleOptionSelection.bind(this));
        }
    }
}