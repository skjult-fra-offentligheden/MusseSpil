// src/classes/npc.ts

import Phaser, { Scene } from 'phaser';
import { DialogueNode } from './dialogues';
import { DialogueManager } from '../dialogues/dialogueManager';
import { Interactable } from '../managers/interactables';
import { Player } from '../classes/player';
import { InventoryManager } from '../managers/itemMananger';
import { NPCReactionsMap } from '../scenes/ToturialScene/npcReactions';
import { Item } from "../classes/itemDatastruct";
import { GlobalEvents } from '../../factories/globalEventEmitter';
import { npcMemory } from "../../data/npcMemory";
import { ItemUsedEventPayload } from '../../data/events/eventTypes';
import { NPCConfig as RichNPCConfig, NPCMovementType } from '../../data/NPCs/npcTemplate';
import { GameState } from '../managers/GameState';

export class NPC extends Phaser.Physics.Arcade.Sprite implements Interactable {
    public displayName: string; 
    public config: RichNPCConfig;

    private dialogues: DialogueNode[];
    private isDialogueActive: boolean = false;
    private dialogueManager: DialogueManager;
    public npcId: string;
    declare body: Phaser.Physics.Arcade.Body;
    private dialogueState: string;

    // Animations
    private animsIdleKey: string;
    private animsWalkLeftKey?: string;
    private animsWalkRightKey?: string;

    // Movement
    private speed: number;
    private movementType: string;
    private patrolPoints: { x: number; y: number }[];
    private targetPointIndex: number = 0;
    private moveArea: Phaser.Geom.Rectangle;

    // Unstick logic
    private previousPosition: Phaser.Math.Vector2;
    private stuckTimer: number = 0;
    private readonly STUCK_THRESHOLD: number = 1000; // Time in ms to consider stuck
    private readonly MIN_MOVE_DISTANCE: number = 2;

    // reactions
    private reactionsData: Record<string, string>;
    private isReactingToItem: boolean = false;
    private reactionTimer: number = 0;
    private reactionAnimationKey: string | null = null;
    private myDialogueNodes: DialogueNode[];
    //sensory range
    private sensoryRange: number;

