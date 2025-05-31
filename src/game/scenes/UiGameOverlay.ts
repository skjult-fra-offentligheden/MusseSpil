import Phaser from 'phaser';
import { UIManager } from '../managers/UIManager';
import { InventoryManager } from '../managers/itemMananger';
import { ItemActionHandler } from "../scenes/ToturialScene/ItemActionHandler";

import { Item } from "../classes/itemDatastruct";


export class UIGameOverlay extends Phaser.Scene {
    private itemSlots: Phaser.GameObjects.Rectangle[] = [];
    private itemIcons: (Phaser.GameObjects.Sprite | null)[] = []
    private itemsInSlots: (Item | null)[] = []; // Keep track of which item is in which slot visually
    private slotConfig = {
        width: 50,
        height: 50,
        spacing: 15,
        offsetX: 30,
        offsetY: 100
    };
    private activeItem: Item | null = null;
    private activeItemIcon: Phaser.GameObjects.Sprite | null = null;
    private itemActionHandler: ItemActionHandler;
    private inventoryManager: InventoryManager;

    constructor() {
        super({ key: "UIGameScene", active: false });
    }

    preload() {
        this.load.image('icon_inventory', 'assets/button/inventory.png');
        this.load.image('icon_guide', 'assets/button/Guide.png');
        this.load.image('icon_journal', 'assets/button/ClueJournal.png');
        this.load.image('icon_accuse', 'assets/button/accuse.png');
    }

    create(): void {
        console.log("I am in the UI overlay. It actually ran");

        const uiManager = UIManager.getInstance();
        this.createLimitedSlots();

        // Define UI buttons
        const iconButtonsConfig = [
            // Use the keys from your preloaded images
            { iconKey: "icon_inventory", callback: () => uiManager.showInventory(), keybind: 'I', tooltip: 'Inventory (I)' },
            { iconKey: "icon_guide", callback: () => uiManager.showGuide(), keybind: 'G', tooltip: 'Guide (G)' },
            { iconKey: "icon_journal", callback: () => uiManager.showJournal(), keybind: 'J', tooltip: 'Clue Journal (J)' },
        //    { iconKey: "icon_accuse", callback: () => uiManager.showAccusation(), keybind: 'A', tooltip: 'Make Accusation (A)' }
        ];

        const iconSize = 78; // Adjust size as needed
        const desiredIconWidth = 78;  // Set the target width in pixels (e.g., 48px)
        const desiredIconHeight = 78;
        const spacing = 15;
        const totalButtonWidth = iconButtonsConfig.length * desiredIconWidth + (iconButtonsConfig.length - 1) * spacing;
        const startX = (this.scale.width - totalButtonWidth) / 2 + desiredIconWidth / 2;
        const topY = 40; // Adjust vertical position

        iconButtonsConfig.forEach((btnConfig, index) => {
            const x = startX + index * (iconSize + spacing);
            const y = topY;

            const iconButton = this.add.image(x, y, btnConfig.iconKey)
                .setOrigin(0.5) // Center the icon
                .setInteractive({ useHandCursor: true }) // Make it clickable, change cursor on hover
                .setScrollFactor(0); // Keep UI static on screen

            // Adjust icon display size if needed (optional)
            iconButton.setDisplaySize(desiredIconWidth, desiredIconHeight);

            // Click Action
            iconButton.on('pointerdown', () => {
                // Optional: Add visual feedback for click (e.g., scale down slightly)
                btnConfig.callback(); // Call the UIManager function
            });

            iconButton.on('pointerup', () => {
            });
            this.input.on('pointerup', () => { // Handles cases where pointer moves off before releasing
            });


            // Optional: Hover Effects (Tinting)
            iconButton.on('pointerover', () => {
                iconButton.setTint(0xDDDDDD); // Lighten tint on hover
                // TODO: Display tooltip (requires a text object, managed visibility)
            });
            iconButton.on('pointerout', () => {
                iconButton.clearTint();
                // TODO: Hide tooltip
            });

            if (btnConfig.keybind) {
                this.input.keyboard.on(`keydown-${btnConfig.keybind}`, btnConfig.callback);
            }
        });

        this.inventoryManager = InventoryManager.getInstance();
        this.itemActionHandler = new ItemActionHandler(this);
        this.updateSlotContents(); // Initial update
        const mainScene = this.scene.get('ToturialScene') as import('../scenes/ToturialScene').ToturialScene;;
        if (mainScene) {
            mainScene.events.on('inventoryUpdated', this.updateSlotContents, this);
        } else {
            console.warn("UIGameOverlay: ToturialScene not found, inventory updates may not work.");
        }



        //Må ikke være space da den også bruges af cursor
        this.input.keyboard.on('keydown-SPACE', () => {
            if (mainScene?.dialogueManager?.isDialogueActive()) {
                console.log("[UIGameOverlay] Dialogue active, ignoring spacebar for item use."); // Optional log
                return; // Stop processing this key press in the overlay
            }

            if (this.activeItem) {
                //defer the UI update
                this.useActiveItem();
            } else {
                console.warn("⚠️ No item selected to use!");
            }
        });
    }

