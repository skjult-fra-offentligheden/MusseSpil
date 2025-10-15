import Phaser from 'phaser';
import { ClueManager } from './clueManager';
import { ICategorySwitcher, ClueCat, createJournalTabs, updateTabVisuals } from "./journalTabs";
import { tutorialCases } from '../../data/cases/tutorialCases';
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs';

export class CaseDetailsScene extends Phaser.Scene implements ICategorySwitcher {
    private originScene!: string;
    private clueManager!: ClueManager;
    private casesData!: any;
    private activeCaseId!: string;
    private activeCaseData!: any;

    private journalContainer!: Phaser.GameObjects.Container;
    private titleText!: Phaser.GameObjects.Text;
    private taskBodyText!: Phaser.GameObjects.Text;
    private activeCat: ClueCat = 'caseMainpage';

    constructor() {
        super({ key: 'CaseDetailsScene' });
    }

    preload() {
        // Preload assets for this scene's tabs
        this.load.image('Clues_tab-idle', 'assets/journal_assets/clues_tab_idle.png');
        this.load.image('People_tab-idle', 'assets/journal_assets/people_tab_idle.png');
        this.load.image('Clueboard_tab-idle', 'assets/journal_assets/clueboard_tab_idle.png');
    }

    init(data: { caseId: string; originScene: string; clueManager: ClueManager }) {
        this.activeCaseId = data.caseId;
        this.originScene = data.originScene;
        this.clueManager = data.clueManager;

        this.casesData = tutorialCases;
        this.activeCaseData = this.casesData.cases[this.activeCaseId];
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        this.buildJournalUI();
        this.addCloseButton();
    }

    private buildJournalUI() {
        const { width, height } = this.scale;
        this.journalContainer = this.add.container(width / 2, height / 2);

        // Draw background with code
        const bg = this.add.graphics();
        bg.fillStyle(0xf5e6d3, 1); // Light cream color
        const bgWidth = 800;
        const bgHeight = 550;
        bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 16);
        this.journalContainer.add(bg);
        this.journalContainer.setSize(bgWidth, bgHeight);
        
        const layout = {
            titleY: -bgHeight / 2 + 60,
            titleWidth: bgWidth * 0.8,
            descriptionY: -bgHeight / 2 + 120,
            descriptionWidth: bgWidth * 0.85
        };

        this.titleText = this.add.text(0, layout.titleY, this.activeCaseData.case_title, {
            fontSize: '36px', fontStyle: 'bold', color: '#333333',
            align: 'center', wordWrap: { width: layout.titleWidth }
        }).setOrigin(0.5, 0);

        this.taskBodyText = this.add.text(0, layout.descriptionY, this.activeCaseData.case_description_task, {
            fontSize: '18px', color: '#555555', lineSpacing: 6,
            align: 'left', wordWrap: { width: layout.descriptionWidth }
        }).setOrigin(0.5, 0);

        this.journalContainer.add([this.titleText, this.taskBodyText]);
        this.createTabs();
    }

    private createTabs() {
        const backButton = this.add.text(-this.journalContainer.width / 2 + 100, -this.journalContainer.height / 2 - 30, '◀ Back to Cases', {
            fontSize: '16px', color: '#FFFFFF', backgroundColor: '#555555', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backButton.on('pointerdown', () => {
            this.scene.start('CaseSelectionScene', { originScene: this.originScene });
        });

        this.journalContainer.add(backButton);

        createJournalTabs(this, this.journalContainer, undefined, ['Clues', 'People', 'Clueboard'], {
            controller: this,
            sceneMap: {
                Clues: { sceneKey: 'ClueDisplayJournalScene', sleepCurrent: true },
                People: { sceneKey: 'PeopleDisplayJournalScene', sleepCurrent: true },
                Clueboard: { sceneKey: 'DragAbleClueScene', sleepCurrent: true },
            },
            launchData: {
                Clues: () => ({ clueManager: this.clueManager, switcher: this }),
                People: () => ({ clueManager: this.clueManager, switcher: this }),
                Clueboard: () => ({
                    clues: this.clueManager.getAllClues(),
                    npcs: Object.values(AllNPCsConfigs).map(npc => ({ id: npc.npcId, name: npc.displayName, imageKey: npc.portrait?.textureKey ?? npc.textureKey })),
                    originScene: this.scene.key,
                }),
            },
            positions: {
                Clues: { x: -150, y: -this.journalContainer.height / 2 - 30, w: 100, h: 40 },
                People: { x: 0, y: -this.journalContainer.height / 2 - 30, w: 100, h: 40 },
                Clueboard: { x: 150, y: -this.journalContainer.height / 2 - 30, w: 100, h: 40 },
            }
        });
    }

    private addCloseButton() {
        const closeButton = this.add.text(this.scale.width - 30, 30, 'X', {
            fontSize: '24px',
            color: '#FFFFFF',
            backgroundColor: '#8B0000',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeButton.on('pointerdown', () => {
            this.scene.stop();
            this.scene.resume(this.originScene);
        });
    }

    public switchCat(category: ClueCat): void {
        this.activeCat = category;
        updateTabVisuals(this as any);
    }
    public getActiveCat(): ClueCat { return this.activeCat; }
    public updateTabVisuals(): void { updateTabVisuals(this as any); }
}