import Phaser from 'phaser';
import { ClueManager } from './clueManager';
import { ICategorySwitcher, ClueCat } from "./journalTabs";
import { tutorialCases } from '../../data/cases/tutorialCases';
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs';
import { UIManager } from '../managers/UIManager';
import { TutorialCase } from '../../cases/TutorialCase';
import { Clue } from '../classes/clue';
import { GameState, BoardNodePosition, BoardConnectionData } from '../managers/GameState';

type JournalTab = 'Mice' | 'Clues' | 'Board' | 'Accuse';
// A new type to help manage draggable items on the board
type BoardNode = { id: string, type: 'person' | 'clue', gameObject: Phaser.GameObjects.Container };

export class CaseDetailsScene extends Phaser.Scene implements ICategorySwitcher {
    private originScene!: string;
    private clueManager!: ClueManager;
    private activeCaseId!: string;
    private activeCaseData!: any;
    private activeTab: JournalTab = 'Mice';
    private gameState!: GameState;
     private headerContainer!: Phaser.GameObjects.Container; // NEW: To easily hide/show
    private tabsContainer!: Phaser.GameObjects.Container;   // NEW: To easily hide/show
    // --- All existing UI elements ---
    private journalContainer!: Phaser.GameObjects.Container;
    private tabs: { [key in JournalTab]?: Phaser.GameObjects.Text } = {};
    private contentPanes: { [key in JournalTab]?: Phaser.GameObjects.Container } = {};

    // --- State for Accuse Tab ---
    private selectedSuspectId: string | null = null;
    private suspectCardMap: Map<string, Phaser.GameObjects.Container> = new Map();
    private accuseDetailsContainer?: Phaser.GameObjects.Container;
    private accuseButton?: Phaser.GameObjects.Container;

    // --- NEW: State for Board Tab ---
    private boardNodes: BoardNode[] = [];
    private connections: { from: BoardNode, to: BoardNode }[] = [];
    private connectionLine!: Phaser.GameObjects.Graphics;
    private isConnecting: boolean = false;
    private connectionStartNode: BoardNode | null = null;
    private isBoardFullscreen: boolean = false; // <-- NEW: For fullscreen state
    private boardDragBounds!: Phaser.Geom.Rectangle;
    private initialJournalScale: number = 1;

    constructor() {
        super({ key: 'CaseDetailsScene' });
    }

    // --- LIFECYCLE METHODS ---

    preload() {
        this.load.image('journal_details_bg', 'assets/journal_assets/journal_details_bg.png');
        Object.values(AllNPCsConfigs).forEach(npc => {
            if (npc.portrait?.textureKey && !this.textures.exists(npc.portrait.textureKey)) {
                this.load.image(npc.portrait.textureKey, `assets/npc/portraits/${npc.portrait.textureKey}.png`);
            }
        });
    }

    init(data: { caseId: string; originScene: string; clueManager: ClueManager }) {
        this.activeCaseId = data.caseId;
        this.originScene = data.originScene;
        this.clueManager = data.clueManager;
        this.activeCaseData = (tutorialCases.cases as any)[this.activeCaseId];
        this.gameState = GameState.getInstance();
    }

    create() {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive();

        this.buildJournalUI();
    }
    
    update() {
        // This is new: it redraws the connection lines on the board every frame
        if (this.activeTab === 'Board' && !this.isBoardFullscreen) {
            this.drawConnections();
        }
    }

