import Phaser from 'phaser';
import { InventoryManager } from '../../managers/itemMananger';
import { Item } from '../../classes/itemDatastruct';
import { Button } from "../../scripts/buttonScript"
export class InventoryScene extends Phaser.Scene {
    private inventoryManager!: InventoryManager;
    private originScene!: string;
    private items: Item[] = [];
    private itemSlots: Phaser.GameObjects.Sprite[] = [];
    private itemIcons: Phaser.GameObjects.Image[] = [];

    private readonly COLS = 5;
    private readonly ROWS = 4;
    private readonly SLOT = 64;
    private readonly GAP = 6;
    private readonly VISIBLE_ROWS = 4;
    private readonly ITEM_ICON_SIZE = 48;
    private readonly PANEL_PADDING_X = 20;
    private readonly PANEL_PADDING_Y = 64;
    private readonly SLOT_DISPLAY_SIZE = 64;

    private readonly EXTRA_PANEL_WIDTH = 200;
    private readonly EXTRA_PANEL_HEIGHT = 50; // How many extra pixels taller? Adjust this.
    private readonly DETAIL_AREA_FIXED_WIDTH = 220;
    constructor() {
        super({ key: 'InventoryScene' });
    }

    preload() {
        this.load.image('inv-frame', 'assets/inventorySceneImgs/Inv-frame.png');
        this.load.image('slot-empty', 'assets/inventorySceneImgs/inventory_empty_slot.png');
        //this.load.image('slot-hover', 'assets/ui/slot-hover.png');
    //    this.load.bitmapFont('pico8', 'assets/fonts/pico8.png', 'assets/fonts/ReplaceTheSun.tff');
    }

    init(data: { inventoryManager: InventoryManager, originScene: string }) {
        this.inventoryManager = data.inventoryManager;
        this.originScene = data.originScene;
        this.itemSlots = [];
        this.itemIcons = [];
    }

    create() {
        this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.7);
        // --- Panel Sizing (Uses SLOT_DISPLAY_SIZE for calculations) ---
        const requiredGridWidth = (this.COLS * this.SLOT_DISPLAY_SIZE) + ((this.COLS - 1) * this.GAP);
        const requiredGridHeight = (this.VISIBLE_ROWS * this.SLOT_DISPLAY_SIZE) + ((this.VISIBLE_ROWS - 1) * this.GAP);
        const panelContentHeight = requiredGridHeight;
        const panelContentWidth = requiredGridWidth + this.GAP * 3 + this.DETAIL_AREA_FIXED_WIDTH; // Recalculate or ensure it's available here
        const PANEL_W = panelContentWidth + 2 * this.PANEL_PADDING_X + this.EXTRA_PANEL_WIDTH; // Add padding + extra space
        const PANEL_H = panelContentHeight + 2 * this.PANEL_PADDING_Y + this.EXTRA_PANEL_HEIGHT;

 const panel = this.add.nineslice(
     this.scale.width * 0.5, this.scale.height * 0.5, 'inv-frame', undefined,
     PANEL_W, PANEL_H, 18, 18, 18, 18
 ).setOrigin(0.5);

        // --- Title ---
        this.add.text(panel.x, panel.y - panel.displayHeight / 2 + 30, 'INVENTORY', {
            fontSize: '24px', color: '#fce5a2', fontStyle: 'bold'
        }).setOrigin(0.5);

        // --- Calculate Inner Bounds for Content ---
        const panelInnerX = panel.x - panel.displayWidth / 2 + this.PANEL_PADDING_X;
        const panelInnerY = panel.y - panel.displayHeight / 2 + this.PANEL_PADDING_Y;
        const panelInnerWidth = panel.displayWidth - (2 * this.PANEL_PADDING_X); // Usable width inside padding

        // --- Grid Position & Size (Uses SLOT_DISPLAY_SIZE for calcs) ---
        const gridAreaWidth = (this.COLS * this.SLOT_DISPLAY_SIZE) + ((this.COLS - 1) * this.GAP);
        const gridAreaHeight = (this.VISIBLE_ROWS * this.SLOT_DISPLAY_SIZE) + ((this.VISIBLE_ROWS - 1) * this.GAP);
        const gridAreaY = panelInnerY + 20;

