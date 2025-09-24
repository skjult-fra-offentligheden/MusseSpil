import Phaser, { Scene } from 'phaser';
import { ClueManager } from './clueManager'; // Adjust path if needed
import { Clue } from '../classes/clue';    // Adjust path if needed
import { GameState } from '../managers/GameState'; // Adjust path if needed
import { Suspect } from './Accusation_scripts/suspect';
import { ClueCat, ICategorySwitcher } from "./journalTabs"; 
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs'
import { createJournalTabs, updateTabVisuals } from './journalTabs';
import { tutorialCases } from '../../data/cases/tutorialCases';
const TAB_SCENES: Record<ClueCat, string | null> = {
    caseMainpage: null,             
    Clues: 'CluesScene',       
    People: 'PeopleScene',      
    Clueboard: 'DragAbleClueScene',
    Accuse: 'AccusationScene',
};
export class ClueJournal extends Phaser.Scene implements ICategorySwitcher {
    private clueManager!: ClueManager;
    private originScene!: string;
    private gameState!: GameState;

    /* ---------- UI refs ---------- */
    private tabs!: Record<ClueCat, Phaser.GameObjects.Image>;
    private list!: Phaser.GameObjects.Container;
    private listMask!: Phaser.Display.Masks.GeometryMask;
    private preview!: Phaser.GameObjects.Container;

    /* ---------- State refs ---------- */
    private activeCat: ClueCat = 'caseMainpage';
    private selectedSuspect: Suspect | null = null;
    private selectedClueId: number | string | null = null;

    /* ---------- constants ---------- */
    private readonly PANEL_W = 1200;
    private readonly PANEL_H = 660;
    private readonly MainPAGE_W = 600;
    private readonly MainPAGE_H = 700;
    private readonly ROW_H = 48;
    private readonly PAGE_X = 80;
    private readonly PAGE_Y = 150;
    private readonly PAGE_W = 885; // Total width of the inner content area
    private readonly PAGE_H = 425; // Total height of the inner content area
    private readonly GAP = (445 /2);      // Increased GAP slightly
    private readonly LIST_W = 445;  // Width of the left list panel
    // Calculated width for the right preview panel
    private get PREVIEW_W() { return this.PAGE_W - this.LIST_W - this.GAP; }

    private casesData!: {
        cases: Record<string, {
            active: boolean;
            main_toturial_case: string;
            case_title: string;
            case_description_player_task: string;
            case_description_task: string;
        }>
    };
    private activeCaseIds: string[] = [];
    private currentCaseIdx = 0;

    private casetitle!: any;
    private casedescription!: any;

    private titleText!: Phaser.GameObjects.Text;
    private playerTaskText!: Phaser.GameObjects.Text;
    private taskBodyText!: Phaser.GameObjects.Text;
    private caseIndexLabel!: Phaser.GameObjects.Text;
    private navPrevBtn?: Phaser.GameObjects.Text;
    private navNextBtn?: Phaser.GameObjects.Text;

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

    private frontContainer!: Phaser.GameObjects.Container;
    private frontNS!: any;
    constructor() { super({ key: 'ClueJournal' }); }

