// src/classes/body.ts

import Phaser from 'phaser';
import { DialogueNode } from './dialogues';
import { DialogueManager } from '../managers/dialogueManager';
import { InventoryManager } from '../managers/itemMananger';
import { Item } from '../managers/itemDatastruct';
import { Player } from './player';
import { Interactable } from '../managers/interactables';
import { NPC } from './npc';

export class Body extends Phaser.Physics.Arcade.Sprite implements Interactable{
    itemName: string;
    itemId: string;
    itemDescription: string;
    iconKey: string;
    quantity: number;
    isCollectible: boolean;
    dialogueData: DialogueNode[];
    dialogueManager: DialogueManager;
    uniqueId: string;
    inventoryManager!: InventoryManager;
    isClue?: boolean;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        dialogueData: DialogueNode[],
        dialogueManager: DialogueManager,
        uniqueId: string,
        itemName?: string,
        itemId?: string,
        itemDescription?: string,
        iconKey?: string,
        isCollectible: boolean = false
    ) {
        super(scene, x, y, texture);
    
        // Enable physics body
        scene.physics.world.enable(this);
        this.body.setImmovable(true)
    
        // Assign parameters to class properties
        this.dialogueData = dialogueData;
        this.dialogueManager = dialogueManager;
        this.uniqueId = uniqueId;
    
        this.itemName = itemName || '';
        this.itemId = itemId || uniqueId;
        this.itemDescription = itemDescription || '';
        this.iconKey = iconKey || texture;
        this.isCollectible = isCollectible;
        this.setInteractive();
    }

    public collect(inventoryManager: InventoryManager): void {
        
        if (this.isCollectible) {
            const item: Item = {
                itemId: this.itemId,
                itemName: this.itemName,
                itemDescription: this.itemDescription,
                iconKey: this.iconKey,
                quantity: 1,
                isClue: this.isClue,
                
            };
            console.log(item)
            inventoryManager.addItem(item);
            this.scene.events.emit('itemCollected', this);

            this.destroy(); // Remove the item from the world
        
        }
    } 

    public initiateInteraction(player: Player, inventoryManager: InventoryManager): void {
        this.inventoryManager = inventoryManager
        this.initiateDialogue();
    }

    public checkProximity(player: Player, range: number, onInRange: () => void): void {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (distance <= range) {
          onInRange();
        }
      }

      public initiateDialogue(): void {
          this.bindCallbacks();
          this.dialogueManager.startDialogue(this.itemId, "greeting", undefined, this.dialogueData);
    }

    private bindCallbacks(): void {
        this.dialogueData.forEach(node => {
            node.options.forEach(option => {
                if (option.callback) {
                    option.callback = option.callback.bind(this);
                }
            });
        });
    }
    

    // Override any NPC methods that are not relevant
    public update(): void {
        // Bodies don't need to update movement or AI behaviors
    }
}