    // --- UI BUILDING ---
    private buildJournalUI() {
        const { width, height } = this.scale;
        this.journalContainer = this.add.container(width / 2, height / 2);

        const bg = this.add.image(0, 0, 'journal_details_bg');
        this.initialJournalScale = Math.min((width * 0.9) / bg.width, (height * 0.9) / bg.height);
        this.journalContainer.setScale(this.initialJournalScale); // Set the initial scale
        this.journalContainer.add(bg);

        const containerWidth = bg.width;
        const containerHeight = bg.height;

        // Create containers for UI sections to make them easy to hide
        this.headerContainer = this.add.container(0, 0);
        this.tabsContainer = this.add.container(0, 0);
        this.journalContainer.add([this.headerContainer, this.tabsContainer]);

        this.createHeader(containerWidth, containerHeight);
        this.createTabs(containerWidth, containerHeight);

        this.contentPanes['Mice'] = this.createMiceContent(containerWidth, containerHeight);
        this.contentPanes['Clues'] = this.createCluesContent(containerWidth, containerHeight);
        this.contentPanes['Board'] = this.createBoardContent(containerWidth, containerHeight);
        this.contentPanes['Accuse'] = this.createAccuseContent(containerWidth, containerHeight);
        
        this.journalContainer.add(Object.values(this.contentPanes).filter(p => p));
        this.switchTab('Mice', true);

        const closeButton = this.add.text(containerWidth / 2 - 30, -containerHeight / 2 + 30, 'X', { fontSize: '24px', color: '#8B4513', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => this.closeJournal());
        this.journalContainer.add(closeButton);
    }
    
    private createHeader(width: number, height: number) {
        // This function is complete and correct from your provided code
        const headerY = -height / 2 + 80;
        const backButton = this.add.text(-width / 2 + 80, headerY - 30, '◀ All Cases', { fontSize: '18px', color: '#8B4513', fontStyle: 'bold' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        backButton.on('pointerdown', () => this.scene.start('CaseSelectionScene', { originScene: this.originScene }));
        const infoBoxWidth = width * 0.85;
        const infoBox = this.add.graphics().fillStyle(0xfdf6e3, 0.8).lineStyle(2, 0xd2b48c, 1);
        infoBox.fillRoundedRect(-infoBoxWidth / 2, headerY, infoBoxWidth, 150, 10).strokeRoundedRect(-infoBoxWidth / 2, headerY, infoBoxWidth, 150, 10);
        const title = this.add.text(0, headerY + 25, this.activeCaseData.case_title, { fontFamily: 'Georgia, serif', fontSize: '32px', color: '#543d25' }).setOrigin(0.5, 0);
        const description = this.add.text(0, headerY + 70, this.activeCaseData.case_description_player_task, { fontSize: '16px', color: '#8B4513', wordWrap: { width: infoBoxWidth - 40 }, align: 'center' }).setOrigin(0.5, 0);
        this.headerContainer.add([backButton, infoBox, title, description]); // Add to header container
        this.createTag(width * 0.25, headerY + 110, this.activeCaseData.status || 'OPEN', 0xfbc47a, this.headerContainer);
        this.createTag(-width * 0.25, headerY + 110, `Oct 15, 2025`, 0xc5d8a4, this.headerContainer);
    }
    
    private createTag(x: number, y: number, text: string, color: number, container: Phaser.GameObjects.Container) {
        // ... (This function now takes a container to add to)
        const tagText = this.add.text(x, y, text.toUpperCase(), { fontSize: '14px', color: '#6b4f2c', fontStyle: 'bold' }).setOrigin(0.5);
        const textWidth = tagText.width + 20;
        const tagBg = this.add.graphics().fillStyle(color, 0.7).fillRoundedRect(x - textWidth / 2, y - 12, textWidth, 24, 12);
        container.add([tagBg, tagText]);
    }
    // --- TAB MANAGEMENT ---
    
    private createTabs(width: number, height: number) {
        // ... (This function is the same, but adds elements to `this.tabsContainer`)
        const tabsY = -height / 2 + 270;
        const tabsWidth = width * 0.85;
        const tabNames: JournalTab[] = ['Mice', 'Clues', 'Board', 'Accuse'];
        const tabsBg = this.add.graphics().fillStyle(0xd2b48c, 0.5).fillRoundedRect(-tabsWidth / 2, tabsY, tabsWidth, 40, 8);
        this.tabsContainer.add(tabsBg);
        const tabWidth = tabsWidth / tabNames.length;
        tabNames.forEach((name, index) => {
            const tabX = -tabsWidth / 2 + (index * tabWidth) + (tabWidth / 2);
            const tabText = this.add.text(tabX, tabsY + 20, name, { fontSize: '18px', color: '#8B4513', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            tabText.on('pointerdown', () => this.switchTab(name));
            this.tabsContainer.add(tabText); // Add to tabs container
            this.tabs[name] = tabText;
        });
    }

    private switchTab(tabName: JournalTab, force: boolean = false) {
        if (!force && this.activeTab === tabName) return;

        // Reset board connection state when switching away from it
        if (this.activeTab === 'Board') {
            this.isConnecting = false;
            this.connectionStartNode = null;
        }

        this.activeTab = tabName;
        this.updateTabStyles();

        for (const key in this.contentPanes) {
            this.contentPanes[key as JournalTab]?.setVisible(false);
        }
        
        const activePane = this.contentPanes[this.activeTab];
        if (activePane) {
            activePane.setVisible(true);
        }
    }

    private updateTabStyles() {
        for (const tabName in this.tabs) {
            const tabText = this.tabs[tabName as JournalTab];
            if (tabText) {
                tabText.setColor(tabName === this.activeTab ? '#fdf6e3' : '#8B4513');
            }
        }
    }
    
    // --- CONTENT PANE CREATORS (Mice, Clues, Accuse) ---
private createMiceContent(width: number, height: number): Phaser.GameObjects.Container {
    const contentY = -height / 2 + 330;
    const container = this.add.container(0, contentY);

    const suspectIds = (TutorialCase as any).suspects;
    const suspects = suspectIds.map((id: string) => (AllNPCsConfigs as any)[id]);
    
    // --- Layout Logic ---
    const columns = 2;
    const cardSpacing = 20;
    const tempCard = this.createPersonCard(suspects[0] || {});
    const cardWidth = tempCard.width;
    const cardHeight = tempCard.height;
    tempCard.destroy(); 
    
    const totalGridWidth = (columns * cardWidth) + ((columns - 1) * cardSpacing);
    const startX = -totalGridWidth / 2;

    const scrollableContainer = this.add.container(0, 0);
    container.add(scrollableContainer);

    suspects.forEach((suspect: any, index: number) => {
        if (!suspect) return;
        
        const col = index % columns;
        const row = Math.floor(index / columns);
        
        const xPos = startX + col * (cardWidth + cardSpacing);
        const yPos = row * (cardHeight + cardSpacing);

        const card = this.createPersonCard(suspect);
        card.setPosition(xPos, yPos);
        scrollableContainer.add(card);
    });
    
    // --- SCROLLBAR LOGIC ---
    const visibleHeight = 480; 
    const totalContentHeight = Math.ceil(suspects.length / columns) * (cardHeight + cardSpacing) - cardSpacing; // Remove last spacing

    if (totalContentHeight > visibleHeight) {
        // 1. Create a mask to hide the overflowing content
        const mask = this.make.graphics();
        mask.fillStyle(0xffffff);
        // Position the mask correctly relative to the main container's new position
        mask.fillRect(container.x + startX, container.y, totalGridWidth, visibleHeight);
        scrollableContainer.setMask(mask.createGeometryMask());

        // 2. Create the scrollbar track and handle
        const scrollbarWidth = 10;
        const scrollbarX = startX + totalGridWidth + 15; // Position to the right of the grid

        const track = this.add.graphics();
        track.fillStyle(0x5D4037, 0.5); // Brownish, semi-transparent track
        track.fillRoundedRect(scrollbarX, 0, scrollbarWidth, visibleHeight, 5);
        container.add(track);

        const handleHeight = Math.max(20, visibleHeight * (visibleHeight / totalContentHeight));
        const handle = this.add.graphics();
        handle.fillStyle(0xD2B48C, 1); // Parchment-colored handle
        handle.fillRoundedRect(0, 0, scrollbarWidth, handleHeight, 5);
        const handleContainer = this.add.container(scrollbarX, 0, handle).setInteractive({ draggable: true });
        container.add(handleContainer);
        this.input.setDraggable(handleContainer);
        
        // --- Scrolling functions ---
        const updateScroll = () => {
            const scrollPercentage = -scrollableContainer.y / (totalContentHeight - visibleHeight);
            handleContainer.y = scrollPercentage * (visibleHeight - handleHeight);
        };
        
        // 3. Handle Mouse Wheel Scrolling
        const zone = this.add.zone(0, 0, totalGridWidth, visibleHeight).setOrigin(0.5, 0).setInteractive();
        container.add(zone); // Add zone to the main container for correct positioning
        
        zone.on('wheel', (pointer: Phaser.Input.Pointer, dx: number, dy: number) => {
            scrollableContainer.y -= dy * 0.5;
            scrollableContainer.y = Phaser.Math.Clamp(scrollableContainer.y, visibleHeight - totalContentHeight, 0);
            updateScroll(); // Update handle position
        });

        // 4. Handle Dragging the Scrollbar Handle
        handleContainer.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            handleContainer.y = Phaser.Math.Clamp(dragY, 0, visibleHeight - handleHeight);
            const scrollPercentage = handleContainer.y / (visibleHeight - handleHeight);
            scrollableContainer.y = -scrollPercentage * (totalContentHeight - visibleHeight);
        });
    }
    
    return container;
}

private createPersonCard(suspect: any): Phaser.GameObjects.Container {
    // --- STYLING LOGIC ---
    const cardWidth = 360; 
    const cardHeight = 220;
    const card = this.add.container(0, 0);

    // --- Card Background ---
    const bg = this.add.graphics();
    bg.fillStyle(0xfdf6e3, 1); // Parchment background color
    bg.lineStyle(2, 0xd2b48c, 1); // Light brown border
    bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 16);
    bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 16);
    
    // --- Circular Portrait ---
    const portraitX = 70;
    const portraitY = 70;
    const portraitKey = suspect.portrait?.textureKey || 'portrait_unknown';
    const portrait = this.add.image(portraitX, portraitY, portraitKey).setScale(0.3); // Adjust scale if needed

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillCircle(portraitX, portraitY, 50); // 50px radius for the circle
    const mask = maskShape.createGeometryMask();
    portrait.setMask(mask);

    // --- Text Content ---
    const name = this.add.text(140, 30, suspect.displayName || 'Unknown', { 
        fontSize: '24px', color: '#543d25', fontStyle: 'bold', fontFamily: 'ReplaceTheSun'
    });
    
    const description = this.add.text(140, 60, `"${suspect.description || ''}"`, { 
        fontSize: '14px', color: '#8B4513', fontStyle: 'italic', wordWrap: { width: cardWidth - 150 } 
    });

    const alibiIcon = this.add.text(30, 120, '💡', { fontSize: '20px' });
    const alibiTitle = this.add.text(60, 122, 'Alibi:', { fontSize: '16px', color: '#543d25', fontStyle: 'bold' });
    const alibiText = this.add.text(60, 142, suspect.alibi || 'None provided.', { 
        fontSize: '14px', color: '#3c5d98', wordWrap: { width: cardWidth - 80 } 
    });

    const motiveIcon = this.add.text(30, 170, '❓', { fontSize: '20px' });
    const motiveTitle = this.add.text(60, 172, 'Possible Motive:', { fontSize: '16px', color: '#543d25', fontStyle: 'bold' });
    const motiveText = this.add.text(60, 192, suspect.culpritDetails?.motive || 'None apparent.', { 
        fontSize: '14px', color: '#c74c3c', wordWrap: { width: cardWidth - 80 } 
    });

    card.add([bg, portrait, name, description, alibiIcon, alibiTitle, alibiText, motiveIcon, motiveTitle, motiveText]);
    card.setSize(cardWidth, cardHeight);
    
    return card;
}

    private createCluesContent(width: number, height: number): Phaser.GameObjects.Container {
        const contentY = -height / 2 + 330;
        const contentWidth = width * 0.85;
        const container = this.add.container(0, contentY);
        const allClues = this.clueManager.getAllClues().filter(c => c.discovered);
        const colWidth = (contentWidth - 20) / 2;
        if (allClues.length === 0) {
            container.add(this.add.text(0, 50, "🔍 No clues discovered yet. Keep investigating!", { fontSize: '18px', color: '#8B4513', align: 'center' }).setOrigin(0.5));
            return container;
        }
        allClues.forEach((clue, index) => {
            const card = this.createClueCard(clue, colWidth);
            const col = index % 2;
            const row = Math.floor(index / 2);
            const xPos = col === 0 ? -contentWidth / 2 : -contentWidth / 2 + colWidth + 20;
            const yPos = row * (card.height + 20);
            card.setPosition(xPos, yPos);
            container.add(card);
        });
        return container;
    }

    private createClueCard(clue: Clue, width: number): Phaser.GameObjects.Container {
        const cardHeight = 160;
        const container = this.add.container(0, 0);
        const bg = this.add.graphics();
        bg.fillStyle(0xEBF5FF, 0.7);
        bg.lineStyle(2, 0x90CDF4, 1);
        bg.fillRoundedRect(0, 0, width, cardHeight, 10);
        bg.strokeRoundedRect(0, 0, width, cardHeight, 10);
        const name = this.add.text(20, 20, clue.title, { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1A365D', fontStyle: 'bold', wordWrap: { width: width - 40} });
        const description = this.add.text(20, 50, clue.description, { fontSize: '14px', color: '#2A4365', wordWrap: { width: width - 40} });
        const significance = this.add.text(20, 100, `💡 Significance: ${clue.significance || 'Not yet determined.'}`, { fontSize: '12px', color: '#4A5568', fontStyle: 'italic', wordWrap: { width: width - 40 } });
        container.add([bg, name, description, significance]);
        container.setSize(width, cardHeight);
        return container;
    }
    
    private createAccuseContent(width: number, height: number): Phaser.GameObjects.Container {
        const contentY = -height / 2 + 330;
        const contentWidth = width * 0.85;
        const container = this.add.container(0, contentY);
        const title = this.add.text(-contentWidth / 2, 0, '⚖️ Make Your Accusation', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#543d25' });
        container.add(title);
        const alertY = 40;
        const alertBox = this.add.graphics();
        alertBox.fillStyle(0xfff5f5, 0.8);
        alertBox.lineStyle(2, 0xfca5a5, 1);
        alertBox.fillRoundedRect(-contentWidth / 2, alertY, contentWidth, 80, 10);
        alertBox.strokeRoundedRect(-contentWidth / 2, alertY, contentWidth, 80, 10);
        const alertTitle = this.add.text(-contentWidth / 2 + 20, alertY + 15, 'This is it, Inspector!', { fontSize: '18px', color: '#991b1b', fontStyle: 'bold' });
        const alertDesc = this.add.text(-contentWidth / 2 + 20, alertY + 40, 'Choose carefully. Once you accuse a suspect, your decision is final.', { fontSize: '14px', color: '#b91c1c', wordWrap: { width: contentWidth - 40 } });
        container.add([alertBox, alertTitle, alertDesc]);
        const gridY = alertY + 100;
        const suspectIds = (TutorialCase as any).suspects;
        const colCount = 3;
        const cardWidth = (contentWidth - (20 * (colCount - 1))) / colCount;
        suspectIds.forEach((id: string, index: number) => {
            const card = this.createSuspectCard(id, cardWidth);
            const col = index % colCount;
            const row = Math.floor(index / colCount);
            const xPos = -contentWidth / 2 + col * (cardWidth + 20);
            const yPos = gridY + row * (card.height + 20);
            card.setPosition(xPos, yPos);
            container.add(card);
            this.suspectCardMap.set(id, card);
        });
        const detailsY = gridY + 180;
        this.accuseDetailsContainer = this.add.container(0, detailsY).setVisible(false);
        container.add(this.accuseDetailsContainer);
        const buttonY = detailsY + 130;
        this.accuseButton = this.createAccuseButton(contentWidth).setY(buttonY);
        container.add(this.accuseButton);
        return container;
    }

    private createSuspectCard(suspectId: string, width: number): Phaser.GameObjects.Container {
        const height = 150;
        const card = this.add.container(0, 0);
        const suspect = (AllNPCsConfigs as any)[suspectId];
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.lineStyle(2, 0xd2b48c, 1);
        bg.fillRoundedRect(0, 0, width, height, 10);
        bg.strokeRoundedRect(0, 0, width, height, 10);
        const maskShape = this.add.circle(width / 2, 50, 40);
        const mask = maskShape.createGeometryMask();
        const portrait = this.add.image(width / 2, 50, suspect.portrait.textureKey || 'portrait_unknown')
            .setDisplaySize(80, 80)
            .setMask(mask);
        const name = this.add.text(width / 2, 105, suspect.displayName, { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#543d25' }).setOrigin(0.5);
        const selectionIndicator = this.add.graphics().setName('selectionIndicator');
        card.add([bg, portrait, name, selectionIndicator]);
        card.setSize(width, height).setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => this.handleSuspectSelected(suspectId));
        return card;
    }

    private handleSuspectSelected(suspectId: string) {
        this.selectedSuspectId = suspectId;
        this.suspectCardMap.forEach((card, id) => {
            const indicator = card.getByName('selectionIndicator') as Phaser.GameObjects.Graphics;
            indicator.clear();
            if (id === suspectId) {
                indicator.lineStyle(4, 0xef4444, 1);
                indicator.strokeRoundedRect(0, 0, card.width, card.height, 10);
            }
        });
        this.populateAccuseDetails(suspectId);
        this.accuseDetailsContainer?.setVisible(true);
        this.accuseButton?.setAlpha(1);
        (this.accuseButton?.getAt(1) as Phaser.GameObjects.Text).setText(`⚖️ Accuse ${ (AllNPCsConfigs as any)[suspectId].displayName }`);
        (this.accuseButton?.getAt(0) as Phaser.GameObjects.GameObject).setInteractive();
    }
    
    private populateAccuseDetails(suspectId: string) {
        this.accuseDetailsContainer?.removeAll(true);
        const suspect = (AllNPCsConfigs as any)[suspectId];
        if (!suspect) return;
        const width = this.journalContainer.width * 0.85;
        const bg = this.add.graphics();
        bg.fillStyle(0xfdf6e3, 0.8);
        bg.fillRoundedRect(-width/2, 0, width, 120, 10);
        const alibi = this.add.text(-width/2 + 20, 20, `📍 Alibi: ${suspect.alibi || 'Not provided'}`, { fontSize: '14px', color: '#1e40af', wordWrap: { width: width - 40} });
        const motive = this.add.text(-width/2 + 20, 60, `⚠️ Motive: ${suspect.culpritDetails?.motive || 'Not clear'}`, { fontSize: '14px', color: '#991b1b', wordWrap: { width: width - 40} });
        this.accuseDetailsContainer?.add([bg, alibi, motive]);
    }

    private createAccuseButton(width: number): Phaser.GameObjects.Container {
        const btnContainer = this.add.container(0, 0);
        const btnWidth = width * 0.7;
        const btnHeight = 60;
        const bg = this.add.graphics();
        bg.fillStyle(0xdc2626, 1);
        bg.fillRoundedRect(-btnWidth / 2, 0, btnWidth, btnHeight, 30);
        const text = this.add.text(0, btnHeight / 2, '⚖️ Accuse Suspect', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        btnContainer.add([bg, text]);
        btnContainer.setSize(btnWidth, btnHeight).setAlpha(0.5);
        bg.on('pointerdown', () => {
            if (this.selectedSuspectId) {
                this.scene.get('ToturialScene').scene.start('GameOver', {
                     reason: `You accused ${ (AllNPCsConfigs as any)[this.selectedSuspectId].displayName }.`,
                     fromSceneKey: this.originScene
                });
            }
        });
        return btnContainer;
    }

    // --- NEW: BOARD TAB IMPLEMENTATION ---

    private createBoardContent(width: number, height: number): Phaser.GameObjects.Container {
        const contentY = -height / 2 + 330;
        const contentWidth = width * 0.85;
        const contentHeight = height - 370;
        const container = this.add.container(0, contentY);
        container.add(this.add.text(-contentWidth / 2, 0, '📌 Evidence Board', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#543d25' }));
        container.add(this.add.text(-contentWidth / 2, 35, 'How to use: Drag items to move. Click "+ Connect", then click another item to link them.', { fontSize: '12px', color: '#8B4513', wordWrap: { width: contentWidth - 80 } }));
        
        const fullscreenButton = this.add.text(contentWidth / 2, 10, '[⤢]', { fontSize: '24px', color: '#543d25'}).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        fullscreenButton.on('pointerdown', () => this.toggleBoardFullscreen(fullscreenButton));
        container.add(fullscreenButton);

        const boardY = 70;
        const boardArea = this.add.graphics().fillStyle(0xfde68a, 1).fillRoundedRect(-contentWidth / 2, boardY, contentWidth, contentHeight - boardY, 10);
        container.add(boardArea);
        
        this.boardDragBounds = new Phaser.Geom.Rectangle(-contentWidth / 2, boardY, contentWidth, contentHeight - boardY);
        boardArea.setInteractive(this.boardDragBounds, Phaser.Geom.Rectangle.Contains)
                 .on('pointerdown', () => { if(this.isConnecting) { this.isConnecting = false; this.connectionStartNode = null; } });
        
        this.connectionLine = this.add.graphics();
        container.add(this.connectionLine);
        
        this.boardNodes = [];
        const suspectIds = (TutorialCase as any).suspects;
        suspectIds.forEach((id: string, index: number) => {
            const node = this.createBoardNode(id, 'person');
            const savedPos = this.gameState.boardNodePositions[id];
            node.setPosition(savedPos?.x ?? -contentWidth / 2 + 100, savedPos?.y ?? boardY + 70 + index * 120);
            container.add(node);
            this.boardNodes.push({ id, type: 'person', gameObject: node });
        });
        
        const allClues = this.clueManager.getAllClues().filter(c => c.discovered);
        allClues.forEach((clue, index) => {
            const node = this.createBoardNode(clue.id, 'clue');
            const savedPos = this.gameState.boardNodePositions[clue.id];
            node.setPosition(savedPos?.x ?? contentWidth / 2 - 100, savedPos?.y ?? boardY + 70 + index * 120);
            container.add(node);
            this.boardNodes.push({ id: clue.id, type: 'clue', gameObject: node });
        });

        this.connections = [];
        this.gameState.boardConnections.forEach(connData => {
            const fromNode = this.boardNodes.find(n => n.id === connData.fromId);
            const toNode = this.boardNodes.find(n => n.id === connData.toId);
            if (fromNode && toNode) this.connections.push({ from: fromNode, to: toNode });
        });
        
        return container;
    }

    private createBoardNode(id: string, type: 'person' | 'clue'): Phaser.GameObjects.Container {
        const width = 180;
        const height = 100;
        const nodeContainer = this.add.container(0,0).setSize(width, height).setInteractive();
        
        this.input.setDraggable(nodeContainer, true);
        nodeContainer.on('drag', (p: any, dragX: number, dragY: number) => {
            const halfW = nodeContainer.width / 2;
            const halfH = nodeContainer.height / 2;
            const constrainedX = Phaser.Math.Clamp(dragX, this.boardDragBounds.left + halfW, this.boardDragBounds.right - halfW);
            const constrainedY = Phaser.Math.Clamp(dragY, this.boardDragBounds.top + halfH, this.boardDragBounds.bottom - halfH);
            nodeContainer.setPosition(constrainedX, constrainedY);

            this.gameState.boardNodePositions[id] = { x: constrainedX, y: constrainedY };
            this.gameState.save();
        });
        
        const bg = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-width/2, -height/2, width, height, 8);
        const labelText = type === 'person' ? (AllNPCsConfigs as any)[id]?.displayName : this.clueManager.getClue(id)?.title;
        const label = this.add.text(0, -10, labelText, { fontSize: '14px', color: '#000', align: 'center', wordWrap: { width: width - 20 } }).setOrigin(0.5);
        const connectButton = this.add.text(0, 30, '[ + Connect ]', { fontSize: '12px', color: '#1e40af' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        nodeContainer.add([bg, label, connectButton]);

        connectButton.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            this.handleConnectionStart(id, type);
        });
        nodeContainer.on('pointerdown', () => { if (this.isConnecting) this.handleConnectionEnd(id, type); });

        return nodeContainer;
    }

    private toggleBoardFullscreen(button: Phaser.GameObjects.Text) {
        this.isBoardFullscreen = !this.isBoardFullscreen;
        
        const boardPane = this.contentPanes.Board;
        if (!boardPane) return;

        const { width, height } = this.scale;
        
        // Hide/show other journal elements
        this.headerContainer.setVisible(!this.isBoardFullscreen);
        this.tabsContainer.setVisible(!this.isBoardFullscreen);
        (this.journalContainer.getAt(0) as Phaser.GameObjects.Image).setVisible(!this.isBoardFullscreen);

        button.setText(this.isBoardFullscreen ? '[⤡]' : '[⤢]');

        // --- REWRITTEN & CORRECTED ANIMATION LOGIC ---

        let targetScale: number;
        let targetY: number;
        
        if (this.isBoardFullscreen) {
            // --- GOING FULLSCREEN ---
            // 1. Calculate the scale needed to make the board fill 90% of the screen's height.
            const boardHeight = this.boardDragBounds.height;
            targetScale = (height * 0.9) / (boardHeight * this.initialJournalScale);

            // 2. Calculate the Y position needed to center the board on the screen.
            // This counteracts the board's natural offset within the journal.
            const boardCenterYinPane = this.boardDragBounds.centerY;
            const paneY = boardPane.y;
            const totalOffsetY = (paneY + boardCenterYinPane) * this.initialJournalScale;
            
            targetY = (height / 2) - (totalOffsetY * (targetScale / this.initialJournalScale));

        } else {
            // --- RETURNING TO NORMAL ---
            // Simply return to the original scale and centered position.
            targetScale = this.initialJournalScale;
            targetY = height / 2;
        }
        
        // Animate the main journal container to the new scale and position.
        this.tweens.add({
            targets: this.journalContainer,
            scale: targetScale,
            x: width / 2, // Always keep horizontally centered
            y: targetY,   // Animate to the new calculated Y position
            duration: 400,
            ease: 'Cubic.easeInOut'
        });
    }


    private handleConnectionEnd(id: string, type: 'person' | 'clue') {
        const endNode = this.boardNodes.find(n => n.id === id) || null;
        if (this.connectionStartNode && endNode && this.connectionStartNode.id !== endNode.id) {
            
            const alreadyExists = this.gameState.boardConnections.some(
                c => (c.fromId === this.connectionStartNode!.id && c.toId === endNode.id) ||
                     (c.fromId === endNode.id && c.toId === this.connectionStartNode!.id)
            );

            if (!alreadyExists) {
                // --- UPDATED: Save connection to GameState ---
                const connData = { fromId: this.connectionStartNode.id, toId: endNode.id };
                this.gameState.boardConnections.push(connData);
                this.gameState.save(); // <-- Save the change!
                this.connections.push({ from: this.connectionStartNode, to: endNode });
            }
        }
        this.isConnecting = false;
        this.connectionStartNode = null;
    }

    private handleConnectionStart(id: string, type: 'person' | 'clue') {
        this.isConnecting = true;
        this.connectionStartNode = this.boardNodes.find(n => n.id === id) || null;
    }


    private drawConnections() {
        this.connectionLine.clear().lineStyle(3, 0xef4444, 0.7); // Red string style

        const contentPane = this.contentPanes.Board;
        if (!contentPane) return;

        // Draw existing connections using the nodes' local positions within the pane
        this.connections.forEach(conn => {
            const startNode = conn.from.gameObject;
            const endNode = conn.to.gameObject;
            this.connectionLine.lineBetween(startNode.x, startNode.y, endNode.x, endNode.y);
        });

        // --- THIS IS THE CORRECTED PART FOR THE PREVIEW LINE ---
        if (this.isConnecting && this.connectionStartNode) {
            const startNode = this.connectionStartNode.gameObject;

            // Create a temporary point to hold the mouse's world coordinates
            const pointerPosition = new Phaser.Math.Vector2(this.input.activePointer.x, this.input.activePointer.y);
            
            // Get the transformation matrix of the board's content pane
            const matrix = contentPane.getWorldTransformMatrix();
            
            // Invert it to create a transform from world space -> local space
            matrix.invert();
            
            // Apply the transformation to our pointer's position
            matrix.transformPoint(pointerPosition.x, pointerPosition.y, pointerPosition);

            // Now, pointerPosition contains the mouse's coordinates *relative to the board pane*
            // This will make the line draw correctly.
            this.connectionLine.lineBetween(
                startNode.x, 
                startNode.y,
                pointerPosition.x,
                pointerPosition.y
            );
        }
    }

    // --- UTILITY AND INTERFACE METHODS ---

    private closeJournal() {
        UIManager.getInstance().setJournalHotkeyEnabled(false);
        const origin = this.scene.get(this.originScene);
        this.scene.stop();
        if (origin) {
            this.scene.resume(this.originScene);
            if (this.scene.isSleeping('UIGameScene')) this.scene.wake('UIGameScene');
            origin.time.delayedCall(200, () => UIManager.getInstance().setJournalHotkeyEnabled(true));
        }
    }
    
    public switchCat(category: ClueCat): void {}
    public getActiveCat(): ClueCat { return this.activeTab as ClueCat; }
    public updateTabVisuals(): void { this.updateTabStyles(); }
}