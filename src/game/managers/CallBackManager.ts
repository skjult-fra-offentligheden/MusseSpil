// src/handlers/CallbackHandler.ts

import { ClueManager } from '../clueScripts/clueManager'; // Adjust path
import { InventoryManager } from '../managers/itemMananger'; // Adjust path
import { GameState } from '../managers/GameState'; // Adjust path
import { UIManager } from '../managers/UIManager'; // Adjust path for your UI messages

// Import your item configurations and types
import { AllItemConfigs } from '../../data/items/AllItemConfig'; // Adjust path
import { ItemConfig, EvidencePhase } from '../../data/items/itemTemplate'; // Adjust path
import { Item as InventoryItem } from '../classes/itemDatastruct'; // Adjust path, aliased for clarity

import Phaser from 'phaser';

export type CallbackFn = (args: {
    scene: Phaser.Scene;
    gs: GameState;
    ui: UIManager;
    inventory?: InventoryManager;
    clueManager?: ClueManager;
    data?: unknown;
}) => void;
export interface ItemGameContext {
    scene: Phaser.Scene;
    inventoryManager: InventoryManager;
    clueManager: ClueManager;
    gameState: GameState;
    ui: {
        showPlayerMessage: (message: string) => void;
    };
    world: {
        removeItemSprite: (gameObject: Phaser.GameObjects.GameObject) => void;
    };
    interactedObject?: Phaser.GameObjects.GameObject; // The GameObject in the scene that was interacted with
}

export class CallbackHandler {
    private clueManager: ClueManager;
    private inventoryManager: InventoryManager;
    private scene: Phaser.Scene;
    private uiManager: UIManager; // For showing messages
    // Stores the GameObject from the scene that was the target of the current interaction
    private currentInteractedObject?: Phaser.GameObjects.GameObject & { itemId?: string };
    private handlers: Record<string, CallbackFn> = {};

    constructor(
        scene: Phaser.Scene,
        clueManager: ClueManager,
        inventoryManager: InventoryManager,
        uiManager: UIManager // Pass in your UIManager
    ) {
        this.scene = scene;
        this.clueManager = clueManager;
        this.inventoryManager = inventoryManager;
        this.uiManager = uiManager;

        console.log("[CallbackHandler Constructor] Initialized.");
        this.addInventoryManagerHelpers(); // Add helper methods to InventoryManager if they don't exist
    }

    public registerHandlers(prefix: string, map: Record<string, CallbackFn>) {
        for (const [key, fn] of Object.entries(map)) {
            const id = `${prefix}/${key}`;
            if (this.handlers[id]) console.warn('[CallbackHandler] Overwriting handler:', id);
            this.handlers[id] = fn;
        }


    }

    private addInventoryManagerHelpers(): void {
        const invManager = this.inventoryManager as any; // Type assertion for dynamic addition

        if (typeof invManager.createInventoryItemData !== 'function') {
            invManager.createInventoryItemData = (itemConfig: ItemConfig): InventoryItem => {
                let iconAssetKey: string | undefined;
                if (itemConfig.art && itemConfig.art.small) {
                    if (typeof itemConfig.art.small === 'string') {
                        iconAssetKey = itemConfig.art.small;
                    } else {
                        iconAssetKey = itemConfig.getArt.call(itemConfig, 'small');
                    }
                }
                const itemName = (itemConfig as any).name || itemConfig.id;
                return new InventoryItem(
                    itemConfig.id,
                    itemName,
                    itemConfig.description,
                    iconAssetKey,
                    1, // Default quantity
                    !!itemConfig.clueId
                );
            };
            console.log("[CallbackHandler] Added createInventoryItemData to InventoryManager.");
        }

        if (typeof invManager.updateItemDisplay !== 'function') {
            invManager.updateItemDisplay = (itemId: string): void => {
                const itemInstance = invManager.items.get(itemId); // Assuming 'items' is public or has a getter
                const itemConfig = AllItemConfigs[itemId];

                if (itemInstance && itemConfig) {
                    let newIconKey: string | undefined;
                    if (itemConfig.art && itemConfig.art.small) {
                        if (typeof itemConfig.art.small === 'string') {
                            newIconKey = itemConfig.art.small;
                        } else {
                            newIconKey = itemConfig.getArt.call(itemConfig, 'small');
                        }
                    }
                    if (newIconKey && itemInstance.iconKey !== newIconKey) {
                        itemInstance.iconKey = newIconKey;
                        // The actual UI sprite update should happen in InventoryManager's UI refresh logic
                        console.log(`[InventoryManager via CallbackHandler] Item ${itemId} iconKey updated to ${newIconKey}. UI refresh needed.`);
                    }
                    invManager.refreshInventoryUI?.(); // Call refresh if it exists
                }
            };
            console.log("[CallbackHandler] Added updateItemDisplay to InventoryManager.");
        }
    }