    //Portrait
    public portraitTextureKey?: string;
    public portraitFrame?: string | number;
    public portraitScale?: number;
    constructor(scene: Phaser.Scene, x: number, y: number, config: RichNPCConfig, dialogueNodesForThisNPC: DialogueNode[], dialogueManager: DialogueManager) {
        if (!scene.textures.exists(config.textureKey)) {
            console.error(`[NPC Constructor - ${config.npcId}] Texture key "${config.textureKey}" NOT FOUND in cache. Preload it! Using fallback.`);
            // It's better to throw an error or have a proper fallback texture defined in your game config
            // For now, super will likely error or use a missing texture.
        }

        super(scene, x, y, config.textureKey, config.initialFrame || 0);

        this.config = config;
        this.dialogues = config.dialogues;
        this.dialogueManager = dialogueManager;
        this.myDialogueNodes = dialogueNodesForThisNPC;
        //Portrait
        if (config.portrait) {
            this.portraitTextureKey = config.portrait.textureKey;
            this.portraitFrame = config.portrait.frame;
            this.portraitScale = config.portrait.scale;
        }

        this.npcId = config.npcId;
        this.dialogueState = 'greeting';
        this.sensoryRange = config.sensoryRange || 500;

        this.animsIdleKey = config.animations.idleKey;
        this.animsWalkLeftKey = config.animations.walkLeftKey;
        this.animsWalkRightKey = config.animations.walkRightKey;
        if (!this.animsIdleKey) {
            console.warn(`[NPC ${this.npcId}] Constructor: animsIdleKey is not defined in config.animations!`);
        }

        //console.log("NPC TEXTURE " + textureKey)
        //console.log("NPC looking for correct " + atlasKey + " and is unique " + isUnique)
        //console.log("NPC animationkeys " + JSON.stringify(animationKeys) + " frames " + frames) 
        // Movement properties
        this.speed = config.speed;
        this.movementType = config.movementType;
        this.patrolPoints = config.patrolPoints || [];
        this.targetPointIndex = 0;
        this.moveArea = config.moveArea ? new Phaser.Geom.Rectangle(config.moveArea.x, config.moveArea.y, config.moveArea.width, config.moveArea.height) : new Phaser.Geom.Rectangle(x - 100, y - 100, 200, 200);
        this.sensoryRange = config.sensoryRange || 150;
        scene.add.existing(this); // Add to scene
        scene.physics.add.existing(this); // Add to physics world
        this.setCollideWorldBounds(true);
        this.setImmovable(true); // NPCs are typically not pushed by player
        this.setOrigin(0.5, 1); // Origin at bottom center for easier positioning on ground
        this.setDepth(y); // Simple depth sorting by y-position

        this.previousPosition = new Phaser.Math.Vector2(this.x, this.y);
        this.isReactingToItem = false;
        this.reactionTimer = 0;
        this.displayName = config.displayName;

        // Add the NPC sprite to the scene and enable physics
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        if (this.body) { // Check if body exists (it should as it extends Physics.Arcade.Sprite)
            this.body.setCollideWorldBounds(true);
            this.body.setBounce(0);
            this.body.setFriction(1, 1);
            this.setImmovable(true);
        } else {
            console.error(`[NPC ${this.npcId}] FAILED TO GET PHYSICS BODY!`);
        }
        this.setScale(config.defaultScale || 1.0); // Set scale from config or default
        this.setDepth(config.depth || 5);  

        // Set up interaction
        this.setInteractive({ useHandCursor: true });
        this.on('pointerdown', () => {
            console.log(`[NPC ${this.npcId}] Clicked! Initiating dialogue.`);

            this.initiateDialogue();
        });

        if (this.scene.events) { // Make sure scene.events is available
            this.scene.events.on(`dialogueEnded_${this.npcId}`, this.onDialogueEnded, this);
        }

        this.reactionsData = NPCReactionsMap[this.npcId] || {}; //config.simpleReactions || 
        this.setupListeners();

        // Call onSpawn from config if it exists
        this.config.onSpawn?.call(this, this.scene);

        // Play initial idle animation
        if (this.animsIdleKey) {
            this.playAnimationByKey(this.animsIdleKey); // Use a consistent play method
        } else {
            console.warn(`[NPC ${this.npcId}] No idle animation key defined in config.animations.idleKey. NPC might not animate initially.`);
        }
        console.log(`[NPC ${this.npcId}] Created. DisplayName: ${this.displayName}, Movement: ${this.movementType}`);


    }

    //play animation
    private playAnimationByKey(animationNameKey: string, ignoreIfPlaying: boolean = true): void {
        if (!animationNameKey) {
            // console.warn(`[NPC ${this.npcId}] playAnimationByKey called with no key.`);
            return;
        }
        if (!this.anims) {
            console.error(`[NPC ${this.npcId}] Anims controller not available for playing ${animationNameKey}`);
            return;
        }

        if (ignoreIfPlaying && this.anims.currentAnim && this.anims.currentAnim.key === animationNameKey) {
            return; // Already playing this, don't restart
        }

        try {
            this.play(animationNameKey, ignoreIfPlaying);
        } catch (error) {
            console.error(`[NPC ${this.npcId}] Error playing animation "${animationNameKey}":`, error);
        }
    }

    private onDialogueEnded(): void { // No parameter needed if event is specific like 'dialogueEnded_npcId'
        console.log(`[NPC ${this.npcId}] Dialogue ended event received.`);
        this.isDialogueActive = false;
        const player = this.scene.registry.get('player') as Player | undefined; // Get from registry
        this.config.onDialogueEnd?.call(this, player!);
    }

    public checkProximity(player: Player, range: number, onInRange: () => void): void {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (distance < range) {
            onInRange();
        }
    }

    public npcMemory: npcMemory = {
        events_happened: {},
        reputation_criminals: -2,
        reputation_cops: 2,
        reputation_civilians: 0,
        visitedDialogues: new Set<string>()
    }