    private createLimitedSlots() {
        const rightEdge = this.scale.width - this.slotConfig.offsetX;
        for (let i = 0; i < 5; i++) {
            const slot = this.add.rectangle(
                rightEdge,
                this.slotConfig.offsetY + (i * (this.slotConfig.height + this.slotConfig.spacing)),
                this.slotConfig.width,
                this.slotConfig.height,
                0x4a4a4a, 0.8
            )
                .setStrokeStyle(2, 0xffffff)
                .setOrigin(1, 0)
                .setScrollFactor(0);

            this.itemSlots.push(slot);
            this.itemIcons.push(null); // Initialize icon array with nulls
            this.itemsInSlots.push(null); // Initialize item tracking array
        }
    }

    private updateSlotContents = () => {
        console.log("Updating slot contents...");
        // Remove previous icons.
        console.log("Updating slot contents (Optimized)...");
        const currentItems = this.inventoryManager.getItems().slice(0, 5);
        console.log("Current inventory items:", currentItems);


        if (this.activeItemIcon) {
            const prevIndex = this.itemsInSlots.findIndex(item => item?.itemId === this.activeItem?.itemId);
            if (prevIndex !== -1) {
                this.itemSlots[prevIndex]?.setStrokeStyle(2, 0xffffff);
                this.activeItemIcon?.clearTint();
            }
            // Don't nullify activeItem itself here, just the visual representation state
            // We will re-apply it below if the item is still present.
        }
        // Reset activeItemIcon reference, it will be reassigned if needed
        this.activeItemIcon = null;
        // ----------------------------------------------------


        for (let i = 0; i < this.itemSlots.length; i++) {
            const slot = this.itemSlots[i];
            const newItem = currentItems[i] || null; // Get the item for this slot, or null if none
            let currentIcon = this.itemIcons[i];

            if (newItem) {
                // --- Item should be in this slot ---
                if (currentIcon) {
                    // Icon exists: Update texture if needed, ensure visible and interactive
                    if (currentIcon.texture.key !== newItem.iconKey) {
                        currentIcon.setTexture(newItem.iconKey!);
                    }
                    currentIcon.setVisible(true).setInteractive();
                    // Ensure the listener points to the *new* item data for this slot
                    currentIcon.off('pointerdown'); // Remove previous listener
                    currentIcon.on('pointerdown', () => {
                        this.handleItemClick(newItem, currentIcon!); // Use newItem here
                    });

                } else {
                    // Icon doesn't exist: Create it
                    console.log(`Creating icon for ${newItem.iconKey} in slot ${i}`);
                    currentIcon = this.add.sprite(
                        slot.x - this.slotConfig.width / 2,
                        slot.y + this.slotConfig.height / 2,
                        newItem.iconKey!
                    )
                        .setOrigin(0.5)
                        .setInteractive()
                        .setScrollFactor(0);

                    currentIcon.on('pointerdown', () => {
                        this.handleItemClick(newItem, currentIcon!); // Use newItem here
                    });
                    this.itemIcons[i] = currentIcon; // Store the new icon
                }

                // --- Apply active item styling if this is the active item ---
                if (this.activeItem && this.activeItem.itemId === newItem.itemId) {
                    console.log(`Re-applying active style to ${newItem.itemId} in slot ${i}`);
                    currentIcon.setTint(0xffff00);
                    slot.setStrokeStyle(4, 0x0000ff).setScale(1.1);
                    this.activeItemIcon = currentIcon; // Update active icon reference
                } else {
                    // Ensure non-active items in this slot don't have active styling
                    // (This check might be redundant if we reset all styles at the start,
                    // but safer to be explicit).
                    if (currentIcon !== this.activeItemIcon) { // Avoid clearing tint on the just-set active icon
                        currentIcon.clearTint();
                        // Slot style is handled below for empty slots or non-active items
                    }
                }

            } else {
                // --- No item should be in this slot ---
                if (currentIcon) {
                    // Icon exists: Hide it and disable interaction
                    console.log(`Hiding icon in slot ${i}`);
                    currentIcon.setVisible(false).disableInteractive();
                    currentIcon.off('pointerdown'); // Remove listener
                    // Optional: could destroy here if items rarely reappear, but hiding is faster
                    // currentIcon.destroy();
                    // this.itemIcons[i] = null;
                }
                // Ensure slot style is reset if it's not holding the active item
                slot.setStrokeStyle(2, 0xffffff).setScale(1);
            }

            // Ensure slot style is default if it's not the active item's slot
            if (!this.activeItem || !newItem || this.activeItem.itemId !== newItem.itemId) {
                slot.setStrokeStyle(2, 0xffffff).setScale(1);
            }

            // Update the tracking array
            this.itemsInSlots[i] = newItem;
        }
        // Final check: If activeItem exists but isn't in the first 5 slots anymore, clear its visual selection state
        if (this.activeItem && !this.itemsInSlots.some(item => item?.itemId === this.activeItem?.itemId)) {
            console.log(`Active item ${this.activeItem.itemId} is no longer in displayed slots. Clearing selection.`);
            // The activeItemIcon should be null already from the reset at the start
            // We just need to ensure no slot has the active style
            this.itemSlots.forEach(s => s.setStrokeStyle(2, 0xffffff).setScale(1));
            // Optionally, you might want to nullify this.activeItem itself here if it's truly gone
            // this.activeItem = null;
        }
    };

