// src/game/scenes/ClueDisplayScene.ts
import Phaser from 'phaser';
import { Clue } from '../classes/clue';
import { ClueManager } from '../clueScripts/clueManager';
import { createJournalTabs, ClueCat } from './journalTabs';
import { UIManager } from '../managers/UIManager';
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs';
import type { ICategorySwitcher } from './journalTabs';


type TabToClueCategory = 'evidence' | 'people' | 'places';

interface ClueDisplaySceneData {
    clueManager: ClueManager;
    switcher?: ICategorySwitcher;
    activeCategory?: ClueCat; // default 'Clues'
}

export class ClueDisplayJournalScene extends Phaser.Scene {
    private clueManager!: ClueManager;
    private switcher?: ICategorySwitcher;
    private frame!: Phaser.GameObjects.Container;   // centered on camera
    private page!: Phaser.GameObjects.Container;    // top-left at the inner page
    private list!: Phaser.GameObjects.Container;    // placed at TMJ rowObj.x/y
    private currentArt?: Phaser.GameObjects.Image;  // the preview image

    // TMJ objects (used directly, no copying)
    private rowObj!: any;
    private imgObj!: any;

    private descObj!: { x: number; y: number; width: number; height: number };
    private descText?: Phaser.GameObjects.Text;
    private descMask?: Phaser.Display.Masks.GeometryMask;

    private debugGfx?: Phaser.GameObjects.Graphics;

    // State
    public activeCat: 'Clues' | 'People' | 'Places' | 'Evidence' = 'Clues';
    private selectedClueId: string | null = null;

    // Minimal layout constants
    private readonly PAGE_PAD_X = 80;
    private readonly PAGE_PAD_Y = 120;
    private readonly ROW_H = 56;
    private readonly ROW_GAP = 10;
    private readonly ROW_PAD_X = 12;
    constructor() { super({ key: 'ClueDisplayJournalScene' }); }

    preload() {
        this.load.image('caseJournalClues', 'assets/journal_assets/case_journal_clues_mock.png');
        this.load.tilemapTiledJSON('clueJournalLayout', 'assets/journal_assets/cluedisplay.tmj');

        // Return-to-Case button texture (matches main journal)
        if (!this.textures.exists('caseMainpage_tab-idle')) {
            this.load.image('caseMainpage_tab-idle', 'assets/journal_assets/case_return_to_main_mock.png');
        }
        if (!this.textures.exists('caseMainpage_tab-active')) {
            this.load.image('caseMainpage_tab-active', 'assets/journal_assets/case_return_to_main_mock.png');
        }

        if (!this.textures.exists('blank-ico')) {
            this.load.image('blank-ico', 'assets/journal_assets/blank_icon.png');
        }
        if (!this.textures.exists('placeholder-clue-art')) {
            this.load.image('placeholder-clue-art', 'assets/journal_assets/placeholder_clue_art.png');
        }

    }

