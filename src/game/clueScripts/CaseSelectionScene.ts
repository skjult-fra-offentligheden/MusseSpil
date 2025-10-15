import Phaser from 'phaser';
// Make sure to import your case data. The path might need adjustment.
import { tutorialCases } from '../../data/cases/tutorialCases';
import { UIManager } from '../managers/UIManager';

export class CaseSelectionScene extends Phaser.Scene {
    private originScene!: string;
    private casesData!: any;

    constructor() {
        super({ key: 'CaseSelectionScene' });
    }

    preload() {
        // We only need the document icon for the cards
        this.load.image('icon-document', 'assets/journal_assets/icon-document.png');
    }

    init(data: { originScene: string }) {
        this.originScene = data.originScene;
    }

    create() {
        const { width, height } = this.scale;

        // Dark overlay
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        // Main journal background (drawn with code to match Figma)
        const mainBg = this.add.graphics();
        mainBg.fillStyle(0x4a2e1a, 1); // Dark brown color
        mainBg.fillRoundedRect(width / 2 - 450, height / 2 - 300, 900, 600, 20);

        // --- Main Title ---
        const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Georgia, serif',
            fontSize: '42px',
            color: '#f5e6d3', // Light cream color
            fontStyle: 'bold',
        };
        this.add.text(width / 2, height / 2 - 230, 'CASE JOURNAL', titleStyle).setOrigin(0.5);

        // --- Case List ---
        const listContainer = this.add.container(width / 2, height / 2 - 120);

        this.casesData = tutorialCases;
        const activeCases = Object.entries(this.casesData.cases).filter(([, caseData]: [string, any]) => caseData.active);

        let yPos = 0;
        const cardHeight = 110;
        const cardSpacing = 20;
        const cardWidth = 750;

        for (const [caseId, caseData] of activeCases) {
            const card = this.createCaseCard(0, yPos, cardWidth, cardHeight, caseId, caseData as any);
            listContainer.add(card);
            yPos += cardHeight + cardSpacing;
        }

        this.addCloseButton();
    }

    private createCaseCard(x: number, y: number, width: number, height: number, caseId: string, caseData: any): Phaser.GameObjects.Container {
        const card = this.add.container(x, y);

        const cardBg = this.add.graphics();
        cardBg.fillStyle(0xf5e6d3, 1); // Light cream color
        cardBg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
        card.add(cardBg);

        const icon = this.add.image(-width / 2 + 50, 0, 'icon-document');
        const title = this.add.text(-width / 2 + 100, -height / 2 + 20, caseData.case_title, {
            fontSize: '18px', color: '#333333', fontStyle: 'bold'
        });
        const description = this.add.text(-width / 2 + 100, -height / 2 + 45, caseData.case_description_task, {
            fontSize: '14px', color: '#555555', wordWrap: { width: width - 220 }
        });
        card.add([icon, title, description]);

        const status = caseData.status || 'open';
        const statusColorHex = status === 'cold' ? 0x90b4d4 : 0xfbc47a; // Blue and Orange

        const statusBg = this.add.graphics();
        statusBg.fillStyle(statusColorHex, 1);
        statusBg.fillRoundedRect(width / 2 - 95, -15, 70, 30, 15);

        const statusText = this.add.text(width / 2 - 60, 0, status.toUpperCase(), {
            fontSize: '12px', color: '#333333', fontStyle: 'bold'
        }).setOrigin(0.5);
        card.add([statusBg, statusText]);

        card.setSize(width, height).setInteractive({ useHandCursor: true });

        card.on('pointerdown', () => {
            this.scene.start('CaseDetailsScene', {
                caseId: caseId,
                originScene: this.originScene,
                clueManager: (this.scene.get(this.originScene) as any).clueManager
            });
        });

        card.on('pointerover', () => cardBg.setAlpha(0.8));
        card.on('pointerout', () => cardBg.setAlpha(1.0));

        return card;
    }

    private addCloseButton() {
        const closeButton = this.add.text(this.scale.width - 30, 30, 'X', {
            fontSize: '24px', color: '#FFFFFF', backgroundColor: '#8B0000', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeButton.on('pointerdown', () => {
            UIManager.getInstance().setJournalHotkeyEnabled(false);
            this.scene.stop();
            this.scene.resume(this.originScene);
            this.time.delayedCall(150, () => UIManager.getInstance().setJournalHotkeyEnabled(true));
        });
    }
}