    public updateInventoryDisplay() {
        this.updateSlotContents();
    }

    private handleItemClick(item: Item, icon: Phaser.GameObjects.Sprite) {
        console.log(`🖱️ Selected item: ${item.itemId}`);
        const currentItemIndex = this.itemsInSlots.findIndex(i => i?.itemId === item.itemId);

        if (this.activeItem && this.activeItem.itemId === item.itemId) {
            // Item is already active, deselect it
            console.log(`Deselecting active item: ${item.itemId}`);
            icon.clearTint();
            if (currentItemIndex !== -1) {
                this.itemSlots[currentItemIndex].setStrokeStyle(2, 0xffffff).setScale(1);
            }
            this.activeItemIcon = null;
            this.activeItem = null;
            return;
        }

        // Deselect previous item visually if there was one
        if (this.activeItem && this.activeItemIcon) {
            const previousItemIndex = this.itemsInSlots.findIndex(i => i?.itemId === this.activeItem?.itemId);
            console.log(`Deselecting previous item: ${this.activeItem.itemId} at index ${previousItemIndex}`);
            if (previousItemIndex !== -1) {
                this.itemSlots[previousItemIndex]?.setStrokeStyle(2, 0xffffff).setScale(1);
            }
            this.activeItemIcon.clearTint();
        }

        // Select the new item
        console.log(`Selecting new active item: ${item.itemId}`);
        this.activeItem = item;
        this.activeItemIcon = icon;
        this.activeItemIcon.setTint(0xffff00);
        if (currentItemIndex !== -1) {
            this.itemSlots[currentItemIndex].setStrokeStyle(4, 0x0000ff).setScale(1.1);
        } else {
            console.warn("Clicked item not found in tracked slots - visual selection might fail.");
        }
    }

    private useActiveItem() {
        if (!this.activeItem) return; // Guard clause

        const itemToUse = this.activeItem; // Store ref in case it changes mid-logic

        this.itemActionHandler.useItem(itemToUse);

    }
}
