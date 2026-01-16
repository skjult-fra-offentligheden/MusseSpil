// src/managers/DialogueManager.ts
import Phaser from 'phaser';
import { Story } from 'inkjs'; 
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
    
    // The Ink Story instance
    private story: Story | null = null;
    
    private currentNpc: NPC | null = null;
    private currentNpcId: string = '';
    
    // UI Component
    private dialogueUI: DialogueUI;
    private callbackHandler: CallbackHandler;

    constructor(
        scene: Phaser.Scene,
        // We no longer need the old dialoguesData JSON here, as Ink files are loaded per interaction
        _unusedDialoguesData: any, 
        _unusedClueManager: any,
        _unusedInventoryManager: any,
        callbackHandler: CallbackHandler
    ) {
        this.scene = scene;
        this.callbackHandler = callbackHandler;
        this.dialogueUI = new DialogueUI(scene);

        this.scene.events.on('start', () => this.reset());
        this.scene.events.on('resume', () => this.reset());
    }

    public startDialogue(sourceId: string, startNodeId?: string, speakerContext?: NPC | any) {
        if (this.isActive) return;
        this.isActive = true;
        this.currentNpcId = sourceId;

        console.log(`[DialogueManager] Starting dialogue for ${sourceId} at node: ${startNodeId}`);

        // 1. Setup NPC Context (Portrait, etc.)
        if (speakerContext instanceof NPC) {
            this.currentNpc = speakerContext;
            if (this.currentNpc.portraitTextureKey) {
                this.dialogueUI.setPortrait(this.currentNpc.portraitTextureKey);
            }
        } else {
            this.currentNpc = null;
            this.dialogueUI.hidePortrait();
        }

        // 2. Load Ink JSON
        // Try 'sourceId_ink' first (e.g. "cop2_ink"), then 'sourceId' (e.g. "cop2")
        const inkKey = sourceId + "_ink"; 
        let inkData = null;
        
        if (this.scene.cache.json.exists(inkKey)) {
            inkData = this.scene.cache.json.get(inkKey);
        } else if (this.scene.cache.json.exists(sourceId)) {
            inkData = this.scene.cache.json.get(sourceId);
        }

        if (!inkData) {
            console.warn(`[DialogueManager] No Ink data found for key: ${inkKey} or ${sourceId}`);
            this.endDialogue();
            return;
        }

        // 3. Initialize Story
        this.story = new Story(inkData);

        // 4. JUMP TO START NODE (Crucial Fix!)
        if (startNodeId) {
            try {
                this.story.ChoosePathString(startNodeId);
                console.log(`[DialogueManager] Jumped to knot: ${startNodeId}`);
            } catch (error) {
                console.error(`[DialogueManager] Failed to find knot: ${startNodeId}`, error);
                // If the knot fails, we might still try to continue from root, or just exit.
            }
        }

        // 5. Sync State & Bind Functions
        this.syncStateToInk();
        this.bindInkFunctions();

        // 6. Start the flow
        this.continueStory();
    }

    private continueStory() {
        if (!this.story) return;

        // FIXED: Loop until we find meaningful text or choices
        // Ink often processes logic lines (variable changes) as "content" that has no text.
        // We must skip these to find the next actual dialogue line.
        while (this.story.canContinue) {
            const text = this.story.Continue();
            
            // If line is empty or just whitespace, skip it and loop again
            if (!text || text.trim().length === 0) {
                continue;
            }

            // FOUND TEXT! Process it.
            let speakerName = this.currentNpcId; 
            let dialogueText = text;

            if (text.includes(':')) {
                const parts = text.split(':');
                if (parts.length > 1) {
                    speakerName = parts[0].trim();
                    dialogueText = parts.slice(1).join(':').trim();
                }
            }

            const options: DialogueOption[] = this.story.currentChoices.map(choice => ({
                id: choice.index.toString(),
                text: choice.text,
            }));

            const currentStepNode: DialogueNode = {
                id: "ink_step",
                speaker: speakerName,
                text: dialogueText,
                options: options
            };

            this.dialogueUI.showDialogue(
                currentStepNode,
                this.handleOptionSelection.bind(this),
                this.endDialogue.bind(this),
                this.continueStory.bind(this)
            );
            return; // Exit function, we are now waiting for user input
        }

        // If loop finishes and we have choices but NO text (Rare but possible)
        if (this.story.currentChoices.length > 0) {
            const options = this.story.currentChoices.map(choice => ({
                id: choice.index.toString(),
                text: choice.text,
            }));
            
            this.dialogueUI.showDialogue(
                { id: "choice_only", speaker: this.currentNpcId, text: "...", options: options },
                this.handleOptionSelection.bind(this),
                this.endDialogue.bind(this),
                this.continueStory.bind(this)
            );
        } else {
            // No text, no choices -> End of Story
            this.endDialogue();
        }
    }

    private handleOptionSelection(option: DialogueOption) {
        if (!this.story) return;
        
        // Tell Ink which choice index was picked
        this.story.ChooseChoiceIndex(parseInt(option.id));
        
        // Continue to the result of that choice
        this.continueStory();
    }

    private syncStateToInk() {
        if (!this.story) return;
        const gameState = GameState.getInstance();

        // Manually push known flags from GameState to Ink
        // Note: Ink variables must exist in the ink file to be set
        const globalVars = [
            "playerDidCocaine", "playerDidGlue_1", "playerDidGlue_2", 
            "playerDidGlue_3", "HAS_PHONE_CLUE", "player_ate_cheese_1", 
            "player_ate_cheese_2"
        ];

        globalVars.forEach(varName => {
            try {
                // Check if variable exists in this story before setting
                // (Optimally, you check the story.variablesState keys)
                const val = gameState.getFlag(varName); // Assuming getFlag returns boolean
                this.story.variablesState[varName] = val;
            } catch (e) {
                // Variable likely doesn't exist in this specific ink file, ignore
            }
        });
    }

    private bindInkFunctions() {
        if (!this.story) return;

        // Helper to bind safely
        const bind = (funcName: string, action: () => void) => {
            try {
                this.story!.BindExternalFunction(funcName, action);
            } catch (e) {
                // Function not defined in this ink file, ignore
            }
        };

        // Bind the external functions defined in your Ink file
        bind("increaseCopReputation", () => {
            console.log("Ink called: Increase Cop Reputation");
            // Call your actual game logic here
             this.callbackHandler.handleCallback("increaseCopReputation");
        });

        bind("decreaseCopReputation", () => {
            console.log("Ink called: Decrease Cop Reputation");
             this.callbackHandler.handleCallback("decreaseCopReputation");
        });

        bind("triggerGameOverFired", () => {
            console.log("Ink called: Game Over");
            this.scene.events.emit('GAME_OVER');
        });

        this.story.BindExternalFunction("tutorial_skip_callback", () => {
             this.callbackHandler.handleCallback("tutorial/skip_tutorial");
        });

        // NEW: Start Investigation
        this.story.BindExternalFunction("start_investigation_callback", () => {
             this.callbackHandler.handleCallback("tutorial/start_investigation");
        });
    }

    public endDialogue() {
        if (!this.isActive) return;

        // SAVE STATE: specific to this NPC (Memory)
        if (this.story && this.currentNpc && this.currentNpc.npcMemory) {
            const saveString = this.story.state.ToJson();
            (this.currentNpc.npcMemory as any).inkState = saveString;
        }

        const npcIdThatWasTalking = this.currentNpcId;
        this.isActive = false;
        this.currentNpc = null;
        this.story = null;
        
        this.dialogueUI.hideDialogue();
        
        if (this.scene.physics.world) {
            this.scene.physics.world.resume();
        }

        if (npcIdThatWasTalking) {
            this.scene.events.emit(`dialogueEnded_${npcIdThatWasTalking}`, npcIdThatWasTalking);
        }
    }

    public isDialogueActive(): boolean {
        return this.isActive;
    }

    public getCurrentNpc(): NPC | null {
        return this.currentNpc;
    }

    public reset(): void {
        this.endDialogue();
        this.dialogueUI.reset();
    }

    // Pass-through update for UI animations/input
    public update() {
        // You might need to expose an update method in DialogueUI or handle inputs there
        // The original DialogueUI handled some inputs internally.
    }
}

