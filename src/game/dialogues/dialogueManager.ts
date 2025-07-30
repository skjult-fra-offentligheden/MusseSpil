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
        //this.callbackHandler = new CallbackHandler(scene, clueManager, inventoryManager, cluesData);

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
        sourceId: string, // Renamed to be more generic (NPC id or Item id)
        startDialogueNodeId: string = 'greeting', // Entry point dialogue node ID within the source's dialogue array
        speakerContext?: NPC | any, // The NPC instance or the Body instance (for items)
        // dialogueData?: DialogueNode[], // REMOVE this if we fetch from AllItemConfigs for items
        //context?: any // REMOVE this if speakerContext is the main context
    ) {
        //console.log("[DialogueManager] passed vars", sourceId, startDialogueNodeId, speakerContext, this.isActive)


        if (this.isActive) return;


        this.isActive = true;
        this.currentNpcId = sourceId; 
        this.currentNpc = (speakerContext instanceof NPC) ? speakerContext : null;

        console.log("[DialogueManager] current NPC", this.currentNpc, this.currentNpcId)

        // --- Determine the source of dialogue data ---
        const itemConfig = AllItemConfigs[sourceId]; // Check if it's an item
        if (itemConfig && itemConfig.dialogue) {
            this.currentDialogues = itemConfig.dialogue;
        //    console.log(`[DialogueManager] Using ITEM dialogue for: ${sourceId}`);
        } else if (this.dialoguesData[sourceId]) { // Fallback to NPC dialogues from preloaded JSON
            // Ensure this.dialoguesData[sourceId] is an array of DialogueNode
            // If it's a single DialogueNode (as your constructor param type suggests), you might need to wrap it.
            // Assuming this.dialoguesData[npcId] is DialogueNode[] for NPCs:

            //IT ENTER HEREE
            //console.log("[DialogueManager] else if", this.dialoguesData[sourceId])
            this.currentDialogues = Array.isArray(this.dialoguesData[sourceId])
                ? this.dialoguesData[sourceId] as DialogueNode[]
                : [this.dialoguesData[sourceId] as DialogueNode]; // Wrap if it's a single node
            console.log(`[DialogueManager] Using NPC dialogue for: ${sourceId}`);
        } else {
            console.warn(`[DialogueManager] No dialogue data found for source: ${sourceId}`);
            this.currentDialogues = [];
            this.isActive = false;
            return;
        }


        let specialEventNode: DialogueNode | undefined = undefined;
        for (const node of this.currentDialogues) {
            if (node.condition) {
                const result = this.evaluateCondition(node.condition, node.id);
                if (typeof result === "string" && node.id === result) {
                    specialEventNode = node;
                    break;
                }
            }
        }

        //console.log("[DialogueManager] currentDialogues.length", this.currentDialogues.length)
        //console.log("[DialogueManager] currentDialogues.length", this.currentDialogues)
        // console log result 13 (with npc  cop2)
        // It's possible that after filtering, no dialogues remain, or the startDialogueNodeId is filtered out.
        if (this.currentDialogues.length === 0) {
            console.warn(`[DialogueManager] After filtering conditions, no dialogues remain for source: ${sourceId}`);
            this.isActive = false;
            return;
        }
        let startDialogue = specialEventNode || this.getDialogueById(startDialogueNodeId);

        //let startDialogue = this.getDialogueById(startDialogueNodeId);
        //console.log(`[DialogueManager] Node found for ${startDialogueNodeId}:`, startDialogue); // Moved for clarity
        if (!startDialogue) {
            // pick the first remaining node as a fallback
            startDialogue = this.currentDialogues[0];
            console.warn(`[DialogueManager] "${startId}" filtered out; ` +
                `falling back to "${startDialogue?.id}".`);
        }
        if (startDialogue) {
            //console.log(`[DialogueManager] Starting with node for ${startDialogueNodeId}:`, startDialogue);
            this.currentDialogueNode = startDialogue;
            this.dialogueUI.showDialogue(startDialogue, this.handleOptionSelection.bind(this), this.handleExitTalk.bind(this));
        } else {
            //console.warn(`Dialogue ID "${startDialogueNodeId}" not found for source "${sourceId}" (possibly filtered out by condition).`);
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
        if (!this.isActive) return; // Prevent multiple calls if already ended

        const npcIdThatWasTalking = this.currentNpcId; // Store the ID of the NPC whose dialogue is ending

        //console.log("Before resetting state in endDialogue for", npcIdThatWasTalking);
        //console.time("test");

        this.isActive = false;
        this.currentNpc = null;
        this.currentNpcId = ''; // Reset DM's state
        this.dialogueUI.hideDialogue();
        if (this.scene.physics.world) { // Check if world exists (e.g. scene not shutting down)
            this.scene.physics.world.resume();
        }

        //console.timeEnd("test");

        if (npcIdThatWasTalking) { // Only emit if there was an active NPC
            const specificEventName = `dialogueEnded_${npcIdThatWasTalking}`;
            //console.log(`[DialogueManager] Emitting specific event: ${specificEventName}`);
            this.scene.events.emit(specificEventName, npcIdThatWasTalking); // Emit specific event

            // Log listener count for the specific event if you want to debug that
            // console.log(`Listener count for '${specificEventName}':`, this.scene.events.listenerCount(specificEventName));
        }
        // console.log("Listener count for generic 'dialogueEnded':", this.scene.events.listenerCount('dialogueEnded'));
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

    private evaluateCondition(conditionKey: string, nodeId?: string): string | false {
        if (!conditionKey) return false;

        const gameState = GameState.getInstance(this.scene); // Still useful for eventsAddressed or other global flags

        // Helper to get item state (assuming unique evidence items for now, so we check AllItemConfigs)
        // In a more complex system, you'd get the item instance from InventoryManager
        const getItemState = (itemId: string) => {
            const itemConfig = AllItemConfigs[itemId];
            if (!itemConfig) {
                //console.warn(`[DialogueManager] Item config not found for ID: ${itemId} in getItemState`);
                return null; // Or some default state
            }
            return {
                timesUsed: itemConfig.timesUsed || 0, // Default to 0 if not present
                currentStatus: itemConfig.currentStatus || itemConfig.initialStatus || 'full' // Default status
            };
        };

        let itemState; // To hold the state of the relevant item

        switch (conditionKey) {
            case "playerDidCocaine": // This implies the coke is now 'empty' or used at least once
                itemState = getItemState('coke');
                // Condition is true if coke has been used at least once OR is empty
                //console.log(`[DialogueManager] Evaluating condition 'playerDidCocaine':`, itemState);
                //console.log(`[DialogueManager] Item state for 'coke':`, itemState ? (itemState.timesUsed > 0 || itemState.currentStatus === 'empty') && !gameState.hasEventBeenAddressed("playerDidCocaine_event") : false);
                if (itemState ? (itemState.timesUsed > 0 || itemState.currentStatus === 'empty') && !gameState.hasEventBeenAddressed("playerDidCocaine_event") : false){
                    return nodeId || "special_event_cocaine_gone";
                }
                return false;

            case "playerDidGlue_1":
                itemState = getItemState('clueGlue'); // Assuming 'clueGlue' is the ID
                if (itemState ? itemState.timesUsed === 1 && !gameState.hasEventBeenAddressed("playerDidGlue_1_event") : false) {
                    return nodeId || "special_event_glue_used_once"; // Return the nodeId if provided
                } return false; // If condition not met, return false

            case "playerDidGlue_2":
                itemState = getItemState('clueGlue');
                if (itemState ? itemState.timesUsed === 2 && !gameState.hasEventBeenAddressed("playerDidGlue_2_event") : false) {
                    return nodeId || "special_event_glue_used_twice"; // Return the nodeId if provided
                }
                return false; // If condition not met, return false

            case "playerDidGlue_3":
                itemState = getItemState('clueGlue');
                if (itemState ? itemState.timesUsed >= 3 && !gameState.hasEventBeenAddressed("playerDidGlue_3_event") : false) {
                    return nodeId || "special_event_glue_used_thrice"; // Return the nodeId if provided
                } return false;

            case "player_ate_cheese_1":
                itemState = getItemState('blueCheese'); // Assuming 'blueCheese' is the ID
                if (itemState ? itemState.timesUsed === 1 && !gameState.hasEventBeenAddressed("playerAteCheese_1_event") : false) {
                    return nodeId || "special_event_cheese_1_used"; // Return the nodeId if provided
                } return false;

            case "player_ate_cheese_2":
                itemState = getItemState('blueCheese');
                if (itemState ? itemState.timesUsed >= 2 && !gameState.hasEventBeenAddressed("playerAteCheese_2_event") : false) {
                    return nodeId || "special_event_cheese_2_used"; // Return the nodeId if provided
                } return false;
                

            // ... other non-item-consumption conditions ...
            case "hasBlueCheeseClue":
                if (this.clueManager.hasClue("blueCheese_clue_id_from_config")) {
                    return nodeId || "blueCheese_clue_found"; // Use actual clue ID
                } return false; // Use actual clue ID
            case "cokeSellerIdentified":
                if (gameState.getFlag("cokeSellerFound")) {
                    return nodeId || "cokeSeller_identified"; // Use actual node ID
                } return false; // Example if using globalFlags

            default:
                console.warn(`[DialogueManager] Unknown condition key in evaluateCondition: ${conditionKey}`);
                return false; // Or false
        }
    }

    public update() {
        if (this.isActive && this.currentDialogueNode) {

            // --- Handle Input for Advancement/Selection/Exit ---

            // Check for SPACE key press
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                //console.log("[DialogueManager Update] Spacebar JustDown detected!"); // Debug log

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
                    //console.log("[DialogueManager Update] Advancing dialogue (no options, next ID). Current Node:", this.currentDialogueNode.id, "Next ID:", this.currentDialogueNode.nextDialogueId); // Debug log
                    const nextNodeId = this.currentDialogueNode.nextDialogueId;
                    const nextDialogue = this.getDialogueById(nextNodeId);
                    if (nextDialogue) {
                        //console.log("[DialogueManager Update] Found next node object:", nextDialogue.id); // Debug log
                        this.currentDialogueNode = nextDialogue; // Update the current node *before* showing UI
                        //console.log("[DialogueManager Update] Calling UI.showDialogue for:", nextDialogue.id); // Debug log
                        this.dialogueUI.showDialogue(nextDialogue, this.handleOptionSelection.bind(this), this.handleExitTalk.bind(this));
                    //    console.log("[DialogueManager Update] Finished calling UI.showDialogue"); // Debug log
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
