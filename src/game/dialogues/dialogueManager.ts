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
    private spaceKey: Phaser.Input.Keyboard.Key;
    private enterKey: Phaser.Input.Keyboard.Key;
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

        this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
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
        this.currentDialogues = (npcInstance && npcInstance.dialogues) ? npcInstance.dialogues : this.dialoguesData[npcId] || [];

        // Filter dialogues based on conditions
        if (npcInstance && npcInstance.npcMemory) {
            this.currentDialogues = this.currentDialogues.filter(node =>
                !node.condition || node.condition(GameState.getInstance(), npcInstance.npcMemory)
            );
        }

        const startDialogue = this.getDialogueById(startDialogueId);
        console.log(`[DialogueManager] Node found for ${startDialogueId}:`, startDialogue);
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
        console.log("Listener count for 'dialogueEnded':", this.scene.events.listenerCount('dialogueEnded'));

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

    public getSelectedOptionIndex(): number {
        return this.selectedOptionIndex;
    }

    public update() {
        if (this.isActive && this.currentDialogueNode) {

            // --- Handle Input for Advancement/Selection/Exit ---

            // Check for SPACE key press
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                console.log("[DialogueManager Update] Spacebar JustDown detected!"); // Debug log

                if (this.currentDialogueNode.options.length > 0) {
                    // Case 1: Node HAS options -> Select the highlighted option
                    console.log("[DialogueManager Update] Handling option selection."); // Debug log
                    // Ensure dialogueUI has getSelectedOptionIndex() method
                    const selectedOption = this.currentDialogueNode.options[this.dialogueUI.getSelectedOptionIndex()];
                    if (selectedOption) {
                        this.handleOptionSelection(selectedOption);
                    } else {
                        console.warn("[DialogueManager Update] Tried to select but no option found at index", this.dialogueUI.getSelectedOptionIndex());
                    }

                } else if (this.currentDialogueNode.nextDialogueId) {
                    // Case 2: Node has NO options BUT has a nextDialogueId -> Advance
                    console.log("[DialogueManager Update] Advancing dialogue (no options, next ID). Current Node:", this.currentDialogueNode.id, "Next ID:", this.currentDialogueNode.nextDialogueId); // Debug log
                    const nextNodeId = this.currentDialogueNode.nextDialogueId;
                    const nextDialogue = this.getDialogueById(nextNodeId);
                    if (nextDialogue) {
                        console.log("[DialogueManager Update] Found next node object:", nextDialogue.id); // Debug log
                        this.currentDialogueNode = nextDialogue; // Update the current node *before* showing UI
                        console.log("[DialogueManager Update] Calling UI.showDialogue for:", nextDialogue.id); // Debug log
                        this.dialogueUI.showDialogue(nextDialogue, this.handleOptionSelection.bind(this), this.handleExitTalk.bind(this));
                        console.log("[DialogueManager Update] Finished calling UI.showDialogue"); // Debug log
                    } else {
                        console.warn(`[DialogueManager Update] Next dialogue ID "${nextNodeId}" not found.`);
                        this.endDialogue(); // End if next node is invalid
                    }

                } else {
                    // Case 3: Node has NO options and NO nextDialogueId -> End dialogue
                    console.log("[DialogueManager Update] Ending dialogue (no options, no next ID)."); // Debug log
                    this.endDialogue();
                }
                return; // Stop processing other input for this frame
            }

            // Check for ENTER key press (Manual Exit)
            if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
                console.log("[DialogueManager Update] Enter pressed, handling exit."); // Debug log
                this.handleExitTalk(); // Use existing exit handler
                return; // Stop processing other input for this frame
            }

            // --- Handle Input for Option Navigation (Visual only, if options exist) ---
            if (this.currentDialogueNode.options.length > 0) {
                // Ensure dialogueUI has handleOptionNavigationInput() method
                this.dialogueUI.handleOptionNavigationInput();
            }
        }
    }
}
