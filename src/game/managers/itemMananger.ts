import Phaser from 'phaser';
import { Item } from "../classes/itemDatastruct";
import { GameState } from './GameState';
import { UIManager } from '../managers/UIManager';
import { AllItemConfigs } from "../../data/items/AllItemConfig";
import { ClueManager } from "../clueScripts/clueManager";
import { ItemGameContext } from "./CallBackManager";
import { Player } from "../classes/player";
import { ItemConfig } from '../../data/items/itemTemplate';
export class InventoryManager {
    private static instance: InventoryManager;
    private items: Map<string, Item> = new Map();
    private scene: Phaser.Scene | null = null;

    // UI Elements
    private inventoryContainer!: Phaser.GameObjects.Container;
    private itemSlots: Phaser.GameObjects.Sprite[] = [];
    private sceneForEvents: Phaser.Scene | null = null;

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
        this.sceneForEvents = scene;
        //this.initializeUI(); //so far destroys item degradation and item slots on scene change
        // Rehydrate inventory from GameState on scene attach (silent add)
        try {
            const gs = GameState.getInstance();
            gs.collectedItems.forEach((id) => {
                const cfg = AllItemConfigs[id];
                if (!cfg) return;
                if (!this.items.has(id)) {
                    const item = this.createInventoryItemData(cfg);
                    // add without duplicate notifications
                    this.items.set(id, item);
                }
                // Ensure icon reflects saved phase
                this.updateItemDisplay(id);
            });
            this.refreshInventoryUI();
        } catch (e) {
            console.warn('[InventoryManager] rehydrate failed:', e);
        }
    }

    public addItem(newItem: Item) {
        const gameState = GameState.getInstance();
        gameState.collectedItems.add(newItem.itemId);
        if (!newItem || !newItem.itemId) {
            console.error("[InventoryManager addItem] Attempted to add invalid item.", newItem);
            return;
        }
        gameState.collectedItems.add(newItem.itemId);

        if (this.items.has(newItem.itemId)) {
            const existingItem = this.items.get(newItem.itemId)!;
            existingItem.quantity = (existingItem.quantity || 0) + (newItem.quantity || 1);
            console.log(`[InventoryManager] Quantity of ${newItem.itemId} updated to ${existingItem.quantity}.`);

            //this.items.get(newItem.itemId)!.quantity += newItem.quantity;
        } else {
            this.items.set(newItem.itemId, { ...newItem });
            console.log(`[InventoryManager] New item ${newItem.itemId} added.`);

        }

        this.showItemNotification(newItem);
        //this.updateItemPositions();
        this.refreshInventoryUI();

        console.log("Item added to inventory:", newItem);


    }

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

    public createInventoryItemData(itemConfig: ItemConfig): Item {
        let iconAssetKey: string | undefined;

        // Get the authoritative state from GameState
        const gameState = GameState.getInstance();
        const clueId = itemConfig.clueId || itemConfig.id;
        const currentPhase = gameState.getOrInitClueState(clueId).phase;

        if (itemConfig.art && itemConfig.art.small) {
            if (typeof itemConfig.art.small === 'string') {
                iconAssetKey = itemConfig.art.small;
            } else { // PhasedArt
                // Call getArt with the current phase from GameState
                iconAssetKey = itemConfig.getArt ? itemConfig.getArt.call(itemConfig, 'small', currentPhase) : itemConfig.art.small.full;
            }
        }
        const quantity = 1;
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

        const itemInstance = this.items.get(itemId);
        const itemConfig = AllItemConfigs[itemId];
        const gameState = GameState.getInstance();

        if (!itemInstance || !itemConfig || typeof itemConfig.getArt !== 'function') {
            console.warn(`[InventoryManager updateItemDisplay] Cannot update data for ${itemId}. Missing instance, config, or getArt.`);
            return;
        }

        // 1. Get the authoritative phase from GameState
        const clueId = itemConfig.clueId || itemId;
        const currentPhase = gameState.getOrInitClueState(clueId).phase;

        // 2. Call getArt with the correct phase to get the new texture
        const newIconKey = itemConfig.getArt.call(itemConfig, 'small', currentPhase);

        if (newIconKey && itemInstance.iconKey !== newIconKey) {
            itemInstance.iconKey = newIconKey; // Update the data object in the inventory
            console.log(`[InventoryManager] Data for ${itemId} iconKey updated to ${newIconKey}.`);
        }

        // 3. Notify the UI to refresh
        this.refreshInventoryUI();
    }

    public refreshInventoryUI(): void {
        
        console.log("[InventoryManager refreshInventoryUI] Data changed, emitting 'inventoryUpdated'.");
        if (this.sceneForEvents && this.sceneForEvents.events) {
            // Emit on the main game scene so UIGameOverlay (and others) can listen
            this.sceneForEvents.events.emit('inventoryUpdated');
        } else {
            console.warn("[InventoryManager] No sceneForEvents to emit 'inventoryUpdated' on.");
        }
    }

    public removeItem(itemId: string): void {
        
        if (this.items.has(itemId)) {
            this.items.delete(itemId);
            console.log(`[InventoryManager] Item data ${itemId} removed.`);
            // Data has changed, so call refreshInventoryUI which will emit the event
            this.refreshInventoryUI();
        } else {
            console.warn(`[InventoryManager removeItem] Attempted to remove non-existent item data: ${itemId}`);
        }
    }

    public useItem(inventoryItem: Item | null, callingScene: Phaser.Scene) {
        if (!inventoryItem) {
            console.warn("useItem called with no item.");
            // Optionally show a UI message via UIManager
            return;
        }

        const itemConfig = AllItemConfigs[inventoryItem.itemId];
        if (!itemConfig || !itemConfig.use) {
            console.warn(`Item ${inventoryItem.itemId} has no use method.`);
            return;
        }

        // Get managers from singletons or the calling scene's registry
        const clueManager = callingScene.registry.get('clueManager') as ClueManager;
        const uiManager = UIManager.getInstance();
        const gameState = GameState.getInstance();

        if (!clueManager) {
            console.error("FATAL: useItem could not find ClueManager in the calling scene's registry.");
            return;
        }

        // Build the complete game context object
        const gameContext: ItemGameContext = {
            scene: callingScene,
            inventoryManager: this, // 'this' is the InventoryManager instance
            clueManager: clueManager,
            ui: uiManager,
            gameState: gameState,
            interactedObject: undefined, // Not relevant for inventory use
            targetItem: undefined, // Can be populated if using an item on another
            world: { removeItemSprite: () => { } }
        };

        // Call the item's use function
        const useResult = itemConfig.use.call(itemConfig, gameContext);

        // Process the results (art changes, consumption)
        if (useResult.artChanged) {
            this.updateItemDisplay(inventoryItem.itemId);
        }

        if (useResult.consumed) {
            this.removeItem(inventoryItem.itemId);
        } else {
            // Even if not consumed, refresh UI in case quantity changes (if you add that later)
            this.refreshInventoryUI();
        }

        // Emit the event for NPCs to hear
        callingScene.events.emit('itemUsedFromInventory', {
            itemId: inventoryItem.itemId,
            player: callingScene.registry.get('player') as Player,
            result: useResult
        });
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