        //const panelContentWidth = requiredGridWidth + this.GAP * 3 + this.DETAIL_AREA_FIXED_WIDTH; // Recalculate or ensure it's available here
        const totalEmptySpaceX = panelInnerWidth - panelContentWidth; // How much space is left over?
        const centeringOffsetX = totalEmptySpaceX > 0 ? totalEmptySpaceX / 2 : 0; // Calculate half the empty space for centering
        const gridAreaX = panelInnerX + centeringOffsetX; // Start grid after the centering offset

        // --- Create Grid Slots (Loop uses SLOT_DISPLAY_SIZE + GAP step) ---
        console.log(`Creating grid: ${this.COLS}x${this.VISIBLE_ROWS} at (${gridAreaX.toFixed(1)}, ${gridAreaY.toFixed(1)}), SlotDisplay:${this.SLOT_DISPLAY_SIZE}, Gap:${this.GAP}`);
        for (let r = 0; r < this.VISIBLE_ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                // Position based on the desired display size + gap
                const slotX = gridAreaX + c * (this.SLOT_DISPLAY_SIZE + this.GAP);
                const slotY = gridAreaY + r * (this.SLOT_DISPLAY_SIZE + this.GAP);

                console.log(`  Slot[${r},${c}] at (${slotX.toFixed(1)}, ${slotY.toFixed(1)}), Step H/V: ${this.SLOT_DISPLAY_SIZE + this.GAP}`);

                // Create the sprite using the loaded (large) image key
                const slotSprite = this.add.sprite(slotX, slotY, 'slot-empty')
                    .setOrigin(0) // Keep origin top-left for positioning
                    .setInteractive({ useHandCursor: true })
                    .setData('gridIndex', { row: r, col: c });

                // ---> RESIZE THE DISPLAYED SPRITE <---
                slotSprite.setDisplaySize(this.SLOT_DISPLAY_SIZE, this.SLOT_DISPLAY_SIZE);
                // ------------------------------------

                // Hover/Out events (check texture existence)
                slotSprite.on('pointerover', () => {
                    if (this.textures.exists('slot-hover')) slotSprite.setTexture('slot-hover').setDisplaySize(this.SLOT_DISPLAY_SIZE, this.SLOT_DISPLAY_SIZE); // Re-apply size on texture change
                    else slotSprite.setTint(0xDDDDDD);
                });
                slotSprite.on('pointerout', () => {
                    // Reset to original texture AND size
                    slotSprite.setTexture('slot-empty').setDisplaySize(this.SLOT_DISPLAY_SIZE, this.SLOT_DISPLAY_SIZE).clearTint();
                });

                this.itemSlots.push(slotSprite);
            }
        }
        console.log(`Created ${this.itemSlots.length} slot sprites.`);


        // --- Detail Area (Calculations use SLOT_DISPLAY_SIZE) ---
        const detailAreaX = gridAreaX + gridAreaWidth + this.GAP * 2; // Position it after the grid + gaps
        const detailAreaY = gridAreaY;
        const detailAreaWidth = this.DETAIL_AREA_FIXED_WIDTH; // Use the new constant!
        const detailAreaHeight = gridAreaHeight; // Match grid height
        //const detailAreaWidth = 300;
        //const detailAreaHeight = 300;

        // Detail Pane Background
        const dPane = this.add.nineslice(detailAreaX + detailAreaWidth / 2, detailAreaY + detailAreaHeight / 2,
            'slot-empty', undefined, detailAreaWidth, detailAreaHeight, 8, 8, 8, 8).setOrigin(0.5);
        // ---> ALSO RESIZE the detail pane background if using slot texture <---
        // dPane.setDisplaySize(detailAreaWidth, detailAreaHeight); // Not needed for Nineslice if width/height provided

        // Detail Contents (Positioned relative to dPane)
        const detailIcon = this.add.image(dPane.x, dPane.y - detailAreaHeight * 0.25, '').setDisplaySize(this.SLOT_DISPLAY_SIZE, this.SLOT_DISPLAY_SIZE).setOrigin(0.5).setVisible(false); // Detail icon matches slot visual size
        const detailName = this.add.text(dPane.x, dPane.y + detailAreaHeight * 0.1, '', { fontSize: '18px', color: '#fce5a2', align: 'center', wordWrap: { width: detailAreaWidth - 20 } }).setOrigin(0.5).setVisible(false);
        const detailDescription = this.add.text(dPane.x, dPane.y + detailAreaHeight * 0.35, '', { fontSize: '14px', color: '#ffffff', align: 'left', wordWrap: { width: detailAreaWidth - 20 } }).setOrigin(0.5, 0).setVisible(false);

        // --- Function/Listeners for showing details ---
        const showItemDetails = (item: Item | null) => { /* ... implementation ... */
            if (item && item.iconKey) {
                if (this.textures.exists(item.iconKey)) { detailIcon.setTexture(item.iconKey).setVisible(true); }
                else { detailIcon.setVisible(false); console.warn(`Detail tex missing: ${item.iconKey}`); }
                detailName.setText(item.itemName || 'Unknown').setVisible(true);
                detailDescription.setText(item.itemDescription || '').setVisible(true);
            } else {
                detailIcon.setVisible(false); detailName.setVisible(false); detailDescription.setVisible(false);
            }
        };
        this.itemSlots.forEach(slot => {
            slot.on('pointerdown', () => {
                const icon = slot.getData('icon') as Phaser.GameObjects.Image | undefined;
                const itemData = icon?.getData('itemData') as Item | undefined;
                showItemDetails(itemData || null);
            });
        });

        // --- Populate Item Icons (Calculations use SLOT_DISPLAY_SIZE) ---
        this.items = this.inventoryManager.getItems();
        this.itemIcons = []; // Reset
        this.items.forEach((item, index) => {
            if (index >= this.itemSlots.length) return;
            const targetSlot = this.itemSlots[index];
            if (!item.iconKey || !this.textures.exists(item.iconKey)) { console.warn(`Item ${index} icon miss: ${item.iconKey}`); return; }

            // Center icon in the DISPLAYED slot area
            const iconX = targetSlot.x + this.SLOT_DISPLAY_SIZE / 2;
            const iconY = targetSlot.y + this.SLOT_DISPLAY_SIZE / 2;

            const itemIcon = this.add.image(iconX, iconY, item.iconKey)
                .setDisplaySize(this.ITEM_ICON_SIZE, this.ITEM_ICON_SIZE) // Items have their own size
                .setOrigin(0.5)
                .setData('itemData', item);
            targetSlot.setData('icon', itemIcon);
            this.itemIcons.push(itemIcon);
        });


        // --- Back Button --- (using custom Button script)
        const backButtonSize = { x: panel.x, y: panel.y + panel.displayHeight / 2 + 30, width: 200, height: 50 };
        new Button(this, backButtonSize,
            { text: "Back to Game", textColor: '#ffffff', fontSize: 24, align: 'center' },
            { backgroundColor: 0x000343, transparency: 0.9 }, { linewidth: 2, linecolor: 0xffffff },
            this.returnToGame
        );

        // --- Keyboard & Cleanup ---
        this.input.keyboard.off('keydown-I');
        this.input.keyboard.on('keydown-I', this.returnToGame, this);
        this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

        console.log("InvScene Create: Finished.");

    } // --- END OF CREATE ---

    private shutdown() {
        console.log("InventoryScene Shutting Down. Cleaning up...");
        // Destroy item icons explicitly to remove their listeners if they were interactive
        this.itemIcons.forEach(icon => icon.destroy());
        this.itemIcons = [];

        // Destroy slot sprites to remove their listeners
        this.itemSlots.forEach(slot => slot.destroy());
        this.itemSlots = [];


        // Remove keyboard listener
        this.input.keyboard.off('keydown-I', this.returnToGame, this);
    }

    //Skal resume den scene den kom fra.
    private returnToGame = () => { // Use arrow function to preserve 'this' context if needed
        console.log("Returning to scene:", this.originScene);
        if (this.scene.isSleeping(this.originScene)) {
            this.scene.wake(this.originScene);
        } else {
            this.scene.resume(this.originScene); // Fallback if not sleeping
        }
        this.scene.stop(); // Stop this inventory scene
    }
}
