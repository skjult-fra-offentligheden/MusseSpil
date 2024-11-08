// src/classes/npc.ts

import Phaser from 'phaser';
import { DialogueNode } from './dialogues';
import { DialogueManager } from '../managers/dialogueManager';
import { Interactable } from '../managers/interactables';
import { Player } from './player';
import { InventoryManager } from '../managers/itemMananger';

interface NPCOptions {
    scene: Phaser.Scene;
    x: number;
    y: number;
    texture?: string;
    frame?: string | number;
    dialogues: DialogueNode[];
    dialogueManager: DialogueManager;
    npcId: string;
    movementType?: string; // 'idle', 'patrol', 'random'
    speed?: number;
    patrolPoints?: { x: number; y: number }[];
    moveArea?: Phaser.Geom.Rectangle;
    isUnique?: boolean;
    atlasKey?: string;
    animationKeys?: {
      walkLeft?: string;
      walkRight?: string;
      idle?: string;
      // Add other animations as needed
    };
  }

export class NPC extends Phaser.Physics.Arcade.Sprite implements Interactable {
    private dialogues: DialogueNode[];
    private isDialogueActive: boolean = false;
    private dialogueManager: DialogueManager;
    private npcId: string;
    declare body: Phaser.Physics.Arcade.Body;
  
    // Animations
    private animsLeft?: string;
    private animsRight?: string;
    private animsIdle?: string;
    private textureKey: string;
  
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

    constructor(options: NPCOptions) {
        const {
          scene,
          x,
          y,
          texture,
          frame,
          dialogues,
          dialogueManager,
          npcId = 'npc1',
          movementType = 'idle',
          speed = 50,
          patrolPoints = [],
          moveArea,
          isUnique = false,
          atlasKey,
          animationKeys,
        } = options;
        const textureKey = options.isUnique && options.atlasKey ? options.atlasKey : options.texture;
        super(scene, x, y, textureKey, frame);



        this.dialogues = dialogues;
        this.dialogueManager = dialogueManager;
        this.npcId = npcId;
        //animation frames
        if (isUnique && atlasKey && animationKeys) {
            // Use unique atlas and animations
            this.animsLeft = animationKeys.walkLeft;
            this.animsRight = animationKeys.walkRight;
            this.animsIdle = animationKeys.idle;
            this.textureKey = atlasKey; 
            console.log("NPC TEXTURE show textures: left: " + this.animsLeft + " right: " + this.animsRight + " idle: "+ this.animsIdle + " texturekey: "+ this.textureKey)
        } else {
                // Use standard animations
                this.animsLeft = 'walk_left';
                this.animsRight = 'walk_right';
                this.animsIdle = 'idle';
                this.textureKey = 'standard_npcs_atlas';
              }
            
        console.log("NPC TEXTURE " + textureKey)
        console.log("NPC looking for correct " + atlasKey + " and is unique " + isUnique)
        console.log("NPC animationkeys " + JSON.stringify(animationKeys) + " frames " + frames) 
        // Movement properties
        this.speed = speed;
        this.movementType = movementType;
        this.patrolPoints = patrolPoints || [];
        this.targetPointIndex = 0;
        this.moveArea = moveArea || new Phaser.Geom.Rectangle(x - 100, y - 100, 200, 200);
        this.previousPosition = new Phaser.Math.Vector2(this.x, this.y);

        // Add the NPC sprite to the scene and enable physics
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0); // Prevent bouncing off walls
        this.body.setFriction(1, 1); // Increase friction to reduce sliding

        // Set NPC as immovable
        this.setImmovable(true);

        // Set up interaction
        this.setInteractive();
        this.on('pointerdown', () => {
            this.initiateDialogue();
        });

        this.scene.events.on('dialogueEnded', this.onDialogueEnded, this);
    }

    //play animation
    private playAnimation(state: string): void{
        let animKey: string | undefined;
        switch (state){
            case "left":
                //console.log("playing left " + this.animsLeft)
                animKey = this.animsLeft;
                break;
            case "right":
                animKey = this.animsRight;
                break;
            case "idle":
                default:
                    animKey = this.animsIdle;
                    break;
        }

        //console.log(" check if it can play " + animKey + " " + this.anims.currentAnim?.key + " " + animKey)
        if (animKey && this.anims.currentAnim?.key !== animKey){
            try {
                            //console.log(`NPC "${this.npcId}" switching to animation: ${animKey}`);
                this.play(animKey, true)
            } catch (error) {
                console.error("An error happened in the anim play " + error)
            }

        }
    }

    public checkProximity(player: Player, range: number, onInRange: () => void): void {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (distance < range) {
            onInRange();
        }
    }

    public initiateInteraction(player: Player, inventoryManager: InventoryManager): void {
        this.initiateDialogue();
      }

    // Method to initiate dialogue
    public initiateDialogue(): void {
        if (this.isDialogueActive || this.dialogueManager.isDialogueActive()) return; // Prevent multiple dialogues
        this.setVelocity(0);
        this.isDialogueActive = true;
        this.dialogueManager.startDialogue(this.dialogues, 'greeting', this.npcId, this); // Pass NPC ID
    }

    // Handler for when dialogue ends
    private onDialogueEnded(endedNpcId: string): void {
        if (endedNpcId === this.npcId) {
            this.isDialogueActive = false;
        }
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
        this.scene.events.off('dialogueEnded', this.onDialogueEnded, this);
        super.destroy(fromScene);
    }

    // Movement methods (patrol, random, etc.)
    //animation frames

    public update(time: number, delta: number): void {
        if (this.body.velocity.x < 0) {
            //console.log(" playing animation left " + this.body.velocity.x)
            this.playAnimation("left");
        } else if (this.body.velocity.x > 0){
            this.playAnimation("right");
        } else {
            this.playAnimation("idle")
        }

        if (!this.isDialogueActive) {
            switch (this.movementType) {
                case 'patrol':
                    this.patrolMovement();
                    break;
                case 'random':
                    this.randomMovement();
                    break;
                case 'idle':
                default:
                    this.setVelocity(0);
                    break;
            }
            this.checkIfStuck(delta);
        } else {
            this.setVelocity(0);
        }
    }
}
