import Phaser from 'phaser';
import { ClueManager } from './clueManager';
import { ICategorySwitcher, ClueCat, updateTabVisuals } from "./journalTabs"; // Kept for interface compatibility
import { tutorialCases } from '../../data/cases/tutorialCases';
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs';
import { UIManager } from '../managers/UIManager';

// Define a type for our new tabs
type JournalTab = 'Mice' | 'Clues' | 'Board' | 'Accuse';

export class CaseDetailsScene extends Phaser.Scene implements ICategorySwitcher {
    private originScene!: string;
    private clueManager!: ClueManager;
    private activeCaseId!: string;
    private activeCaseData!: any;
    private activeTab: JournalTab = 'Mice';

    // UI Elements
    private journalContainer!: Phaser.GameObjects.Container;
    private tabs: { [key in JournalTab]?: Phaser.GameObjects.Text } = {};

    constructor() {
        super({ key: 'CaseDetailsScene' });
    }

    preload() {
        // --- IMPORTANT: Load your new background image here! ---
        this.load.image('journal_details_bg', 'assets/journal_assets/journal_details_bg.png');

        // Preload NPC portraits if they are not already loaded
        Object.values(AllNPCsConfigs).forEach(npc => {
            if (npc.portrait?.textureKey && !this.textures.exists(npc.portrait.textureKey)) {
                // Assuming portraits are in a specific folder, adjust path as needed
                this.load.image(npc.portrait.textureKey, `assets/npc/portraits/${npc.portrait.textureKey}.png`);
            }
        });
    }

    init(data: { caseId: string; originScene: string; clueManager: ClueManager }) {
        this.activeCaseId = data.caseId;
        this.originScene = data.originScene;
        this.clueManager = data.clueManager;
        this.activeCaseData = (tutorialCases.cases as any)[this.activeCaseId];
    }

