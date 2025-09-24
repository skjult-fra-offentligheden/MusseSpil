// src/game/clueScripts/Accusation_scripts/AccusationScene.ts
import Phaser from 'phaser';
import { ClueManager } from '../clueManager';
import { AccusationUI, AccusationUIConfig } from './accusationUI';
import { Suspect } from './suspect';
import { createJournalTabs, ClueCat, ICategorySwitcher } from '../journalTabs';
import { UIManager } from '../../managers/UIManager';
import { TutorialCase } from '../../../cases/TutorialCase';
import { GameState } from '../../managers/GameState';
import { AllNPCsConfigs } from '../../../data/NPCs/AllNPCsConfigs';

type SuspectsMap = { [key: string]: Suspect };

interface AccusationInitData {
  suspectsData?: SuspectsMap;            // optional, derive from NPC configs if missing
  clueManager?: ClueManager;             // optional (kept for parity)
  originScene?: string;
  gameplaySceneKey?: string;
  initialSuspectKey?: string;
  switcher?: ICategorySwitcher;
}

export class AccusationScene extends Phaser.Scene {
  private clueManager?: ClueManager;
  private suspectsData!: SuspectsMap;
  private originScene!: string;
  private gameplaySceneKey!: string;
  private switcher?: ICategorySwitcher;

  private frame!: Phaser.GameObjects.Container;
  private page!: Phaser.GameObjects.Container;
  private list!: Phaser.GameObjects.Container;
  private listMask?: Phaser.Display.Masks.GeometryMask;
  private previewImg?: Phaser.GameObjects.Image;
  private motiveText?: Phaser.GameObjects.Text;
  private crimesText?: Phaser.GameObjects.Text;
  private currentSuspectId?: string;

  // TMJ rects
  private imgRect!: { x: number; y: number; width: number; height: number };
  private listRect!: { x: number; y: number; width: number; height: number };
  private motiveRect!: { x: number; y: number; width: number; height: number };
  private accuseRect!: { x: number; y: number; width: number; height: number };

  // row layout
  private readonly ROW_H = 56;
  private readonly ROW_PAD_X = 12;
  private readonly ROW_GAP = 8;

  constructor() { super({ key: 'AccusationScene' }); }

  preload() {
    this.load.image('caseJournalAccuse', 'assets/journal_assets/case_accuse_mock.png');
    this.load.tilemapTiledJSON('accuseJournalLayout', 'assets/journal_assets/JournalAccuseCase.tmj');
    if (!this.textures.exists('blank-ico')) this.load.image('blank-ico', 'assets/journal_assets/blank_icon.png');
    if (!this.textures.exists('caseMainpage_tab-idle')) this.load.image('caseMainpage_tab-idle', 'assets/journal_assets/case_return_to_main_mock.png');
    if (!this.textures.exists('caseMainpage_tab-active')) this.load.image('caseMainpage_tab-active', 'assets/journal_assets/case_return_to_main_mock.png');
  }

  init(data: AccusationInitData) {
    this.clueManager = data.clueManager;
    this.switcher = data.switcher;
    this.originScene = data.originScene ?? 'ClueJournal';
    this.gameplaySceneKey = data.gameplaySceneKey ?? 'ToturialScene';
    // Use provided suspects or derive from NPC configs
    if (data.suspectsData && Object.keys(data.suspectsData).length) {
      this.suspectsData = data.suspectsData;
    } else {
      this.suspectsData = Object.values(AllNPCsConfigs).reduce((acc, npc) => {
        acc[npc.npcId] = {
          id: npc.npcId,
          name: npc.displayName,
          description: npc.description,
          imageKey: npc.portrait?.textureKey ?? npc.textureKey,
          isCulprit: !!npc.culpritDetails,
          motive: npc.culpritDetails?.motive,
          alibi: npc.alibi,
        } as Suspect;
        return acc;
      }, {} as SuspectsMap);
    }
    this.currentSuspectId = data.initialSuspectKey;
  }

