// In ItemActionHandler.ts
import { Item } from "../../classes/itemDatastruct";
import Phaser from "phaser";
import { GlobalEvents } from '../../../factories/globalEventEmitter';
import { AllItemConfigs } from "../../../data/items/AllItemConfig"; // Adjust path
import { ItemConfig } from "../../../data/items/itemTemplate"; // Adjust path
import { ItemUsedEventPayload } from '../../../data/events/eventTypes';
import { InventoryManager } from "../../managers/itemMananger"; // Adjust path
import { UIManager } from "../../managers/UIManager"; // Adjust path
import { GameState } from "../../managers/GameState";
import { ItemGameContext } from "../../managers/CallBackManager";
import { Player } from "../../classes/player";
// Import other managers if needed for gameContext

export interface ItemUsedEventPayload { // Add 'export'
    itemId: string;
    itemConfig: ItemConfig;
    useResult: { /* ... */ };
    target?: any;
    player?: Player;
}
export class ItemActionHandler {
    private scene: Phaser.Scene;
    private inventoryManager: InventoryManager;
    private uiManager: UIManager;
    private gameState: GameState;

    // Add ClueManager, GameState if needed by itemConfig.use() context

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.inventoryManager = InventoryManager.getInstance(); // Assuming singleton
        this.uiManager = UIManager.getInstance(); // Assuming singleton
        this.gameState = GameState.getInstance();
        console.log("[ItemActionHandler constructor] InventoryManager instance:", this.inventoryManager);
        console.log("[ItemActionHandler constructor] Does it have removeItem?", typeof this.inventoryManager.removeItem);
    }

    public useItem(inventoryItem: Item | null, target?: any) { // Parameter is the Item from inventory
        console.log("[ItemActionHandler useItem] 'this' refers to:", this);
        console.log("[ItemActionHandler useItem] this.inventoryManager:", this.inventoryManager);
        if (!inventoryItem) {
            this.showTemporaryMessage("⚠️ No active item selected to use!");
            console.warn("⚠️ No active item selected to use!");
            return;
        }

        const itemConfig = AllItemConfigs[inventoryItem.itemId];
        if (!itemConfig || !itemConfig.use) {
            this.showTemporaryMessage(`You can't use ${inventoryItem.itemName} that way.`);
            console.warn(`❌ Item ${inventoryItem.itemId} has no ItemConfig or use method defined.`);
            return;
        }

        console.log(`Using item from inventory: ${inventoryItem.itemName} (ID: ${inventoryItem.itemId})`);

        // Prepare a limited game context if needed by 'use' methods.
        // 'use' methods might not need the full world interaction context.
        const gameContext: Partial<ItemGameContext> = { // Partial because 'use' might not need 'interactedObject'
            scene: this.scene,
            inventoryManager: this.inventoryManager,
            ui: {
                showPlayerMessage: (message: string) => this.showTemporaryMessage(message)
            },
            gameState: this.gameState,
            targetItem: target
            // gameState: GameState.getInstance(), // If 'use' methods need to change game state
            // clueManager: ClueManager.getInstance(), // If 'use' methods might generate clues
        };

        // Call the item's own 'use' method
        // 'this' inside itemConfig.use will be itemConfig
        const useResult = itemConfig.use.call(itemConfig, gameContext);

        if (useResult.message) {
            this.showTemporaryMessage(useResult.message);
        }

        if (useResult.artChanged) {
            // Tell InventoryManager to update the display of this item
            // This assumes InventoryManager.updateItemDisplay will fetch the new art using itemConfig.getArt()
            console.log(`[ItemActionHandler] Art changed for ${inventoryItem.itemId}. Telling InventoryManager to update display.`);
            this.inventoryManager.updateItemDisplay(inventoryItem.itemId);
        }

        if (useResult.consumed) {
            // Item was fully consumed. Reduce quantity or remove.
            console.log(`[ItemActionHandler] Item ${inventoryItem.itemId} was marked as consumed by its use method.`);
            inventoryItem.quantity = (inventoryItem.quantity || 1) - 1; // Assuming use consumes 1
            if (inventoryItem.quantity <= 0) {
                this.inventoryManager.removeItem(inventoryItem.itemId);
                this.showTemporaryMessage(`${inventoryItem.itemName} was used up.`);
                if (!useResult.message?.toLowerCase().includes("used up") && !useResult.message?.toLowerCase().includes("empty") && !useResult.message?.toLowerCase().includes("gone")) {
                    this.showTemporaryMessage(`${inventoryItem.itemName} was used up.`);
                }
            } else {
                // If quantity > 0 but art changed (e.g. half-eaten), updateItemDisplay handles it.
                // No specific message here unless you want "Used one X. Y left."
            }
        }
        const playerInstance = this.scene.registry.get('player') as Player | undefined;
        // Always refresh inventory UI in case quantity changed or item removed/art updated
        this.inventoryManager.refreshInventoryUI?.();
        const eventPayload: ItemUsedEventPayload = { // Use the imported type
            itemId: inventoryItem!.itemId,
            itemConfig: AllItemConfigs[inventoryItem!.itemId], // Get the actual stateful ItemConfig
            useResult: useResult,
            target: target,
            player: playerInstance
        };
        console.log(`[ItemActionHandler] PRE-EMIT 'itemUsedFromInventory'. Payload for ${eventPayload.itemId}:`, eventPayload);
        GlobalEvents.emit('itemUsedFromInventory', eventPayload); // Event name NPCs are listening for
        console.log(`[ItemActionHandler] POST-EMIT 'itemUsedFromInventory' for ${eventPayload.itemId}`);
    }

    // ... showTemporaryMessage and other helpers ...
    private showTemporaryMessage(message: string): void {
        // Your existing method - ensure UIManager is used if that's your central message system
        // this.uiManager.showNotification(message);
        // For now, using the local one from your ItemActionHandler:
        if (!this.scene || !this.scene.scale) return; // Guard against scene not being ready

        const messageText = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height - 100, // Adjusted to be a bit higher
            message,
            {
                fontSize: "16px",
                fontFamily: '"Verdana", "Arial", sans-serif',
                color: "#ffffff",
                backgroundColor: "rgba(0,0,0,0.75)",
                padding: { x: 10, y: 5 },
                align: 'center',
                wordWrap: { width: this.scene.scale.width - 40, useAdvancedWrap: true }
            }
        )
            .setOrigin(0.5)
            .setDepth(Phaser.Math.MAX_SAFE_INTEGER) // Ensure it's on top
            .setScrollFactor(0); // Fixed to camera

        this.scene.time.delayedCall(2500, () => { // Slightly longer display
            if (messageText.scene) { // Check if text object is still part of a scene
                this.scene.tweens.add({
                    targets: messageText,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => messageText.destroy()
                });
            } else {
                messageText.destroy(); // Fallback if scene is gone
            }
        });
    }
}