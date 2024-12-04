import Phaser from 'phaser';
import { Item } from "../classes/itemDatastruct"

export class InventoryManager {
    private items: Map<string, Item>;
    public scene: Phaser.Scene;
    private static instance: InventoryManager;

    constructor(scene: Phaser.Scene) {
        this.items = new Map();
        this.scene = scene;
        console.log('InventoryManager initialized with scene:', this.scene);
    }

    public addItem(newItem: Item) {
        console.log('InventoryManager addItem called. this.scene:', this);
        console.log('InventoryManager addItem called. this.item:', newItem);
        if (this.items.has(newItem.itemId)) {
            const existingItem = this.items.get(newItem.itemId)!;
            existingItem.quantity += newItem.quantity;
        } else {
            this.items.set(newItem.itemId, { ...newItem });
        }

        this.showItemNotification(newItem);
        this.scene.events.emit('itemCollected', newItem);
    }

    private showItemNotification(item: Item) {
        console.log('InventoryManager showItemNotification. this.scene:', this.scene);

        if (!this.scene) {
            console.error('Error: this.scene is undefined in InventoryManager.');
            return;
        }

        // Simple notification example
        const notificationText = this.scene.add.text(10, 10, `Collected: ${item.itemName}`, {
            fontSize: '20px',
            color: '#ffffff',
        });

        // Fade out and destroy after 2 seconds
        this.scene.tweens.add({
            targets: notificationText,
            alpha: 0,
            duration: 2000,
            onComplete: () => notificationText.destroy(),
        });
    }

    public static getInstance(scene: Phaser.Scene): InventoryManager {
        if (!InventoryManager.instance) {
            InventoryManager.instance = new InventoryManager(scene);
        }
        return InventoryManager.instance;
    }

    public getItems(): Item[] {
        return Array.from(this.items.values());
    }
}