// export class DialogueManager {
//     private scene: Phaser.Scene;
//     private isActive: boolean = false;
//     private currentDialogues: DialogueNode[] = [];
//     private currentNpcId: string = '';
//     private currentNpc: NPC | null = null;
//     private clueManager: ClueManager;
//     private cluesData: { [key: string]: Clue };
//     private currentDialogueNode!: DialogueNode;
//     private selectedOptionIndex: number = 0;
//     private dialoguesData: { [npcId: string]: DialogueNode };
//     private inventoryManager: InventoryManager;
//     private dialogueUI: DialogueUI;
//     private spaceKey: Phaser.Input.Keyboard.Key;
//     private enterKey: Phaser.Input.Keyboard.Key;
//     private callbackHandler: CallbackHandler;

//     constructor(
//         scene: Phaser.Scene,
//         dialoguesData: { [npcId: string]: DialogueNode },
//         clueManager: ClueManager,
//         inventoryManager: InventoryManager,
//         callbackHandler: CallbackHandler
//     ) {
//         this.scene = scene;
//         this.dialoguesData = dialoguesData;
//         this.clueManager = clueManager;
//         this.inventoryManager = inventoryManager;
//         this.callbackHandler = callbackHandler;
//         this.dialogueUI = new DialogueUI(scene);

