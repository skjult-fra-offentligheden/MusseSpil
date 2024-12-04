import Phaser from 'phaser';
import { InventoryManager } from '../../managers/itemMananger';
import { Item } from '../../classes/itemDatastruct';
import { Button } from "../../scripts/buttonScript"
export class InventoryScene extends Phaser.Scene {
    private inventoryManager!: InventoryManager;
    private items: Item[] = [];

    constructor() {
        super({ key: 'InventoryScene' });
    }

    init(data: { inventoryManager: InventoryManager }) {
        this.inventoryManager = data.inventoryManager;
    }

    create() {
        // Retrieve items from the inventory manager
        this.items = this.inventoryManager.getItems();

        // Display the inventory background or UI elements
        this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000080,
            0.8
        );

        // Display the items
        this.displayItems();

        // Close the inventory on key press (e.g., 'I' key)
        this.input.keyboard.on('keydown-I', () => {
            this.scene.stop();
            this.scene.resume('Game');
        });
    }

    private displayItems() {
        const itemSize = 64; // Size of item icons
        const padding = 10;  // Padding between items
        const columns = 5;   // Number of items per row

        // Starting position for the grid
        const startX = 100;
        const startY = 100;

        this.items.forEach((item, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            const x = startX + col * (itemSize + padding);
            const y = startY + row * (itemSize + padding);

            // Display the item's icon
            console.log("inventory scene " + item.iconKey);
            const icon = this.add.image(x, y, item.iconKey).setOrigin(0, 0);
            icon.setSize(48, 48);

            // Optionally, display the item's quantity
            if (item.quantity > 1) {
                this.add.text(x + itemSize - 16, y + itemSize - 16, item.quantity.toString(), {
                    fontSize: '16px',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                }).setOrigin(1, 1);
            }

            // Optionally, make the icon interactive to show item details
            icon.setInteractive();
            icon.on('pointerdown', () => {
                this.showItemDetails(item);
            });
        });

        // Create "Back to Game" button using the Button class
        const backButtonConfig = {
            text: "Back to Game",
            textColor: '#ffffff',
            strokeColor: '#000000',
            fontSize: 24,
            fontFamily: "Arial Black",
            align: "center" // Changed to center for better alignment
        };
        const backButtonRect = { backgroundColor: 0x000343, transparency: 0.8, fill: "white" };
        const backButtonOutline = { linewidth: 5, linecolor: 0xffffff };
        const backButtonSize = { x: this.scale.width * 0.75, y: this.scale.height * 0.85, width: 200, height: 50 };

        new Button(this, backButtonSize, backButtonConfig, backButtonRect, backButtonOutline, () => this.returnToGame(), "A");

    }

    private showItemDetails(item: Item) {
        // Display item details, e.g., in a panel or modal
        const detailsBackground = this.add.rectangle(400, 300, 400, 300, 0x222222, 0.9);
        const itemNameText = this.add.text(400, 250, item.itemName, {
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);

        const itemDescriptionText = this.add.text(400, 300, item.itemDescription, {
            fontSize: '16px',
            color: '#ffffff',
            wordWrap: { width: 350 },
        }).setOrigin(0.5);

        // Close the details panel on pointer down
        detailsBackground.setInteractive();
        detailsBackground.on('pointerdown', () => {
            detailsBackground.destroy();
            itemNameText.destroy();
            itemDescriptionText.destroy();
        });
    }

    private returnToGame(): void {
        this.scene.stop();
        this.scene.resume("Game");
    }

}