    public initiateInteraction(playerParam?: Player): void {
        if (this.isDialogueActive || this.dialogueManager.isDialogueActive()) return;
        this.setVelocity(0);
        this.isDialogueActive = true;

        const initialNodeId = this.config.dialogues?.[0]?.id || 'greeting';
        // Call onDialogueStart from config if it exists
        const playerForDialogue = playerParam || this.scene.registry.get('player') as Player | undefined;
        if (playerForDialogue) {
            this.config.onDialogueStart?.call(this, playerForDialogue);
        } else {
            console.warn(`[NPC ${this.npcId}] Player not available for onDialogueStart callback.`);
        }

        this.dialogueManager.startDialogue(this.npcId, initialNodeId, this);
    }

    // Method to initiate dialogue
    public initiateDialogue(playerParam?: Player): void {
        console.log('this.dialogueManager', this.dialogueManager);
        console.log('scene.dialogueManager', (this.scene as any).dialogueManager);
        if (this.isDialogueActive || this.dialogueManager.isDialogueActive()) return;
        this.setVelocity(0);
        this.isDialogueActive = true;

        const initialNodeId = this.config.dialogues?.[0]?.id || 'greeting';
        // Call onDialogueStart from config if it exists
        const playerToUse = playerParam || this.scene.registry.get('player') as Player | undefined;
        if (!playerToUse) {
            console.error(`[NPC ${this.npcId}] Player instance not available for onDialogueStart.`);
            // Potentially skip onDialogueStart or handle error
        } else {
            this.config.onDialogueStart?.call(this, playerToUse); // Use playerToUse
        }
        this.dialogueManager.startDialogue(this.npcId, initialNodeId, this);
    }

    private patrolMovement(): void {
        if (this.patrolPoints.length < 2) {
            // At least two points are required for patrol
            return;
        }

        const targetPoint = this.patrolPoints[this.targetPointIndex];
        const dx = targetPoint.x - this.x;
        const dy = targetPoint.y - this.y;
        const distance = Phaser.Math.Distance.Between(this.x, this.y, targetPoint.x, targetPoint.y);

        if (distance < 5) {
            // Arrived at the target point; switch to the next point
            this.targetPointIndex = (this.targetPointIndex + 1) % this.patrolPoints.length;
        } else {
            // Move towards the target point
            const angle = Math.atan2(dy, dx);
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        }
    }

    private turnTowards(targetX: number, targetY: number): void {
        // This method now primarily DECIDES the animation key for the reaction
        // and sets this.reactionAnimationKey. It also plays it.
        let newReactionAnimKey: string | null = null;

        if (targetX < this.x && Math.abs(targetX - this.x) > 5 && this.animsLeft) {
            newReactionAnimKey = this.animsLeft;
        } else if (targetX > this.x && Math.abs(targetX - this.x) > 5 && this.animsRight) {
            newReactionAnimKey = this.animsRight;
        } else {
            newReactionAnimKey = this.animsIdle || null; // Default to idle if not turning or anims not available
        }

        this.reactionAnimationKey = newReactionAnimKey; // Store it

        // Play it immediately if valid
        // if (this.reactionAnimationKey) {
        //     this.playAnimation(this.reactionAnimationKey, true); // Force play this animation
        // }
        // The playAnimation call is now in handleItemUsedByPlayer after turnTowards
    }