    preload() {
        // --- Keep your existing preload ---
        this.load.tilemapTiledJSON('caseFrontPage', 'assets/journal_assets/journalMainPage.tmj');
        this.load.image("caseJournalFrontPage", "assets/journal_assets/caseFileFrontPage.png");
        //this.load.image('journal-frame', 'assets/journal_assets/journal_1000_625.png');
        this.load.image('Clues_tab-idle', 'assets/journal_assets/clues_tab_idle.png');
        this.load.image('Clues_tab-active', 'assets/journal_assets/clues_tab_idle.png');
        // Ensure common placeholder textures exist to avoid warnings when sub-scenes reference them later
        if (!this.textures.exists('blank-ico')) {
            this.load.image('blank-ico', 'assets/journal_assets/blank_icon.png');
        }
        if (!this.textures.exists('placeholder-clue-art')) {
            this.load.image('placeholder-clue-art', 'assets/journal_assets/placeholder_clue_art.png');
        }
        this.load.image('People_tab-active', 'assets/journal_assets/people_tab_idle.png');
        this.load.image('People_tab-idle', 'assets/journal_assets/people_tab_idle.png');
        this.load.image('places_tab-idle', 'assets/journal_assets/Places_idle_tab.png');
        this.load.image('places_tab-active', 'assets/journal_assets/Places_active_tab.png');
        this.load.image('Clueboard_tab-idle', 'assets/journal_assets/clueboard_tab_idle.png');
        this.load.image('Clueboard_tab-active', 'assets/journal_assets/clueboard_tab_idle.png');
        this.load.image('Accuse_tab-idle', 'assets/journal_assets/accuse_tab_idle.png');
        this.load.image('Accuse_tab-active', 'assets/journal_assets/accuse_tab_idle.png');
        this.load.image('caseMainpage_tab-idle', 'assets/journal_assets/case_return_to_main_mock.png');
        this.load.image("caseMainpage_tab-active", "assets/journal_assets/case_return_to_main_mock.png");
        this.load.image('blank-ico', 'assets/journal_assets/blank_icon.png'); // Example path for default icon
        // --- ADD Placeholder for Clue Preview ---
        this.load.image('placeholder-clue-art', 'assets/journal_assets/placeholder_clue_art.png'); // Create a simple placeholder image asset
    }

    init(data: { clueManager: ClueManager; originScene: string }) {
        this.clueManager = data.clueManager;
        this.originScene = data.originScene;
        this.gameState = GameState.getInstance();
        this.activeCat = 'caseMainpage';
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

        // Load cases for the Tutorial scene from shared data
        this.casesData = tutorialCases;
        try {
            console.log('[ClueJournal] Loaded cases data:', Object.keys(this.casesData.cases));
            Object.entries(this.casesData.cases).forEach(([id, c]) => {
                // @ts-ignore
                console.log(`  - ${id}: active=${(c as any).active}`);
            });
        } catch {}
        // If assault case was flagged active during gameplay, reflect it here
        try {
            const gs = GameState.getInstance();
            const oc: any = (this.casesData as any).cases?.['officer_whiskers_case'];
            if (oc && gs.getFlag('assaultCaseActive')) oc.active = true;
        } catch {}
        this.activeCaseIds = Object.entries(this.casesData.cases)
            .filter(([, v]) => v.active)
            .map(([k]) => k);
        try { console.log('[ClueJournal] Active cases after merge:', this.activeCaseIds); } catch {}

        if (this.activeCaseIds.length === 0) {
            // fallback: allow all if none active
            this.activeCaseIds = Object.keys(this.casesData.cases);
        }
        this.currentCaseIdx = 0;

        // get placements for tabs
        const { container, page } = this.generateMainScreenCasePage(tutorialCases, cy, cx)

        const map = this.make.tilemap({ key: 'caseFrontPage' });
        const layer =
            map.getObjectLayer('Object Layer 1') ||
            map.getObjectLayer('tabs') ||
            (map as any).objects?.[0];

        if (!layer) {
            console.error('TMJ missing a tabs layer');
            // tabPositions will just be empty/fallbacks
        }

        // Build positions from TMJ "tabs" objects
        type Rect = { x: number; y: number; w: number; h: number };
        const VALID: ClueCat[] = ['caseMainpage', 'Clues', 'People', 'Clueboard', 'Accuse', 'Evidence', 'Places', 'Timeline'];

        const tabPositions: Partial<Record<ClueCat, Rect>> = {};
        for (const o of (layer?.objects ?? []) as any[]) {
            if ((o.type || '').trim() !== 'tabs') continue;
            const name = (o.name || '').trim() as ClueCat;
            if (!VALID.includes(name)) {
                console.warn('[tabs] Unknown tab name in TMJ:', o.name);
                continue;
            }
            tabPositions[name] = {
                x: Number(o.x) || 0,
                y: Number(o.y) || 0,
                w: Number(o.width) || 0,
                h: Number(o.height) || 0
            };
        }

        // Ensure all tabs you plan to show have an entry (keeps shape stable)
        (['Clues', 'People', 'Clueboard', 'Accuse'] as ClueCat[]).forEach(k => {
            if (!tabPositions[k]) tabPositions[k] = { x: 0, y: 0, w: 0, h: 0 };
        });

        console.log('[tabs] positions:', tabPositions);
        createJournalTabs(
            this,                      // ITabbedJournalScene
            page,       // wherever you place the tabs
            undefined,              // your NineSlice / frame
            ['Clues', 'People', 'Clueboard', 'Accuse'],
            {
                controller: this,        // central controller
                sceneMap: {
                    Clues: { sceneKey: 'ClueDisplayJournalScene', sleepCurrent: true },
                    People: { sceneKey: 'PeopleDisplayJournalScene', sleepCurrent: true },
                    Clueboard: { sceneKey: 'DragAbleClueScene', sleepCurrent: true },
                },
                positions: tabPositions,
                launchData: {
                    Clues: () => ({ clueManager: this.clueManager, switcher: this }),
                    People: () => ({ clueManager: this.clueManager, switcher: this, activeCategory: 'People' as ClueCat }),
                    Clueboard: () => ({
                        clues: this.clueManager.getAllClues(),
                        npcs: Object.values(AllNPCsConfigs).map(npc => ({ id: npc.npcId, name: npc.displayName, imageKey: npc.portrait?.textureKey ?? npc.textureKey })),
                        originScene: this.scene.key,
                    }),
                },
            }
        );

        // Visual close button (top-right) to exit the journal
        const addClose = () => {
            const xBtnSize = 28, xBtnPad = 16;
            const x = this.cameras.main.width - xBtnPad - xBtnSize;
            const y = xBtnPad;
            const cont = this.add.container(x, y).setDepth(99999).setScrollFactor(0);
            const bg = this.add.rectangle(0, 0, xBtnSize, xBtnSize, 0xcc0000, 1)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0xffffff, 0.95);
            const tx = this.add.text(xBtnSize / 2, xBtnSize / 2, 'X', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
                .setOrigin(0.5);
            cont.add([bg, tx]).setSize(xBtnSize, xBtnSize).setInteractive({ useHandCursor: true });
            cont.on('pointerdown', () => this.close());
            cont.on('pointerover', () => bg.setAlpha(0.85));
            cont.on('pointerout', () => bg.setAlpha(1));
        };
        addClose();

        this.events.on('shutdown', () => {
            // Make sure to remove the listener from the same emitter you added it to.
        });

    }