  create() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Root containers
    this.frame = this.add.container(cx, cy);
    const bgFrame = this.textures.getFrame('caseJournalAccuse');
    const bgW = bgFrame?.width ?? 1000;
    const bgH = bgFrame?.height ?? 625;
    this.page = this.add.container(-bgW / 2, -bgH / 2);
    this.frame.add(this.page);
    const bg = this.add.image(0, 0, 'caseJournalAccuse').setOrigin(0, 0);
    this.page.add(bg);

    // Read TMJ rectangles
    const map = this.make.tilemap({ key: 'accuseJournalLayout' });
    const objLayer = map.getObjectLayer('objects') || map.getObjectLayer('Object Layer 1');
    if (!objLayer) { console.warn('[AccusationScene] TMJ missing objects layer'); return; }

    this.imgRect = this.findRect(objLayer, 'Image_portrait');
    this.listRect = this.findRect(objLayer, 'Suspect_selektor');
    this.motiveRect = this.findRect(objLayer, 'Motive_description');
    this.accuseRect = this.findRect(objLayer, 'Accuse button');

    // Build list + mask
    this.list = this.add.container(this.listRect.x, this.listRect.y);
    this.page.add(this.list);
    const maskGfx = this.add.graphics({ x: this.listRect.x, y: this.listRect.y })
      .fillStyle(0xffffff, 1).fillRect(0, 0, this.listRect.width, this.listRect.height).setVisible(false);
    this.page.add(maskGfx);
    this.listMask = maskGfx.createGeometryMask();
    this.list.setMask(this.listMask);

    // Tabs
    const layer = map.getObjectLayer('Object Layer 1') || map.getObjectLayer('tabs') || (map as any).objects?.[0];
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

    createJournalTabs(
      this as any,
      this.page,
      undefined,
      ['Clues', 'People', 'Clueboard', 'Accuse'],
      {
        controller: this.switcher ?? (this as unknown as ICategorySwitcher),
        positions: tabPositions,
        sceneMap: {
          Accuse: { sceneKey: 'AccusationScene', sleepCurrent: true },
          Clues: { sceneKey: 'ClueDisplayJournalScene', sleepCurrent: true },
          People: { sceneKey: 'PeopleDisplayJournalScene', sleepCurrent: true },
        },
        launchData: {
          Accuse: () => ({ clueManager: this.clueManager, switcher: this.switcher })
        }
      }
    );

    // Return to case
    const rtc = (objLayer.objects as any[]).find(o => (o.name || '').trim() === 'Return_to_case');
    if (rtc) {
      const rx = Number(rtc.x) || 0, ry = Number(rtc.y) || 0, rw = Number(rtc.width) || 0, rh = Number(rtc.height) || 0;
      const btn = this.add.image(rx + rw / 2, ry + rh / 2, 'caseMainpage_tab-idle').setOrigin(0.5).setDisplaySize(rw, rh);
      this.page.add(btn);
      btn.setInteractive(new Phaser.Geom.Rectangle(-rw / 2, -rh / 2, rw, rh), Phaser.Geom.Rectangle.Contains);
      if (btn.input) btn.input.cursor = 'pointer';
      btn.on('pointerdown', () => { this.switcher?.switchCat?.('caseMainpage'); this.switcher?.updateTabVisuals?.(); });
    }