    private randomMovement(): void {
        if (!this.moveArea) {
            // Random movement requires a defined move area
            return;
        }

        // If the NPC is idle or has no velocity, choose a new random direction
        if (this.body.velocity.lengthSq() === 0) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        } else if (!this.moveArea.contains(this.x, this.y)) {
            // NPC has moved outside the area; steer back towards center
            const centerX = this.moveArea.centerX;
            const centerY = this.moveArea.centerY;
            const angle = Math.atan2(centerY - this.y, centerX - this.x);
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        }
    }

    private handleStuck(): void {
        if (this.movementType === 'patrol') {
            // Switch to the next patrol point
            this.targetPointIndex = (this.targetPointIndex + 1) % this.patrolPoints.length;
            this.previousPosition.set(this.x, this.y);
        } else if (this.movementType === 'random') {
            // Choose a new random direction
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            this.previousPosition.set(this.x, this.y);
        }
    }

    private checkIfStuck(delta: number): void {
        const distanceMoved = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            this.previousPosition.x,
            this.previousPosition.y
        );

        if (distanceMoved < this.MIN_MOVE_DISTANCE) {
            // NPC hasn't moved enough; increment stuck timer
            this.stuckTimer += delta;
        } else {
            // NPC has moved; reset stuck timer and update position
            this.stuckTimer = 0;
            this.previousPosition.set(this.x, this.y);
        }

        if (this.stuckTimer >= this.STUCK_THRESHOLD) {
            // NPC is considered stuck; handle it
            this.handleStuck();
            this.stuckTimer = 0; // Reset timer
        }
    }

    // Clean up event listeners when NPC is destroyed
    public destroy(fromScene?: boolean): void {
        // Important: Remove scene-specific event listeners
        if (this.scene && this.scene.events) {
            this.scene.events.off(`dialogueEnded_${this.npcId}`, this.onDialogueEnded, this);
        }
        GlobalEvents.off('itemUsedFromInventory', this.handleItemUsedByPlayer, this);
        super.destroy(fromScene);
    
    }

    public getDialogueState(): string {
        return this.dialogueState;
    }

    public setDialogueState(state: string): void {
        this.dialogueState = state;
    }

    // Movement methods (patrol, random, etc.)
    //animation frames

    public update(time: number, delta: number): void {
        if (this.config.onUpdate) {
            const preventDefaultUpdate = this.config.onUpdate.call(this, time, delta);
            if (preventDefaultUpdate === false) return; // Config's onUpdate handled everything
        }

        if (this.isReactingToItem) {
            this.reactionTimer -= delta;
            if (this.reactionTimer <= 0) {
                this.isReactingToItem = false;
                if (this.animsIdleKey) this.playAnimationByKey(this.animsIdleKey, true);
                else this.anims.stop();
            }
            return;
        }

        if (this.isDialogueActive) {
            if (this.body && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
                this.setVelocity(0);
            }
            if (this.animsIdleKey) this.playAnimationByKey(this.animsIdleKey);
            return;
        }

        if (this.body) {
            switch (this.movementType) {
                case 'patrol': this.patrolMovement(); break;
                case 'random': this.randomMovement(); break;
                case 'idle': default:
                    if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) this.setVelocity(0);
                    break;
            }
        }

        if (this.body && this.body.velocity) {
            if (this.body.velocity.x < -1 && this.animsWalkLeftKey) {
                this.playAnimationByKey(this.animsWalkLeftKey);
            } else if (this.body.velocity.x > 1 && this.animsWalkRightKey) {
                this.playAnimationByKey(this.animsWalkRightKey);
            } else {
                if (this.animsIdleKey) this.playAnimationByKey(this.animsIdleKey);
            }
        } else {
            if (this.animsIdleKey) this.playAnimationByKey(this.animsIdleKey);
            else if (this.anims) this.anims.stop(); // Ensure anims exists before calling stop
        }
        this.checkIfStuck(delta);
    }

    private handleItemUsedByPlayer(data: ItemUsedEventPayload): void { // Ensure ItemUsedEventPayload is correctly typed/imported
        console.log(`[NPC ${this.npcId}] Heard 'itemUsedFromInventory'. Item ID: ${data.itemId}, Player: ${data.player?.name || 'Unknown'}`);

        // 1. Config-level override for event handling
        if (this.config.handleGlobalEvent) {
            const gameContextForEvent = { scene: this.scene /* add other managers as needed by handleGlobalEvent */ };
            const handledByConfig = this.config.handleGlobalEvent.call(this, 'itemUsedFromInventory', data, gameContextForEvent);
            if (handledByConfig) {
                console.log(`[NPC ${this.npcId}] Event ${data.itemId} handled by config.handleGlobalEvent.`);
                return;
            }
        }

        // 2. Standard reaction logic
        if (data.player) {
            const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, data.player.x, data.player.y);
            if (distanceToPlayer > this.sensoryRange && this.npcId !== "godWhoSeesAll") {
                return;
            }
        }

        const reactionsToUse = this.reactionsData; // Use the initialized reactionsData
        if (!reactionsToUse) return;

        const reactionText = reactionsToUse[data.itemId];

        if (reactionText) {
            console.log(`[NPC ${this.npcId}] Reacting to ${data.itemId}: "${reactionText}"`);
            this.isReactingToItem = true;
            this.reactionTimer = 3000;
            this.setVelocity(0);

            let reactionAnimKeyToPlay: string | undefined;
            if (data.player) {
                if (data.player.x < this.x && Math.abs(data.player.x - this.x) > 5 && this.animsWalkLeftKey) {
                    reactionAnimKeyToPlay = this.animsWalkLeftKey;
                } else if (data.player.x > this.x && Math.abs(data.player.x - this.x) > 5 && this.animsWalkRightKey) {
                    reactionAnimKeyToPlay = this.animsWalkRightKey;
                }
            }

            if (reactionAnimKeyToPlay) {
                this.playAnimationByKey(reactionAnimKeyToPlay, true); // Play it
                if (reactionAnimKeyToPlay === this.animsWalkLeftKey || reactionAnimKeyToPlay === this.animsWalkRightKey) {
                    if (this.anims) this.anims.stop(); // Stop on current frame
                }
            } else if (this.animsIdleKey) {
                this.playAnimationByKey(this.animsIdleKey, true); // Let idle loop
            } else {
                if (this.anims) this.anims.stop();
            }
            this.showSpeechBubble(reactionText);
        }
    }



    private setupListeners() {

        //problem, bliver ikke automatisk kaldt når der bliver brugt et item. Kun i intialiseringen. 
        GlobalEvents.off('itemUsedFromInventory', this.handleItemUsedByPlayer, this); // Good practice to off then on
        GlobalEvents.on('itemUsedFromInventory', this.handleItemUsedByPlayer, this); // Changed method name for clarity
        //console.log("ItemUsed in, listener reached " + this);
    }

    private showSpeechBubble(text: string) {
        // Ensure scene context is valid for adding game objects
        if (!this.scene || !this.scene.cameras.main) {
            console.error(`[NPC ${this.npcId}] Cannot show speech bubble: Scene or main camera is not available.`);
            return;
        }

        // Calculate position relative to the NPC, ensuring it's visible
        const bubbleX = this.x;
        const bubbleY = this.y - (this.displayHeight / 2) - 15; // Position above the NPC's head

        const bubbleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontSize: "14px",
            fontFamily: '"Verdana", "Arial", sans-serif', // Ensure fonts are loaded or common
            color: "#222222", // Dark text for light bubble
            backgroundColor: "rgba(255,255,255,0.9)", // Light, slightly transparent bubble
            padding: { x: 10, y: 5 },
            align: 'center',
            wordWrap: { width: 180, useAdvancedWrap: true }, // Max width for bubble
            // borderRadius: 6, // Phaser text objects don't directly support borderRadius for background
        };

        const bubble = this.scene.add.text(bubbleX, bubbleY, text, bubbleStyle)
            .setOrigin(0.5, 1) // Origin at bottom-center, so it "points" upwards from NPC
            .setDepth(this.depth + 5) // Ensure it's above this NPC and other nearby elements
            .setScrollFactor(this.scrollFactorX, this.scrollFactorY); // Match NPC's scroll factor

        // Auto-destroy with a fade
        if (this.scene && this.scene.time) {
            this.scene.time.delayedCall(3000, () => {
                if (bubble.scene) { // Check if bubble is still valid
                    this.scene.tweens.add({
                        targets: bubble,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            bubble.destroy();
                        }
                    });
                } else if (bubble.active) { // If scene is gone but bubble somehow still active
                    bubble.destroy();
                }
            });
        } else { // Fallback if scene.time is not available (e.g., during shutdown)
            setTimeout(() => { if (bubble.active) bubble.destroy(); }, 3300);
        }
    }
}