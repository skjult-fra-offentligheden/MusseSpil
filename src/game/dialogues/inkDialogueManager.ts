import Phaser from 'phaser';
import { Story } from 'inkjs';
import { DialogueNode, DialogueOption } from './dialogues';
import { DialogueUI } from './dialogueUI';
import { GameState } from '../managers/GameState';
import { UIManager } from '../managers/UIManager';
import { AllItemConfigs } from '../../data/items/AllItemConfig';
import { CallbackHandler } from '../managers/CallBackManager';
import { NPC } from '../NPCgeneral/npc';
import { DialogueController } from './dialogueController';

type InkSources = {
    npcInkKeys: Record<string, string>;
    objectsInkKey?: string;
};

export class InkDialogueManager implements DialogueController {
    private scene: Phaser.Scene;
    private inkSources: InkSources;
    private callbackHandler: CallbackHandler;
    private dialogueUI: DialogueUI;
    private story: Story | null = null;
    private isActive: boolean = false;
    private currentNpcId: string = '';
    private currentNpc: NPC | null = null;
    private currentDialogueNode: DialogueNode | null = null;
    private spaceKey: Phaser.Input.Keyboard.Key;
    private enterKey: Phaser.Input.Keyboard.Key;
    private storyStateBySourceId: Map<string, string> = new Map();

    constructor(scene: Phaser.Scene, inkSources: InkSources, callbackHandler: CallbackHandler) {
        this.scene = scene;
        this.inkSources = inkSources;
        this.callbackHandler = callbackHandler;
        this.dialogueUI = new DialogueUI(scene);
        this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
        this.dialogueUI.setScene(scene);
    }

    public startDialogue(sourceId: string, startDialogueNodeId: string = 'greeting', speakerContext?: NPC | any) {
        if (this.isActive) return;

        const inkKey = this.resolveInkKey(sourceId);
        if (!inkKey) {
            console.warn(`[InkDialogueManager] No ink key found for source: ${sourceId}`);
            return;
        }

        const inkData = this.scene.cache.json.get(inkKey);
        if (!inkData) {
            console.warn(`[InkDialogueManager] Ink data missing for key: ${inkKey}`);
            return;
        }

        this.isActive = true;
        this.currentNpcId = sourceId;

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

        this.story = new Story(inkData);
        this.story.onError = (message) => {
            console.error(`[InkDialogueManager] Ink error for ${sourceId}:`, message);
            this.endDialogue();
        };

        const savedState = this.storyStateBySourceId.get(sourceId);
        if (savedState) {
            this.story.state.LoadJson(savedState);
        }

        this.bindExternalFunctions();
        this.syncStoryVariables();

        if (!this.chooseStartPath(sourceId, startDialogueNodeId)) {
            console.warn(`[InkDialogueManager] No valid ink path for ${sourceId} (${startDialogueNodeId}).`);
            this.endDialogue();
            return;
        }

        this.continueStory();
    }

    public update() {
        if (!this.isActive || !this.currentDialogueNode) return;

        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            if (this.currentDialogueNode.options.length > 0) {
                const selectedOption = this.currentDialogueNode.options[this.dialogueUI.getSelectedOptionIndex()];
                if (selectedOption) this.handleOptionSelection(selectedOption);
            } else if (this.currentDialogueNode.nextDialogueId) {
                this.continueStory();
            } else {
                this.endDialogue();
            }
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.endDialogue();
            return;
        }