    /**
     * Sets the context of the interaction, typically the GameObject that was clicked
     * and has an associated itemId.
     * @param gameObject The Phaser GameObject that was interacted with.
     */
    public setContext(gameObject: Phaser.GameObjects.GameObject & { itemId?: string }): void {
        this.currentInteractedObject = gameObject;
        const itemId = gameObject.getData('itemId') || gameObject.itemId;
        console.log(`[CallbackHandler setContext] Context set. Item ID: ${itemId || 'N/A'}`, gameObject);
    }

    public handleCallback(callbackId: string, data?: unknown): void {
        console.log(`[CallbackHandler handleCallback] Received callback: ${callbackId}`);

        // --- 1) Global/dialogue callbacks (no item context required) ---
        const global = this.handlers[callbackId];
        if (global) {
            const ctx = {
                scene: this.scene,
                gs: GameState.getInstance(this.scene),
                ui: this.uiManager,
                inventory: this.inventoryManager,
                clueManager: this.clueManager,
                data
            };
            try {
                global(ctx);
            } catch (e) {
                console.error('[CallbackHandler] Error in global callback', callbackId, e);
            }
            return; // IMPORTANT: do not fall through to item path
        }

        // --- 2) Item-specific callbacks (your existing logic) ---
        // needs currentInteractedObject with an itemId
        const itemId =
            this.currentInteractedObject?.getData('itemId') as string ||
            this.currentInteractedObject?.itemId;

        if (!itemId) {
            console.warn(
                `[CallbackHandler handleCallback] No handler for "${callbackId}" and no itemId in context.`
            );
            this.clearContext();
            return;
        }

        const itemConfig = AllItemConfigs[itemId];
        if (!itemConfig) {
            console.warn(`[CallbackHandler handleCallback] No ItemConfig found for itemId: "${itemId}"`);
            this.clearContext();
            return;
        }

        const gameContext: ItemGameContext = {
            scene: this.scene,
            inventoryManager: this.inventoryManager,
            clueManager: this.clueManager,
            gameState: GameState.getInstance(this.scene),
            ui: {
                showPlayerMessage: (message: string) => {
                    this.uiManager.showNotification(message);
                    console.log('PLAYER_MESSAGE:', message);
                }
            },
            world: {
                removeItemSprite: (go: Phaser.GameObjects.GameObject) => {
                    if (go && typeof (go as any).destroy === 'function') {
                        console.log(`[CallbackHandler/World] Destroying world sprite.`);
                        (go as any).destroy();
                    }
                }
            },
            interactedObject: this.currentInteractedObject
        };

        if (itemConfig.handleCallback) {
            console.log(
                `[CallbackHandler handleCallback] Delegating "${callbackId}" to ItemConfig for "${itemId}".`
            );
            itemConfig.handleCallback.call(itemConfig, callbackId, gameContext);
        } else {
            // your existing generic fallback (pickup etc.)
            switch (callbackId) {
                case 'ACTION_PICKUP':
                    if (itemConfig.collectible) {
                        this.executeGenericPickup(itemConfig, gameContext);
                    } else {
                        gameContext.ui.showPlayerMessage(`You can't pick up the ${itemConfig.description || itemConfig.id}.`);
                    }
                    break;
                default:
                    console.warn(
                        `⚠️ Unhandled callback ID: "${callbackId}" for item "${itemId}" (no item handler & no generic handler).`
                    );
                    break;
            }
        }

        this.clearContext();
    }

    
    private executeGenericPickup(itemConfig: ItemConfig, gameContext: ItemGameContext): void {
        console.log(`[CallbackHandler executeGenericPickup] Processing generic pickup for item: ${itemConfig.id}`);

        let collectionResult = { collected: false, message: `Could not pick up ${itemConfig.id}.` };

        // 1. Call item's onCollect method if it exists for custom logic/messaging
        if (itemConfig.onCollect) {
            collectionResult = itemConfig.onCollect.call(itemConfig, gameContext);
        } else if (itemConfig.collectible) {
            // Default collect if no onCollect but item is collectible
            collectionResult = { collected: true, message: `${(itemConfig as any).name || itemConfig.id} collected.` };
        }

        if (collectionResult.collected) {
            // 2. Add to Inventory (using helper that should be on InventoryManager)
            if ((this.inventoryManager as any).createInventoryItemData) {
                const invItem = (this.inventoryManager as any).createInventoryItemData(itemConfig) as InventoryItem;
                this.inventoryManager.addItem(invItem);
            } else {
                console.error("[CallbackHandler executeGenericPickup] InventoryManager is missing createInventoryItemData method!");
            }

            // 3. Handle Clue (generic clue creation)
            this.addOrDiscoverClueForItem(itemConfig, gameContext);

            // 4. Remove sprite from the world (if not handled by onCollect)
            // We assume if onCollect exists and wants to remove the sprite, it uses gameContext.world.removeItemSprite.
            // If onCollect doesn't exist, and item was collected, we remove it.
            if (!itemConfig.onCollect && gameContext.interactedObject) {
                gameContext.world.removeItemSprite(gameContext.interactedObject);
            }
        }

        if (collectionResult.message) {
            gameContext.ui.showPlayerMessage(collectionResult.message);
        }
    }

