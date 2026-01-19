// src/classes/Body.ts
import Phaser from 'phaser';
import type { DialogueController } from '../dialogues/dialogueController'; // Adjust path
import { Player } from './player'; // Adjust path
import { Interactable } from '../managers/interactables'; // Adjust path
import { AllItemConfigs } from '../../data/items/AllItemConfig'; // Adjust path
import { ItemConfig, PhaseArt, EvidencePhase } from '../../data/items/itemTemplate'; // Adjusted DialogueEntry to DialogueNode for consistency

export class Body extends Phaser.Physics.Arcade.Sprite implements Interactable {
    public itemId: string;
    private itemConfig: ItemConfig;
    private dialogueManager: DialogueController;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        itemId: string,
        dialogueManager: DialogueController
    ) {
        const configFromGlobal = AllItemConfigs[itemId];
        let determinedInitialTextureKey: string;
        let configToUse: ItemConfig;

        if (!configFromGlobal) {
            console.error(`[Body Constructor] ItemConfig not found for itemId "${itemId}". Using fallback.`);
            determinedInitialTextureKey = 'fallback_missing_item_texture';
            configToUse = {
                id: itemId,
                name: 'Unknown Item', // Added name for fallback
                art: { small: determinedInitialTextureKey, large: determinedInitialTextureKey },
                description: 'An unknown item.', // Added description
                collectible: false,
                dialogue: [],
                initialStatus: 'full', // Added fallback state
                timesUsed: 0,          // Added fallback state
                currentStatus: 'full',   // Added fallback state
                getArt: function (this: ItemConfig, size: 'small' | 'large') { // Added fallback getArt
                    const artPath = this.art[size];
                    return typeof artPath === 'string' ? artPath : artPath.full;
                },
                use: function (this: ItemConfig) { // Added fallback use
                    return { newStatus: this.currentStatus, message: "Cannot use unknown item.", artChanged: false, consumed: false };
                }
                // defaultScale: 0.5, // Ensure defaultScale is on ItemConfig or provide here
            } as ItemConfig; // Cast, make sure ALL required ItemConfig fields are present
        } else {
            configToUse = configFromGlobal;
            if (typeof configToUse.art.large === 'string') {
                determinedInitialTextureKey = configToUse.art.large;
            } else { // It's PhaseArt, use getArt for current status if possible, else default to full
                determinedInitialTextureKey = configToUse.getArt ? configToUse.getArt.call(configToUse, 'large') : configToUse.art.large.full;
            }
        }

        super(scene, x, y, determinedInitialTextureKey);

        this.itemConfig = configToUse;
        this.itemId = itemId;
        this.dialogueManager = dialogueManager;

        // Standard Phaser way to store custom data, usable by gameObject.getData()
        this.setData('itemId', this.itemId);

        this.setScale(this.itemConfig.defaultScale || 0.5); // Use 0.5 as a fallback if not on itemConfig

        scene.add.existing(this);
        scene.physics.world.enable(this); // Redundant if extending Physics.Arcade.Sprite, but harmless
        if (this.body) { // body will exist if physics is enabled for the scene
            (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
        }

        this.setInteractive({ useHandCursor: true });

        console.log(`[Body Created] ItemID: ${this.itemId}, Name: ${this.itemConfig.name || this.itemConfig.id}, Texture: ${this.texture.key}`);
    }

    // --- THIS IS THE CORRECT VERSION ---
    public initiateInteraction(player?: Player): void {
        console.log(`[Body initiateInteraction] For item: ${this.itemId}`);
        const gameScene = this.scene as any; // Or use a typed interface: const gameScene = this.scene as IMyGameScene;

        if (gameScene.callbackHandler && typeof gameScene.callbackHandler.setContext === 'function') {
            gameScene.callbackHandler.setContext(this); // Pass 'this' (the Body Sprite instance) directly
        } else {
            console.warn(`[Body initiateInteraction] Scene does not have a valid callbackHandler or setContext method.`);
        }
        this.initiateDialogue(); // Proceed to initiate dialogue
    }

    public setArtPhase(phase: EvidencePhase): void {
        if (!this.itemConfig || typeof this.itemConfig.art.large === 'string') {
            console.warn(`[Body setArtPhase] Item ${this.itemId} does not use phased art or itemConfig is missing.`);
            return;
        }
        const phaseArt = this.itemConfig.art.large as PhaseArt;
        const newTextureKey = phaseArt[phase as keyof PhaseArt] || phaseArt.full; // Use phase, fallback to full

        if (newTextureKey && this.texture.key !== newTextureKey) {
            try {
                this.setTexture(newTextureKey);
                console.log(`[Body setArtPhase] Item ${this.itemId} texture set to phase: ${phase} (${newTextureKey})`);
            } catch (e) {
                console.error(`[Body setArtPhase] Failed to set texture ${newTextureKey} for ${this.itemId}:`, e);
                if (this.texture.key !== 'fallback_missing_item_texture') {
                    this.setTexture('fallback_missing_item_texture');
                }
            }
        }
    }

    // Refreshes texture based on current itemConfig state
    public refreshTexture(): void {
        if (this.itemConfig && this.itemConfig.getArt) {
            const newTextureKey = this.itemConfig.getArt.call(this.itemConfig, 'large');
            if (this.texture.key !== newTextureKey) {
                try {
                    this.setTexture(newTextureKey);
                    console.log(`[Body ${this.itemId}] Texture refreshed to ${newTextureKey}`);
                } catch (error) {
                    console.error(`[Body ${this.itemId}] Error setting texture to ${newTextureKey}:`, error);
                    if (this.texture.key !== 'fallback_missing_item_texture') {
                        this.setTexture('fallback_missing_item_texture');
                    }
                }
            }
        }
    }


    public checkProximity(player: Player, range: number, onInRange: () => void): void {
        if (!this.active) return; // Check if the Body sprite itself is active
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (distance <= range) {
            onInRange();
        }
    }

    public initiateDialogue(): void {
        if (!this.itemConfig) {
            console.warn(`[Body initiateDialogue] itemConfig not initialized for ${this.itemId}.`);
            return;
        }
        const startNodeId = this.itemConfig.dialogue?.[0]?.id || 'greeting';
        this.dialogueManager.startDialogue(
            this.itemId,
            startNodeId,
            this
        );
    }

    public update(): void {
        // Optional: any per-frame updates for the Body sprite itself
    }

    public get isItemCollectible(): boolean {
        return this.itemConfig ? this.itemConfig.collectible : false;
    }

    public getItemName(): string {
        if (!this.itemConfig) return this.itemId;
        return this.itemConfig.name || this.itemConfig.id;
    }
}