    create() {
        // Modal blocker to capture input
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive()
            .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                 // Prevent clicks from passing through, but don't do anything
                pointer.stopPropagation();
            });

        this.buildJournalUI();
    }

    private buildJournalUI() {
        const { width, height } = this.scale;
        
        // --- Main Container ---
        this.journalContainer = this.add.container(width / 2, height / 2);

        // --- Background Image ---
        const bg = this.add.image(0, 0, 'journal_details_bg');
        // Let's scale the background to fit nicely on the screen
        const scale = Math.min((width * 0.9) / bg.width, (height * 0.9) / bg.height);
        bg.setScale(scale);
        
        this.journalContainer.add(bg);
        const containerWidth = bg.displayWidth;
        const containerHeight = bg.displayHeight;

        // --- Header Section ---
        this.createHeader(containerWidth, containerHeight);
        
        // --- Tabs Section ---
        this.createTabs(containerWidth, containerHeight);

        // --- Content Section (Initially showing "Mice") ---
        this.createMiceContent(containerWidth, containerHeight);

        // --- Close Button ---
        const closeButton = this.add.text(containerWidth / 2 - 30, -containerHeight / 2 + 30, 'X', {
            fontSize: '24px', color: '#8B4513', fontStyle: 'bold',
            backgroundColor: '#00000000', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => this.closeJournal());
        this.journalContainer.add(closeButton);
    }
    
    private createHeader(width: number, height: number) {
        const headerY = -height / 2 + 80;

        // "All Cases" Back Button
        const backButton = this.add.text(-width / 2 + 80, headerY - 30, '◀ All Cases', {
            fontSize: '18px', color: '#8B4513', fontStyle: 'bold'
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        
        backButton.on('pointerdown', () => {
            this.scene.start('CaseSelectionScene', { originScene: this.originScene });
        });
        this.journalContainer.add(backButton);

        // Main Info Box
        const infoBoxWidth = width * 0.85;
        const infoBoxHeight = 150;
        const infoBox = this.add.graphics();
        infoBox.fillStyle(0xfdf6e3, 0.8); // Light beige, slightly transparent
        infoBox.lineStyle(2, 0xd2b48c, 1); // Tan border
        infoBox.fillRoundedRect(-infoBoxWidth / 2, headerY, infoBoxWidth, infoBoxHeight, 10);
        infoBox.strokeRoundedRect(-infoBoxWidth / 2, headerY, infoBoxWidth, infoBoxHeight, 10);
        this.journalContainer.add(infoBox);

        // Case Title
        const title = this.add.text(0, headerY + 25, this.activeCaseData.case_title, {
            fontFamily: 'Georgia, serif', fontSize: '32px', color: '#543d25'
        }).setOrigin(0.5, 0);
        this.journalContainer.add(title);
        
        // Case Description
        const description = this.add.text(0, headerY + 70, this.activeCaseData.case_description_player_task, {
            fontSize: '16px', color: '#8B4513', wordWrap: { width: infoBoxWidth - 40 }, align: 'center'
        }).setOrigin(0.5, 0);
        this.journalContainer.add(description);
        
        // Status Tag
        this.createTag(width * 0.25, headerY + 110, this.activeCaseData.status || 'OPEN', 0xfbc47a);
        
        // Date Tag (Note: Your case data doesn't have a date field, so I'm adding a placeholder)
        this.createTag(-width * 0.25, headerY + 110, `Oct 5, 2025`, 0xc5d8a4);
    }
    
    private createTag(x: number, y: number, text: string, color: number) {
        const tagText = this.add.text(x, y, text.toUpperCase(), {
            fontSize: '14px', color: '#6b4f2c', fontStyle: 'bold'
        }).setOrigin(0.5);

        const textWidth = tagText.width + 20;
        const tagBg = this.add.graphics();
        tagBg.fillStyle(color, 0.7);
        tagBg.fillRoundedRect(x - textWidth / 2, y - 12, textWidth, 24, 12);
        
        this.journalContainer.add(tagBg);
        this.journalContainer.add(tagText); // Add text on top of background
    }

    private createTabs(width: number, height: number) {
        const tabsY = -height / 2 + 270;
        const tabsWidth = width * 0.85;
        const tabNames: JournalTab[] = ['Mice', 'Clues', 'Board', 'Accuse'];

        const tabsBg = this.add.graphics();
        tabsBg.fillStyle(0xd2b48c, 0.5); // Tan background
        tabsBg.fillRoundedRect(-tabsWidth / 2, tabsY, tabsWidth, 40, 8);
        this.journalContainer.add(tabsBg);

        const tabWidth = tabsWidth / tabNames.length;

        tabNames.forEach((name, index) => {
            const tabX = -tabsWidth / 2 + (index * tabWidth) + (tabWidth / 2);
            
            const tabText = this.add.text(tabX, tabsY + 20, name, {
                fontSize: '18px', color: '#8B4513', fontStyle: 'bold'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            tabText.on('pointerdown', () => this.switchTab(name));
            this.journalContainer.add(tabText);
            this.tabs[name] = tabText;
        });

        this.updateTabStyles();
    }

    private switchTab(tabName: JournalTab) {
        this.activeTab = tabName;
        this.updateTabStyles();
        // Here you would add logic to show the content for the selected tab
        // For now, it only knows how to show the "Mice" content.
        console.log(`Switched to ${tabName} tab.`);
    }

    private updateTabStyles() {
        const activeColor = '#fdf6e3'; // Light beige for active
        const inactiveColor = '#8B4513'; // Brown for inactive
        for (const tabName in this.tabs) {
            const tabText = this.tabs[tabName as JournalTab];
            if (tabText) {
                tabText.setColor(tabName === this.activeTab ? activeColor : inactiveColor);
            }
        }
    }

    private createMiceContent(width: number, height: number) {
        // This is a simplified version of what your "PeopleTab" would do.
        // It's not scrollable yet, but it builds the layout.
        const contentY = -height / 2 + 330;
        const contentWidth = width * 0.85;
        
        // For now, we'll just show the suspects of the current case.
        const suspectIds = (TutorialCase as any).suspects; // Getting from TutorialCase.ts
        const suspects = suspectIds.map((id: string) => (AllNPCsConfigs as any)[id]);
        
        let yPos = contentY;

        suspects.forEach((suspect: any) => {
            if (!suspect) return;

            const cardHeight = 100;
            const card = this.add.graphics();
            card.fillStyle(0xfdf6e3, 0.7);
            card.lineStyle(1, 0xd2b48c, 1);
            card.fillRoundedRect(-contentWidth / 2, yPos, contentWidth, cardHeight, 8);
            card.strokeRoundedRect(-contentWidth / 2, yPos, contentWidth, cardHeight, 8);
            this.journalContainer.add(card);

            // Add Suspect Name & Description
            const name = this.add.text(-contentWidth/2 + 30, yPos + 20, suspect.displayName, {
                fontSize: '20px', color: '#543d25', fontStyle: 'bold'
            }).setOrigin(0, 0);

            const alibi = this.add.text(-contentWidth/2 + 30, yPos + 50, `Alibi: ${suspect.alibi || 'None provided.'}`, {
                 fontSize: '14px', color: '#8B4513'
            }).setOrigin(0, 0);

            this.journalContainer.add([name, alibi]);

            yPos += cardHeight + 15;
        });
    }

    private closeJournal() {
        UIManager.getInstance().setJournalHotkeyEnabled(false);
        const origin = this.scene.get(this.originScene);
        this.scene.stop();

        if (origin) {
            this.scene.resume(this.originScene);
            if (this.scene.isSleeping('UIGameScene')) {
                this.scene.wake('UIGameScene');
            }
            origin.time.delayedCall(200, () => {
                UIManager.getInstance().setJournalHotkeyEnabled(true);
            });
        }
    }

    // --- ICategorySwitcher Implementation (for compatibility with other scenes) ---
    public switchCat(category: ClueCat): void { /* This scene now handles its own tabs */ }
    public getActiveCat(): ClueCat { return this.activeTab as ClueCat; }
    public updateTabVisuals(): void { this.updateTabStyles(); }
}