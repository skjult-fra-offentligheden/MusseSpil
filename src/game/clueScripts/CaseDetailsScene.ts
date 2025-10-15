import Phaser from 'phaser';
import { ClueManager } from './clueManager';
import { ICategorySwitcher, ClueCat } from "./journalTabs";
import { tutorialCases } from '../../data/cases/tutorialCases';
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs';
import { UIManager } from '../managers/UIManager';
import { TutorialCase } from '../../cases/TutorialCase';
import { Clue } from '../classes/clue';

type JournalTab = 'Mice' | 'Clues' | 'Board' | 'Accuse';
// A new type to help manage draggable items on the board
type BoardNode = { id: string, type: 'person' | 'clue', gameObject: Phaser.GameObjects.Container };

export class CaseDetailsScene extends Phaser.Scene implements ICategorySwitcher {
    private originScene!: string;
    private clueManager!: ClueManager;
    private activeCaseId!: string;
    private activeCaseData!: any;
    private activeTab: JournalTab = 'Mice';

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
    }

    create() {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive();

        this.buildJournalUI();
    }
    
    update() {
        // This is new: it redraws the connection lines on the board every frame
        if (this.activeTab === 'Board') {
            this.drawConnections();
        }
    }

    // --- UI BUILDING ---

    private buildJournalUI() {
        const { width, height } = this.scale;
        this.journalContainer = this.add.container(width / 2, height / 2);

        const bg = this.add.image(0, 0, 'journal_details_bg');
        const scale = Math.min((width * 0.9) / bg.width, (height * 0.9) / bg.height);
        bg.setScale(scale);
        this.journalContainer.add(bg);

        const containerWidth = bg.displayWidth;
        const containerHeight = bg.displayHeight;

        this.createHeader(containerWidth, containerHeight);

        // Create all content panes
        this.contentPanes['Mice'] = this.createMiceContent(containerWidth, containerHeight);
        this.contentPanes['Clues'] = this.createCluesContent(containerWidth, containerHeight);
        this.contentPanes['Board'] = this.createBoardContent(containerWidth, containerHeight);
        this.contentPanes['Accuse'] = this.createAccuseContent(containerWidth, containerHeight);
        
        // Add valid panes to the main container
        this.journalContainer.add(Object.values(this.contentPanes).filter(p => p));

        // Create tabs last so they render on top of the content
        this.createTabs(containerWidth, containerHeight); 
        this.switchTab('Mice', true); // Set initial visible tab

        const closeButton = this.add.text(containerWidth / 2 - 30, -containerHeight / 2 + 30, 'X', {
            fontSize: '24px', color: '#8B4513', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => this.closeJournal());
        this.journalContainer.add(closeButton);
    }
    
    private createHeader(width: number, height: number) {
        // This function is complete and correct from your provided code
        const headerY = -height / 2 + 80;
        const backButton = this.add.text(-width / 2 + 80, headerY - 30, '◀ All Cases', { fontSize: '18px', color: '#8B4513', fontStyle: 'bold' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        backButton.on('pointerdown', () => this.scene.start('CaseSelectionScene', { originScene: this.originScene }));
        this.journalContainer.add(backButton);
        const infoBoxWidth = width * 0.85;
        const infoBox = this.add.graphics().fillStyle(0xfdf6e3, 0.8).lineStyle(2, 0xd2b48c, 1);
        infoBox.fillRoundedRect(-infoBoxWidth / 2, headerY, infoBoxWidth, 150, 10).strokeRoundedRect(-infoBoxWidth / 2, headerY, infoBoxWidth, 150, 10);
        this.journalContainer.add(infoBox);
        const title = this.add.text(0, headerY + 25, this.activeCaseData.case_title, { fontFamily: 'Georgia, serif', fontSize: '32px', color: '#543d25' }).setOrigin(0.5, 0);
        const description = this.add.text(0, headerY + 70, this.activeCaseData.case_description_player_task, { fontSize: '16px', color: '#8B4513', wordWrap: { width: infoBoxWidth - 40 }, align: 'center' }).setOrigin(0.5, 0);
        this.journalContainer.add([title, description]);
        this.createTag(width * 0.25, headerY + 110, this.activeCaseData.status || 'OPEN', 0xfbc47a);
        this.createTag(-width * 0.25, headerY + 110, `Oct 15, 2025`, 0xc5d8a4);
    }
    
    private createTag(x: number, y: number, text: string, color: number) {
        // This function is complete and correct
        const tagText = this.add.text(x, y, text.toUpperCase(), { fontSize: '14px', color: '#6b4f2c', fontStyle: 'bold' }).setOrigin(0.5);
        const textWidth = tagText.width + 20;
        const tagBg = this.add.graphics().fillStyle(color, 0.7).fillRoundedRect(x - textWidth / 2, y - 12, textWidth, 24, 12);
        this.journalContainer.add([tagBg, tagText]);
    }

    // --- TAB MANAGEMENT ---
    
    private createTabs(width: number, height: number) {
        const tabsY = -height / 2 + 270;
        const tabsWidth = width * 0.85;
        const tabNames: JournalTab[] = ['Mice', 'Clues', 'Board', 'Accuse'];

        const tabsBg = this.add.graphics();
        tabsBg.fillStyle(0xd2b48c, 0.5);
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
        let yPos = 0;
        suspects.forEach((suspect: any) => {
            if (!suspect) return;
            const card = this.createPersonCard(suspect);
            card.setPosition(0, yPos);
            container.add(card);
            yPos += card.height + 15;
        });
        return container;
    }

    private createPersonCard(suspect: any): Phaser.GameObjects.Container {
        const cardWidth = this.journalContainer.width * 0.85;
        const cardHeight = 100;
        const card = this.add.container(0,0);
        const bg = this.add.graphics();
        bg.fillStyle(0xfdf6e3, 0.7);
        bg.lineStyle(1, 0xd2b48c, 1);
        bg.fillRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 8);
        bg.strokeRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 8);
        const name = this.add.text(-cardWidth/2 + 30, 20, suspect.displayName, { fontSize: '20px', color: '#543d25', fontStyle: 'bold' });
        const alibi = this.add.text(-cardWidth/2 + 30, 50, `Alibi: ${suspect.alibi || 'None provided.'}`, { fontSize: '14px', color: '#8B4513', wordWrap: { width: cardWidth - 50 } });
        card.add([bg, name, alibi]);
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
        const contentHeight = height - 370; // Available height for the board area
        const container = this.add.container(0, contentY);

        // Title and instructions
        container.add(this.add.text(-contentWidth / 2, 0, '📌 Evidence Board', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#543d25' }));
        container.add(this.add.text(-contentWidth / 2, 35, 'How to use: Drag items to move. Click "+ Connect", then click another item to link them.', { fontSize: '12px', color: '#8B4513', wordWrap: { width: contentWidth } }));

        // Corkboard area - make it interactive to catch clicks to cancel connection
        const boardY = 70;
        const boardArea = this.add.graphics().fillStyle(0xfde68a, 1).fillRoundedRect(-contentWidth / 2, boardY, contentWidth, contentHeight - boardY, 10);
        container.add(boardArea);
        boardArea.setInteractive(new Phaser.Geom.Rectangle(-contentWidth / 2, boardY, contentWidth, contentHeight - boardY), Phaser.Geom.Rectangle.Contains)
                 .on('pointerdown', () => {
                     if(this.isConnecting) {
                         this.isConnecting = false;
                         this.connectionStartNode = null;
                     }
                 });
        
        // This graphics object is for drawing the red connection lines
        this.connectionLine = this.add.graphics();
        container.add(this.connectionLine);

        // Create draggable person nodes
        const suspectIds = (TutorialCase as any).suspects;
        suspectIds.forEach((id: string, index: number) => {
            const node = this.createBoardNode(id, 'person');
            node.setPosition(-contentWidth / 2 + 100, boardY + 70 + index * 120);
            container.add(node);
            this.boardNodes.push({ id, type: 'person', gameObject: node });
        });
        
        // Create draggable clue nodes
        const allClues = this.clueManager.getAllClues().filter(c => c.discovered);
        allClues.forEach((clue, index) => {
            const node = this.createBoardNode(clue.id, 'clue');
            node.setPosition(contentWidth / 2 - 100, boardY + 70 + index * 120);
            container.add(node);
            this.boardNodes.push({ id: clue.id, type: 'clue', gameObject: node });
        });
        
        return container;
    }

    private createBoardNode(id: string, type: 'person' | 'clue'): Phaser.GameObjects.Container {
        const width = 180;
        const height = 100;
        // The node itself is a container that we make draggable
        const nodeContainer = this.add.container(0,0).setSize(width, height).setInteractive();
        this.input.setDraggable(nodeContainer);

        // Visuals for the node
        const bg = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-width/2, -height/2, width, height, 8);
        const labelText = type === 'person' ? (AllNPCsConfigs as any)[id]?.displayName : this.clueManager.getClue(id)?.title;
        const label = this.add.text(0, -10, labelText, { fontSize: '14px', color: '#000', align: 'center', wordWrap: { width: width - 20 } }).setOrigin(0.5);
        const connectButton = this.add.text(0, 30, '[ + Connect ]', { fontSize: '12px', color: '#1e40af' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        nodeContainer.add([bg, label, connectButton]);

        // --- Event Handlers for Drag and Connect ---
        nodeContainer.on('drag', (p: any, dragX: any, dragY: any) => nodeContainer.setPosition(dragX, dragY));
        
        connectButton.on('pointerdown', (p: any) => {
            p.stopPropagation(); // Prevents the drag from starting when clicking the button
            this.handleConnectionStart(id, type);
        });

        // The main body of the node listens for the *end* of a connection
        nodeContainer.on('pointerdown', () => {
            if (this.isConnecting) {
                this.handleConnectionEnd(id, type);
            }
        });

        return nodeContainer;
    }

    private handleConnectionStart(id: string, type: 'person' | 'clue') {
        this.isConnecting = true;
        this.connectionStartNode = this.boardNodes.find(n => n.id === id) || null;
    }

    private handleConnectionEnd(id: string, type: 'person' | 'clue') {
        const endNode = this.boardNodes.find(n => n.id === id) || null;
        if (this.connectionStartNode && endNode && this.connectionStartNode.id !== endNode.id) {
            this.connections.push({ from: this.connectionStartNode, to: endNode });
        }
        // Reset connection state
        this.isConnecting = false;
        this.connectionStartNode = null;
    }

    private drawConnections() {
        this.connectionLine.clear().lineStyle(3, 0xef4444, 0.7); // Red string style

        // Get the absolute world position of the content pane
        const contentPane = this.contentPanes.Board;
        if (!contentPane) return;
        const worldPos = new Phaser.Math.Vector2();
        contentPane.getWorldTransformMatrix().transformPoint(0, 0, worldPos);

        // Draw existing connections
        this.connections.forEach(conn => {
            const startNode = conn.from.gameObject;
            const endNode = conn.to.gameObject;
            this.connectionLine.lineBetween(
                worldPos.x + startNode.x, worldPos.y + startNode.y,
                worldPos.x + endNode.x, worldPos.y + endNode.y
            );
        });

        // Draw the temporary line from the start node to the mouse cursor
        if (this.isConnecting && this.connectionStartNode) {
            const startNode = this.connectionStartNode.gameObject;
            this.connectionLine.lineBetween(
                worldPos.x + startNode.x, worldPos.y + startNode.y,
                this.input.activePointer.x, this.input.activePointer.y
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