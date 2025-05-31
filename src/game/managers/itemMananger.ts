import Phaser from 'phaser';
import { Item } from "../classes/itemDatastruct";
import { GameState } from './GameState';
import { ItemActionHandler } from '../scenes/ToturialScene/ItemActionHandler';
import { UIManager } from '../managers/UIManager';
import { UIGameOverlay } from "../scenes/UiGameOverlay";
import { AllItemConfigs } from "../../data/items/AllItemConfig";
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
    private itemActionHandler: ItemActionHandler; // Add this

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
        this.itemActionHandler = new ItemActionHandler(this.scene);
        this.initializeUI();
    }

    private initializeUI() {
        if (!this.scene) return;

        // Create inventory container
        this.inventoryContainer = this.scene.add.container(0, 0).setDepth(1000);

        // Background panel
        //const bg = this.scene.add.rectangle(
        //    this.scene.cameras.main.width / 2,
        //    30,
        //    this.scene.cameras.main.width,
        //    60,
        //    0xff0000,
        //    0.9
        //).setOrigin(0.5, 0);

        // Mask for scrollable area - not working
        const mask = this.scene.add.graphics()
            .fillRect(20, 10, this.scene.cameras.main.width - 40, 50)
            .setVisible(false);

        this.inventoryContainer.add([mask]);
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

    private handleItemClick(item: Item) {
        console.log('[InventoryManager] Item clicked:', item.itemName, 'ID:', item.itemId);

        if (!this.itemActionHandler) {
            console.error("[InventoryManager] ItemActionHandler not initialized!");
            return;
        }

        // Call the ItemActionHandler to perform the action
        this.itemActionHandler.useItem(item);

        // --- Now, handle degradation and UI refresh AFTER the action ---
        // We need to know if the item was one that should degrade.
        // We can check the item.itemId against known degradable items.
        const degradableItemIds = ['coke', 'blueCheese']; // Define which items degrade

        if (degradableItemIds.includes(item.itemId)) {
            const itemConfig = AllItemConfigs[item.itemId]; // Assuming you have AllItemConfigs imported
            if (itemConfig) {
                const wasDegraded = this.degradePhasedItem(item.itemId, 'small'); // 'small' or 'large' for icon

                if (wasDegraded) {
                    // Check if item became "empty" and if quantity should be affected or item removed
                    const gameState = GameState.getInstance();
                    const itemState = gameState.getOrInitClueState(item.itemId);

                    if (itemState.phase === 'empty') {
                        // Option 1: Reduce quantity by 1 for each use, remove when quantity is 0.
                        // This means an item has multiple "doses/servings" that can be empty.
                        // item.quantity -=1; // This should ideally be done in ItemActionHandler if it's about consumption amount
                        // if (item.quantity <=0) { this.removeItem(item.itemId) }


                        // Option 2: If "empty" means the entire stack is gone (e.g. one bag of coke is now empty)
                        // Then the ItemActionHandler might decide to call removeItem, or you do it here.
                        // For simplicity, let's assume for now that degradation to empty just changes visuals.
                        // If you want to remove it, call:
                        // this.removeItem(item.itemId);
                        console.log(`[InventoryManager] Item ${item.itemId} is now empty.`);
                    }
                }
            }
        }
        // Always refresh the UI if an action might have changed something
        // (e.g., item consumed, item state changed, item removed)
        // The ItemActionHandler might also emit an event that triggers this.
        // For now, let's assume ItemActionHandler's effects are separate and we only refresh for degradation.
        this.refreshInventoryUI(); // Or at least if degradation happened
    }

    // The degradePhasedItem, removeItem, refreshInventoryUI, addItem methods
    // from my previous response can largely stay the same.
    // Make sure degradePhasedItem returns a boolean indicating if degradation actually occurred.
    private degradePhasedItem(itemId: string, sizeToUpdate: 'small' | 'large'): boolean {
        const gameState = GameState.getInstance(); // Assuming scene is already set for GameState
        const itemConfig = AllItemConfigs[itemId];

        if (!itemConfig || !itemConfig.art || typeof itemConfig.art[sizeToUpdate] === 'string') {
            console.warn(`[InventoryManager] Item ${itemId} is not phased or has no art config for degradation.`);
            return false;
        }

        // Get the current state (this also initializes it if it doesn't exist)
        const clueRuntimeState = gameState.getOrInitClueState(itemId);
        const oldPhase = clueRuntimeState.phase;

        // Use your existing GameState.degradeClue() method
        const newPhase = gameState.degradeClue(itemId); // This method handles the 'full' -> 'half' -> 'empty' logic

        if (newPhase === oldPhase) {
            // Degradation didn't happen (e.g., item was already 'empty' or 'fixed')
            if (oldPhase === 'empty') {
                console.log(`[InventoryManager] Item ${itemId} is already empty.`);
            } else if (oldPhase === 'fixed') {
                console.log(`[InventoryManager] Item ${itemId} is 'fixed', cannot degrade.`);
            }
            return false; // No change occurred
        }

        console.log(`[InventoryManager] Item ${itemId} phase updated from ${oldPhase} to ${newPhase}.`);

        // Update the iconKey of the Item object stored in this.items
        const inventoryItemInstance = this.items.get(itemId);
        if (inventoryItemInstance && itemConfig.art) {
            // We know artForSize is PhaseArt because of the earlier check
            const artSet = itemConfig.art[sizeToUpdate] as PhaseArt;
            // newPhase is 'full' | 'half' | 'empty' | 'fixed'. PhaseArt keys are 'full', 'half', 'empty'.
            // If newPhase is 'fixed', we should probably use 'full' art.
            const phaseKeyForArt = (newPhase === 'fixed' ? 'full' : newPhase) as keyof PhaseArt;

            if (artSet && artSet[phaseKeyForArt]) {
                inventoryItemInstance.iconKey = artSet[phaseKeyForArt];
                console.log(`[InventoryManager] Updated inventory item instance iconKey for ${itemId} to: ${inventoryItemInstance.iconKey}`);
            } else {
                console.warn(`[InventoryManager] Could not find art for phase ${phaseKeyForArt} for item ${itemId}.`);
            }
        }
        return true; // Degradation occurred
    }

    private isPointerOverInventory(pointer: Phaser.Input.Pointer): boolean {
        return pointer.y < 80 && pointer.x > 20 && pointer.x < (this.scene?.cameras.main.width || 800) - 20;
    }

    public createInventoryItemData(itemConfig: ItemConfig): Item {
        let iconAssetKey: string | undefined;
        if (itemConfig.art && itemConfig.art.small) {
            if (typeof itemConfig.art.small === 'string') {
                iconAssetKey = itemConfig.art.small;
            } else { // PhasedArt
                // Use itemConfig.getArt() to get the current state's art
                iconAssetKey = itemConfig.getArt ? itemConfig.getArt.call(itemConfig, 'small') : itemConfig.art.small.full;
            }
        }
        const quantity = 1; // Or itemConfig.initialQuantity if you add that
        const itemName = itemConfig.name || itemConfig.id;

        return new Item(
            itemConfig.id,
            itemName,
            itemConfig.description,
            iconAssetKey,
            quantity,
            !!itemConfig.clueId
        );
    }

    public updateItemDisplay(itemId: string): void {
        console.log(`[InventoryManager updateItemDisplay] Called for item ID: ${itemId}`);

        const itemInstance = this.items.get(itemId); // Get the Item object stored in the inventory (Map)
        const itemConfig = AllItemConfigs[itemId];   // Get the stateful ItemConfig object

        if (!itemInstance) {
            console.warn(`[InventoryManager updateItemDisplay] No item instance found in inventory for ID: ${itemId}. Cannot update display.`);
            return;
        }

        if (!itemConfig) {
            console.warn(`[InventoryManager updateItemDisplay] No ItemConfig found for ID: ${itemId}. Cannot determine new art.`);
            return;
        }

        if (typeof itemConfig.getArt !== 'function') {
            console.warn(`[InventoryManager updateItemDisplay] ItemConfig for ${itemId} is missing the getArt method. Cannot update icon.`);
            // Item might not be "phased" or its art doesn't change.
            // You might still want to refresh UI if quantity changed, but this method is about art.
            // For now, we'll just return if getArt isn't there, assuming no art change is possible.
            // this.refreshInventoryUI(); // Optionally refresh anyway if other non-art state might affect display
            return;
        }

        // Get the LATEST art key based on the itemConfig's CURRENT status
        // We use .call(itemConfig, ...) to ensure 'this' inside getArt refers to the itemConfig itself.
        const newIconKey = itemConfig.getArt.call(itemConfig, 'small');

        if (!newIconKey) {
            console.warn(`[InventoryManager updateItemDisplay] itemConfig.getArt('small') for ${itemId} returned undefined/null. Using fallback or current.`);
            // Potentially use a fallback or do nothing to the itemInstance.iconKey
            // For now, if newIconKey is falsy, we won't change it.
        }

        // Check if the iconKey actually needs to be updated
        if (newIconKey && itemInstance.iconKey !== newIconKey) {
            console.log(`[InventoryManager updateItemDisplay] Updating iconKey for ${itemId} from "${itemInstance.iconKey}" to "${newIconKey}".`);
            itemInstance.iconKey = newIconKey; // Update the iconKey on the Item object in the inventory data
        } else if (newIconKey && itemInstance.iconKey === newIconKey) {
            console.log(`[InventoryManager updateItemDisplay] IconKey for ${itemId} is already "${newIconKey}". No change to item data needed, but refreshing UI just in case.`);
        }


        // Always refresh the inventory UI to reflect any potential changes (even if iconKey string didn't change,
        // other visual aspects tied to refresh might need an update, or to ensure consistency).
        // This call will make refreshInventoryUI() use the (potentially updated) itemInstance.iconKey.
        this.refreshInventoryUI();
    }

    public refreshInventoryUI(): void {
        if (!this.scene || !this.inventoryContainer) {
            console.warn("[InventoryManager refreshInventoryUI] Scene or inventoryContainer not available.");
            return;
        }

        this.itemSlots.forEach(slotSprite => slotSprite.destroy());
        this.itemSlots = [];

        this.items.forEach(itemData => { // itemData is of type Item (from itemDatastruct)
            if (itemData.quantity > 0) {
                let currentIconKey = itemData.iconKey;
                if (!currentIconKey || !this.scene!.textures.exists(currentIconKey)) { // Also check if texture exists
                    console.warn(`[InventoryManager refreshInventoryUI] Item ${itemData.itemId} has invalid/missing iconKey: "${currentIconKey}". Using fallback.`);
                    currentIconKey = 'fallback_missing_item_texture'; // Ensure fallback is loaded
                }
                try {
                    const itemSprite = this.scene!.add.sprite(0, 30, currentIconKey) // USES itemData.iconKey
                        .setScale(0.0)
                        .setInteractive({ useHandCursor: true })
                        .on('pointerdown', () => this.handleItemClick(itemData))
                        .setData('item', itemData);

                    this.itemSlots.push(itemSprite);
                    this.inventoryContainer.add(itemSprite);
                } catch (e) {
                    console.error(`[InventoryManager refreshInventoryUI] Error creating sprite for item ${itemData.itemId} with iconKey ${currentIconKey}:`, e);
                }
            }
        });

        this.updateItemPositions();
        console.log(`[InventoryManager refreshInventoryUI] UI refreshed with ${this.itemSlots.length} items displaying.`);

        // IMPORTANT: Notify other UI systems (like UIGameOverlay) that the inventory has been updated
        // so they can also refresh their views.
        const mainGameScene = this.scene?.scene.get('ToturialScene'); // Or your current main game scene key
        if (mainGameScene && mainGameScene.events) {
            mainGameScene.events.emit('inventoryUpdated');
        }
    }

    public removeItem(itemId: string): void {
        if (this.items.has(itemId)) {
            this.items.delete(itemId);
            console.log(`[InventoryManager] Item ${itemId} removed from inventory.`);
            this.refreshInventoryUI(); // Refresh UI to remove the slot

            const mainScene = this.scene?.scene.get('ToturialScene');
            if (mainScene && mainScene.events) { // Check if mainScene and its events emitter exist
                mainScene.events.emit('inventoryUpdated');
            }
        } else {
            console.warn(`[InventoryManager removeItem] Attempted to remove non-existent item: ${itemId}`);
        }
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