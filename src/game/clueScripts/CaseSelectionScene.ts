import Phaser from 'phaser';
import { tutorialCases } from '../../data/cases/tutorialCases';
import { UIManager } from '../managers/UIManager';

export class CaseSelectionScene extends Phaser.Scene {
    private originScene!: string;
    private casesData!: any;

    constructor() {
        super({ key: 'CaseSelectionScene' });
    }

    init(data: { originScene: string }) {
        this.originScene = data.originScene;
    }

    create() {
        console.log('[CaseSelectionScene] 1. Starting create()');

        // --- NEW: MODAL INPUT BLOCKER & DEBUG ---
        // This creates a fullscreen, transparent, interactive rectangle.
        // Its job is to "steal" all input, preventing clicks from passing to the paused scene below.
        // It also helps ensure this scene's camera is active and on top.
        const blocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.0)
            .setOrigin(0)
            .setInteractive();

        blocker.on('pointerdown', () => {
            console.log('[CaseSelectionScene] Modal blocker was clicked! The scene IS receiving input.');
        });
        console.log(`[CaseSelectionScene] 1a. Input blocker created. Camera is at (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY})`);
        // --- END NEW PART ---

        const { width, height } = this.scale;

        console.log('[CaseSelectionScene] 2. Adding overlay rectangle');
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        console.log('[CaseSelectionScene] 3. Drawing main background');
        const mainBg = this.add.graphics();
        mainBg.fillStyle(0x4a2e1a, 1);
        mainBg.fillRoundedRect(width / 2 - 450, height / 2 - 300, 900, 600, 20);

        console.log('[CaseSelectionScene] 4. Adding title text');
        const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Georgia, serif', fontSize: '42px', color: '#f5e6d3', fontStyle: 'bold',
        };
        this.add.text(width / 2, height / 2 - 230, 'CASE JOURNAL', titleStyle).setOrigin(0.5);

        console.log('[CaseSelectionScene] 5. Preparing to load case data');
        const listContainer = this.add.container(width / 2, height / 2 - 120);

        this.casesData = tutorialCases;
        console.log('[CaseSelectionScene] 6. Case data loaded:', this.casesData);

        let activeCases = Object.entries(this.casesData.cases).filter(([, caseData]: [string, any]) => caseData.active);
        console.log(`[CaseSelectionScene] 7. Found ${activeCases.length} active cases.`);

        if (activeCases.length === 0) {
            console.log('[CaseSelectionScene] 7a. No active cases, using all cases as fallback.');
            activeCases = Object.entries(this.casesData.cases);
        }

        console.log('[CaseSelectionScene] 8. Starting to create case cards...');
        let yPos = 0;
        const cardHeight = 150;
        const cardSpacing = 20;
        const cardWidth = 750;

        for (const [caseId, caseData] of activeCases) {
            const card = this.createCaseCard(0, yPos, cardWidth, cardHeight, caseId, caseData as any);
            listContainer.add(card);
            yPos += cardHeight + cardSpacing;
        }
        console.log('[CaseSelectionScene] 9. Finished creating case cards.');

        this.addCloseButton();
        console.log('[CaseSelectionScene] 10. create() method finished successfully.');
    }

    private createCaseCard(x: number, y: number, width: number, height: number, caseId: string, caseData: any): Phaser.GameObjects.Container {
        const card = this.add.container(x, y);

        const cardBg = this.add.graphics();
        cardBg.fillStyle(0xf5e6d3, 1);
        cardBg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);

        const title = this.add.text(-width / 2 + 40, -height / 2 + 20, caseData.case_title, {
            fontSize: '20px', color: '#333333', fontStyle: 'bold'
        });

        const descWidth = width - 200;
        const descHeight = height - 80; // visible window for the description text
        const descY = -height / 2 + 48;
        const description = this.add.text(-width / 2 + 40, descY, caseData.case_description_task, {
            fontSize: '14px', color: '#555555', wordWrap: { width: descWidth }
        });

        // Use crop to clip text; only enable scroll when it actually overflows
        description.setCrop(0, 0, descWidth, descHeight);

        let scrollOffset = 0;
        const maxScroll = Math.max(0, description.height - descHeight);
        const scrollZone = this.add.zone(-width / 2 + 40, descY, descWidth, descHeight).setOrigin(0);

        // Optional scrollbar visuals
        let handleContainer: Phaser.GameObjects.Container | undefined;
        if (maxScroll > 0) {
            // Track
            const barX = -width / 2 + 40 + descWidth + 6;
            const track = this.add.graphics({ x: barX, y: descY });
            const trackWidth = 10;
            track.fillStyle(0x4a2e1a, 0.85);
            track.fillRoundedRect(0, 0, trackWidth, descHeight, 4);

            // Handle
            const handleHeight = Math.max(20, descHeight * (descHeight / (description.height || descHeight)));
            const handle = this.add.graphics();
            handle.fillStyle(0xf4a460, 1);
            handle.fillRoundedRect(0, 0, trackWidth, handleHeight, 4);
            handleContainer = this.add.container(barX, descY, handle);
            handleContainer
                .setSize(trackWidth, handleHeight)
                .setInteractive(new Phaser.Geom.Rectangle(0, 0, trackWidth, handleHeight), Phaser.Geom.Rectangle.Contains);

            // Drag scrolling (requires interactive hit area)
            this.input.setDraggable(handleContainer, true);
            handleContainer.on('drag', (_p: any, _dx: number, dragY: number) => {
                const clampedY = Phaser.Math.Clamp(dragY, descY, descY + descHeight - handleHeight);
                handleContainer!.setY(clampedY);
                const pct = (clampedY - descY) / (descHeight - handleHeight);
                scrollOffset = pct * maxScroll;
                description.setCrop(0, scrollOffset, descWidth, descHeight);
            });

            scrollZone.setInteractive(); // keep for pointer hover if needed; wheel intentionally disabled
            card.add([track, handleContainer]);
        } else {
            // No overflow: remove crop so text renders normally and disable scroll interaction
            description.setCrop();
            scrollZone.disableInteractive();
        }

        const status = caseData.status || 'open';
        const statusColorHex = status === 'cold' ? 0x90b4d4 : 0xfbc47a;
        const statusBg = this.add.graphics();
        statusBg.fillStyle(statusColorHex, 1);
        statusBg.fillRoundedRect(width / 2 - 95, -15, 70, 30, 15);
        const statusText = this.add.text(width / 2 - 60, 0, status.toUpperCase(), {
            fontSize: '12px', color: '#333333', fontStyle: 'bold'
        }).setOrigin(0.5);

        card.add([cardBg, title, description, scrollZone, statusBg, statusText]);

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
        const closeButtonX = this.scale.width / 2 + 450 - 20;
        const closeButtonY = this.scale.height / 2 - 300 + 20;
        const closeButton = this.add.text(closeButtonX, closeButtonY, 'X', {
            fontSize: '24px', color: '#FFFFFF', backgroundColor: '#8B0000', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        closeButton.on('pointerdown', () => this.closeJournal());
        this.input.keyboard?.on('keydown-J', this.closeJournal, this);
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
}
