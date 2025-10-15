// src/game/clueScripts/peopleDisplay.ts
import Phaser from 'phaser';
import { Clue } from '../classes/clue';
import { ClueManager } from '../clueScripts/clueManager';
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs';
import { createJournalTabs, ClueCat } from './journalTabs';
import type { ICategorySwitcher } from './journalTabs';
import { UIManager } from '../managers/UIManager';

type TabToClueCategory = 'evidence' | 'people' | 'places';

interface PeopleDisplaySceneData {
  clueManager?: ClueManager; // optional; we populate from NPC configs
  switcher?: ICategorySwitcher;
  activeCategory?: ClueCat; // default 'People'
}

export class PeopleDisplayJournalScene extends Phaser.Scene {
  private clueManager?: ClueManager;
  private switcher?: ICategorySwitcher;

  private frame!: Phaser.GameObjects.Container; // centered on camera
  private page!: Phaser.GameObjects.Container; // top-left at the inner page
  private list!: Phaser.GameObjects.Container; // placed at TMJ rowObj.x/y
  private currentArt?: Phaser.GameObjects.Image; // the preview image

  // TMJ objects (used directly, no copying)
  private rowObj!: any;
  private imgObj!: any;
  private descObj!: { x: number; y: number; width: number; height: number };
  private descText?: Phaser.GameObjects.Text;
  private descMask?: Phaser.Display.Masks.GeometryMask;
  private debugGfx?: Phaser.GameObjects.Graphics;

  // State
  public activeCat: 'Clues' | 'People' | 'Places' | 'Evidence' = 'People';
  private selectedClueId: string | null = null;

  // Minimal layout constants
  private readonly ROW_H = 56;
  private readonly ROW_GAP = 10;
  private readonly ROW_PAD_X = 12;

  constructor() { super({ key: 'PeopleDisplayJournalScene' }); }

  preload() {
    // Background and TMJ for PEOPLE
    this.load.image('caseJournalPeople', 'assets/journal_assets/case_people_mock.png');
    this.load.tilemapTiledJSON('peopleJournalLayout', 'assets/journal_assets/journalPeopleCase.tmj');

    // Shared assets
    if (!this.textures.exists('blank-ico')) {
      this.load.image('blank-ico', 'assets/journal_assets/blank_icon.png');
    }
    if (!this.textures.exists('placeholder-clue-art')) {
      this.load.image('placeholder-clue-art', 'assets/journal_assets/placeholder_clue_art.png');
    }
    // Return to case button
    if (!this.textures.exists('caseMainpage_tab-idle')) {
      this.load.image('caseMainpage_tab-idle', 'assets/journal_assets/case_return_to_main_mock.png');
    }
    if (!this.textures.exists('caseMainpage_tab-active')) {
      this.load.image('caseMainpage_tab-active', 'assets/journal_assets/case_return_to_main_mock.png');
    }
  }

  init(data: PeopleDisplaySceneData) {
    this.clueManager = data.clueManager;
    this.switcher = data.switcher;
    this.activeCat = data.activeCategory ?? 'People';
  }

  create() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Root container centered on camera
    this.frame = this.add.container(cx, cy);

    // Load the TMJ to read object rects
    const map = this.make.tilemap({ key: 'peopleJournalLayout' });

    // Size the page from the background texture
    const bgFrame = this.textures.getFrame('caseJournalPeople');
    const bgW = bgFrame?.width ?? 1000;
    const bgH = bgFrame?.height ?? 625;

    // `page` is positioned so (0,0) is the top-left of the background image
    this.page = this.add.container(-bgW / 2, -bgH / 2);
    this.frame.add(this.page);

    const bg = this.add.image(0, 0, 'caseJournalPeople').setOrigin(0, 0);
    this.page.add(bg);

    // --- TMJ OBJECTS ---
    const objLayer =
      map.getObjectLayer('objects') ||
      map.getObjectLayer('Object Layer 1');
    if (!objLayer) {
      console.warn('TMJ missing objects layer for People');
      return;
    }

    // Map names from the people TMJ
    this.rowObj = this.findObj(objLayer, 'npc_rows');
    const img = objLayer.objects.find((o: any) => o.name === 'npc_image');
    const desc = objLayer.objects.find((o: any) => o.name === 'npc_description');
    if (!img || !desc) {
      throw new Error('TMJ missing npc_image or npc_description');
    }
    this.imgObj = { x: Number(img.x) || 0, y: Number(img.y) || 0, width: Number(img.width) || 0, height: Number(img.height) || 0 };
    this.descObj = { x: Number(desc.x) || 0, y: Number(desc.y) || 0, width: Number(desc.width) || 0, height: Number(desc.height) || 0 };