    private addOrDiscoverClueForItem(itemConfig: ItemConfig, gameContext: ItemGameContext): void {
        if (!itemConfig.clueId && !itemConfig.collectible) { // Only process if it's a clue or generally significant
            return;
        }

        const clueIdToUse = itemConfig.clueId || itemConfig.id; // Use clueId if present, else item's own id
        let clue = gameContext.clueManager.getClue(clueIdToUse);

        if (clue) {
            if (!clue.discovered) {
                gameContext.clueManager.discoverClue(clueIdToUse);
                clue = gameContext.clueManager.getClue(clueIdToUse); // Re-fetch
                console.log(`[CallbackHandler] Clue "${clueIdToUse}" discovered.`);
            }
        } else {
            // Create a new clue
            let clueImageKey: string | undefined;
            if (itemConfig.art?.small) {
                clueImageKey = typeof itemConfig.art.small === 'string'
                    ? itemConfig.art.small
                    : itemConfig.getArt.call(itemConfig, 'small');
            }

            const clueData = {
                id: clueIdToUse,
                title: (itemConfig as any).name || itemConfig.id,
                description: itemConfig.description,
                imageKey: clueImageKey,
                category: itemConfig.clueCategory || 'evidence', // Default category
                foundAt: itemConfig.clueFoundAt || gameContext.scene.scene.key,
                relatedNPCs: itemConfig.clueRelatedNPCs || [],
                discovered: true,
            };
            // You'll need to adapt this to your ClueManager's specific add methods
            // e.g., gameContext.clueManager.addEvidenceClue(clueData), etc.
            // For now, assuming a generic addClue or category-specific methods exist.
            clue = gameContext.clueManager.addClue(clueData); // Replace with your actual ClueManager method
            console.log(`[CallbackHandler] New clue "${clueIdToUse}" added.`);
        }

        if (clue) {
            gameContext.gameState.getOrInitClueState(clueIdToUse).isDiscovered = clue.discovered;
            gameContext.scene.events.emit('clueCollected', clue);
        } else {
            console.error(`[CallbackHandler addOrDiscoverClueForItem] Failed to process clue for ${itemConfig.id}`);
        }
    }

    private clearContext(): void {
        this.currentInteractedObject = undefined;
        console.log('[CallbackHandler] Context cleared.');
    }
}