//         // Keyboard input setup
//         this.scene.events.on('start', () => this.reset());
//         this.scene.events.on('resume', () => this.reset());

//         this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
//         this.enterKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
//     }

//     public setScene(scene: Phaser.Scene): void {
//         this.scene = scene;
//         this.dialogueUI.setScene(scene);
//     }

//     public startDialogue(
//         sourceId: string,
//         startDialogueNodeId: string = 'greeting',
//         speakerContext?: NPC | any
//         // REMOVED: this.handleAdvance.bind(this) - This was a syntax error in the definition
//     ) {
//         if (this.isActive) return;
//         this.isActive = true;
//         this.currentNpcId = sourceId;

//         // Check for NPC instance and set portrait
//         if (speakerContext instanceof NPC) {
//             this.currentNpc = speakerContext;
//             if (this.currentNpc.portraitTextureKey) {
//                 this.dialogueUI.setPortrait(this.currentNpc.portraitTextureKey);
//             } else {
//                 this.dialogueUI.hidePortrait();
//             }
//         } else {
//             this.currentNpc = null;
//             this.dialogueUI.hidePortrait();
//         }

//         console.log("[DialogueManager] current NPC", this.currentNpc, this.currentNpcId);

//         // Determine source of dialogue data
//         const itemConfig = AllItemConfigs[sourceId];
//         if (itemConfig && itemConfig.dialogue) {
//             this.currentDialogues = itemConfig.dialogue;
//         } else if (this.dialoguesData[sourceId]) {
//             this.currentDialogues = Array.isArray(this.dialoguesData[sourceId])
//                 ? this.dialoguesData[sourceId] as DialogueNode[]
//                 : [this.dialoguesData[sourceId] as DialogueNode];
//             console.log(`[DialogueManager] Using NPC dialogue for: ${sourceId}`);
//         } else {
//             console.warn(`[DialogueManager] No dialogue data found for source: ${sourceId}`);
//             this.currentDialogues = [];
//             this.isActive = false;
//             return;
//         }

//         // Filter based on conditions
//         let specialEventNode: DialogueNode | undefined = undefined;
//         for (const node of this.currentDialogues) {
//             // 1. Check if this node is 'once' and has already been visited
//             if (node.once && this.currentNpc && this.currentNpc.npcMemory.visitedDialogues.has(node.id)) {
//                 continue; // Skip this node, we've already seen it
//             }

//             // 2. Check the condition
//             if (node.condition) {
//                 const result = this.evaluateCondition(node.condition, node.id);
//                 if (typeof result === "string" && node.id === result) {
//                     specialEventNode = node;
//                     break;
//                 }
//             }
//         }

//         if (this.currentDialogues.length === 0) {
//             console.warn(`[DialogueManager] After filtering conditions, no dialogues remain for source: ${sourceId}`);
//             this.isActive = false;
//             return;
//         }

//         let startDialogue = specialEventNode || this.getDialogueById(startDialogueNodeId);

//         if (!startDialogue) {
//             startDialogue = this.currentDialogues[0];
//             console.warn(`[DialogueManager] "${startDialogueNodeId}" filtered out; falling back to "${startDialogue?.id}".`);
//         }

//         if (startDialogue) {
//             this.currentDialogueNode = startDialogue;

