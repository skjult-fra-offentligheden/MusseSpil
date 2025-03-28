import Phaser from 'phaser';
import { Button } from "../scripts/buttonScript";
import { UIManager } from '../managers/UIManager';
import { InventoryManager } from '../managers/itemMananger';
import { ItemActionHandler } from "../scenes/ToturialScene/ItemActionHandler";
import { Item } from "../classes/itemDatastruct";
export class UIGameOverlay extends Phaser.Scene {
    private itemSlots: Phaser.GameObjects.Rectangle[] = [];
    private itemIcons: Phaser.GameObjects.Sprite[] = [];
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

    constructor() {
        super({ key: "UIGameScene", active: false });
    }

    create(): void {
        console.log("I am in the UI overlay. It actually ran");

        const uiManager = UIManager.getInstance();
        this.createLimitedSlots();

        // Define UI buttons
        const buttonsConfig = [
            { text: "Inventory", callback: () => uiManager.showInventory(), key: 'I' },
            { text: "Guide", callback: () => uiManager.showGuide(), key: 'G' },
            { text: "Clue Journal", callback: () => uiManager.showJournal(), key: 'J' },
            { text: "Accuse", callback: () => uiManager.showAccusation(), key: 'A' }
        ];

        const buttonWidth = 140, buttonHeight = 40, spacing = 10;
        const totalWidth = buttonsConfig.length * buttonWidth + (buttonsConfig.length - 1) * spacing;
        const startX = (this.scale.width - totalWidth) / 2 + buttonWidth / 2;

        buttonsConfig.forEach((btnConfig, index) => {
            const x = startX + index * (buttonWidth + spacing);
            const y = 50;
            new Button(this, { x, y, width: buttonWidth, height: buttonHeight },
                { text: btnConfig.text, textColor: '#ffffff', strokeColor: '#000000', fontSize: 24, fontFamily: "Arial", align: "center" },
                { backgroundColor: 0x000343, transparency: 0.8 },
                { linewidth: 2, linecolor: 0xffffff }, btnConfig.callback, btnConfig.key);
        });

        this.inventoryManager = InventoryManager.getInstance();
        const mainScene = this.scene.get('ToturialScene');
        if (mainScene) {
            mainScene.events.on('inventoryUpdated', this.updateSlotContents, this);
        } else {
            console.warn("UIGameOverlay: ToturialScene not found, inventory updates may not work.");
        }

        this.itemActionHandler = new ItemActionHandler(this);
        this.updateSlotContents(); // ✅ Ensure UI updates at start

        //Må ikke være space da den også bruges af cursor
        this.input.keyboard.on('keydown-N', () => {
            if (this.activeItem) {
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
        }
    }

    private updateSlotContents = () => {
        console.log("Updating slot contents...");
        // Remove previous icons.
        this.itemIcons.forEach(icon => icon.destroy());
        this.itemIcons = [];

        const items = this.inventoryManager.getItems().slice(0, 5);
        console.log("Current inventory items:", items);

        this.itemSlots.forEach((slot, index) => {
            if (items[index]) {
                console.log(`Placing item ${items[index].iconKey} in slot ${index}`);
                const icon = this.add.sprite(
                    slot.x - this.slotConfig.width / 2,
                    slot.y + this.slotConfig.height / 2,
                    items[index].iconKey!
                )
                    .setOrigin(0.5)
                    .setScale(1)
                    .setInteractive()
                    .setScrollFactor(0);

                icon.on('pointerdown', () => {
                    this.handleItemClick(items[index], icon);
                });

                // If this item is the active one, reapply the selection style.
                if (this.activeItem && this.activeItem.itemId === items[index].itemId) {
                    icon.setTint(0xffff00);
                    slot.setStrokeStyle(4, 0x0000ff).setScale(1.1);
                    // Update the activeItemIcon reference in case it changed.
                    this.activeItemIcon = icon;
                }

                this.itemIcons.push(icon);
            }
        });
    };

    public updateInventoryDisplay() {
        this.updateSlotContents();
    }

    private handleItemClick(item: Item, icon: Phaser.GameObjects.Sprite) {
        console.log(`🖱️ Selected item: ${item.itemId}`);
        const index = this.itemIcons.findIndex(i => i === icon);

        if (this.activeItemIcon && this.activeItem && this.activeItem.itemId === item.itemId) {
            console.log(`Item ${item.itemId} is already active. Deselecting.`);
            icon.clearTint();
            this.itemSlots[index].setStrokeStyle(2, 0xffffff).setScale(1);
            this.activeItemIcon = null;
            this.activeItem = null;
            return;
        }


        if (this.activeItem && this.activeItem.itemId !== item.itemId) {
            const prevIndex = this.itemIcons.findIndex(i => i === this.activeItemIcon);
            if (prevIndex !== -1) {
                this.itemSlots[prevIndex]
                    .setStrokeStyle(2, 0xffffff)
                    .setScale(1);
                this.activeItemIcon?.clearTint();
            }
        }

        this.activeItem = item;
        this.activeItemIcon = icon;
        this.activeItemIcon.setTint(0xffff00);
        this.itemSlots[index].setStrokeStyle(4, 0x0000ff).setScale(1.1);
    }

    private useActiveItem() {
        this.itemActionHandler.useItem(this.activeItem);
        this.updateSlotContents(); 
    }
}