        if (this.currentDialogueNode.options.length > 0) {
            this.dialogueUI.handleOptionNavigationInput();
        }
    }

    public endDialogue(options?: { saveState?: boolean }) {
        if (!this.isActive) return;

        const shouldSaveState = options?.saveState !== false;
        if (shouldSaveState && this.story) {
            this.storyStateBySourceId.set(this.currentNpcId, this.story.state.toJson());
        }

        const npcIdThatWasTalking = this.currentNpcId;
        this.isActive = false;
        this.story = null;
        this.currentDialogueNode = null;
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

    public isDialogueActive(): boolean {
        return this.isActive;
    }

    public getCurrentNpc(): NPC | null {
        return this.currentNpc;
    }

    private resolveInkKey(sourceId: string): string | null {
        if (this.inkSources.npcInkKeys[sourceId]) return this.inkSources.npcInkKeys[sourceId];
        if (this.inkSources.objectsInkKey && AllItemConfigs[sourceId]) return this.inkSources.objectsInkKey;
        return null;
    }

    private chooseStartPath(sourceId: string, startDialogueNodeId?: string): boolean {
        if (!this.story) return false;

        const candidates: string[] = [];
        const objectKnot = this.getObjectInkKnot(sourceId);
        if (objectKnot && objectKnot !== sourceId) {
            candidates.push(objectKnot);
        }
        if (startDialogueNodeId && startDialogueNodeId !== 'greeting') {
            candidates.push(startDialogueNodeId, `${sourceId}.${startDialogueNodeId}`);
        }

        candidates.push(`${sourceId}_entry`, sourceId);

        if (startDialogueNodeId === 'greeting') {
            candidates.push(`${sourceId}.greeting`);
        }

        for (const path of candidates) {
            if (!path) continue;
            try {
                this.story.ChoosePathString(path);
                return true;
            } catch {
                continue;
            }
        }

        return false;
    }

    private continueStory() {
        if (!this.story) return;

        if (this.story.canContinue) {
            let text = '';
            try {
                text = this.story.Continue()?.trim() || '';
            } catch (error) {
                console.warn('[InkDialogueManager] Ink continue failed.', error);
                this.endDialogue();
                return;
            }
            if (!text) {
                this.continueStory();
                return;
            }

            const options: DialogueOption[] = this.story.currentChoices.map(choice => ({
                id: choice.index.toString(),
                text: choice.text
            }));

            const node: DialogueNode = {
                id: 'ink_step',
                text,
                options,
                nextDialogueId: this.story.canContinue ? '__ink_continue' : undefined
            };

            this.currentDialogueNode = node;
            this.dialogueUI.showDialogue(
                node,
                this.handleOptionSelection.bind(this),
                this.endDialogue.bind(this),
                this.continueStory.bind(this)
            );
            return;
        }

        if (this.story.currentChoices.length > 0) {
            const node: DialogueNode = {
                id: 'ink_choice',
                text: '...',
                options: this.story.currentChoices.map(choice => ({
                    id: choice.index.toString(),
                    text: choice.text
                }))
            };

            this.currentDialogueNode = node;
            this.dialogueUI.showDialogue(
                node,
                this.handleOptionSelection.bind(this),
                this.endDialogue.bind(this),
                this.continueStory.bind(this)
            );
            return;
        }

        this.endDialogue();
    }

    private handleOptionSelection(option: DialogueOption) {
        if (!this.story) return;
        try {
            this.story.ChooseChoiceIndex(parseInt(option.id, 10));
            this.continueStory();
        } catch (error) {
            console.warn('[InkDialogueManager] Ink choice failed.', error);
            this.endDialogue();
        }
    }

    private bindExternalFunctions() {
        if (!this.story) return;

        this.story.BindExternalFunction('handleCallback', (id: string) => {
            this.callbackHandler.handleCallback(id);
        });

        this.story.BindExternalFunction('tutorial_skip_callback', () => {
            this.callbackHandler.handleCallback('tutorial/skip_tutorial');
        });

        this.story.BindExternalFunction('increaseCopReputation', () => {
            this.adjustReputation('reputation_cops', 1);
        });

        this.story.BindExternalFunction('decreaseCopReputation', () => {
            this.adjustReputation('reputation_cops', -1);
        });

        this.story.BindExternalFunction('increaseNPCReputation', () => {
            this.adjustReputation('reputation_civilians', 1);
        });

        this.story.BindExternalFunction('decreaseNPCReputation', () => {
            this.adjustReputation('reputation_civilians', -1);
        });

        this.story.BindExternalFunction('triggerGameOverFired', () => {
            UIManager.getInstance().showNotification('Game over.');
            this.scene.time.delayedCall(600, () => this.scene.scene.start('GameOver'));
        });
    }

    private adjustReputation(field: 'reputation_cops' | 'reputation_civilians', delta: number) {
        if (!this.currentNpc) return;
        this.currentNpc.npcMemory[field] += delta;
    }

    private syncStoryVariables() {
        if (!this.story) return;
        const gs = GameState.getInstance(this.scene);

        this.setStoryVar('playerDidCocaine', gs.getFlag('playerDidCocaine'));
        this.setStoryVar('playerDidGlue_1', gs.getFlag('playerDidGlue_1'));
        this.setStoryVar('playerDidGlue_2', gs.getFlag('playerDidGlue_2'));
        this.setStoryVar('playerDidGlue_3', gs.getFlag('playerDidGlue_3'));
        this.setStoryVar('player_ate_cheese_1', gs.getFlag('player_ate_cheese_1'));
        this.setStoryVar('player_ate_cheese_2', gs.getFlag('player_ate_cheese_2'));
        this.setStoryVar('HAS_PHONE_CLUE', gs.isClueDiscovered('clue_phone_gang_connection'));
    }

    private setStoryVar(name: string, value: boolean) {
        if (!this.story) return;
        const vars: any = this.story.variablesState as any;

        if (typeof vars?.GlobalVariableExistsWithName === 'function' && !vars.GlobalVariableExistsWithName(name)) {
            return;
        }

        try {
            vars.$(name, value);
        } catch (error) {
            console.warn(`[InkDialogueManager] Skipping undeclared ink var "${name}".`, error);
        }
    }

    private getObjectInkKnot(sourceId: string): string | null {
        if (!AllItemConfigs[sourceId]) return null;
        const aliasMap: Record<string, string> = {
            coke: 'clueCoke',
            blueCheese: 'clueCheese'
        };
        return aliasMap[sourceId] || sourceId;
    }
}
