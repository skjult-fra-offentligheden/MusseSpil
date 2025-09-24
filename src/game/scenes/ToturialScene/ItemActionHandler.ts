// src/scenes/ToturialScene/ItemActionHandler.ts
import Phaser from "phaser";
import { Item } from "../../classes/itemDatastruct";
import { Player } from "../../classes/player";
import { GlobalEvents } from "../../../factories/globalEventEmitter";
import { AllItemConfigs } from "../../../data/items/AllItemConfig"; // ← plural, correct file
import type { ItemUsedEventPayload } from "../../../data/events/eventTypes";
import { InventoryManager } from "../../managers/itemMananger";
import { UIManager } from "../../managers/UIManager";
import { GameState } from "../../managers/GameState";
import type { ItemGameContext } from "../../managers/CallBackManager";
import { ClueManager } from "../../clueScripts/clueManager";

export class ItemActionHandler {
    private scene: Phaser.Scene;
    private inventoryManager: InventoryManager;
    private uiManager: UIManager;
    private gameState: GameState;
    private clueManager: ClueManager;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.inventoryManager = InventoryManager.getInstance();
        this.uiManager = UIManager.getInstance();
        this.gameState = GameState.getInstance();
        this.clueManager = scene.registry.get("clueManager");
    }

    public useItem(inventoryItem: Item | null, target?: any) {
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

        // Build the (partial) game context passed into item use()
        const gameContext: Partial<ItemGameContext> = {
            scene: this.scene,
            inventoryManager: this.inventoryManager,
            ui: { showPlayerMessage: (msg: string) => this.showTemporaryMessage(msg) },
            gameState: this.gameState,
            clueManager: this.clueManager,
            targetItem: target,
            interactedObject: undefined,
            world: { removeItemSprite: () => { } },
        };

        // ─── Item use call ─────────────────────────────────────────────────────
        const useResult = itemConfig.use.call(itemConfig, gameContext);

        // Optional player toast
        if (useResult.message) this.showTemporaryMessage(useResult.message);

        // ─── Reconcile inventory quantity + visual phase with the item's reported status ───
        const startQty = inventoryItem.quantity ?? 0;
        const usedThisClick = !!useResult.consumed;
        const qtyAfter = Math.max(0, startQty - (usedThisClick ? 1 : 0));

        const statusFromItem = useResult.newStatus as "full" | "half" | "empty" | undefined;
        const statusFromQty = qtyAfter <= 0 ? "empty" : qtyAfter === 1 ? "half" : "full";

        // Prefer the item's explicit status; if mismatch, prefer "empty" to avoid desync
        let effectiveStatus = statusFromItem || statusFromQty;
        if (statusFromItem && statusFromItem !== statusFromQty) {
            if (statusFromItem === "empty" || statusFromQty === "empty") {
                effectiveStatus = "empty";
            } else {
                console.warn(
                    `[ItemActionHandler] Status mismatch for ${inventoryItem.itemId}: item=${statusFromItem}, qty=${statusFromQty}`
                );
            }
        }

        // Mutate inventory to match the effective status
        if (effectiveStatus === "empty") {
            // Ensure removal even if consumed=false but status says empty
            this.inventoryManager.removeItem(inventoryItem.itemId);

            const msg = useResult.message?.toLowerCase() ?? "";
            if (!msg.includes("used up") && !msg.includes("empty") && !msg.includes("gone")) {
                this.showTemporaryMessage(`${inventoryItem.itemName} was used up.`);
            }
        } else {
            // Keep the item, store the post-use quantity
            inventoryItem.quantity = qtyAfter > 0 ? qtyAfter : 1;

            // Update art AFTER quantity is final
            if (useResult.artChanged) {
                console.log(
                    `[ItemActionHandler] Art changed for ${inventoryItem.itemId}. Telling InventoryManager to update display.`
                );
                this.inventoryManager.updateItemDisplay(inventoryItem.itemId);
            }
        }

        // Single UI refresh (avoid duplicates)
        this.inventoryManager.refreshInventoryUI?.();

        // ─── Emit reconciled event payload ─────────────────────────────────────
        const playerInstance = this.scene.registry.get("player") as Player | undefined;
        const eventPayload: ItemUsedEventPayload = {
            itemId: inventoryItem.itemId,
            px: playerInstance?.x ?? this.scene.input.activePointer.worldX,
            py: playerInstance?.y ?? this.scene.input.activePointer.worldY,
            itemConfig: AllItemConfigs[inventoryItem.itemId],
            useResult: { ...useResult, newStatus: effectiveStatus },
            target: target ?? null,
            player: playerInstance ?? null,
        };

        console.log(
            `[ItemActionHandler] PRE-EMIT 'itemUsedFromInventory'. Payload for ${eventPayload.itemId}:`,
            eventPayload
        );
        GlobalEvents.emit("itemUsedFromInventory", eventPayload);
        console.log(
            `[ItemActionHandler] POST-EMIT 'itemUsedFromInventory' for ${eventPayload.itemId}`
        );
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    private showTemporaryMessage(message: string): void {
        if (!this.scene || !this.scene.scale) return;

        const messageText = this.scene.add
            .text(this.scene.scale.width / 2, this.scene.scale.height - 100, message, {
                fontSize: "16px",
                fontFamily: '"Verdana", "Arial", sans-serif',
                color: "#ffffff",
                backgroundColor: "rgba(0,0,0,0.75)",
                padding: { x: 10, y: 5 },
                align: "center",
                wordWrap: { width: this.scene.scale.width - 40, useAdvancedWrap: true },
            })
            .setOrigin(0.5)
            .setDepth(Phaser.Math.MAX_SAFE_INTEGER)
            .setScrollFactor(0);

        this.scene.time.delayedCall(2500, () => {
            if (messageText.scene) {
                this.scene.tweens.add({
                    targets: messageText,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => messageText.destroy(),
                });
            } else {
                messageText.destroy();
            }
        });
    }
}
