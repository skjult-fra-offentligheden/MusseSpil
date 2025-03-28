// src/handlers/CallbackHandler.ts

import { ClueManager } from '../managers/clueManager';
import { InventoryManager } from '../managers/itemMananger';
import { Clue } from '../classes/clue';
import { Item } from '../classes/itemDatastruct';
import Phaser from 'phaser';

export class CallbackHandler {
    private clueManager: ClueManager;
    private inventoryManager: InventoryManager;
    private cluesData: { [key: string]: Clue };
    private scene: Phaser.Scene;
    private context: any;

    constructor(
        scene: Phaser.Scene,
        clueManager: ClueManager,
        inventoryManager: InventoryManager,
        cluesData: { [key: string]: Clue }
    ) {
        this.scene = scene;
        this.clueManager = clueManager;
        this.inventoryManager = inventoryManager;
        this.cluesData = cluesData;

        console.log("CallbackHandler initialized.");
        console.log("Callback ItemManager:", this.inventoryManager);
    }

    /** Sets context for the callback handler */
    public setContext(context: any) {
        this.context = context;
    }

    /** Handles callbacks associated with dialogue options */
    public handleCallback(callbackId: string) {
        switch (callbackId) {
            case 'Investigate_body':
                this.handleInvestigateBody(callbackId);
                break;

            case 'pick_up_knife':
                this.pickUpItem(callbackId, "Knife_with_blood");
                break;

            case 'pick_up_glue':
                this.pickUpItem(callbackId, "Examine_glue");
                break;

            case 'pick_up_cheese':
                this.pickUpItem(callbackId, "Examine_glue");
                break;

            case 'pick_up_cocaine':
                this.pickUpItem(callbackId, "Examine_glue");
                break;

            case 'pick_up_phone':
                this.pickUpItem(callbackId, "Examine_glue");
                break;

            default:
                console.warn(`⚠️ Unhandled callback ID: "${callbackId}"`);
                break;
        }
    }

    /** Handles investigating a body and adding a clue */
    private handleInvestigateBody(callbackId: string) {
        const clueData = this.cluesData[callbackId];
        if (clueData) {
            this.clueManager.addClue({ ...clueData, discovered: true });
            this.scene.events.emit('clueCollected', clueData);
        } else {
            console.warn(`⚠️ Clue data for "${callbackId}" not found.`);
        }
        if (this.context) {
            this.context.setDialogueState('info');
        }
    }

    /** Handles picking up an item and adding it to the inventory */
    private pickUpItem(callbackId: string, clueKey: string) {
        // Ensure context has valid item data
        if (!this.context || !this.context.itemId) {
            console.warn(`⚠️ No valid item context for callback: "${callbackId}"`);
            return;
        }

        console.log(`📦 Picking up item: ${this.context.itemId}`);

        // 1️⃣ Get Clue Data
        const clueData = this.cluesData[clueKey];
        if (clueData) {
            this.clueManager.addClue({ ...clueData, discovered: true });
            this.scene.events.emit('clueCollected', clueData);
        } else {
            console.warn(`⚠️ Clue data for "${clueKey}" not found.`);
        }

        // 2️⃣ Create & Add the Item
        const newItem = new Item(
            this.context.itemId,
            this.context.itemName,
            this.context.itemDescription,
            this.context.iconKey,
            1
        );
        this.inventoryManager.addItem(newItem);
        this.scene.events.emit('inventoryUpdated'); // ✅ Notify UI to refresh inventory

        // 3️⃣ Remove the Item Sprite from the Scene
        if (this.context instanceof Phaser.GameObjects.Sprite) {
            console.log(`🗑️ Removing item sprite: ${this.context.itemId}`);
            this.context.destroy();
        }

        // 4️⃣ Remove from Interactables List
        if (this.scene.interactables) {
            const index = this.scene.interactables.indexOf(this.context);
            if (index > -1) {
                this.scene.interactables.splice(index, 1);
            }
        }

        console.log(`✅ Item "${this.context.itemId}" successfully picked up.`);
    }
}