    // Build list and initial selection
    this.buildList();
    if (this.currentSuspectId && this.suspectsData[this.currentSuspectId]) this.showSuspect(this.suspectsData[this.currentSuspectId]);

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
          .forEach(k=>{ if(sm.isActive(k) || sm.isSleeping(k)) sm.stop(k); });
        if (sm.isSleeping(originKey)) sm.wake(originKey);
        sm.resume(originKey);
        setTimeout(() => ui.setJournalHotkeyEnabled(true), 150);
      });
      cont.on('pointerover', () => bg.setAlpha(0.85));
      cont.on('pointerout', () => bg.setAlpha(1));
    };
    addClose();

    // Hotkey: Close journal to game from any tab
    this.input.keyboard?.on('keydown-J', () => {
      const ui = UIManager.getInstance();
      ui.setJournalHotkeyEnabled(false);
      const sm = this.scene;
      const cj: any = sm.get('ClueJournal');
      const originKey: string = cj?.originScene || 'ToturialScene';

      ['ClueDisplayJournalScene','PeopleDisplayJournalScene','AccusationScene','DragAbleClueScene','ClueJournal']
        .forEach(k=>{ if(sm.isActive(k) || sm.isSleeping(k)) sm.stop(k); });

      if (sm.isSleeping(originKey)) sm.wake(originKey);
      sm.resume(originKey);
      setTimeout(() => ui.setJournalHotkeyEnabled(true), 150);
    });
  }

  private buildList() {
    this.list.removeAll(true);
    const suspects = Object.values(this.suspectsData);
    suspects.forEach((suspect, i) => {
      const rowY = i * (this.ROW_H + this.ROW_GAP);
      const rowWidth = this.listRect.width;
      const row = this.add.container(0, rowY).setData('id', suspect.id);
      const bg = this.add.rectangle(rowWidth / 2, this.ROW_H / 2, rowWidth, this.ROW_H, 0x161616, 0.0);
      const txt = this.add.text(this.ROW_PAD_X, this.ROW_H / 2, suspect.name, { fontSize: '16px', color: '#111' }).setOrigin(0, 0.5);
      row.add([bg, txt]).setSize(rowWidth, this.ROW_H).setInteractive({ useHandCursor: true })
        .on('pointerover', () => { if (row.getData('id') !== this.currentSuspectId) bg.setFillStyle(0xffffff, 0.15); })
        .on('pointerout', () => { if (row.getData('id') !== this.currentSuspectId) bg.setFillStyle(0x161616, 0.0); })
        .on('pointerdown', () => this.showSuspect(suspect));
      this.list.add(row);
    });
  }

  private showSuspect(suspect: Suspect) {
    this.currentSuspectId = suspect.id;
    // Highlight rows
    this.list.getAll().forEach((row: any) => {
      if (!(row instanceof Phaser.GameObjects.Container)) return;
      const bg = row.getAt(0) as Phaser.GameObjects.Rectangle;
      const selected = row.getData('id') === suspect.id;
      bg.setFillStyle(selected ? 0xffd700 : 0x161616, selected ? 0.25 : 0.0);
    });

    // Portrait
    if (this.previewImg && !this.previewImg.destroyed) this.previewImg.destroy();
    const artKey = suspect.imageKey && this.textures.exists(suspect.imageKey) ? suspect.imageKey : 'blank-ico';
    const r = this.imgRect; const cx = r.x + r.width / 2; const cy = r.y + r.height / 2;
    this.previewImg = this.add.image(cx, cy, artKey).setOrigin(0.5);
    this.page.add(this.previewImg);
    const fw = this.previewImg.width || 1, fh = this.previewImg.height || 1;
    const s = Math.min((r.width * 0.95) / fw, (r.height * 0.95) / fh);
    this.previewImg.setScale(s);

      // Motive/Alibi block
      if (!this.motiveText || this.motiveText.destroyed) {
        this.motiveText = this.add.text(this.motiveRect.x + 8, this.motiveRect.y + 8, '', {
          fontSize: '16px', color: '#1a1a1a', wordWrap: { width: this.motiveRect.width - 16, useAdvancedWrap: true }, lineSpacing: 3
        });
        this.page.add(this.motiveText);
      }
      const info = `Motive:\n${suspect.motive || 'None recorded.'}\n\nAlibi:\n${suspect.alibi || 'None provided.'}`;
      this.motiveText.setText(info);

      // Crimes availability list
      const crimes = TutorialCase.crimes.filter(c => c.suspectId === suspect.id);
      const gs = GameState.getInstance(this);
      const describe = (c: any): string => {
        const ok = this.evalCond(c.unlockWhen, gs);
        const reason = this.condToText(c.unlockWhen);
        return `- ${c.label}: ${ok ? 'Available' : 'Locked'}${ok ? '' : ` (needs ${reason})`}`;
      };
      const crimesStr = crimes.length ? `\n\nCrimes:\n${crimes.map(describe).join('\n')}` : '';
      if (!this.crimesText || this.crimesText.destroyed) {
        this.crimesText = this.add.text(this.motiveRect.x + 8, this.motiveRect.y + this.motiveRect.height - 100, '', { fontSize: '14px', color: '#333', wordWrap: { width: this.motiveRect.width - 16, useAdvancedWrap: true } });
        this.page.add(this.crimesText);
      }
      this.crimesText.setText(crimesStr);

    // Accuse button (zone in TMJ area) + label text
    const ax = this.accuseRect.x, ay = this.accuseRect.y, aw = this.accuseRect.width, ah = this.accuseRect.height;
    const centerX = ax + aw / 2;
    const centerY = ay + ah / 2;
    const btnZone = this.add.zone(centerX, centerY, aw, ah).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.page.add(btnZone);
    // Add visible label over the red area
    const label = this.add.text(centerX, centerY, 'Accuse of crime', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.page.add(label);
    btnZone.once('pointerdown', () => this.confirmAccusation(suspect));
  }

  // Minimal condition evaluator mirroring CaseDirector
  private evalCond(cond: any, gs: GameState): boolean {
    if (!cond) return true;
    if (cond.kind === 'flag') return cond.value === undefined ? !!gs.getFlag(cond.id) : gs.getFlag(cond.id) === cond.value;
    if (cond.kind === 'counterAtLeast') return (gs.getCounter(cond.id) >= cond.count);
    if (cond.kind === 'all') return (cond.of || []).every((c: any) => this.evalCond(c, gs));
    if (cond.kind === 'any') return (cond.of || []).some((c: any) => this.evalCond(c, gs));
    return false;
  }

  private condToText(cond: any): string {
    if (!cond) return '';
    if (cond.kind === 'flag') return `${cond.id}=${cond.value === undefined ? 'true' : String(cond.value)}`;
    if (cond.kind === 'counterAtLeast') return `${cond.id}>=${cond.count}`;
    if (cond.kind === 'all') return (cond.of || []).map((c: any) => this.condToText(c)).join(' & ');
    if (cond.kind === 'any') return (cond.of || []).map((c: any) => this.condToText(c)).join(' | ');
    return '';
  }

  private confirmAccusation(suspect: Suspect) {
    const uiConfig: AccusationUIConfig = { suspectsData: this.suspectsData, suspectsSprites: [], originScene: this.originScene };
    const ui = new AccusationUI(this, uiConfig);
    ui.showConfirmation(suspect, () => this.resolveAccusation(suspect), () => {/* cancel */});
  }

  private resolveAccusation(suspect: Suspect) {
    const gameState = GameState.getInstance();
    const culpritId = gameState.culpritId;
    // Close overlays
    ['ClueDisplayJournalScene', 'PeopleDisplayJournalScene', 'AccusationScene', 'DragAbleClueScene'].forEach(k => {
      if (this.scene.isActive(k)) this.scene.stop(k);
    });
    if (suspect.id === culpritId) {
      this.scene.start('VictoryScene', { suspect, culpritDetails: gameState.culpritDetails });
    } else {
      this.scene.start('GameOver', { suspect, fromSceneKey: this.gameplaySceneKey || 'ToturialScene' });
    }
  }

  private findRect(layer: Phaser.Types.Tilemaps.TiledObjectLayer, name: string) {
    const o = layer.objects.find((ob: any) => (ob.name || '').trim() === name);
    if (!o) throw new Error(`[AccusationScene TMJ] Missing rect: ${name}`);
    return { x: Number(o.x) || 0, y: Number(o.y) || 0, width: Number(o.width) || 0, height: Number(o.height) || 0 };
  }
}
