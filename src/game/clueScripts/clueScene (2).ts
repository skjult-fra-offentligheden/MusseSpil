import Phaser from 'phaser';
import { ClueManager } from './clueManager'; // Adjust path if needed
import { Clue } from '../classes/clue';    // Adjust path if needed
import { GameState } from '../managers/GameState'; // Adjust path if needed
import { Suspect } from '../Accusation_scripts/suspect';
import { ClueCat, ICategorySwitcher } from "./journalTabs"; 
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs'
export class ClueJournal extends Phaser.Scene {
    private clueManager!: ClueManager;
    private originScene!: string;
    private gameState!: GameState;

    /* ---------- UI refs ---------- */
    private tabs!: Record<ClueCat, Phaser.GameObjects.Image>;
    private list!: Phaser.GameObjects.Container;
    private listMask!: Phaser.Display.Masks.GeometryMask;
    private preview!: Phaser.GameObjects.Container;

    /* ---------- State refs ---------- */
    private activeCat: ClueCat = 'evidence';
    private selectedSuspect: Suspect | null = null;
    private selectedClueId: number | string | null = null;

    /* ---------- constants ---------- */
    private readonly PANEL_W = 1200;
    private readonly PANEL_H = 660;
    private readonly ROW_H = 48;
    private readonly PAGE_X = 80;
    private readonly PAGE_Y = 150;
    private readonly PAGE_W = 885; // Total width of the inner content area
    private readonly PAGE_H = 425; // Total height of the inner content area
    private readonly GAP = (445 /2);      // Increased GAP slightly
    private readonly LIST_W = 445;  // Width of the left list panel
    // Calculated width for the right preview panel
    private get PREVIEW_W() { return this.PAGE_W - this.LIST_W - this.GAP; }