    private renderCaseAtIndex(idx: number, pageWidth: number) {
        const id = this.activeCaseIds[idx];
        const c = this.casesData.cases[id];
        if (!c) return;

        this.titleText.setText(c.case_title);
        this.fitTitleToWidth(this.titleText, pageWidth * 0.835, 36, 14);

        this.caseIndexLabel.setText(`${idx + 1}/${this.activeCaseIds.length}`);

        //this.playerTaskText.setText(c.case_description_player_task);
        this.taskBodyText.setText(c.case_description_task);
    }

    private changeCase(delta: number) {
        const n = this.activeCaseIds.length;
        if (n <= 1) return;
        this.currentCaseIdx = (this.currentCaseIdx + delta + n) % n;

        // recompute width quickly from current title’s world (safe enough),
        // or cache imgWidth from generateMainScreenCasePage if you prefer.
        const maxWidthGuess = this.cameras.main.width / 2.5 * 0.835;
        this.renderCaseAtIndex(this.currentCaseIdx, maxWidthGuess);
    }

    private fitTitleToWidth(textObj: Phaser.GameObjects.Text, maxWidth: number, maxPx = 36, minPx = 14) {
        // ensure no wrapping on the title
        if (!this.cache.tilemap.exists('caseFrontPage')) {
            console.error('[ClueJournal] Tilemap key "caseFrontPage" not found in cache.',
                'Loaded tilemaps:', this.cache.tilemap.getKeys());
            return;
        }

        (textObj.style as any).wordWrap = undefined;

        let lo = minPx, hi = maxPx, best = minPx;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            textObj.setFontSize(mid);
            if (textObj.width <= maxWidth) { best = mid; lo = mid + 1; }
            else { hi = mid - 1; }
        }
        textObj.setFontSize(best);
        // single super-long word safety
        if (textObj.width > maxWidth) textObj.setScale(maxWidth / textObj.width, 1);
        else textObj.setScale(1, 1);
    }

    private generateMainScreenCasePage(cases: JSON, cy: number, cx: number) {
        // use your loaded map key (no renames)
        const map = this.make.tilemap({ key: 'caseFrontPage' }); // <-- CHANGED

        const pageW = 500;
        const pageH = 800;
        if (this.scale.width < 800 || this.scale.height < 600) {
            const pageW = map.widthInPixels || this.scale.width;
            const pageH = map.heightInPixels || this.scale.height;
        }

        const container = this.add.container(cx, cy);
        const page = this.add.container(-pageW / 2, -pageH / 2);
        container.add(page);

        // use your loaded image key (no renames)
        const bg = this.add.image(0, 0, 'caseJournalFrontPage') // <-- CHANGED
            .setOrigin(0, 0);

        // ensure PNG matches the TMJ size so object coords line up
        bg.setDisplaySize(pageW, pageH); // <-- ADD

        page.addAt(bg, 0);

        console.log("[ClueScene] pageW, pageH:", pageW, pageH);
        const objLayer =
            map.getObjectLayer('Object Layer 1') ||
            map.getObjectLayer('objects') ||       // fallback if you rename later
            map.getObjectLayer('ui') ||
            (map as any).objects?.[0];
        if (!objLayer) {
            console.warn('TMJ missing "objects" layer');
            return;
        }

        // Use the helper to normalize numbers
        this.casetitle = this.findObj(objLayer, 'Case Title');
        this.casedescription = this.findObj(objLayer, 'Case Description');
        console.log("[ClueScene] objLayer:", objLayer);

        const SHOW_DEBUG = false;
        if (SHOW_DEBUG) {
            const g = this.add.graphics();
            page.add(g); // IMPORTANT: add to 'page' so (x,y) matches Tiled

            // Title (red)
            g.lineStyle(2, 0xff3b30, 1)
                .strokeRect(
                    this.casetitle.x,
                    this.casetitle.y,
                    this.casetitle.width,
                    this.casetitle.height
                );

            // Description (green)
            g.lineStyle(2, 0x34c759, 1)
                .strokeRect(
                    this.casedescription.x,
                    this.casedescription.y,
                    this.casedescription.width,
                    this.casedescription.height
                );

            // debug fills removed
        }

        this.titleText = this.add.text(
            this.casetitle.x + this.casetitle.width / 2,
            this.casetitle.y,
            "",
            {
                fontSize: '36px',
                fontStyle: 'bold',
                color: '#000000',
                wordWrap: { width: Math.max(20, this.casetitle.width), useAdvancedWrap: true },
                align: 'center',
            }
        ).setOrigin(0.5, 0);
        page.add(this.titleText);

        this.taskBodyText = this.add.text(
            this.casetitle.x + this.casetitle.width / 2,
            this.casedescription.y,
            'hi',
            {
                fontSize: '18px',
                color: '#000000',
                lineSpacing: 6,
                wordWrap: {
                    width: Math.max(20, this.casedescription.width),
                    useAdvancedWrap: true,
                },
            }
        ).setOrigin(0.5, 0);
        //this.taskBodyText.setMask(descMaskGfx.createGeometryMask());
        page.add(this.taskBodyText);
        console.info("[ClueScene] taskBodyText:", this.taskBodyText.x, this.taskBodyText.y);
        console.info("[ClueScene] titleText:", this.titleText.x, this.titleText.y);

        const _id = this.activeCaseIds[this.currentCaseIdx];
        const c = this.casesData.cases[_id];
        if (c) {
            this.titleText.setText(c.case_title || 'Untitled Case');
            this.fitTitleToWidth(this.titleText, this.casetitle.width, 36, 14);
            this.taskBodyText.setText(c.case_description_task || '');
        }

        //// ----- Case switcher (keep functionality) -----
        if (this.activeCaseIds?.length > 1) {
            // index label above the title (e.g. "1/2")
            this.caseIndexLabel = this.add.text(
                this.casetitle.x + this.casetitle.width / 2,
                Math.max(0, this.casetitle.y - 16),
                `${this.currentCaseIdx + 1}/${this.activeCaseIds.length}`,
                { fontSize: '14px', color: '#333333' }
            ).setOrigin(0.5, 1);
            page.add(this.caseIndexLabel);

            // arrows left/right of the title box
            const yMid = this.casetitle.y + 18;

            this.navPrevBtn = this.add.text(
                Math.max(8, this.casetitle.x - 18), yMid, '◀',
                { fontSize: '22px', color: '#333333', backgroundColor: '#e6e6e6', padding: { x: 8, y: 4 } }
            ).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
            this.navPrevBtn.on('pointerdown', () => this.changeCase(-1));
            page.add(this.navPrevBtn);

            this.navNextBtn = this.add.text(
                this.casetitle.x + this.casetitle.width + 18, yMid, '▶',
                { fontSize: '22px', color: '#333333', backgroundColor: '#e6e6e6', padding: { x: 8, y: 4 } }
            ).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
            this.navNextBtn.on('pointerdown', () => this.changeCase(+1));
            page.add(this.navNextBtn);

            // keyboard shortcuts
            this.input.keyboard?.on('keydown-LEFT', () => this.changeCase(-1));
            this.input.keyboard?.on('keydown-RIGHT', () => this.changeCase(+1));
            // Hotkey: J to close journal and return to game
            this.input.keyboard?.on('keydown-J', () => this.close());

            // seed using your existing renderer (keeps your font fit + label update)
            if (typeof this.renderCaseAtIndex === 'function') {
                this.renderCaseAtIndex(this.currentCaseIdx, this.casetitle.width);
            }


        } return {container, page};
    }


    private close() {
        // Close the journal and return to the gameplay scene without immediately reopening
        try {
            const { UIManager } = require('../managers/UIManager');
            const ui = UIManager.getInstance();
            // Prevent the overlay J hotkey from reopening the journal on the same keypress
            ui.setJournalHotkeyEnabled(false);
        } catch {}

        if (this.scene.isActive('AccusationScene')) {
            this.scene.stop('AccusationScene');
        }
        const originKey = this.originScene;
        const sm = this.scene;
        // Stop this journal scene
        sm.stop(this.scene.key);
        // Resume/wake origin gameplay
        if (sm.isSleeping(originKey)) sm.wake(originKey);
        sm.resume(originKey);

        // Wake or relaunch the UI overlay so it returns after closing the journal
        try {
            if (sm.isSleeping('UIGameScene')) {
                sm.wake('UIGameScene');
            } else if (!sm.isActive('UIGameScene')) {
                sm.launch('UIGameScene');
            }
            sm.bringToTop('UIGameScene');
        } catch {}

        // Re-enable the overlay journal hotkey a moment later from the origin scene's clock
        const origin = sm.get(originKey) as Phaser.Scene | undefined;
        if (origin) {
            origin.time.delayedCall(150, () => {
                try {
                    const { UIManager } = require('../managers/UIManager');
                    UIManager.getInstance().setJournalHotkeyEnabled(true);
                } catch {}
            });
        } else {
            // Fallback
            setTimeout(() => {
                try {
                    const { UIManager } = require('../managers/UIManager');
                    UIManager.getInstance().setJournalHotkeyEnabled(true);
                } catch {}
            }, 150);
        }
    }

    // ---- ICategorySwitcher implementation ----
    public switchCat(category: ClueCat, force = false): void {
        if (!force && this.activeCat === category) return;
        this.activeCat = category;

        // Always stop other overlay scenes before switching to a new tab
        const overlays = ['ClueDisplayJournalScene', 'PeopleDisplayJournalScene', 'AccusationScene', 'DragAbleClueScene'];
        overlays.forEach(k => { if (this.scene.isActive(k)) this.scene.stop(k); });

        if (category === 'caseMainpage') {
            // Ensure the main page is visible again
            if (this.scene.isSleeping(this.scene.key)) this.scene.wake(this.scene.key);
            this.scene.bringToTop(this.scene.key);
        }

        // If needed, additional categories can be routed here
        updateTabVisuals(this as any);
    }

    public getActiveCat(): ClueCat {
        return this.activeCat;
    }

    public updateTabVisuals(): void {
        updateTabVisuals(this as any);
    }

    private findObj(layer: Phaser.Types.Tilemaps.TiledObjectLayer, name: string) {
        const o = layer.objects.find((ob: any) => ob.name === name);
        if (!o) throw new Error(`TMJ object not found: ${name}`);
        // Tiled rectangles give x,y,width,height; ensure numbers
        return {
            x: Number(o.x) || 0,
            y: Number(o.y) || 0,
            width: Number(o.width) || 0,
            height: Number(o.height) || 0
        };
    }


}