    // Description mask
    const dMaskGfx = this.add.graphics({ x: this.descObj.x, y: this.descObj.y });
    dMaskGfx.fillStyle(0xffffff, 1).fillRect(0, 0, this.descObj.width, this.descObj.height);
    dMaskGfx.setVisible(false);
    this.page.add(dMaskGfx);
    this.descMask = dMaskGfx.createGeometryMask();

    // --- LIST CONTAINER + MASK, all in page space ---
    this.list = this.add.container(this.rowObj.x, this.rowObj.y);
    this.page.add(this.list);

    const maskGfx = this.add.graphics({ x: this.rowObj.x, y: this.rowObj.y });
    maskGfx.fillStyle(0xffffff, 1).fillRect(0, 0, this.rowObj.width, this.rowObj.height);
    maskGfx.setVisible(false);
    this.page.add(maskGfx);
    this.list.setMask(maskGfx.createGeometryMask());

    // Tabs positions from TMJ (if present)
    const layer =
      map.getObjectLayer('Object Layer 1') ||
      map.getObjectLayer('tabs') ||
      (map as any).objects?.[0];

    type Rect = { x: number; y: number; w: number; h: number };
    const VALID: ClueCat[] = ['caseMainpage', 'Clues', 'People', 'Clueboard', 'Accuse', 'Evidence', 'Places', 'Timeline'];
    const tabPositions: Partial<Record<ClueCat, Rect>> = {};
    for (const o of (layer?.objects ?? []) as any[]) {
      if ((o.type || '').trim() !== 'tabs') continue;
      const name = (o.name || '').trim() as ClueCat;
      if (!VALID.includes(name)) continue;
      tabPositions[name] = { x: Number(o.x) || 0, y: Number(o.y) || 0, w: Number(o.width) || 0, h: Number(o.height) || 0 };
    }
    (['Clues', 'People', 'Clueboard', 'Accuse'] as ClueCat[]).forEach(k => { if (!tabPositions[k]) tabPositions[k] = { x: 0, y: 0, w: 0, h: 0 }; });

    // Create tabs with external controller if provided
    createJournalTabs(
      this,
      this.page,
      undefined,
      ['Clues', 'People', 'Clueboard', 'Accuse'],
      {
        controller: this.switcher ?? (this as unknown as ICategorySwitcher),
        sceneMap: {
          People: { sceneKey: 'PeopleDisplayJournalScene', sleepCurrent: true },
          Clues: { sceneKey: 'ClueDisplayJournalScene', sleepCurrent: true },
          Clueboard: { sceneKey: 'DragAbleClueScene', sleepCurrent: true },
        },
        positions: tabPositions,
        launchData: {
          People: () => ({ clueManager: this.clueManager, switcher: this.switcher ?? (this as unknown as ICategorySwitcher), activeCategory: 'People' as ClueCat }),
          Clueboard: () => ({
            clues: this.clueManager?.getAllClues?.() ?? [],
            npcs: Object.values(AllNPCsConfigs).map(npc => ({ id: npc.npcId, name: npc.displayName, imageKey: npc.portrait?.textureKey ?? npc.textureKey })),
            originScene: (this.scene && this.scene.key) || 'ClueJournal',
          }),
        },
      }
    );