    // --- Text Styles (Make sure these offer good contrast) ---
    private readonly ACCUSE_BUTTON_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: '18px', color: '#ffffff', backgroundColor: '#8B0000', padding: { x: 10, y: 5 }
    };
    private readonly LIST_ROW_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: 'Arial', fontSize: '16px', color: '#161616' // Slightly off-white
    };
    private readonly SUSPECT_INFO_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
        // Using a darker color for better contrast on tan background
        fontSize: '14px', color: '#403020', wordWrap: { width: this.PREVIEW_W - 12 }, lineSpacing: 4
    };
    private readonly SUSPECT_TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
        // Using a darker color for better contrast
        fontSize: '20px', color: '#543d25', fontStyle: 'bold' // Dark Brown
    };
    private readonly CLUE_TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
        // Using a darker color for better contrast
        fontSize: '18px', color: '#543d25', wordWrap: { width: this.PREVIEW_W - 12 }, fontStyle: 'bold' // Dark Brown Bold
    };
    private readonly CLUE_BODY_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
        // Using a darker color for better contrast
        fontSize: '14px', color: '#403020', wordWrap: { width: this.PREVIEW_W - 12 }, lineSpacing: 4 // Dark Brown/Gray
    };
    private readonly PROMPT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: '16px', color: '#888888', align: 'center', wordWrap: { width: this.PREVIEW_W - 20 } // Gray prompt
    };
    constructor() { super({ key: 'ClueJournal' }); }

    preload() {
        // --- Keep your existing preload ---
        this.load.image('journal-frame', 'assets/journal_assets/journal_1000_625.png');
        this.load.image('evidence_tab-idle', 'assets/journal_assets/Evidence_idle_tab.png');
        this.load.image('evidence_tab-active', 'assets/journal_assets/Evidence_activity_tab.png');
        this.load.image('people_tab-active', 'assets/journal_assets/People_active_tab.png');
        this.load.image('people_tab-idle', 'assets/journal_assets/People_idle_tab.png');
        this.load.image('places_tab-idle', 'assets/journal_assets/Places_idle_tab.png');
        this.load.image('places_tab-active', 'assets/journal_assets/Places_active_tab.png');
        this.load.image('timeline_tab-idle', 'assets/journal_assets/Timeline_idle_tab.png');
        this.load.image('timeline_tab-active', 'assets/journal_assets/Timeline_activity_tab.png');
        this.load.image('accuse_tab-idle', 'assets/journal_assets/accuse_idle_tab.png');
        this.load.image('accuse_tab-active', 'assets/journal_assets/accuse_active_tab.png');
        // --- ADD Placeholder for Clue Preview ---
    }

    init(data: { clueManager: ClueManager; originScene: string }) {
        this.clueManager = data.clueManager;
        this.originScene = data.originScene;
        this.gameState = GameState.getInstance();
        this.activeCat = 'evidence';
        this.selectedSuspect = null;
        this.selectedClueId = null;
    }

    create() {
        this.add.rectangle(
            this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height,
            0x000000, 0.6
        ).setDepth(-1);

        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        this.add.nineslice(
            cx, cy, 'journal-frame', undefined,
            this.PANEL_W, this.PANEL_H, 48, 48, 48, 48
        ).setOrigin(0.5);

        const closeButtonX = cx + this.PANEL_W / 2 - 60; // Position inside top-right corner
        const closeButtonY = cy - this.PANEL_H / 2 + 60;

        const closeButton = this.add.text(closeButtonX, closeButtonY, 'X', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#A52A2A', // A nice, visible brown-red
            padding: { x: 12, y: 6 }
        })
            .setOrigin(0.5) // Center the 'X' in its background
            .setInteractive({ useHandCursor: true });

        // Set the button's action
        closeButton.on('pointerdown', () => this.close());

        // Add hover effects for better feedback
        closeButton.on('pointerover', () => closeButton.setBackgroundColor('#D2691E')); // A brighter color on hover
        closeButton.on('pointerout', () => closeButton.setBackgroundColor('#A52A2A')); // Return to normal color

        // --- END OF FIX ---

        this.createTabs(cx, cy);
        // ... the rest of the create() method continues here

        this.createTabs(cx, cy);

        // --- Calculate precise top-left corner of the INNER page area ---
        const pageAreaX = cx - this.PANEL_W / 2 + this.PAGE_X;
        const pageAreaY = cy - this.PANEL_H / 2 + this.PAGE_Y;

        /* ------------ Left List Panel ------------ */
        const listX = pageAreaX; // List starts at the left edge of the page area
        const listY = pageAreaY; // List starts at the top edge of the page area

        // Create and position the list container
        this.list = this.add.container(listX, listY);

        // Create the mask EXACTLY matching the list's intended area
        const maskGfx = this.make.graphics()
            .fillRect(listX, listY, this.LIST_W, this.PAGE_H); // Use precise coords and size
        this.listMask = maskGfx.createGeometryMask();
        this.list.setMask(this.listMask); // Apply mask

        // --- Debug: Draw the outline of the list area ---
        // this.add.graphics().lineStyle(1, 0x00ff00).strokeRect(listX, listY, this.LIST_W, this.PAGE_H);


        /* ------------ Right Preview Panel ------------ */
        // Calculate the X position for the preview panel
        const previewX = listX + this.LIST_W + this.GAP; // Position it AFTER the list + GAP
        const previewY = pageAreaY; // Align top with the list

        // Create and position the preview container
        this.preview = this.add.container(previewX, previewY);

        // --- Debug: Draw the outline of the preview area ---
        // this.add.graphics().lineStyle(1, 0xff0000).strokeRect(previewX, previewY, this.PREVIEW_W, this.PAGE_H);

        /* ------------ Initial Population & Input ------------ */
        this.switchCat(this.activeCat, true);
        this.setupInputHandlers();
        const originScene = this.scene.get(this.originScene);

        this.game.events.on('clueUpdated', this.handleClueUpdate, this);
        this.events.on('shutdown', () => {
            // Make sure to remove the listener from the same emitter you added it to.
            if (originScene) {
                originScene.events.off('clueUpdated', this.handleClueUpdate, this);
            }
        });

    }

    private handleClueUpdate(updatedClue: Clue) {
        console.log(`[ClueJournal] Heard 'clueUpdated' event for: ${updatedClue.id}`);

        // A) Refresh the main list if the updated clue is in the currently active category.
        if (this.activeCat === updatedClue.category) {
            console.log(`[ClueJournal] Category matches. Repopulating list.`);
            this.populateClueList(this.activeCat);
        }

        // B) Refresh the detail panel if the updated clue is the one being viewed.
        if (this.selectedClueId === updatedClue.id) {
            console.log(`[ClueJournal] Selected clue matches. Refreshing detail view.`);
            this.showClueDetail(updatedClue);
        }
    }

    private createTabs(cx: number, cy: number): void {
        // (Keep this function as it was in the previous correct version)
        const cats: ClueCat[] = ['people', 'places', 'evidence', 'timeline', 'accuse'];
        this.tabs = {} as Record<ClueCat, Phaser.GameObjects.Image>;

        cats.forEach((cat, i) => {
            const initialTextureKey = `${cat}_tab-${cat === this.activeCat ? 'active' : 'idle'}`;
            if (!this.textures.exists(initialTextureKey)) {
                console.error(`[Create Tabs] Texture key not found: ${initialTextureKey}`);
                return;
            }
            const btn = this.add.image(
                // Adjust X position calculation if tabs are misaligned
                cx - (this.PANEL_W * 0.4) + (i * (this.PANEL_W * 0.18)), // Example adjustment
                cy - this.PANEL_H / 2 + (this.PANEL_H * 0.145), // Adjust Y position if needed
                initialTextureKey
            )
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    if (cat == "timeline") {
                        this.openTimelineBoard()
                    } else { this.switchCat(cat)  }
                    
                });
            this.tabs[cat] = btn;
        });
    }

    private openTimelineBoard() {
        // give the tab its “active” art so UI still reacts
        this.activeCat = 'timeline';
        Object.entries(this.tabs).forEach(([c, img]) => {
            img.setTexture(`${c}_tab-${c === 'timeline' ? 'active' : 'idle'}`);
        });

        const allNpcConfigs = Object.values(AllNPCsConfigs);

        // 2. Map this complete list into the format the DragAbleClueScene expects.
        const npcDataForBoard = allNpcConfigs.map(npcConfig => {
            return {
                id: npcConfig.npcId,           // Use the NPC's unique ID
                name: npcConfig.displayName,   // Use the display name
                imageKey: npcConfig.textureKey // Use the texture atlas key as the image
            };
        });

        const allClues = this.clueManager.getAllClues().filter(clue => clue.discovered);

        // launch or wake the drag scene, passing the manager
        if (!this.scene.isActive('DragAbleClueScene')) {
            this.scene.launch('DragAbleClueScene', {
                clues: allClues,
                npcs: npcDataForBoard,
                originScene: this.scene.key      // let it know who to resume later
            });
        } else {
            this.scene.wake('DragAbleClueScene');
        }

        this.scene.bringToTop('DragAbleClueScene');
        this.scene.sleep(this.scene.key);

        // freeze the journal underneath (optional—remove if you prefer overlap)
        this.scene.pause();       // resumes when DragAbleClueScene calls .resume()
    }

    private setupInputHandlers(): void {
        // (Keep this function as it was in the previous correct version)
        const listStartY = this.list.y;
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
            // More robust check if pointer is over the list's visual area
            const listScreenBounds = this.list.getBounds(); // Get actual screen bounds
            if (Phaser.Geom.Rectangle.Contains(listScreenBounds, pointer.x, pointer.y)) {
                const contentHeight = this.list.getBounds().height; // Recalculate content height inside
                const maxScroll = Math.max(0, contentHeight - this.PAGE_H);
                // Prevent scrolling beyond content bounds
                this.list.y = Phaser.Math.Clamp(
                    this.list.y - deltaY * 0.5, // Adjust scroll speed if needed
                    listStartY - maxScroll,    // Most scrolled down point
                    listStartY                 // Original top point
                );
            }
        });
        this.input.keyboard.on('keydown-ESC', () => this.close());
        this.input.keyboard.on('keydown-J', () => this.close());
    }

    public switchCat(cat: ClueCat, force: boolean = false): void {
        if (!force && this.activeCat === cat) {
            return; // Do nothing if NOT forced and clicking the same tab
        }


        console.log(`--- Switching category from ${this.activeCat} to ${cat} ---`);
        this.activeCat = cat;
        this.selectedClueId = null;

        // Update tab visuals
        Object.entries(this.tabs).forEach(([c, img]) => {
            img.setTexture(`${c}_tab-${c === this.activeCat ? 'active' : 'idle'}`);
        });

        // Reset our own UI elements
        this.list.removeAll(true);
        this.clearPreview();

        // --- Main Logic Branch ---
        if (cat === 'accuse') {
            // Hide this scene's content containers
            this.list.setVisible(false);
            this.preview.setVisible(false);

            // Launch or wake the AccusationScene
            if (this.scene.isActive('AccusationScene')) {
                this.scene.wake('AccusationScene');
            } else {
                this.launchAccusationScene(); // Use a helper to keep this clean
            }
            this.scene.bringToTop('AccusationScene');

        } else { // Switching to 'people', 'places', or 'evidence'
            // Ensure AccusationScene is stopped or slept
            if (this.scene.isActive('AccusationScene')) {
                this.scene.sleep('AccusationScene');
            }

            // Show this scene's content containers
            this.list.setVisible(true);
            this.preview.setVisible(true);

            // Populate list and preview as normal
            this.populateClueList(cat);
            const firstClue = this.getCluesByCategory(cat).find(c => c.discovered);
            if (firstClue) {
                this.showClueDetail(firstClue);
            } else {
                this.showPromptInPreview(`No discovered items found for ${cat}.`);
            }
        }
    }

    public getActiveCategory(): ClueCat {
        return this.activeCat
    }

    private close() {
        // (Keep this function as it was)
        if (this.scene.isActive('AccusationScene')) {
            this.scene.stop('AccusationScene');
        }
        this.scene.stop();
        this.scene.resume(this.originScene);
    }

    private populateClueList(cat: ClueCat) {
        // (Keep this function as it was)
        const clues = this.getCluesByCategory(cat);
        clues.forEach((c, i) => this.buildClueRow(c, i));
        const listStartY = this.cameras.main.centerY - this.PANEL_H / 2 + this.PAGE_Y;
        this.list.y = listStartY; // Ensure scroll reset here too
    }

    private buildClueRow(clue: Clue, index: number) {
        // (Keep this function mostly as it was, ensure styles are correct)
        const rowY = index * this.ROW_H;
        const rowWidth = this.LIST_W;
        const row = this.add.container(0, rowY).setData('itemKey', clue.id);

        const bg = this.add.rectangle(rowWidth / 2, this.ROW_H / 2, rowWidth, this.ROW_H, 0xffffff, 0);
        const icoKey = clue.imageKey && this.textures.exists(clue.imageKey) ? clue.imageKey : null;
        const ico = this.add.sprite(6, this.ROW_H / 2, icoKey)
            .setOrigin(0, 0.5)
            .setDisplaySize(this.ROW_H * 0.7, this.ROW_H * 0.7);
        const txt = this.add.text(
            ico.x + ico.displayWidth + 8, // Increased spacing slightly
            this.ROW_H / 2,
            clue.title, this.LIST_ROW_STYLE // Use LIST_ROW_STYLE
        ).setOrigin(0, 0.5)
            .setAlpha(clue.discovered ? 1 : 0.4);

        row.add([bg, ico, txt])
            .setSize(rowWidth, this.ROW_H)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => { if (row.getData('itemKey') !== this.selectedClueId) bg.setFillStyle(0xffffff, 0.2) }) // Subtle hover
            .on('pointerout', () => { if (row.getData('itemKey') !== this.selectedClueId) bg.setFillStyle(0xffffff, 0) })
            .on('pointerdown', () => {
                if (clue.discovered) {
                    this.showClueDetail(clue);
                } else {
                    this.showPromptInPreview("This clue hasn't been discovered yet.");
                }
            });
        this.list.add(row);
    }

    private clearPreview() {
        // (Keep this function as it was)
        this.preview.removeAll(true);
    }

    private showPromptInPreview(message: string) {
        // (Keep this function as it was, ensure PROMPT_STYLE is used)
        this.clearPreview();
        const promptText = this.add.text(
            this.PREVIEW_W / 2, this.PAGE_H / 3,
            message, this.PROMPT_STYLE // Use defined style
        ).setOrigin(0.5);
        this.preview.add(promptText);
    }

    private showClueDetail(clue: Clue) {
        this.clearPreview();
        this.selectedClueId = clue.id;
        this.selectedSuspect = null;
        // const displacement_right = 0; // If you still need this for layout

        // --- Use the imageKey directly from the Clue object ---
        // This imageKey should have been set when the Clue was created,
        // ideally from itemConfig.getArt('small').
        const textureKey = (clue.imageKey && this.textures.exists(clue.imageKey))
            ? clue.imageKey
            : null;

        // Adjust position and scale for the preview panel
        // PREVIEW_W is the width of your preview area.
        const art = this.add.image(this.PREVIEW_W / 2, 80, textureKey) // Centered, Y=80
            .setOrigin(0.5, 0.5) // Center the image
            .setScale(1.5); // Adjust scale as needed for preview, maybe smaller than world sprite

        // Ensure the image doesn't overflow the preview area
        if (art.displayWidth > this.PREVIEW_W - 20) {
            art.displayWidth = this.PREVIEW_W - 20;
            art.scaleY = art.scaleX; // Maintain aspect ratio
        }
        if (art.displayHeight > 120) { // Max height for art
            art.displayHeight = 120;
            art.scaleX = art.scaleY;
        }


        let currentY = art.y + art.displayHeight / 2 + 20; // Start text below image

        const title = this.add.text(0, currentY, clue.title, this.CLUE_TITLE_STYLE)
            .setOrigin(0, 0); // Align text to top-left of its block
        currentY += title.getBounds().height + 10;

        const bodyText = `${clue.description}\n\nFound at: ${clue.foundAt || 'Unknown Location'}`;
        const body = this.add.text(0, currentY, bodyText, this.CLUE_BODY_STYLE)
            .setOrigin(0, 0);

        this.preview.add([art, title, body]);
        this.highlightListRow(clue.id);
    }


    private highlightListRow(key: string | number | null) {
        // (Keep this function as it was)
        this.list.getAll().forEach((rowContainer) => {
            if (!(rowContainer instanceof Phaser.GameObjects.Container)) return;
            const bg = rowContainer.getAt(0) as Phaser.GameObjects.Rectangle;
            if (!bg || typeof bg.setFillStyle !== 'function') return;
            if (rowContainer.getData('itemKey') === key) {
                bg.setFillStyle(0xffd700, 0.3); // Slightly less intense gold highlight
            } else {
                bg.setFillStyle(0xffffff, 0);
            }
        });
    }

    private getCluesByCategory(cat: ClueCat): Clue[] {
        // (Keep this function as it was)
        if (!this.clueManager) {
            console.error("ClueManager is not initialized!");
            return [];
        }
        return this.clueManager
            .getAllClues()
            .filter(c => (c.category as ClueCat) === cat)
            .sort((a, b) => {
                if (a.discovered !== b.discovered) {
                    return a.discovered ? -1 : 1;
                }
                return a.title.localeCompare(b.title);
            });
    }

    private launchAccusationScene(): void {
        const suspectsDataForScene: Record<string, Suspect> = Object.values(AllNPCsConfigs)
            .filter(npcConfig => npcConfig.isSuspect)
            .reduce((acc, npcConfig) => {
                // 2. Map the NPCConfig to the Suspect interface structure.
                const suspect: Suspect = {
                    id: npcConfig.npcId, // CRITICAL: Use npcId as the unique ID
                    name: npcConfig.displayName,
                    description: npcConfig.description || "No description available.",
                    imageKey: npcConfig.textureKey,
                    // The 'isCulprit' flag is true only if the culpritDetails object exists
                    isCulprit: !!npcConfig.culpritDetails,
                    // Add motive and alibi from the config
                    motive: npcConfig.culpritDetails?.motive,
                    alibi: npcConfig.alibi || "No alibi provided."
                };
                acc[suspect.id] = suspect;
                return acc;
            }, {} as Record<string, Suspect>);


        const payload: any = {
            suspectsData: suspectsDataForScene,
            clueManager: this.clueManager,
            suspectsSprites: this.gameState.npcIdleFrames,
            originScene: this.scene.key,
            gameplaySceneKey: this.originScene,
            switcher: this as ICategorySwitcher,
            layout: {
                listX: this.list.x,
                listY: this.list.y,
                listWidth: this.LIST_W,
                listHeight: this.PAGE_H,
                previewX: this.preview.x,
                previewY: this.preview.y,
                previewWidth: this.PREVIEW_W,
                previewHeight: this.PAGE_H,
                styles: {
                    rowStyle: this.LIST_ROW_STYLE,
                    titleStyle: this.SUSPECT_TITLE_STYLE,
                    infoStyle: this.SUSPECT_INFO_STYLE,
                    buttonStyle: this.ACCUSE_BUTTON_STYLE,
                    promptStyle: this.PROMPT_STYLE
                }
            }
        };

        this.scene.launch('AccusationScene', payload);
    }

}