//             // --- ADD THIS BLOCK ---
//             // If this node is meant to be shown only once, mark it as visited immediately
//             if (startDialogue.once && this.currentNpc) {
//                 this.currentNpc.npcMemory.visitedDialogues.add(startDialogue.id);
//             }
//             // ---------------------

//             this.dialogueUI.showDialogue(
//                 startDialogue, // Use getFilteredNode(startDialogue) here if you implemented the option filter
//                 this.handleOptionSelection.bind(this),
//                 this.handleExitTalk.bind(this),
//                 this.handleAdvance.bind(this)
//             );
//         } else {
//             this.isActive = false;
//         }
//     }

//     private getFilteredNode(node: DialogueNode): DialogueNode {
//         if (!this.currentNpc) return node;

//         const validOptions = node.options.filter(option => {
//             if (option.once) {
//                 if (this.currentNpc?.npcMemory.visitedOptions?.has(option.id)) {
//                     return false;
//                 }
//             }
//             return true;
//         })
//         return { ...node, options: validOptions };
//     }

//     private getDialogueById(id: string): DialogueNode | undefined {
//         return this.currentDialogues.find(d => d.id === id);
//     }

//     private handleOptionSelection(option: DialogueOption) {
//         if (option.once && this.currentNpc) {
//             if (!this.currentNpc.npcMemory.visitedOptions){
//                 this.currentNpc.npcMemory.visitedOptions = new Set();
//             }
//             this.currentNpc.npcMemory.visitedOptions.add(option.id);
//         }

//         if (option.callbackId) {
//             this.callbackHandler.handleCallback(option.callbackId);
//         }

//         if (option.nextDialogueId) {
//             const nextDialogue = this.getDialogueById(option.nextDialogueId);
//             if (nextDialogue) {
//                 this.currentDialogueNode = nextDialogue;
//                 const nodeToShow = this.getFilteredNode(nextDialogue);
//                 // --- FIX: Pass handleAdvance here ---
//                 this.dialogueUI.showDialogue(
//                     nodeToShow,
//                     this.handleOptionSelection.bind(this),
//                     this.handleExitTalk.bind(this),
//                     this.handleAdvance.bind(this) // <--- Passed correctly here
//                 );
//                 return;
//             } else {
//                 console.warn(`Next dialogue ID "${option.nextDialogueId}" not found.`);
//             }
//         }

//         this.endDialogue();
//     }

//     private handleExitTalk() {
//         this.endDialogue();
//     }

//     public endDialogue() {
//         if (!this.isActive) return;

//         const npcIdThatWasTalking = this.currentNpcId;
//         this.isActive = false;
//         this.currentNpc = null;
//         this.currentNpcId = '';
//         this.dialogueUI.hideDialogue();
        
//         if (this.scene.physics.world) {
//             this.scene.physics.world.resume();
//         }

//         if (npcIdThatWasTalking) {
//             const specificEventName = `dialogueEnded_${npcIdThatWasTalking}`;
//             this.scene.events.emit(specificEventName, npcIdThatWasTalking);
//         }
//     }

//     public getCurrentNpc(): NPC | null {
//         return this.currentNpc;
//     }

//     public isDialogueActive(): boolean {
//         return this.isActive;
//     }

//     public reset(): void {
//         this.isActive = false;
//         this.currentNpc = null;
//         this.currentNpcId = '';
//         this.dialogueUI.reset();
//     }

//     public getSelectedOptionIndex(): number {
//         return this.selectedOptionIndex;
//     }

//     private evaluateCondition(conditionKey: string | ((s: GameState) => boolean), nodeId?: string) {
//         if (!conditionKey) return false;
//         if (typeof conditionKey === 'function') return conditionKey(GameState.getInstance()) ? nodeId! : false;

//         const gameState = GameState.getInstance();

//         switch (conditionKey) {
//             // --- EXISTING ---
//             case "HAS_PHONE_CLUE":
//                 return gameState.isClueDiscovered('clue_phone_gang_connection') ? nodeId : false;

//             // ============================================================
//             // 🧀 CHEESE TRIGGERS (Exclusive Levels)
//             // ============================================================
//             // Show Level 1 ONLY if Level 2 hasn't happened yet
//             case "player_ate_cheese_1":
//                 return (gameState.getFlag("player_ate_cheese_1") && !gameState.getFlag("player_ate_cheese_2")) ? nodeId : false;
            
