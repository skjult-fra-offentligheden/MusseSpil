// src/handlers/CallbackHandler.ts

import { ClueManager } from '../clueScripts/clueManager'; // Adjust path
import { InventoryManager } from '../managers/InventoryManager'; // Adjust path
import { GameState } from '../managers/GameState'; // Adjust path
import { UIManager } from '../managers/UIManager'; // Adjust path for your UI messages

// Import your item configurations and types
import { AllItemConfigs } from '../../data/items/AllItemConfig'; // Adjust path
import { ItemConfig, EvidencePhase } from '../../data/items/itemTemplate'; // Adjust path
import { Item as InventoryItem } from '../classes/itemDatastruct'; // Adjust path, aliased for clarity

import Phaser from 'phaser';

/**
 * Provides context to ItemConfig methods, allowing them to interact with game systems.
 */
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

    /**
     * Helper to ensure InventoryManager has the necessary methods.
     * You might place these methods directly in InventoryManager.ts instead.
     */
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

    /**
     * Main entry point for handling callbacks from dialogue or direct interactions.
     */
    public handleCallback(callbackId: string): void {
        console.log(`[CallbackHandler handleCallback] Received callback: ${callbackId}`);

        // Try to get itemId from currentInteractedObject's data or direct property
        const itemId = this.currentInteractedObject?.getData('itemId') as string || this.currentInteractedObject?.itemId;

        if (!itemId) {
            console.warn(`[CallbackHandler handleCallback] No itemId found on currentInteractedObject. Cannot process callback "${callbackId}".`);
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
            gameState: GameState.getInstance(),
            ui: {
                showPlayerMessage: (message: string) => {
                    this.uiManager.showNotification(message); // Use your UIManager
                    console.log("PLAYER_MESSAGE:", message);
                }
            },
            world: {
                removeItemSprite: (gameObjectToDestroy: Phaser.GameObjects.GameObject) => {
                    if (gameObjectToDestroy && typeof gameObjectToDestroy.destroy === 'function') {
                        console.log(`[CallbackHandler/World] Destroying world sprite.`);
                        gameObjectToDestroy.destroy();
                    }
                }
            },
            interactedObject: this.currentInteractedObject
        };

        // --- Prioritize Item's Own handleCallback ---
        if (itemConfig.handleCallback) {
            console.log(`[CallbackHandler handleCallback] Delegating callback "${callbackId}" to ItemConfig for "${itemId}".`);
            itemConfig.handleCallback.call(itemConfig, callbackId, gameContext);
        } else {
            // --- Fallback to Generic Callback Handling ---
            console.log(`[CallbackHandler handleCallback] ItemConfig for "${itemId}" does not have a handleCallback method. Using generic handler for "${callbackId}".`);
            switch (callbackId) {
                case 'ACTION_PICKUP': // A generic pickup action name
                    if (itemConfig.collectible) {
                        this.executeGenericPickup(itemConfig, gameContext);
                    } else {
                        gameContext.ui.showPlayerMessage(`You can't pick up the ${itemConfig.description || itemConfig.id}.`);
                    }
                    break;
                // Add other *truly generic* callbacks here if needed.
                // Most item-specific actions should be handled by itemConfig.handleCallback.
                default:
                    console.warn(`⚠️ Unhandled callback ID: "${callbackId}" for item "${itemId}" (no item-specific handler and no generic handler).`);
                    break;
            }
        }

        this.clearContext(); // Clear context after handling
    }

    /**
     * Executes a generic pickup sequence for an item.
     * This is called if a generic 'ACTION_PICKUP' callback is used and the item
     * doesn't have its own handleCallback for it, or if an item's handleCallback
     * explicitly calls this for some reason.
     */
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

    /**
     * Adds a new clue or discovers an existing one based on ItemConfig.
     */
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