import Phaser from 'phaser';
import { InventoryManager } from '../../managers/itemMananger';
import { Item } from '../../classes/itemDatastruct';
import { Button } from "../../scripts/buttonScript"
export class InventoryScene extends Phaser.Scene {
    private inventoryManager!: InventoryManager;
    private items: Item[] = [];
    private originScene: string;

    constructor() {
        super({ key: 'InventoryScene' });
    }

    init(data: { inventoryManager: InventoryManager, originScene: string }) {
        this.inventoryManager = data.inventoryManager;
        this.originScene = data.originScene;
    }

    create() {
        // Retrieve items from the inventory manager
        try {
            this.items = this.inventoryManager.getItems();
        } catch (error) {
            console.error("Kunne ikke få items fra inventory manager")
            this.items = [];
        }

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
            this.returnToGame()
        });
    }

    private displayItems() {
        const itemSize = 64; // Size of item icons
        const padding = 10;  // Padding between items
        const columns = 5;   // Number of items per row

        const topClearingForUiElements = this.scale.height / 5;
        // Starting position for the grid
        const startX = this.scale.width/5;
        const startY = topClearingForUiElements + this.scale.height / 5;

        /* 
        64*5 cols + 10*50 = 370, så hvis skærm er mindre end 370, så reducer antallet af items og padding.
        64*4 rows + 10*4 = 276, så hvis skærm er mindre end 276 gør de nederste del af skærmen scrollbar. top items 1,2,3 skal altid være synlige.


        Overview over hvordan det skal se ud.
          1|2|3      main clues 
        ---------
        a|b|c|d|e    all items.
        ---------
        f|g|h|i|j
        ---------
        k|l|m|n|o

            |
         scroll ned hvis mere end 15 items
        */

        this.items.forEach((item, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            const x = startX + col * (itemSize + padding);
            const y = startY + row * (itemSize + padding);

            // Display the item's icon
            console.log("inventory scene 1" + item.iconKey + " making it appear  " + x+ " " + y);
            const icon = this.add.image(x, y, item.iconKey!).setOrigin(0, 0).setDepth(100)
            console.log("inventory scene added icon " + icon);

            icon.setSize(itemSize-padding, itemSize-padding);
            console.log("inventory scene all items " + 
                " item size : " + item.quantity! + 
                " item size : "  + itemSize
            );

            // ikke her
            if (item.quantity! > 1) {
                this.add.text(x + itemSize - 16, y + itemSize - 16, item.quantity!.toString(), {
                    fontSize: '16px',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                }).setOrigin(1, 1).setDepth(100);
            }
            console.log("inventory scene 4" + item.iconKey);


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

    //Skal resume den scene den kom fra.
    private returnToGame(): void {
        this.scene.stop();
        console.log("in inventory scene, returning to the scene " + this.originScene);
        //hvis den fejler i at få den oprindelige scene, skal der stadig være en måde man skal kunne få den til at emitte at scenen er lukket.
        this.scene.resume(this.originScene);
    }

}
