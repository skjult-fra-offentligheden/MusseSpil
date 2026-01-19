import { Story } from 'inkjs';
import { DialogueUI } from './dialogueUI';
import { CallbackHandler } from '../managers/CallBackManager';
import { DialogueNode, DialogueOption } from './dialogues';

export class InteractionManager {
    private scene: Phaser.Scene;
    private story: Story | null = null;
    private dialogueUI: DialogueUI;
    private callbackHandler: CallbackHandler;
    private isActive: boolean = false;

    constructor(scene: Phaser.Scene, callbackHandler: CallbackHandler) {
        this.scene = scene;
        this.callbackHandler = callbackHandler;
        this.dialogueUI = new DialogueUI(scene);
    }

    public interact(itemId: string) {
        if (this.isActive) return;

        // 1. Load the master objects file
        const inkData = this.scene.cache.json.get("objects_dialogues_toturial_ink");
        if (!inkData) {
            console.error(`[InteractionManager] Master 'objects_ink' not found in cache.`);
            return;
        }

        this.isActive = true;
        this.story = new Story(inkData);

        // 2. Bind the specific item pickup function
        this.story.BindExternalFunction("handleCallback", (id: string) => {
            console.log(`[InteractionManager] Triggering item callback: ${id}`);
            this.callbackHandler.handleCallback(id);
        });

        // 3. Jump to the specific item knot (e.g., 'clueGlue')
        try {
            this.story.ChoosePathString(itemId);
        } catch (e) {
            console.warn(`[InteractionManager] No knot found for item: ${itemId}`);
            this.isActive = false;
            return;
        }

        this.continueInteraction();
    }

    private continueInteraction() {
        if (!this.story) return;

        if (this.story.canContinue) {
            const text = this.story.Continue()?.trim();
            
            // Skip empty logic lines
            if (!text) {
                this.continueInteraction();
                return;
            }

            const options: DialogueOption[] = this.story.currentChoices.map(choice => ({
                id: choice.index.toString(),
                text: choice.text,
            }));

            const node: DialogueNode = {
                id: "interaction_step",
                speaker: "Observation", // Generic speaker for objects
                text: text,
                options: options
            };

            this.dialogueUI.showDialogue(
                node,
                this.handleOption.bind(this),
                this.endInteraction.bind(this),
                this.continueInteraction.bind(this)
            );
        } else if (this.story.currentChoices.length > 0) {
            // Handle choice-only points
            this.dialogueUI.showDialogue(
                { id: "choice", speaker: "Observation", text: "...", options: this.story.currentChoices.map(c => ({ id: c.index.toString(), text: c.text })) },
                this.handleOption.bind(this),
                this.endInteraction.bind(this),
                this.continueInteraction.bind(this)
            );
        } else {
            this.endInteraction();
        }
    }

    private handleOption(option: DialogueOption) {
        this.story?.ChooseChoiceIndex(parseInt(option.id));
        this.continueInteraction();
    }

    private endInteraction() {
        this.isActive = false;
        this.story = null;
        this.dialogueUI.hideDialogue();
        if (this.scene.physics.world) this.scene.physics.world.resume();
    }
}