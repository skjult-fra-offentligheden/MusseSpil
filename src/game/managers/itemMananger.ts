import Phaser from 'phaser';
import { Item } from "../classes/itemDatastruct";
import { GameState } from './GameState';
import { UIManager } from '../managers/UIManager';
import { UIGameOverlay } from "../scenes/UiGameOverlay"
export class InventoryManager {
    private static instance: InventoryManager;
    private items: Map<string, Item> = new Map();
    private scene: Phaser.Scene | null = null;

    // UI Elements
    private inventoryContainer!: Phaser.GameObjects.Container;
    private itemSlots: Phaser.GameObjects.Sprite[] = [];
    private scrollOffset: number = 0;
    private isDragging: boolean = false;
    private dragStartX: number = 0;

    private constructor() {
        console.log('InventoryManager initialized.');
    }

    public static getInstance(): InventoryManager {
        if (!InventoryManager.instance) {
            InventoryManager.instance = new InventoryManager();
        }
        return InventoryManager.instance;
    }

    public setScene(scene: Phaser.Scene) {
        this.scene = scene;
        this.initializeUI();
    }

    private initializeUI() {
        if (!this.scene) return;

        // Create inventory container
        this.inventoryContainer = this.scene.add.container(0, 0).setDepth(1000);

        // Background panel
        const bg = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2,
            30,
            this.scene.cameras.main.width,
            60,
            0x2d2d2d,
            0.9
        ).setOrigin(0.5, 0);

        // Mask for scrollable area - not working
        const mask = this.scene.add.graphics()
            .fillRect(20, 10, this.scene.cameras.main.width - 40, 50)
            .setVisible(false);

        this.inventoryContainer.add([bg, mask]);
        this.inventoryContainer.mask = new Phaser.Display.Masks.GeometryMask(this.scene, mask);

        // Setup input handlers
        this.setupInputHandling();
        this.scene.events.on('update', () => this.handleInventoryDrag());
    }

    private setupInputHandling() {
        if (!this.scene) return;

        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isPointerOverInventory(pointer)) {
                this.isDragging = true;
                this.dragStartX = pointer.x;
            }
        });

        this.scene.input.on('pointerup', () => {
            this.isDragging = false;
        });
    }

    private handleInventoryDrag() {
        if (!this.isDragging || !this.scene) return;

        const deltaX = this.scene.input.activePointer.x - this.dragStartX;
        this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + deltaX, -this.getMaxScroll(), 0);
        this.dragStartX = this.scene.input.activePointer.x;
        this.updateItemPositions();
    }

    private updateItemPositions() {
        this.itemSlots.forEach((sprite, index) => {
            sprite.x = 30 + (index * 60) + this.scrollOffset;
        });
    }

    private getMaxScroll(): number {
        return Math.max(0, (this.items.size * 60) - (this.scene?.cameras.main.width || 800) + 100);
    }

    public addItem(newItem: Item) {
        const gameState = GameState.getInstance();
        gameState.collectedItems.add(newItem.itemId);

        if (this.items.has(newItem.itemId)) {
            this.items.get(newItem.itemId)!.quantity += newItem.quantity;
        } else {
            this.items.set(newItem.itemId, { ...newItem });
        }

        this.showItemNotification(newItem);
        this.updateItemPositions();

        console.log("Item added to inventory:", newItem);

        // Notify UIGameOverlay to update its slots
        const mainScene = this.scene?.scene.get('ToturialScene');
        if (mainScene) {
            console.log("Emitting inventoryUpdated event to ToturialScene...");
            mainScene.events.emit('inventoryUpdated');
        } else {
            console.warn("InventoryManager: Could not find ToturialScene, event not emitted.");
        }
    }

    private createItemSprite(item: Item) {
        if (!this.scene) return;

        const itemSprite = this.scene.add.sprite(
            30 + (this.itemSlots.length * 60),
            30,
            item.iconKey!
        )
            .setScale(0.4)
            .setInteractive()
            .on('pointerdown', () => this.handleItemClick(item))
            .setData('item', item);

        this.itemSlots.push(itemSprite);
        this.inventoryContainer.add(itemSprite);
    }

    private handleItemClick(item: Item) {
        console.log('Item clicked:', item.itemName);
        // Implement item interaction logic here
    }

    private isPointerOverInventory(pointer: Phaser.Input.Pointer): boolean {
        return pointer.y < 80 && pointer.x > 20 && pointer.x < (this.scene?.cameras.main.width || 800) - 20;
    }

    private showItemNotification(item: Item) {
        if (!this.scene) return;

        const notification = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            80,
            `Acquired: ${item.itemName}`,
            { fontSize: '18px', color: '#ffffff', backgroundColor: '#000000' }
        )
            .setOrigin(0.5, 0)
            .setDepth(1001);

        this.scene.tweens.add({
            targets: notification,
            y: 60,
            alpha: 0,
            duration: 2000,
            onComplete: () => notification.destroy()
        });
    }

    public getItems(): Item[] {
        return Array.from(this.items.values());
    }
}