//             case "player_ate_cheese_2":
//                 return gameState.getFlag("player_ate_cheese_2") ? nodeId : false;

//             case "PLAYER_ATE_CHEESE_ONCE": 
//                 // Keep this simple or link it to level 1 logic
//                 return (gameState.getFlag("player_ate_cheese_1") && !gameState.getFlag("player_ate_cheese_2")) ? nodeId : false;

//             // ============================================================
//             // 🧴 GLUE TRIGGERS (Exclusive Levels)
//             // ============================================================
//             // Level 1: Active only if we haven't reached Level 2
//             case "playerDidGlue_1":
//                 return (gameState.getFlag("playerDidGlue_1") && !gameState.getFlag("playerDidGlue_2")) ? nodeId : false;

//             // Level 2: Active only if we haven't reached Level 3
//             case "playerDidGlue_2":
//                 return (gameState.getFlag("playerDidGlue_2") && !gameState.getFlag("playerDidGlue_3")) ? nodeId : false;

//             // Level 3: Always active if reached
//             case "playerDidGlue_3":
//                 return gameState.getFlag("playerDidGlue_3") ? nodeId : false;

//             // ============================================================
//             // ⚪ COCAINE TRIGGERS
//             // ============================================================
//             case "playerDidCocaine_1":
//                 return gameState.getFlag("playerDidCocaine_1") ? nodeId : false;
//             case "playerDidCocaine_2":
//                 return gameState.getFlag("playerDidCocaine_2") ? nodeId : false ? nodeId : false;

//             default:
//                 console.warn(`Condition "${conditionKey}" not implemented in DialogueManager.`);
//                 return false;
//         }
//     }

// private handleAdvance() {
//         if (!this.currentDialogueNode) return;

//         if (this.currentDialogueNode.nextDialogueId) {
//             const nextNodeId = this.currentDialogueNode.nextDialogueId;
//             const nextDialogue = this.getDialogueById(nextNodeId);

//             if (nextDialogue) {
//                 this.currentDialogueNode = nextDialogue;

//                 // --- ADD THIS BLOCK ---
//                 if (nextDialogue.once && this.currentNpc) {
//                     this.currentNpc.npcMemory.visitedDialogues.add(nextDialogue.id);
//                 }
//                 // ---------------------

//                 this.dialogueUI.showDialogue(
//                     nextDialogue, 
//                     this.handleOptionSelection.bind(this),
//                     this.handleExitTalk.bind(this),
//                     this.handleAdvance.bind(this)
//                 );
//             } else {
//                 this.endDialogue();
//             }
//         } else {
//             this.endDialogue();
//         }
//     }

//     public update() {
//         if (this.isActive && this.currentDialogueNode) {

//             // --- Handle Input for Advancement/Selection/Exit ---

//             // Check for SPACE key press
//             if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                
//                 if (this.currentDialogueNode.options.length > 0) {
//                     // Case 1: Node HAS options -> Select the highlighted option
//                     console.log("[DialogueManager Update] Handling option selection.");
//                     const selectedOption = this.currentDialogueNode.options[this.dialogueUI.getSelectedOptionIndex()];
//                     if (selectedOption) {
//                         this.handleOptionSelection(selectedOption);
//                     } else {
//                         console.warn("[DialogueManager Update] Tried to select but no option found at index", this.dialogueUI.getSelectedOptionIndex());
//                     }

//                 } else if (this.currentDialogueNode.nextDialogueId) {
//                     // Case 2: Node has NO options BUT has a nextDialogueId -> Advance
//                     // --- CLEANER: Use the helper method ---
//                     this.handleAdvance(); 
//                 } else {
//                     // Case 3: Node has NO options and NO nextDialogueId -> End dialogue
//                     console.log("[DialogueManager Update] Ending dialogue (no options, no next ID).");
//                     this.endDialogue();
//                 }
//                 return; // Stop processing other input for this frame
//             }

//             // Check for ENTER key press (Manual Exit)
//             if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
//                 console.log("[DialogueManager Update] Enter pressed, handling exit.");
//                 this.handleExitTalk();
//                 return;
//             }

//             // --- Handle Input for Option Navigation (Visual only, if options exist) ---
//             if (this.currentDialogueNode.options.length > 0) {
//                 this.dialogueUI.handleOptionNavigationInput();
//             }
//         }
//     }
// }