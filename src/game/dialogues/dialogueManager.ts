// src/managers/DialogueManager.ts
import Phaser from 'phaser';
import { DialogueNode, DialogueOption } from '../dialogues/dialogues';
import { NPC } from '../NPCgeneral/npc';
import { ClueManager } from '../clueScripts/clueManager';
import { Clue } from '../classes/clue';
import { InventoryManager } from '../managers/itemMananger';
import { CallbackHandler } from '../managers/CallBackManager';
import { GameState } from '../managers/GameState';
import { DialogueUI } from '../dialogues/dialogueUI';
import { AllItemConfigs } from '../../data/items/AllItemConfig';

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
    private dialogueUI: DialogueUI;
    private spaceKey: Phaser.Input.Keyboard.Key;
    private enterKey: Phaser.Input.Keyboard.Key;
    private callbackHandler: CallbackHandler;

    constructor(
        scene: Phaser.Scene,
        dialoguesData: { [npcId: string]: DialogueNode },
        clueManager: ClueManager,
        inventoryManager: InventoryManager,
        callbackHandler: CallbackHandler
    ) {
        this.scene = scene;
        this.dialoguesData = dialoguesData;
        this.clueManager = clueManager;
        this.inventoryManager = inventoryManager;
        this.callbackHandler = callbackHandler;
        this.dialogueUI = new DialogueUI(scene);

        // Keyboard input setup
        this.scene.events.on('start', () => this.reset());
        this.scene.events.on('resume', () => this.reset());

        this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
        this.dialogueUI.setScene(scene);
    }

    public startDialogue(
        sourceId: string,
        startDialogueNodeId: string = 'greeting',
        speakerContext?: NPC | any
        // REMOVED: this.handleAdvance.bind(this) - This was a syntax error in the definition
    ) {
        if (this.isActive) return;
        this.isActive = true;
        this.currentNpcId = sourceId;

        // Check for NPC instance and set portrait
        if (speakerContext instanceof NPC) {
            this.currentNpc = speakerContext;
            if (this.currentNpc.portraitTextureKey) {
                this.dialogueUI.setPortrait(this.currentNpc.portraitTextureKey);
            } else {
                this.dialogueUI.hidePortrait();
            }
        } else {
            this.currentNpc = null;
            this.dialogueUI.hidePortrait();
        }

        console.log("[DialogueManager] current NPC", this.currentNpc, this.currentNpcId);

        // Determine source of dialogue data
        const itemConfig = AllItemConfigs[sourceId];
        if (itemConfig && itemConfig.dialogue) {
            this.currentDialogues = itemConfig.dialogue;
        } else if (this.dialoguesData[sourceId]) {
            this.currentDialogues = Array.isArray(this.dialoguesData[sourceId])
                ? this.dialoguesData[sourceId] as DialogueNode[]
                : [this.dialoguesData[sourceId] as DialogueNode];
            console.log(`[DialogueManager] Using NPC dialogue for: ${sourceId}`);
        } else {
            console.warn(`[DialogueManager] No dialogue data found for source: ${sourceId}`);
            this.currentDialogues = [];
            this.isActive = false;
            return;
        }

        // Filter based on conditions
        let specialEventNode: DialogueNode | undefined = undefined;
        for (const node of this.currentDialogues) {
            // 1. Check if this node is 'once' and has already been visited
            if (node.once && this.currentNpc && this.currentNpc.npcMemory.visitedDialogues.has(node.id)) {
                continue; // Skip this node, we've already seen it
            }

            // 2. Check the condition
            if (node.condition) {
                const result = this.evaluateCondition(node.condition, node.id);
                if (typeof result === "string" && node.id === result) {
                    specialEventNode = node;
                    break;
                }
            }
        }

        if (this.currentDialogues.length === 0) {
            console.warn(`[DialogueManager] After filtering conditions, no dialogues remain for source: ${sourceId}`);
            this.isActive = false;
            return;
        }

        let startDialogue = specialEventNode || this.getDialogueById(startDialogueNodeId);

        if (!startDialogue) {
            startDialogue = this.currentDialogues[0];
            console.warn(`[DialogueManager] "${startDialogueNodeId}" filtered out; falling back to "${startDialogue?.id}".`);
        }

        if (startDialogue) {
            this.currentDialogueNode = startDialogue;

            // --- ADD THIS BLOCK ---
            // If this node is meant to be shown only once, mark it as visited immediately
            if (startDialogue.once && this.currentNpc) {
                this.currentNpc.npcMemory.visitedDialogues.add(startDialogue.id);
            }
            // ---------------------

            this.dialogueUI.showDialogue(
                startDialogue, // Use getFilteredNode(startDialogue) here if you implemented the option filter
                this.handleOptionSelection.bind(this),
                this.handleExitTalk.bind(this),
                this.handleAdvance.bind(this)
            );
        } else {
            this.isActive = false;
        }
    }

    private getFilteredNode(node: DialogueNode): DialogueNode {
        if (!this.currentNpc) return node;

        const validOptions = node.options.filter(option => {
            if (option.once) {
                if (this.currentNpc?.npcMemory.visitedOptions?.has(option.id)) {
                    return false;
                }
            }
            return true;
        })
        return { ...node, options: validOptions };
    }

    private getDialogueById(id: string): DialogueNode | undefined {
        return this.currentDialogues.find(d => d.id === id);
    }

    private handleOptionSelection(option: DialogueOption) {
        if (option.once && this.currentNpc) {
            if (!this.currentNpc.npcMemory.visitedOptions){
                this.currentNpc.npcMemory.visitedOptions = new Set();
            }
            this.currentNpc.npcMemory.visitedOptions.add(option.id);
        }

        if (option.callbackId) {
            this.callbackHandler.handleCallback(option.callbackId);
        }

        if (option.nextDialogueId) {
            const nextDialogue = this.getDialogueById(option.nextDialogueId);
            if (nextDialogue) {
                this.currentDialogueNode = nextDialogue;
                const nodeToShow = this.getFilteredNode(nextDialogue);
                // --- FIX: Pass handleAdvance here ---
                this.dialogueUI.showDialogue(
                    nodeToShow,
                    this.handleOptionSelection.bind(this),
                    this.handleExitTalk.bind(this),
                    this.handleAdvance.bind(this) // <--- Passed correctly here
                );
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
        if (!this.isActive) return;

        const npcIdThatWasTalking = this.currentNpcId;
        this.isActive = false;
        this.currentNpc = null;
        this.currentNpcId = '';
        this.dialogueUI.hideDialogue();
        
        if (this.scene.physics.world) {
            this.scene.physics.world.resume();
        }

        if (npcIdThatWasTalking) {
            const specificEventName = `dialogueEnded_${npcIdThatWasTalking}`;
            this.scene.events.emit(specificEventName, npcIdThatWasTalking);
        }
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

    private evaluateCondition(conditionKey: string | ((s: GameState) => boolean), nodeId?: string) {
        if (!conditionKey) return false;
        if (typeof conditionKey === 'function') return conditionKey(GameState.getInstance()) ? nodeId! : false;

        const gameState = GameState.getInstance();

        switch (conditionKey) {
            // --- EXISTING ---
            case "HAS_PHONE_CLUE":
                return gameState.isClueDiscovered('clue_phone_gang_connection') ? nodeId : false;

            // ============================================================
            // 🧀 CHEESE TRIGGERS (Exclusive Levels)
            // ============================================================
            // Show Level 1 ONLY if Level 2 hasn't happened yet
            case "player_ate_cheese_1":
                return (gameState.getFlag("player_ate_cheese_1") && !gameState.getFlag("player_ate_cheese_2")) ? nodeId : false;
            
            case "player_ate_cheese_2":
                return gameState.getFlag("player_ate_cheese_2") ? nodeId : false;

            case "PLAYER_ATE_CHEESE_ONCE": 
                // Keep this simple or link it to level 1 logic
                return (gameState.getFlag("player_ate_cheese_1") && !gameState.getFlag("player_ate_cheese_2")) ? nodeId : false;

            // ============================================================
            // 🧴 GLUE TRIGGERS (Exclusive Levels)
            // ============================================================
            // Level 1: Active only if we haven't reached Level 2
            case "playerDidGlue_1":
                return (gameState.getFlag("playerDidGlue_1") && !gameState.getFlag("playerDidGlue_2")) ? nodeId : false;

            // Level 2: Active only if we haven't reached Level 3
            case "playerDidGlue_2":
                return (gameState.getFlag("playerDidGlue_2") && !gameState.getFlag("playerDidGlue_3")) ? nodeId : false;

            // Level 3: Always active if reached
            case "playerDidGlue_3":
                return gameState.getFlag("playerDidGlue_3") ? nodeId : false;

            // ============================================================
            // ⚪ COCAINE TRIGGERS
            // ============================================================
            case "playerDidCocaine_1":
                return gameState.getFlag("playerDidCocaine_1") ? nodeId : false;
            case "playerDidCocaine_2":
                return gameState.getFlag("playerDidCocaine_2") ? nodeId : false ? nodeId : false;

            default:
                console.warn(`Condition "${conditionKey}" not implemented in DialogueManager.`);
                return false;
        }
    }

private handleAdvance() {
        if (!this.currentDialogueNode) return;

        if (this.currentDialogueNode.nextDialogueId) {
            const nextNodeId = this.currentDialogueNode.nextDialogueId;
            const nextDialogue = this.getDialogueById(nextNodeId);

            if (nextDialogue) {
                this.currentDialogueNode = nextDialogue;

                // --- ADD THIS BLOCK ---
                if (nextDialogue.once && this.currentNpc) {
                    this.currentNpc.npcMemory.visitedDialogues.add(nextDialogue.id);
                }
                // ---------------------

                this.dialogueUI.showDialogue(
                    nextDialogue, 
                    this.handleOptionSelection.bind(this),
                    this.handleExitTalk.bind(this),
                    this.handleAdvance.bind(this)
                );
            } else {
                this.endDialogue();
            }
        } else {
            this.endDialogue();
        }
    }

    public update() {
        if (this.isActive && this.currentDialogueNode) {

            // --- Handle Input for Advancement/Selection/Exit ---

            // Check for SPACE key press
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                
                if (this.currentDialogueNode.options.length > 0) {
                    // Case 1: Node HAS options -> Select the highlighted option
                    console.log("[DialogueManager Update] Handling option selection.");
                    const selectedOption = this.currentDialogueNode.options[this.dialogueUI.getSelectedOptionIndex()];
                    if (selectedOption) {
                        this.handleOptionSelection(selectedOption);
                    } else {
                        console.warn("[DialogueManager Update] Tried to select but no option found at index", this.dialogueUI.getSelectedOptionIndex());
                    }

                } else if (this.currentDialogueNode.nextDialogueId) {
                    // Case 2: Node has NO options BUT has a nextDialogueId -> Advance
                    // --- CLEANER: Use the helper method ---
                    this.handleAdvance(); 
                } else {
                    // Case 3: Node has NO options and NO nextDialogueId -> End dialogue
                    console.log("[DialogueManager Update] Ending dialogue (no options, no next ID).");
                    this.endDialogue();
                }
                return; // Stop processing other input for this frame
            }

            // Check for ENTER key press (Manual Exit)
            if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
                console.log("[DialogueManager Update] Enter pressed, handling exit.");
                this.handleExitTalk();
                return;
            }

            // --- Handle Input for Option Navigation (Visual only, if options exist) ---
            if (this.currentDialogueNode.options.length > 0) {
                this.dialogueUI.handleOptionNavigationInput();
            }
        }
    }
}