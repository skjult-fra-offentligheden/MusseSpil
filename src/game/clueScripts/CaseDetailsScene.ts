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
    private headerContainer!: Phaser.GameObjects.Container;
    private tabsContainer!: Phaser.GameObjects.Container;
    
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
    
    private isBoardFullscreen: boolean = false; 
    private boardDragBounds!: Phaser.Geom.Rectangle;
    private initialJournalScale: number = 1;
    
    private fullscreenBg!: Phaser.GameObjects.Rectangle; // Den store baggrund
    private smallBoardBounds!: Phaser.Geom.Rectangle;     // De originale grænser (inde i bogen)
    private boardZoneContainer!: Phaser.GameObjects.Container;
    
    // Den nye knap-container der ligger ovenpå alt
    private closeBtnContainer?: Phaser.GameObjects.Container; 

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
        } else if (this.activeTab === 'Board' && this.isBoardFullscreen) {
             // Tegn også connections i fullscreen mode
             this.drawConnections();
        }
    }

    // --- UI BUILDING ---
    private buildJournalUI() {
        const { width, height } = this.scale;
        this.journalContainer = this.add.container(width / 2, height / 2);

        // VIGTIGT: Vi giver den et navn, så vi kan finde den senere
        const bg = this.add.image(0, 0, 'journal_details_bg').setName('journalBackground');
        
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
        closeButton.setName('journalCloseBtn')
        closeButton.on('pointerdown', () => this.closeJournal());
        this.journalContainer.add(closeButton);
    }
    
    private createHeader(width: number, height: number) {
        const headerY = -height / 2 + 80;
        const backButton = this.add.text(-width / 2 + 80, headerY - 30, '◀ All Cases', { fontSize: '18px', color: '#8B4513', fontStyle: 'bold' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        backButton.on('pointerdown', () => this.scene.start('CaseSelectionScene', { originScene: this.originScene }));
        const infoBoxWidth = width * 0.85;
        const infoBox = this.add.graphics().fillStyle(0xfdf6e3, 0.8).lineStyle(2, 0xd2b48c, 1);
        infoBox.fillRoundedRect(-infoBoxWidth / 2, headerY, infoBoxWidth, 150, 10).strokeRoundedRect(-infoBoxWidth / 2, headerY, infoBoxWidth, 150, 10);
        const title = this.add.text(0, headerY + 25, this.activeCaseData.case_title, { fontFamily: 'Georgia, serif', fontSize: '32px', color: '#543d25' }).setOrigin(0.5, 0);
        const description = this.add.text(0, headerY + 70, this.activeCaseData.case_description_player_task, { fontSize: '16px', color: '#8B4513', wordWrap: { width: infoBoxWidth - 40 }, align: 'center' }).setOrigin(0.5, 0);
        this.headerContainer.add([backButton, infoBox, title, description]); 
        this.createTag(width * 0.25, headerY + 110, this.activeCaseData.status || 'OPEN', 0xfbc47a, this.headerContainer);
        this.createTag(-width * 0.25, headerY + 110, `Oct 15, 2025`, 0xc5d8a4, this.headerContainer);
    }
    
    private createTag(x: number, y: number, text: string, color: number, container: Phaser.GameObjects.Container) {
        const tagText = this.add.text(x, y, text.toUpperCase(), { fontSize: '14px', color: '#6b4f2c', fontStyle: 'bold' }).setOrigin(0.5);
        const textWidth = tagText.width + 20;
        const tagBg = this.add.graphics().fillStyle(color, 0.7).fillRoundedRect(x - textWidth / 2, y - 12, textWidth, 24, 12);
        container.add([tagBg, tagText]);
    }
    
    private createTabs(width: number, height: number) {
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
            this.tabsContainer.add(tabText); 
            this.tabs[name] = tabText;
        });
    }

    private switchTab(tabName: JournalTab, force: boolean = false) {
        if (!force && this.activeTab === tabName) return;

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
    
    // --- CONTENT PANE CREATORS ---

    private createMiceContent(width: number, height: number): Phaser.GameObjects.Container {
        const contentY = -height / 2 + 330;
        const container = this.add.container(0, contentY);

        const suspectIds = (TutorialCase as any).suspects;
        const suspects = suspectIds.map((id: string) => (AllNPCsConfigs as any)[id]);
        
        const columns = 2;
        const cardSpacing = 20;
        const tempCard = this.createPersonCard(suspects[0] || {});
        const cardWidth = tempCard.width;
        const cardHeight = tempCard.height;
        tempCard.destroy(); 
        
        const totalGridWidth = (columns * cardWidth) + ((columns - 1) * cardSpacing);
        const startX = -totalGridWidth / 2;

        const scrollableContainer = this.add.container(startX, 0);
        container.add(scrollableContainer);

        suspects.forEach((suspect: any, index: number) => {
            if (!suspect) return;
            const col = index % columns;
            const row = Math.floor(index / columns);
            const xPos = col * (cardWidth + cardSpacing);
            const yPos = row * (cardHeight + cardSpacing);
            const card = this.createPersonCard(suspect);
            card.setPosition(xPos, yPos);
            scrollableContainer.add(card);
        });
        
        const visibleHeight = 440; 
        const totalContentHeight = Math.ceil(suspects.length / columns) * (cardHeight + cardSpacing) - cardSpacing;

        if (totalContentHeight > visibleHeight) {
            const currentScale = this.journalContainer.scale;
            const maskPadding = 20;
            const extraSpaceBottom = 30;

            const maskHeight = visibleHeight * currentScale;
            const maskWidth = (totalGridWidth + (maskPadding * 2)) * currentScale;

            const maskX = (this.scale.width / 2) + ((startX - maskPadding) * currentScale);
            const maskY = (this.scale.height / 2) + ((contentY - maskPadding) * currentScale);

            const maskGraphics = this.make.graphics();
            maskGraphics.fillStyle(0xffffff); 
            maskGraphics.fillRect(maskX, maskY, maskWidth, maskHeight+extraSpaceBottom);
            const mask = maskGraphics.createGeometryMask();
            scrollableContainer.setMask(mask);

            const scrollbarWidth = 10;
            const scrollbarX = startX + totalGridWidth + 15;

            const track = this.add.graphics();
            track.fillStyle(0x5D4037, 0.5);
            track.fillRoundedRect(scrollbarX, 0, scrollbarWidth, visibleHeight, 5);
            container.add(track);

            const handleHeight = Math.max(20, visibleHeight * (visibleHeight / totalContentHeight));
            const handle = this.add.graphics();
            handle.fillStyle(0xD2B48C, 1);
            handle.fillRoundedRect(0, 0, scrollbarWidth, handleHeight, 5);
            
            const handleContainer = this.add.container(scrollbarX, 0, handle);
            container.add(handleContainer);

            this.input.setDraggable(handleContainer.setInteractive({
                 hitArea: new Phaser.Geom.Rectangle(0, 0, scrollbarWidth, handleHeight),
                 hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                 draggable: true
            }));
            
            const updateContentPosition = () => {
                const scrollPercentage = handleContainer.y / (visibleHeight - handleHeight);
                scrollableContainer.y = -scrollPercentage * (totalContentHeight - visibleHeight);
            };
            
            const zone = this.add.zone(startX, 0, totalGridWidth, visibleHeight).setOrigin(0, 0).setInteractive();
            container.add(zone);
            
            zone.on('wheel', (pointer: Phaser.Input.Pointer) => {
                let newY = handleContainer.y + pointer.deltaY * 0.2;
                handleContainer.y = Phaser.Math.Clamp(newY, 0, visibleHeight - handleHeight);
                updateContentPosition();
            });

            handleContainer.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                handleContainer.y = Phaser.Math.Clamp(dragY, 0, visibleHeight - handleHeight);
                updateContentPosition();
            });
        }
        
        return container;
    }

    private createPersonCard(suspect: any): Phaser.GameObjects.Container {
        const cardWidth = 360; 
        const cardHeight = 220;
        const card = this.add.container(0, 0);

        const bg = this.add.graphics();
        bg.fillStyle(0xfdf6e3, 1); 
        bg.lineStyle(2, 0xd2b48c, 1); 
        bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 16);
        bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 16);
        
        const portraitX = 70;
        const portraitY = 70;
        const portraitKey = suspect.portrait?.textureKey || 'portrait_unknown';
        const portrait = this.add.image(portraitX, portraitY, portraitKey).setScale(0.3); 

        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillCircle(portraitX, portraitY, 50); 
        const mask = maskShape.createGeometryMask();
        portrait.setMask(mask);

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
        
        // --- 1. Opret Scroll Zone til musen (Lægges BAGERST) ---
        const visibleHeight = 440; 
        const zone = this.add.zone(0, visibleHeight/2, contentWidth, visibleHeight)
            .setInteractive();
        container.add(zone);

        const scrollableStartY = 10;
        const scrollableContainer = this.add.container(0, scrollableStartY);
        container.add(scrollableContainer);

        const allClues = this.clueManager.getAllClues().filter(c => c.discovered);
        const colWidth = (contentWidth - 20) / 2;
        
        if (allClues.length === 0) {
            container.add(this.add.text(0, 50, "🔍 No clues discovered yet. Keep investigating!", { fontSize: '18px', color: '#8B4513', align: 'center' }).setOrigin(0.5));
            return container;
        }

        let maxY = 0;
        allClues.forEach((clue, index) => {
            const card = this.createClueCard(clue, colWidth);
            const col = index % 2;
            const row = Math.floor(index / 2);
            const xPos = col === 0 ? -contentWidth / 2 : -contentWidth / 2 + colWidth + 20;
            const yPos = row * (card.height + 20);
            card.setPosition(xPos, yPos);
            scrollableContainer.add(card);
            maxY = yPos + card.height;
        });

        const totalContentHeight = maxY + 20;

        if (totalContentHeight > visibleHeight) {
            const currentScale = this.journalContainer.scale;
            const maskPadding = 20;
            const maskHeight = visibleHeight * currentScale;
            const maskWidth = (contentWidth + (maskPadding * 2)) * currentScale;
            const maskX = (this.scale.width / 2) + ((-contentWidth / 2 - maskPadding) * currentScale);
            const maskY = (this.scale.height / 2) + ((contentY + scrollableStartY - maskPadding) * currentScale);

            const maskGraphics = this.make.graphics();
            maskGraphics.fillStyle(0xffffff);
            maskGraphics.fillRect(maskX, maskY, maskWidth, maskHeight);
            const mask = maskGraphics.createGeometryMask();
            scrollableContainer.setMask(mask);

            const scrollbarWidth = 10;
            const scrollbarX = contentWidth / 2 + 15;
            const track = this.add.graphics();
            track.fillStyle(0x5D4037, 0.5);
            track.fillRoundedRect(scrollbarX, scrollableStartY, scrollbarWidth, visibleHeight, 5);
            container.add(track);

            const handleHeight = Math.max(20, visibleHeight * (visibleHeight / totalContentHeight));
            const handle = this.add.graphics();
            handle.fillStyle(0xD2B48C, 1);
            handle.fillRoundedRect(0, 0, scrollbarWidth, handleHeight, 5);
            const handleContainer = this.add.container(scrollbarX, scrollableStartY, handle);
            container.add(handleContainer);

            this.input.setDraggable(handleContainer.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(0, 0, scrollbarWidth, handleHeight),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                draggable: true
            }));

            const updateContentPosition = () => {
                const relativeY = handleContainer.y - scrollableStartY;
                const trackLen = visibleHeight - handleHeight;
                const scrollPercentage = relativeY / trackLen;
                scrollableContainer.y = scrollableStartY - (scrollPercentage * (totalContentHeight - visibleHeight));
            };

            zone.on('wheel', (pointer: Phaser.Input.Pointer) => {
                let newY = handleContainer.y + pointer.deltaY * 0.2;
                handleContainer.y = Phaser.Math.Clamp(newY, scrollableStartY, scrollableStartY + visibleHeight - handleHeight);
                updateContentPosition();
            });

            handleContainer.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                handleContainer.y = Phaser.Math.Clamp(dragY, scrollableStartY, scrollableStartY + visibleHeight - handleHeight);
                updateContentPosition();
            });
        }

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
        
        const visibleHeight = 440;
        const zone = this.add.zone(0, visibleHeight/2 + 10, contentWidth, visibleHeight)
            .setInteractive();
        container.add(zone);
        
        const scrollableStartY = 10;
        const scrollableContainer = this.add.container(0, scrollableStartY);
        container.add(scrollableContainer);

        const alertY = 0;
        const alertBoxHeight = 60
        const alertBox = this.add.graphics();
        alertBox.fillStyle(0xfff5f5, 0.8);
        alertBox.lineStyle(2, 0xfca5a5, 1);
        alertBox.fillRoundedRect(-contentWidth / 2, alertY, contentWidth, alertBoxHeight, 10);
        alertBox.strokeRoundedRect(-contentWidth / 2, alertY, contentWidth, alertBoxHeight, 10);
        const alertTitle = this.add.text(-contentWidth / 2 + 20, alertY + 15, 'This is it, Inspector!', { fontSize: '18px', color: '#991b1b', fontStyle: 'bold' });
        const alertDesc = this.add.text(-contentWidth / 2 + 20, alertY + 40, 'Choose carefully. Once you accuse a suspect, your decision is final.', { fontSize: '14px', color: '#b91c1c', wordWrap: { width: contentWidth - 40 } });
        scrollableContainer.add([alertBox, alertTitle, alertDesc]);

        const buttonY = 80;
        this.accuseButton = this.createAccuseButton(contentWidth).setY(buttonY);
        scrollableContainer.add(this.accuseButton);
        const buttonHeight = 60;
        const gridY = buttonY + buttonHeight + 10;

        const detailsY = gridY + buttonHeight + 10;
        this.accuseDetailsContainer = this.add.container(0, detailsY).setVisible(false);
        scrollableContainer.add(this.accuseDetailsContainer);

        const suspectIds = (TutorialCase as any).suspects;
        const colCount = 3;
        const cardWidth = (contentWidth - (20 * (colCount - 1))) / colCount;
        const cardHeight = 150;

        suspectIds.forEach((id: string, index: number) => {
            const card = this.createSuspectCard(id, cardWidth);
            const col = index % colCount;
            const row = Math.floor(index / colCount);
            const xPos = -contentWidth / 2 + col * (cardWidth + 20);
            const yPos = gridY + row * (card.height + 20);
            card.setPosition(xPos, yPos);
            scrollableContainer.add(card);
            this.suspectCardMap.set(id, card);
            card.setInteractive({ useHandCursor: true });
            card.on('pointerdown', () => {
                this.handleSuspectSelected(id);
            });
        });

        const rowCount = Math.ceil(suspectIds.length / colCount);
        const totalGridHeight = rowCount * (cardHeight + 20);
        const totalContentHeight = gridY + totalGridHeight + 20;

        if (totalContentHeight > visibleHeight) {
            const currentScale = this.journalContainer.scale;
            const maskPadding = 20;
            const maskHeight = visibleHeight * currentScale;
            const maskWidth = (contentWidth + (maskPadding * 2)) * currentScale;
            const maskX = (this.scale.width / 2) + ((-contentWidth / 2 - maskPadding) * currentScale);
            const maskY = (this.scale.height / 2) + ((contentY - maskPadding) * currentScale);

            const maskGraphics = this.make.graphics();
            maskGraphics.fillStyle(0xffffff);
            maskGraphics.fillRect(maskX, maskY, maskWidth, maskHeight);
            const mask = maskGraphics.createGeometryMask();
            scrollableContainer.setMask(mask);

            const scrollbarWidth = 10;
            const scrollbarX = contentWidth / 2 + 15;
            const track = this.add.graphics();
            track.fillStyle(0x5D4037, 0.5);
            track.fillRoundedRect(scrollbarX, 0, scrollbarWidth, visibleHeight, 5);
            container.add(track);

            const handleHeight = Math.max(20, visibleHeight * (visibleHeight / totalContentHeight));
            const handle = this.add.graphics();
            handle.fillStyle(0xD2B48C, 1);
            handle.fillRoundedRect(0, 0, scrollbarWidth, handleHeight, 5);

            const handleContainer = this.add.container(scrollbarX, scrollableStartY, handle);
            container.add(handleContainer);

            this.input.setDraggable(handleContainer.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(0, 0, scrollbarWidth, handleHeight),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                draggable: true
            }));
        
            const updateContentPosition = () => {
                const relativeY = handleContainer.y - scrollableStartY;
                const trackLen = visibleHeight - handleHeight;
                const scrollPercentage = relativeY / trackLen;
                scrollableContainer.y = scrollableStartY - scrollPercentage * (totalContentHeight - visibleHeight);
            };

            zone.on('wheel', (pointer: Phaser.Input.Pointer) => {
                let newY = handleContainer.y + pointer.deltaY * 0.2;
                handleContainer.y = Phaser.Math.Clamp(newY, scrollableStartY, scrollableStartY + visibleHeight - handleHeight);
                updateContentPosition();
            });

            handleContainer.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                handleContainer.y = Phaser.Math.Clamp(dragY, scrollableStartY, scrollableStartY + visibleHeight - handleHeight);
                updateContentPosition();
            });
        }
        return container;
    }

    private createSuspectCard(suspectId: string, width: number): Phaser.GameObjects.Container {
        const height = 120;
        const card = this.add.container(0, 0);
        const suspect = (AllNPCsConfigs as any)[suspectId];
        
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.lineStyle(2, 0xd2b48c, 1);
        bg.fillRoundedRect(0, 0, width, height, 10);
        bg.strokeRoundedRect(0, 0, width, height, 10);

        const selection = this.add.graphics().setName('selectionIndicator');
        selection.lineStyle(4, 0xdc2626, 0); 
        selection.strokeRoundedRect(0, 0, width, height, 10);

        const portraitSize = 60;
        const portraitX = 45;
        const portraitY = 45;

        const portrait = this.add.image(portraitX, portraitY, suspect.portrait.textureKey || 'portrait_unknown');
        portrait.setDisplaySize(portraitSize, portraitSize);
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillCircle(portraitX, portraitY, portraitSize / 2);
        const mask = maskShape.createGeometryMask();
        portrait.setMask(mask);

        const portraitRing = this.add.graphics();
        portraitRing.lineStyle(2, 0x8B4513, 1);
        portraitRing.strokeCircle(portraitX, portraitY, portraitSize / 2);

        const name = this.add.text(portraitX + 40, 25, suspect.displayName, { 
            fontFamily: 'Georgia, serif', fontSize: '16px', color: '#543d25', fontStyle: 'bold', wordWrap: { width: width - (portraitX + 50) }
        });
        
        const textStartY = 90;
        const textStyle = { fontSize: '11px', color: '#543d25', wordWrap: { width: width - 20 } };
        const labelStyle = { fontSize: '11px', color: '#8B4513', fontStyle: 'bold' };

        const alibiLabel = this.add.text(10, textStartY, '📍 Mice desc:', labelStyle);
        const alibiText = this.add.text(10, textStartY + 15, suspect.alibi || 'Will be provided later', textStyle);

        card.add([bg, portrait, portraitRing, name, alibiLabel, alibiText, selection]);
        card.setSize(width, height);

        return card;
    }

    private handleSuspectSelected(suspectId: string) {
        this.selectedSuspectId = suspectId;
        this.suspectCardMap.forEach((card, id) => {
            const indicator = card.getByName('selectionIndicator') as Phaser.GameObjects.Graphics;
            indicator.clear();
                if (id === suspectId) {
                    indicator.lineStyle(4, 0xdc2626, 1);
                    indicator.strokeRoundedRect(0, 0, card.width, card.height, 10);
                } else {
                    indicator.lineStyle(4, 0xdc2626, 0);
                    indicator.strokeRoundedRect(0, 0, card.width, card.height, 10);
                }
        });
        this.accuseDetailsContainer?.setVisible(true);
        this.accuseButton?.setAlpha(1);
        (this.accuseButton?.getAt(1) as Phaser.GameObjects.Text).setText(`⚖️ Accuse ${ (AllNPCsConfigs as any)[suspectId].displayName }`);
        (this.accuseButton?.getAt(0) as Phaser.GameObjects.GameObject).setInteractive();
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

        this.fullscreenBg = this.add.rectangle(0, 0, screen.width, screen.height, 0xfdf6e3);
        this.fullscreenBg.setOrigin(0, 0);
        this.fullscreenBg.setScrollFactor(0); 
        this.fullscreenBg.setVisible(false);
        this.fullscreenBg.setDepth(100);

        container.add(this.add.text(-contentWidth / 2, 0, '📌 Evidence Board', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#543d25' }).setName('boardTitle'));
        container.add(this.add.text(-contentWidth / 2, 35, 'How to use: Drag items to move. Click "+ Connect", then click another item to link them.', { fontSize: '12px', color: '#8B4513', wordWrap: { width: contentWidth - 80 } }).setName('boardInstructions'));
        
        const fullscreenButton = this.add.text(contentWidth / 2, 10, '[⤢] Expand', { fontSize: '20px', color: '#543d25'})
            .setOrigin(1, 0.5)
            .setInteractive({ useHandCursor: true });
        fullscreenButton.on('pointerdown', () => this.toggleBoardFullscreen(fullscreenButton));
        container.add(fullscreenButton);

        const boardY = 70;
        this.boardZoneContainer = this.add.container(0, boardY);
        container.add(this.boardZoneContainer);

        const boardArea = this.add.graphics();
        boardArea.fillStyle(0xfde68a, 1);
        boardArea.fillRoundedRect(-contentWidth / 2, 0, contentWidth, contentHeight - boardY, 10);
        boardArea.setName('smallBoardBg'); // VIGTIGT
        this.boardZoneContainer.add(boardArea);

        this.smallBoardBounds = new Phaser.Geom.Rectangle(-contentWidth / 2, 0, contentWidth, contentHeight - boardY);
        
        this.boardDragBounds = Phaser.Geom.Rectangle.Clone(this.smallBoardBounds);
        boardArea.setInteractive(this.boardDragBounds, Phaser.Geom.Rectangle.Contains)
                 .on('pointerdown', () => { 
                     if(this.isConnecting) { 
                         this.isConnecting = false; 
                         this.connectionStartNode = null; 
                     } 
                 });

        this.connectionLine = this.add.graphics();
        this.connectionLine.setDepth(10);
        this.boardZoneContainer.add(this.connectionLine); // Tilføj til zone!

        if (!this.gameState.boardNodePositions[this.activeCaseId]) {
             this.gameState.boardNodePositions[this.activeCaseId] = {};
        }
        const caseNodePositions = this.gameState.boardNodePositions[this.activeCaseId];
        this.boardNodes = [];
        
        // --- 2. INDLÆS PERSONER ---
        const suspectIds = (TutorialCase as any).suspects;
        suspectIds.forEach((id: string, index: number) => {
            const type = 'person'; 
            const node = this.createBoardNode(id, type);
            const savedPos = caseNodePositions[id];
            
            const defaultX = -contentWidth / 2 + 100;
            const defaultY = boardY + 70 + index * 120; // 0 i boardZone er toppen, så vi behøver ikke boardY her hvis noden er i zonen. Men lad os holde det.
            // Hvis vi tilføjer til boardZoneContainer, er 0,0 toppen af det gule område.
            // Så Y skal være relativ til det. 
            // Din 'defaultY' ovenfor inkluderer 'boardY'. Hvis 'boardZoneContainer' allerede er flyttet ned med boardY,
            // så vil noderne blive skubbet dobbelt ned.
            // FIX: Relativ Y.
            const relativeDefaultY = 70 + index * 120;

            node.setPosition(savedPos?.x ?? defaultX, savedPos?.y ?? relativeDefaultY);
            this.boardZoneContainer.add(node);
            this.boardNodes.push({ id, type, gameObject: node });
        });
        
        // --- 3. INDLÆS CLUES ---
        const allClues = this.clueManager.getAllClues().filter(c => c.discovered);
        allClues.forEach((clue, index) => {
            const type = 'clue';
            const id = clue.id;
            const node = this.createBoardNode(id, type);
            const savedPos = caseNodePositions[id];
            
            const defaultX = contentWidth / 2 - 100; 
            const relativeDefaultY = 70 + index * 120;

            node.setPosition(savedPos?.x ?? defaultX, savedPos?.y ?? relativeDefaultY);
            this.boardZoneContainer.add(node);
            this.boardNodes.push({ id, type, gameObject: node });
        });

        // --- 4. INDLÆS CONNECTIONS ---
        this.connections = [];
        const currentCaseConnections = this.gameState.boardConnections[this.activeCaseId] || [];

        currentCaseConnections.forEach(connData => {
            const fromNode = this.boardNodes.find(n => n.id === connData.fromId);
            const toNode = this.boardNodes.find(n => n.id === connData.toId);
            if (fromNode && toNode) this.connections.push({ from: fromNode, to: toNode });
        });

        this.updateBoardMask(contentWidth, contentHeight - boardY, contentY + boardY);
        return container;
    }

    private createBoardNode(id: string, type: 'person' | 'clue'): Phaser.GameObjects.Container {
    const width = 180;
    const height = 100;
    const nodeContainer = this.add.container(0,0).setSize(width, height).setInteractive();
    
    // FIX A: Set Node Depth higher than the line (which is 10)
    // This ensures the card is always physically ON TOP of the red line
    nodeContainer.setDepth(100); 

    this.input.setDraggable(nodeContainer, true);
    nodeContainer.on('drag', (p: any, dragX: number, dragY: number) => {
        const halfW = nodeContainer.width / 2;
        const halfH = nodeContainer.height / 2;
        const constrainedX = Phaser.Math.Clamp(dragX, this.boardDragBounds.left + halfW, this.boardDragBounds.right - halfW);
        const constrainedY = Phaser.Math.Clamp(dragY, this.boardDragBounds.top + halfH, this.boardDragBounds.bottom - halfH);
        nodeContainer.setPosition(constrainedX, constrainedY);
        if (!this.gameState.boardNodePositions[this.activeCaseId]) {
                this.gameState.boardNodePositions[this.activeCaseId] = {};
            }
        this.gameState.boardNodePositions[this.activeCaseId][id] = { x: constrainedX, y: constrainedY };
        this.gameState.save();
    });
    
    const bg = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-width/2, -height/2, width, height, 8);
    const labelText = type === 'person' ? (AllNPCsConfigs as any)[id]?.displayName : this.clueManager.getClue(id)?.title;
    const label = this.add.text(0, -10, labelText, { fontSize: '14px', color: '#000', align: 'center', wordWrap: { width: width - 20 } }).setOrigin(0.5);
    const connectButton = this.add.text(0, 30, '[ + Connect ]', { fontSize: '12px', color: '#1e40af' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    nodeContainer.add([bg, label, connectButton]);

    // FIX B: Smart Click Handling
    connectButton.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
        // If we are currently dragging a connection line...
        if (this.isConnecting) {
            // ...then clicking this button should FINISH the connection
            this.handleConnectionEnd(id, type);
            event.stopPropagation();
        } else {
            // ...otherwise, START a new connection
            event.stopPropagation();
            this.handleConnectionStart(id, type);
        }
    });

    // Clicking the card body also finishes the connection
    nodeContainer.on('pointerdown', () => { 
        if (this.isConnecting) this.handleConnectionEnd(id, type); 
    });

    return nodeContainer;
}

    private updateBoardMask(width: number, height: number, globalYOffset: number, scale?: number) {
        const currentScale = scale !== undefined ? scale : this.journalContainer.scale;
        const maskX = (this.scale.width / 2) + ((-width / 2) * currentScale);
        const maskY = (this.scale.height / 2) + (globalYOffset * currentScale);
        const maskWidth = width * currentScale;
        const maskHeight = height * currentScale;

        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(maskX, maskY, maskWidth, maskHeight);
        const mask = maskGraphics.createGeometryMask();
        this.boardZoneContainer.setMask(mask);
    }

    private toggleBoardFullscreen(button: Phaser.GameObjects.Text) {
        this.isBoardFullscreen = !this.isBoardFullscreen;
        
        // Find objects by name for safety
        const journalBg = this.journalContainer.getByName('journalBackground') as Phaser.GameObjects.Image;
        const smallBoardBg = this.boardZoneContainer.getByName('smallBoardBg') as Phaser.GameObjects.Graphics;
        const journalCloseBtn = this.journalContainer.getByName('journalCloseBtn') as Phaser.GameObjects.Text; // <--- NEW

        const boardPane = this.contentPanes['Board'];
        const boardTitle = boardPane?.getByName('boardTitle') as Phaser.GameObjects.Text; // <--- NEW
        const boardInstr = boardPane?.getByName('boardInstructions') as Phaser.GameObjects.Text; // <--- NEW
        
        const { width, height } = this.scale;
        const originalBoardY = 70; 

        if (this.isBoardFullscreen) {
            // --- EXPAND TO FULLSCREEN ---
            
            // 1. Show big background
            this.fullscreenBg.setVisible(true);
            this.fullscreenBg.setInteractive(); // Enable input on BG to block clicks passing through
            this.fullscreenBg.setDepth(-1); 

            // 2. Bring Journal to front
            this.journalContainer.setDepth(100); 

            // 3. Hide Journal UI
            if (journalBg) journalBg.setVisible(false);
            if (smallBoardBg) smallBoardBg.setVisible(false);
            if (journalCloseBtn) journalCloseBtn.setVisible(false); 
            if (boardTitle) boardTitle.setVisible(false);           
            if (boardInstr) boardInstr.setVisible(false);

            this.headerContainer.setVisible(false);
            this.tabsContainer.setVisible(false);

            // 4. Animate to Full Screen
            this.tweens.add({
                targets: this.journalContainer,
                scale: 1,
                x: width / 2,
                y: height / 2,
                duration: 300
            });
            
            this.boardZoneContainer.y = 0;
            
            // Hide the original expand button
            button.setVisible(false);

            // Create new "Close" container on top
            if (this.closeBtnContainer) this.closeBtnContainer.destroy();
            this.closeBtnContainer = this.add.container(0, 0).setDepth(9999).setScrollFactor(0);

            const btnW = 160;
            const btnH = 50;
            const bg = this.add.graphics();
            bg.fillStyle(0xdc2626, 1); bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
            bg.lineStyle(2, 0xffffff, 1); bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 8);
            bg.setInteractive(new Phaser.Geom.Rectangle(-btnW/2, -btnH/2, btnW, btnH), Phaser.Geom.Rectangle.Contains);
            bg.on('pointerdown', () => this.toggleBoardFullscreen(button));
            const text = this.add.text(0, 0, '❌ CLOSE BOARD', { fontSize: '18px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
            this.closeBtnContainer.add([bg, text]);
            this.closeBtnContainer.setPosition(width - 100, 50)

            // 5. Remove Mask and expand bounds
            this.boardZoneContainer.clearMask();
            this.boardDragBounds.setTo(-2000, -2000, 4000, 4000);

        } else {
            // --- SHRINK TO JOURNAL ---

            // FIX 1: Disable background interaction so it cannot steal clicks
            this.fullscreenBg.disableInteractive();
            this.fullscreenBg.setVisible(false);
            if (journalCloseBtn) journalCloseBtn.setVisible(true); // <--- Show X
            if (boardTitle) boardTitle.setVisible(true);           // <--- Show Title
            if (boardInstr) boardInstr.setVisible(true);

            // Show elements again
            if (journalBg) journalBg.setVisible(true);
            if (smallBoardBg) smallBoardBg.setVisible(true);
            
            this.headerContainer.setVisible(true);
            this.tabsContainer.setVisible(true);

            this.journalContainer.bringToTop(this.headerContainer);
            this.journalContainer.bringToTop(this.tabsContainer);
            if (journalCloseBtn) this.journalContainer.bringToTop(journalCloseBtn);
            this.journalContainer.setDepth(0); 

            this.tweens.add({
                targets: this.journalContainer,
                scale: this.initialJournalScale,
                x: width / 2,
                y: height / 2,
                duration: 300
            });

            this.boardZoneContainer.y = originalBoardY; 

            // --- RESTORE EXPAND BUTTON ---
            button.setVisible(true);
            button.setText('[⤢] Expand');
            
            // FIX 2: Bring the button to the very top of its container
            // This ensures the boardZoneContainer (which was added after it) doesn't cover it
            if (button.parentContainer) {
                button.parentContainer.bringToTop(button);
            }

            // FIX 3: Force refresh the interactive state
            // Often needed after a parent container has been scaled/tweened/hidden
            button.disableInteractive();
            button.setInteractive({ useHandCursor: true });
            
            // Destroy temporary close button
            if (this.closeBtnContainer) {
                this.closeBtnContainer.destroy();
                this.closeBtnContainer = undefined;
            }

            // Restore Mask & Bounds
            const bgWidth = journalBg.width;
            const contentWidth = bgWidth * 0.85;
            button.setPosition(contentWidth / 2, 10);

            const bgHeight = journalBg.height;
            const contentY = -bgHeight / 2 + 330;
            this.updateBoardMask(this.smallBoardBounds.width, this.smallBoardBounds.height, contentY + originalBoardY, this.initialJournalScale);

            this.boardDragBounds = Phaser.Geom.Rectangle.Clone(this.smallBoardBounds);
            
            // Snap Back Logic (Bring nodes back into view)
            this.boardNodes.forEach(nodeData => {
                const node = nodeData.gameObject;
                if (!this.boardDragBounds.contains(node.x, node.y)) {
                    const targetX = Phaser.Math.Clamp(node.x, this.boardDragBounds.left + 50, this.boardDragBounds.right - 50);
                    const targetY = Phaser.Math.Clamp(node.y, this.boardDragBounds.top + 50, this.boardDragBounds.bottom - 50);

                    if (this.gameState.boardNodePositions[this.activeCaseId]) {
                        this.gameState.boardNodePositions[this.activeCaseId][nodeData.id] = { x: targetX, y: targetY };
                        this.gameState.save();
                    }

                    this.tweens.add({
                        targets: node,
                        x: targetX,
                        y: targetY,
                        duration: 500,
                        ease: 'Bounce.easeOut'
                    });
                }
            });
        }
    }

private handleConnectionEnd(id: string, type: 'person' | 'clue') {
        const endNode = this.boardNodes.find(n => n.id === id) || null;
        
        if (this.connectionStartNode && endNode && this.connectionStartNode.id !== endNode.id) {
            
            // 1. Get the array for the CURRENT case only
            // If it doesn't exist yet, default to an empty array so .some() doesn't crash
            const currentCaseConns = this.gameState.boardConnections[this.activeCaseId] || [];

            // 2. Check for duplicates inside that specific array
            const alreadyExists = currentCaseConns.some(
                (c: any) => (c.fromId === this.connectionStartNode!.id && c.toId === endNode.id) ||
                            (c.fromId === endNode.id && c.toId === this.connectionStartNode!.id)
            );

            if (!alreadyExists) {
                const connData = { fromId: this.connectionStartNode.id, toId: endNode.id };
                
                // 3. Ensure the array exists in GameState before pushing
                if (!this.gameState.boardConnections[this.activeCaseId]) {
                    this.gameState.boardConnections[this.activeCaseId] = [];
                }

                // 4. Save to GameState
                this.gameState.boardConnections[this.activeCaseId].push(connData);
                this.gameState.save();

                // 5. Update the visual lines immediately
                this.connections.push({ from: this.connectionStartNode, to: endNode });
            }
        }
        
        // Reset state
        this.isConnecting = false;
        this.connectionStartNode = null;
    }

    private handleConnectionStart(id: string, type: 'person' | 'clue') {
        this.time.delayedCall(50, () => {
        this.isConnecting = true;
        this.connectionStartNode = this.boardNodes.find(n => n.id === id) || null;
    });
    }


    private drawConnections() {
        this.connectionLine.clear().lineStyle(3, 0xef4444, 0.7);

        // FIX: Brug klasse-variablen direkte
        if (!this.boardZoneContainer) return;

        this.connections.forEach(conn => {
            const startNode = conn.from.gameObject;
            const endNode = conn.to.gameObject;
            this.connectionLine.lineBetween(startNode.x, startNode.y, endNode.x, endNode.y);
        });

        if (this.isConnecting && this.connectionStartNode) {
            const startNode = this.connectionStartNode.gameObject;

            const pointer = this.input.activePointer;
            const pointerPosition = new Phaser.Math.Vector2(pointer.x, pointer.y);
            
            // Brug boardZoneContainer direkte her
            const matrix = this.boardZoneContainer.getWorldTransformMatrix();
            
            matrix.invert();
            matrix.transformPoint(pointerPosition.x, pointerPosition.y, pointerPosition);

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