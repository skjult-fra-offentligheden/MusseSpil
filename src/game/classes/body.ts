import Phaser from 'phaser';
import { DialogueNode } from './dialogues';
import { DialogueManager } from '../managers/dialogueManager';
import { InventoryManager } from '../managers/itemMananger';
import { Item } from '../classes/itemDatastruct';
import { Player } from './player';
import { Interactable } from '../managers/interactables';

export class Body extends Phaser.Physics.Arcade.Sprite implements Interactable {
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
        isCollectible: boolean = false,
        public desiredWidth?: number,     
        public desiredHeight?: number,     
        public desiredScale?: number       
    ) {
        super(scene, x, y, texture);

        if (desiredScale !== undefined) {
            this.setScale(desiredScale);
        }

        if (desiredWidth && desiredHeight) {
            this.displayWidth = desiredWidth;
            this.displayHeight = desiredHeight;
        }
        // Enable physics body
        scene.physics.world.enable(this);
        this.body.setImmovable(true);

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
        console.log("set it interactive. object")


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
            console.log('Collecting item:', item);
            inventoryManager.addItem(item);
            this.scene.events.emit('itemCollected', this);

            // Remove the item from the world
            this.destroy();
        }
    }

    public initiateInteraction(player: Player, inventoryManager: InventoryManager): void {
        this.inventoryManager = inventoryManager;
        // Only initiate dialogue
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
        // Pass 'this' as the context to the dialogue manager
        this.dialogueManager.startDialogue(this.itemId, 'greeting', undefined, this.dialogueData, this);
    }

    private bindCallbacks(): void {
        // Ensure callbacks are bound correctly
        console.log("pre load " + this.dialogueData);
        if (this.dialogueData) {
            console.log("this dialogue data " + this.dialogueData);
            this.dialogueData.forEach((node) => {
                node.options.forEach((option) => {
                    if (option.callback && typeof option.callback === 'function') {
                        option.callback = option.callback.bind(this);
                    }
                });
            });
        } else { console.warn("Dialogue data not initilized ") }
    }

    // Bodies don't need to update movement or AI behaviors
    public update(): void { }
}
