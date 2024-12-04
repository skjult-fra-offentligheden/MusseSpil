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
        console.log("Callback ItemManager:", this.inventoryManager);
        console.log("Callback ItemManager.scene:", this.inventoryManager.scene);
    }

    /** Handles callbacks associated with dialogue options */
    public setContext(context: any) {
        this.context = context;
    }

    public handleCallback(callbackId: string) {
        switch (callbackId) {
            case 'Investigate_body': {
                const clueData = this.cluesData[callbackId];
                if (clueData) {
                    this.clueManager.addClue({ ...clueData, discovered: true });
                    this.scene.events.emit('clueCollected', clueData);
                } else {
                    console.warn(`Clue data for "${callbackId}" not found.`);
                }

                this.context.setDialogueState('info');
                break;
            }
            case 'pick_up_knife': {
                //const newItem = new Item('knife001', 'Knife', 'A bloody knife', undefined, 1);
                const clueData = this.cluesData["Knife_with_blood"];
                if (clueData) {
                    this.clueManager.addClue({ ...clueData, discovered: true });
                    this.scene.events.emit('clueCollected', clueData);
                } else {
                    console.warn(`Clue data for "${callbackId}" not found.`);
                }

                const newItem = new Item(
                    this.context.itemId,
                    this.context.itemName,
                    this.context.itemDescription,
                    this.context.iconKey,
                    1
                );
                this.inventoryManager.addItem(newItem);
                if (this.context && this.context instanceof Phaser.GameObjects.Sprite) {
                    this.context.destroy(); // Remove the item sprite
                }

                if (this.scene.interactables) {
                    const index = this.scene.interactables.indexOf(this.context);
                    if (index > -1) {
                        this.scene.interactables.splice(index, 1);
                    }
                }
                //this.scene.events.emit('itemCollected', newItem);
                break;
            }
            default:
                console.warn(`Unhandled callback ID: "${callbackId}"`);
                break;
        }
    }
}