    // Return-to-Case button from TMJ rect named 'Return_to_case_area'
    try {
      const rtc = (objLayer.objects as any[]).find(o => (o.name || '').trim() === 'Return_to_case_area');
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
          if (this.textures.exists('caseMainpage_tab-active')) {
            btn.setTexture('caseMainpage_tab-active');
            this.time.delayedCall(120, () => btn.setTexture('caseMainpage_tab-idle'));
          }
        });
      }
    } catch (e) {
      console.warn('[PeopleDisplay] Failed to init Return-to-Case area:', e);
    }

    this.createSuspectCards();
    // Visual close button (top-right)
    const addClose = () => {
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
    addClose();

    // Hotkey: Close journal to game
    this.input.keyboard?.on('keydown-J', () => {
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
  }


  private activeCatToClueCategory(cat: 'Clues' | 'People' | 'Places' | 'Evidence'): TabToClueCategory {
    if (cat === 'People') return 'people';
    if (cat === 'Places') return 'places';
    return 'evidence';
  }

  private showClueDetail(npc: any) {
    if (this.currentArt && !this.currentArt.destroyed) this.currentArt.destroy();

    const detailContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
    this.frame.add(detailContainer);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(-this.cameras.main.width / 2, -this.cameras.main.height / 2, this.cameras.main.width, this.cameras.main.height);
    detailContainer.add(bg);

    const detailBg = this.add.graphics();
    detailBg.fillStyle(0xfffbf0, 1);
    detailBg.fillRoundedRect(-250, -200, 500, 400, 10);
    detailContainer.add(detailBg);

    const name = this.add.text(-230, -180, npc.displayName, {
      fontSize: '28px',
      color: '#4a4a4a',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold'
    });
    detailContainer.add(name);

    if (npc.portrait?.textureKey) {
      const avatar = this.add.image(-180, -100, npc.portrait.textureKey);
      avatar.setScale(0.3);
      detailContainer.add(avatar);
    }

    if (npc.description) {
      const quote = this.add.text(-100, -120, `"${npc.description}"`, {
        fontSize: '18px',
        color: '#6e6e6e',
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
        wordWrap: { width: 300 }
      });
      detailContainer.add(quote);
    }

    if (npc.alibi) {
      const alibiText = this.add.text(-230, 0, `Alibi: ${npc.alibi}`, {
        fontSize: '16px',
        color: '#333333',
        fontFamily: 'Arial, sans-serif',
        wordWrap: { width: 460 }
      });
      detailContainer.add(alibiText);
    }

    if (npc.culpritDetails?.motive) {
      const motiveText = this.add.text(-230, 100, `Motive: ${npc.culpritDetails.motive}`, {
        fontSize: '16px',
        color: '#333333',
        fontFamily: 'Arial, sans-serif',
        wordWrap: { width: 460 }
      });
      detailContainer.add(motiveText);
    }

    const closeButton = this.add.text(230, -180, 'X', {
      fontSize: '24px',
      color: '#ff0000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive();
    detailContainer.add(closeButton);

    closeButton.on('pointerdown', () => {
      detailContainer.destroy();
    });

    this.currentArt = detailContainer;
  }

  private createSuspectCards() {
    const people = Object.values(AllNPCsConfigs);
    const cardWidth = 400;
    const cardHeight = 200;
    const padding = 20;
    const columns = 2;

    const scrollableContainer = this.add.container(0, 0);
    this.page.add(scrollableContainer);

    people.forEach((npc, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = col * (cardWidth + padding);
      const y = row * (cardHeight + padding);

      const card = this.add.container(x, y).setInteractive(new Phaser.Geom.Rectangle(0, 0, cardWidth, cardHeight), Phaser.Geom.Rectangle.Contains);
      scrollableContainer.add(card);

      card.on('pointerdown', () => {
        this.selectedClueId = npc.npcId;
        this.showClueDetail(npc);
      });

      const bg = this.add.graphics();
      bg.fillStyle(0xfffbf0, 1);
      bg.lineStyle(2, 0xebebeb, 1);
      bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 10);
      bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 10);
      card.add(bg);

      const name = this.add.text(140, 20, npc.displayName, {
        fontSize: '28px',
        color: '#4a4a4a',
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold'
      });
      card.add(name);

      if (npc.description) {
        const quote = this.add.text(140, 60, `"${npc.description}"`, {
          fontSize: '18px',
          color: '#6e6e6e',
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          wordWrap: { width: cardWidth - 160 }
        });
        card.add(quote);
      }

      if (npc.alibi) {
        const alibiBg = this.add.graphics();
        alibiBg.fillStyle(0xe6f7ff, 1);
        alibiBg.fillRoundedRect(20, 110, cardWidth - 40, 40, 5);
        card.add(alibiBg);

        const alibiIcon = this.add.text(30, 120, '💡', { fontSize: '20px' });
        card.add(alibiIcon);
        const alibiText = this.add.text(60, 120, `Alibi: ${npc.alibi}`, {
          fontSize: '16px',
          color: '#333333',
          fontFamily: 'Arial, sans-serif',
          wordWrap: { width: cardWidth - 90 }
        });
        card.add(alibiText);
      }

      if (npc.culpritDetails?.motive) {
        const motiveBg = this.add.graphics();
        motiveBg.fillStyle(0xfff0f0, 1);
        motiveBg.fillRoundedRect(20, 160, cardWidth - 40, 40, 5);
        card.add(motiveBg);

        const motiveIcon = this.add.text(30, 170, '❓', { fontSize: '20px' });
        card.add(motiveIcon);
        const motiveText = this.add.text(60, 170, `Motive: ${npc.culpritDetails.motive}`, {
          fontSize: '16px',
          color: '#333333',
          fontFamily: 'Arial, sans-serif',
          wordWrap: { width: cardWidth - 90 }
        });
        card.add(motiveText);
      }

      if (npc.portrait?.textureKey) {
        const avatar = this.add.image(70, 70, npc.portrait.textureKey);
        avatar.setScale(0.2);
        card.add(avatar);

        const mask = this.make.graphics({});
        mask.fillStyle(0xffffff);
        mask.fillCircle(70, 70, 50);
        const geometryMask = mask.createGeometryMask();
        avatar.setMask(geometryMask);
      }
    });
  }

  private findObj(layer: Phaser.Types.Tilemaps.TiledObjectLayer, name: string) {
    const o = layer.objects.find((ob: any) => ob.name === name);
    if (!o) throw new Error(`TMJ object not found: ${name}`);
    return { x: Number(o.x) || 0, y: Number(o.y) || 0, width: Number(o.width) || 0, height: Number(o.height) || 0 };
  }
}