    init(data: ClueDisplaySceneData) {
        this.clueManager = data.clueManager;
        this.switcher = data.switcher;
        this.activeCat = data.activeCategory ?? 'Clues';
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // Root container centered on camera
        this.frame = this.add.container(cx, cy);

        // Load the TMJ to read object rects (no tile layers needed)
        const map = this.make.tilemap({ key: 'clueJournalLayout' });
        console.info('tilemap exists?', this.cache.tilemap.exists('clueJournalLayout'));

        // --- PAGE + BACKGROUND IMAGE (top-left anchored inside the centered frame) ---
        // Size the page from the background texture
        const bgFrame = this.textures.getFrame('caseJournalClues');
        const bgW = bgFrame?.width ?? 1000;
        const bgH = bgFrame?.height ?? 625;

        // `page` is positioned so (0,0) is the top-left of the background image
        this.page = this.add.container(-bgW / 2, -bgH / 2);
        this.frame.add(this.page);

        const bg = this.add.image(0, 0, 'caseJournalClues').setOrigin(0, 0);
        this.page.add(bg);

        // --- TMJ OBJECTS ---
        const objLayer = map.getObjectLayer('objects');
        if (!objLayer) {
            console.warn('TMJ missing "objects" layer');
            return;
        }

        // Use the helper to normalize numbers
        this.rowObj = this.findObj(objLayer, 'Clue_row_area');
        this.imgObj = this.findObj(objLayer, 'Image display area');
        this.descObj = this.findObj(objLayer, 'image_description_area');

        // one-time mask for the description box
        const dMaskGfx = this.add.graphics({ x: this.descObj.x, y: this.descObj.y });
        dMaskGfx.fillStyle(0xffffff, 1).fillRect(0, 0, this.descObj.width, this.descObj.height);
        dMaskGfx.setVisible(false);
        this.page.add(dMaskGfx);
        this.descMask = dMaskGfx.createGeometryMask();

        // Optional visual debug of TMJ rects
        //this.drawTMJOutlines(objLayer);

        // Add a Return-to-Case area if present in TMJ (non-tab button)
        try {
            const rtc = (objLayer.objects as any[]).find(o => (o.name || '').trim() === 'caseMainpage');
            if (rtc) {
                const rx = Number(rtc.x) || 0;
                const ry = Number(rtc.y) || 0;
                const rw = Number(rtc.width) || 0;
                const rh = Number(rtc.height) || 0;

                const btn = this.add.image(rx + rw / 2, ry + rh / 2, 'caseMainpage_tab-idle')
                    .setOrigin(0.5)
                    .setDisplaySize(rw, rh)
                    .setDepth(10);
                this.page.add(btn);

                btn.setInteractive(
                    new Phaser.Geom.Rectangle(-rw / 2, -rh / 2, rw, rh),
                    Phaser.Geom.Rectangle.Contains
                );
                if (btn.input) btn.input.cursor = 'pointer';

                btn.on('pointerdown', () => {
                    this.switcher?.switchCat?.('caseMainpage');
                    this.switcher?.updateTabVisuals?.();
                    // visual feedback (optional)
                    if (this.textures.exists('caseMainpage_tab-active')) {
                        btn.setTexture('caseMainpage_tab-active');
                        this.time.delayedCall(120, () => btn.setTexture('caseMainpage_tab-idle'));
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to initialize Return-to-Case area:', e);
        }

        // --- LIST CONTAINER + MASK, all in page space ---
        this.list = this.add.container(this.rowObj.x, this.rowObj.y);
        this.page.add(this.list);

        const maskGfx = this.add.graphics({ x: this.rowObj.x, y: this.rowObj.y });
        maskGfx.fillStyle(0xffffff, 1).fillRect(0, 0, this.rowObj.width, this.rowObj.height);
        maskGfx.setVisible(false);
        this.page.add(maskGfx);
        this.list.setMask(maskGfx.createGeometryMask());

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
            this.page,       // wherever you place the tabs
            undefined,              // your NineSlice / frame
            ['Clues', 'People', 'Clueboard', 'Accuse'],
            {
                // Use external controller if provided so tabs switch globally
                controller: this.switcher ?? (this as unknown as ICategorySwitcher),
                sceneMap: {
                    Clues: { sceneKey: 'ClueDisplayJournalScene', sleepCurrent: true },
                    People: { sceneKey: 'PeopleDisplayJournalScene', sleepCurrent: true },
                    Clueboard: { sceneKey: 'DragAbleClueScene', sleepCurrent: true },
                },
                positions: tabPositions,
                launchData: {
                    // Ensure any newly launched ClueDisplay scenes also get the controller
                    Clues: () => ({ clueManager: this.clueManager, switcher: this.switcher ?? (this as unknown as ICategorySwitcher) }),
                    Clueboard: () => ({
                        clues: this.clueManager?.getAllClues?.() ?? [],
                        npcs: Object.values(AllNPCsConfigs).map(npc => ({ id: npc.npcId, name: npc.displayName, imageKey: npc.portrait?.textureKey ?? npc.textureKey })),
                        originScene: (this.scene && this.scene.key) || 'ClueJournal',
                    }),
                },
            }
        );

        // Build the list (and auto-select first)
        console.info('ClueDisplayJournalScene: building list');
        this.refreshList();

        // Visual close button (top-right)
        const makeClose = () => {
            const xBtnSize = 28, xBtnPad = 16;
            const x = this.cameras.main.width - xBtnPad - xBtnSize;
            const y = xBtnPad;
            const cont = this.add.container(x, y).setDepth(99999).setScrollFactor(0);
            const bg = this.add.rectangle(0, 0, xBtnSize, xBtnSize, 0xcc0000, 1).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.95);
            const tx = this.add.text(xBtnSize / 2, xBtnSize / 2, 'X', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
            cont.add([bg, tx]).setSize(xBtnSize, xBtnSize).setInteractive({ useHandCursor: true });
            cont.on('pointerdown', () => {
                const ui = UIManager.getInstance();
                ui.setJournalHotkeyEnabled(false);
                const sm = this.scene;
                const cj: any = sm.get('ClueJournal');
                const originKey: string = cj?.originScene || 'ToturialScene';
                ['ClueDisplayJournalScene','PeopleDisplayJournalScene','AccusationScene','DragAbleClueScene','ClueJournal']
                    .forEach(k => { if (sm.isActive(k) || sm.isSleeping(k)) sm.stop(k); });
                if (sm.isSleeping(originKey)) sm.wake(originKey);
                sm.resume(originKey);
                setTimeout(() => ui.setJournalHotkeyEnabled(true), 150);
            });
            cont.on('pointerover', () => bg.setAlpha(0.85));
            cont.on('pointerout', () => bg.setAlpha(1));
        };
        makeClose();

        // Hotkey: Close journal to game
        this.input.keyboard?.on('keydown-J', () => {
            const ui = UIManager.getInstance();
            ui.setJournalHotkeyEnabled(false);
            const sm = this.scene;
            const cj: any = sm.get('ClueJournal');
            const originKey: string = cj?.originScene || 'ToturialScene';

            // Stop all journal-related scenes (including this one)
            ['ClueDisplayJournalScene','PeopleDisplayJournalScene','AccusationScene','DragAbleClueScene','ClueJournal']
              .forEach(k => { if (sm.isActive(k) || sm.isSleeping(k)) sm.stop(k); });

            // Wake/resume origin immediately; use window timeout to re-enable hotkey
            if (sm.isSleeping(originKey)) sm.wake(originKey);
            sm.resume(originKey);
            setTimeout(() => ui.setJournalHotkeyEnabled(true), 150);
        });
    }

    private drawTMJOutlines(layer: Phaser.Types.Tilemaps.TiledObjectLayer) {
        // kill previous
        if (this.debugGfx && !this.debugGfx.destroyed) this.debugGfx.destroy();

        const g = this.add.graphics();
        this.page.add(g); // TMJ x/y now used directly
        this.debugGfx = g;

        const colorOf = (name: string) =>
            name === 'Clue_row_area' ? 0x34c759 : // green
                name === 'Image display area' ? 0x0a84ff : // blue
                    name === 'image_description_area' ? 0xff9f0a : // orange
                        name === 'Return_to_case_area' ? 0xaf52de : // purple
                            0xff3b30;  // red (default)

        for (const o of layer.objects as any[]) {
            const w = Number(o.width) || 0;
            const h = Number(o.height) || 0;
            const x = Number(o.x) || 0;
            const y = Number(o.y) || 0;
            g.lineStyle(2, colorOf(o.name || ''), 1).strokeRect(x, y, w, h);
        }
    }

    // ---------- List / Preview ----------
    private refreshList() {
        this.list.removeAll(true);
        this.selectedClueId = null;

        const cat = this.activeCatToClueCategory(this.activeCat);
        const clues = this.clueManager.getAllClues()
            .filter(c => c.category === cat && c.discovered);

        if (!clues.length) {
            this.list.add(this.add.text(0, 8, `No discovered ${cat} yet.`, { fontSize: '16px', color: '#666' }));
            return;
        }

        clues.forEach((clue, i) => this.list.add(this.buildClueRow(clue, i)));

        // Auto select first
        this.showClueDetail(clues[0]);
        this.showClueDescription(clues[0]);
    }

    private buildClueRow(clue: Clue, index: number): Phaser.GameObjects.Container {
        const listW = this.rowObj.width;                          // width straight from TMJ
        const y = index * (this.ROW_H + this.ROW_GAP);

        const row = this.add.container(0, y).setSize(listW, this.ROW_H);
        row.setData('id', clue.id);

        const hit = this.add.zone(0, 0, listW, this.ROW_H).setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        const icoKey = (clue.imageKey && this.textures.exists(clue.imageKey)) ? clue.imageKey : 'blank-ico';
        const icoSize = Math.floor(this.ROW_H * 0.7);
        const ico = this.add.image(this.ROW_PAD_X, Math.floor(this.ROW_H / 2), icoKey)
            .setOrigin(0, 0.5)
            .setDisplaySize(icoSize, icoSize);

        const title = this.add.text(ico.x + ico.displayWidth + 10, Math.floor(this.ROW_H / 2),
            clue.title ?? 'Untitled', { fontSize: '16px', color: '#111' })
            .setOrigin(0, 0.5)
            .setAlpha(clue.discovered ? 1 : 0.4);

        row.add([hit, ico, title]);

        hit.on('pointerdown', () => {
            if (!clue.discovered) return;
            this.selectedClueId = clue.id;
            this.highlightSelected(clue.id);
            this.showClueDetail(clue);
            this.showClueDescription(clue);
        });

        return row;
    }

    private showClueDetail(clue: Clue) {
        if (this.currentArt && !this.currentArt.destroyed) this.currentArt.destroy();

        // your exact resolver line
        const artKey = (clue.imageKey && this.textures.exists(clue.imageKey)) ? clue.imageKey : 'placeholder-clue-art';
        const r = this.imgObj; // {x,y,width,height} from TMJ (top-left anchored)
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        // Drop image at the TMJ object’s x/y inside the page container
        this.currentArt = this.add.image(cx, cy, artKey).setOrigin(0.5);
        this.page.add(this.currentArt);
    }

    private showClueDescription(clue: Clue) {
        const r = this.descObj;
        const pad = 12;

        // create once, reuse
        if (!this.descText || this.descText.destroyed) {
            this.descText = this.add.text(r.x + pad, r.y + pad, '', {
                fontSize: '16px',
                color: '#1a1a1a',
                wordWrap: { width: r.width - pad * 2, useAdvancedWrap: true },
                align: 'left',
                lineSpacing: 2
            });
            this.page.add(this.descText);
            //if (this.descMask) this.descText.setMask(this.descMask);
        }

        const text =
            (clue.description && clue.description.trim().length > 0)
                ? clue.description
                : 'No description yet.';
        this.descText.setText(text);

        // optional: reset scroll position if you later add scroll
        this.descText.setY(r.y + pad);
    }

    private highlightSelected(id: string) {
        this.list.iterate((child: any) => {
            if (!(child instanceof Phaser.GameObjects.Container)) return;
            const title = child.getAt(2) as Phaser.GameObjects.Text | undefined;
            const ico = child.getAt(1) as Phaser.GameObjects.Image | undefined;
            const sel = child.getData('id') === id;
            if (title) title.setStyle({ fontStyle: sel ? 'bold' : 'normal' });
            if (ico) {
                const baseScaleX = ico.displayWidth / (ico.width || 1);
                const baseScaleY = ico.displayHeight / (ico.height || 1);
                const bump = sel ? 1.06 : 1.0;
                ico.setScale(baseScaleX * bump, baseScaleY * bump);
            }
        });
    }

    private activeCatToClueCategory(cat: 'Clues' | 'People' | 'Places' | 'Evidence'): TabToClueCategory {
        if (cat === 'People') return 'people';
        if (cat === 'Places') return 'places';
        return 'evidence';
    }

    // ----- tiny helper -----
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
