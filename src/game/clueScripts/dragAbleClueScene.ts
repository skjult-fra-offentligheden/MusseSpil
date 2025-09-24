import Phaser from 'phaser';
import { Clue } from '../classes/clue';
import { UIManager } from '../managers/UIManager';

interface NpcData {
    id: string;
    name: string;
    imageKey: string;
}

interface StringButton {
    id: string;
    text: string;
    container: Phaser.GameObjects.Container;
    isAttached: boolean;
    attachedTo?: Phaser.GameObjects.Container;
}

interface PanelsPlacement {
    leftPanel: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    rightPanel: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    panelSpacing: number;
    usableWidth: number;
    panelWidth: number;
    panelHeight: number;
}
interface CardData {
    id: string;
    gameObject: Phaser.GameObjects.Container;
    globalCenter: Phaser.Math.Vector2;
}
export class DragAbleClueScene extends Phaser.Scene {
    // --- Configuration Constants ---
    //private readonly Size = this.scale'
    private dict_panels_sizing: {
        LEFT_PANEL_X: number,
        RIGHT_PANEL_X: number,
        PANEL_Y: number,
    } = {
        LEFT_PANEL_X: 0,
        RIGHT_PANEL_X: 0,
        PANEL_Y: 0,
        }

    private dict_card_sizing: {
        CARD_Y_SPACING: number,
        CARD_X_SPACING: number
    } = {
            CARD_Y_SPACING: 0,
            CARD_X_SPACING: 0
        }
    private cardRegistry: Map<Phaser.GameObjects.Container, CardData>;
    private panelsPlacement!: PanelsPlacement;
    private STRING_BUTTON_Y_SPACING: number;
    private int_string_buttonWitdh: number;
    private int_string_buttonHeight: number;

    private dict_item_npc_container: {
        int_container_width: number,
        int_container_height: number,
        int_spacing: number
    } = {
        int_container_width: 0,
            int_container_height: 0,
            int_spacing: 0
    };

    private readonly BACKGROUND_COLOR = 0x2c3e50;
    private readonly PANEL_BACKGROUND_COLOR = 0x34495e;
    private readonly NO_CLUES_TEXT_COLOR = '#ecf0f1';
    private readonly PREVIEW_LINE_COLOR = 0x3498db;
    private readonly LINK_LINE_COLOR = 0xe74c3c;
    private readonly STRING_BUTTON_COLOR = 0xf39c12;
    private readonly SELECTED_STRING_COLOR = 0xe67e22;
    private readonly HOVER_CARD_COLOR = 0x95a5a6;
    
    private clues: Clue[];
    private npcs: NpcData[];
    private originSceneKey: string = 'ClueJournal';
    private stringButtons: StringButton[] = [];
    private selectedStringButton: StringButton | null = null;
    private firstSelectedCard: Phaser.GameObjects.Container | null = null;
    private isConnecting: boolean = false;

    private readonly DEPTH = {
        BACKGROUND: 0,
        PANELS: 5,
        LINES: 10,
        CARDS: 20,
        STRING_BUTTONS: 25,
        DRAGGED_CARD: 30,
        UI: 40,
    };

    // --- Scene Properties ---
    private links: {
        a: Phaser.GameObjects.Container;
        b: Phaser.GameObjects.Container;
        line: Phaser.GameObjects.Line;
        label?: Phaser.GameObjects.Text;
    }[] = [];

    private previewLine: Phaser.GameObjects.Graphics | null = null;
    private leftPanel!: Phaser.GameObjects.Container;
    private rightPanel!: Phaser.GameObjects.Container;
    private stringPanel!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'DragAbleClueScene' });
        this.cardRegistry = new Map();
    }

    init(data: { clues: Clue[]; npcs: NpcData[]; originScene?: string }) {
        this.clues = data.clues;
        this.npcs = data.npcs;
        this.originSceneKey = data.originScene ?? 'ClueJournal';
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.dict_panels_sizing.LEFT_PANEL_X = width * 0.08; // 8% from left
        this.dict_panels_sizing.RIGHT_PANEL_X = width * 0.80; // 70% from left
        this.dict_panels_sizing.PANEL_Y = height * 0.18;     // 18% from top
        this.dict_card_sizing.CARD_Y_SPACING = height * 0.06; // 12% of height
        this.STRING_BUTTON_Y_SPACING = height * 0.06; // 6% of height

        this.dict_item_npc_container.int_container_height = height * 0.12; // 12% of height
        this.dict_item_npc_container.int_container_width = width * 0.15; // 15% of width   
        this.dict_item_npc_container.int_spacing = width * 0.02; // 2% of width

        this.int_string_buttonWitdh = width * 0.15;
        this.int_string_buttonHeight = height * 0.04;   


        // Create background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, this.BACKGROUND_COLOR)
            .setOrigin(0)
            .setDepth(this.DEPTH.BACKGROUND);

        // Create title
        this.add.text(this.cameras.main.centerX, 50, 'CLUE BOARD', {
            fontSize: '32px',
            color: '#ecf0f1',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(this.DEPTH.UI);

        // Quick red "X" close button in the top-right (non-overlapping)
        const xBtnSize = 28;
        const xBtnPad = 16;
        const xBtnX = this.scale.width - xBtnPad - xBtnSize;
        const xBtnY = xBtnPad;
        const xBtnContainer = this.add.container(xBtnX, xBtnY).setDepth(this.DEPTH.UI);
        const xBtnBg = this.add.rectangle(0, 0, xBtnSize, xBtnSize, 0xcc0000, 1)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0xffffff, 0.95);
        const xBtnText = this.add.text(xBtnSize / 2, xBtnSize / 2, 'X', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
            .setOrigin(0.5);
        xBtnContainer.add([xBtnBg, xBtnText]);
        // Keep fixed to the camera so it stays in the corner
        xBtnContainer.setScrollFactor(0);
        // Make the whole area clickable
        xBtnContainer.setSize(xBtnSize, xBtnSize).setInteractive({ useHandCursor: true });
        xBtnContainer.on('pointerdown', () => {
            this.scene.stop();
            this.scene.wake(this.originSceneKey);
        });
        xBtnContainer.on('pointerover', () => xBtnBg.setAlpha(0.85));
        xBtnContainer.on('pointerout', () => xBtnBg.setAlpha(1));

        
        const escapeButton = this.add.text(40, 40, '<< Back to Journal', {
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 10, y: 5 }
        })
            .setOrigin(0, 0.5) // Anchor to its top-left corner
            .setDepth(this.DEPTH.UI)
            .setInteractive({ useHandCursor: true });

        escapeButton.on('pointerdown', () => {
            this.scene.stop();
            this.scene.wake(this.originSceneKey);
        });

        escapeButton.on('pointerover', () => escapeButton.setAlpha(0.8));
        escapeButton.on('pointerout', () => escapeButton.setAlpha(1));

        // Hotkey: Close journal to game
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

        // Create panels
        this.createPanels();

        const left = this.panelsPlacement.leftPanel;
        const right = this.panelsPlacement.rightPanel;
        const padXLeft = left.width * 0.05;
        const padXRight = right.width * 0.10;

        // Even vertical slots
        const slotHLeft = left.height / this.clues.length;
        const slotHRight = right.height / this.npcs.length;

        // --- Create cards ---
        const allCards: Phaser.GameObjects.Container[] = []; // Array to hold all card objects

        // Create and position NPC cards (Right side)
        this.npcs.forEach((npc, index) => {
            const card = this.createCards('npc', npc.id, npc.name, npc.imageKey);
            const centeredPaddingX = (this.panelsPlacement.rightPanel.width - card.width) / 2;
            const globalX = this.panelsPlacement.rightPanel.x + centeredPaddingX; // Center the card
            const globalY = this.rightPanel.y + ((index + 0.5) * slotHRight);

            // Add the card to the main scene, NOT the panel
            this.add.existing(card);
            card.setPosition(globalX, globalY);
            allCards.push(card); // Add to our list

            const cardData: CardData = {
                id: npc.id,
                gameObject: card,
                globalCenter: new Phaser.Math.Vector2(globalX + card.width / 2, globalY + card.height / 2)
            };
            this.cardRegistry.set(card, cardData);
        });

        // Create and position Clue cards (Left side)
        this.clues.forEach((clue, index) => {
            const card = this.createCards('item', clue.id, clue.title ?? 'Unknown Clue', clue.imageKey || 'blank-ico');
            const centeredPaddingX = (this.panelsPlacement.leftPanel.width - card.width) / 2;
            const globalX = this.panelsPlacement.leftPanel.x + centeredPaddingX; // Center the card
            const globalY = this.leftPanel.y + ((index + 0.5) * slotHLeft);

            // FIX: Add the card to the main scene, NOT the panel, for consistency
            this.add.existing(card);
            card.setPosition(globalX, globalY);
            allCards.push(card); // Add to our list

            const cardData: CardData = {
                id: clue.id,
                gameObject: card,
                globalCenter: new Phaser.Math.Vector2(globalX + card.width / 2, globalY + card.height / 2)
            };
            this.cardRegistry.set(card, cardData);
        });

        //const debugColor = 0xff00ff; // Bright magenta
        //const debugGraphics = this.add.graphics({ fillStyle: { color: debugColor } });
        //debugGraphics.setDepth(this.DEPTH.UI + 1); // Ensure it's on top of everything

        //// 1. Get the very first NPC card you created.
        //// We need to find it in the 'allCards' array. A bit tricky, but we can get it.
        //const firstNpcCard = allCards.find(card => card.getData('type') === 'npc');

        //if (firstNpcCard) {
        //    console.log('--- DEBUGGING FIRST NPC CARD ---');
        //    console.log('Card Container (Top-Left Origin):', `x: ${firstNpcCard.x}`, `y: ${firstNpcCard.y}`);
        //    console.log('Card Dimensions:', `width: ${firstNpcCard.width}`, `height: ${firstNpcCard.height}`);

        //    const cardOriginX = firstNpcCard.x;
        //    const cardOriginY = firstNpcCard.y;

        //    // 2. VISUALIZE THE CARD'S ORIGIN (its x, y)
        //    // This is the point your line is currently drawn FROM when dragging.
        //    debugGraphics.fillCircle(cardOriginX, cardOriginY, 10); // Big circle at the top-left
        //    this.add.text(cardOriginX, cardOriginY - 20, 'Card Origin (x, y)', {
        //        fontSize: '12px',
        //        color: '#ff00ff',
        //        backgroundColor: '#000'
        //    }).setOrigin(0.5, 1);

        //    // 3. CALCULATE AND VISUALIZE THE CENTER POINT
        //    // This is where the line SHOULD be drawn from.
        //    const calculatedCenterX = cardOriginX + (firstNpcCard.width / 2);
        //    const calculatedCenterY = cardOriginY + (firstNpcCard.height / 2);
        //    console.log('Calculated Center:', `x: ${calculatedCenterX}`, `y: ${calculatedCenterY}`);


        //    debugGraphics.lineStyle(2, 0x00ff00); // Green line for the center
        //    debugGraphics.strokeCircle(calculatedCenterX, calculatedCenterY, 12); // Circle at the calculated center
        //    this.add.text(calculatedCenterX, calculatedCenterY + 20, 'Calculated Center', {
        //        fontSize: '12px',
        //        color: '#00ff00',
        //        backgroundColor: '#000'
        //    }).setOrigin(0.5, 0);

            // 4. VISUALIZE THE PANEL'S ORIGIN for reference
        //    const panelOriginX = this.panelsPlacement.rightPanel.x;
        //    const panelOriginY = this.panelsPlacement.rightPanel.y;
        //    debugGraphics.fillStyle(0xffff00); // Yellow
        //    debugGraphics.fillCircle(panelOriginX, panelOriginY, 8);
        //    this.add.text(panelOriginX, panelOriginY, 'Panel Origin', {
        //        fontSize: '12px',
        //        color: '#ffff00',
        //        backgroundColor: '#000'
        //    }).setOrigin(0, 1);
        //}
        //const allCards = [...this.leftPanel.getAll(), ...this.rightPanel.getAll()];


        // --- Setup input handlers ---
        this.createStringButtons();
        this.setupInputHandlers(allCards); // Pass the complete list of cards
        this.addEscapeKeyHandler();

        // Add instructions
        //this.addInstructions();
        
        // Debug: Log final card positions
    }

    private createPanels(): void {
        //jeg skal samle placeringen af panels i en dict, så jeg kan ændre det nemt

        const panelSpacing = 20;
        const usableWidth = this.scale.width - panelSpacing * 2;
        const panelWidth = (usableWidth - panelSpacing) / 5;
        const topY = this.dict_panels_sizing.PANEL_Y;
        const bottomMargin = this.scale.height * 0.15;
        const panelHeight = this.scale.height - topY - bottomMargin;
        // Left panel for items/clues
        this.panelsPlacement = {
            leftPanel: {
                x: panelSpacing,
                y: this.dict_panels_sizing.PANEL_Y,
                width: panelWidth,
                height: panelHeight
            },
            rightPanel: {
                x: this.dict_panels_sizing.RIGHT_PANEL_X,
                y: this.dict_panels_sizing.PANEL_Y,
                width: panelWidth,
                height: panelHeight
            },
            panelSpacing,
            usableWidth,
            panelWidth,
            panelHeight
        };

        // Now use this.panelsPlacement.leftPanel, etc.
        this.leftPanel = this.add.container(
            this.panelsPlacement.leftPanel.x,
            this.panelsPlacement.leftPanel.y
        );
        const leftPanelBg = this.add.rectangle(
            0, 0,
            this.panelsPlacement.leftPanel.width,
            this.panelsPlacement.leftPanel.height,
            this.PANEL_BACKGROUND_COLOR
        ).setOrigin(0, 0).setDepth(-999);

            //Note the left panelbg is perfect for this screensize, however the title is not following
        const leftPanelTitle = this.add.text(panelWidth / 2, 20, 'ITEMS', {
            fontSize: '18px',
            color: '#ecf0f1',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.leftPanel.add([leftPanelBg, leftPanelTitle]);
        
        // Right panel for NPCs
        // Now use this.panelsPlacement.leftPanel, etc.
        this.rightPanel = this.add.container(
            this.panelsPlacement.rightPanel.x,
            this.panelsPlacement.rightPanel.y
        );
        const rightPanelBg = this.add.rectangle(
            0, 0,
            this.panelsPlacement.rightPanel.width,
            this.panelsPlacement.rightPanel.height,
            this.PANEL_BACKGROUND_COLOR
        ).setOrigin(0, 0).setDepth(-999);
        const rightPanelTitle = this.add.text(panelWidth / 2, 20, 'SUSPECTS', {
            fontSize: '18px',
            color: '#ecf0f1',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.rightPanel.add([rightPanelBg, rightPanelTitle]);
        console.log('panelsPlacement:', this.panelsPlacement);

        this.leftPanel.setName('leftPanel');
        this.rightPanel.setName('rightPanel');
        // String panel at the bottom
        //this.stringPanel = this.add.container(50, 600);
        //const stringPanelBg = this.add.rectangle(0, 0, 700, 150, this.PANEL_BACKGROUND_COLOR)
        //    .setOrigin(0, 0);
        //const stringPanelTitle = this.add.text(350, 20, 'CONNECTION STRINGS', {
        //    fontSize: '18px',
        //    color: '#ecf0f1',
        //    fontStyle: 'bold'
        //}).setOrigin(0.5);
        //this.stringPanel.add([stringPanelBg, stringPanelTitle]);
    }

    private createStringButtons(): void {
        // const stringTexts = [
        //     'MOTIVE',
        //     'OPPORTUNITY', 
        //     'MEANS',
        //     'ALIBI',
        //     'WITNESS',
        //     'EVIDENCE',
        //     'SUSPICIOUS',
        //     'CONFESSION'
        // ];
        const stringTexts = [
            'Connected',
            'Alibi',
            'Suspecious'
        ];

        const buttonWidth = this.int_string_buttonWitdh;
        const buttonHeight = this.int_string_buttonHeight;
        const spacing = buttonWidth * 0.2; 
        const totalWidth = stringTexts.length * buttonWidth + (stringTexts.length - 1) * spacing;
        const startX = (this.scale.width - totalWidth) / 2;
        const y = this.scale.height * 0.85; 

        stringTexts.forEach((text, index) => {
            const x = startX + index * (buttonWidth + spacing);
            //console.info(`Creating string button "${text}" at (${x}, ${y}) with size (${buttonWidth}, ${buttonHeight})`);
            const button = this.createStringButton(text, x, y, buttonWidth, buttonHeight);
            this.stringButtons.push(button);
        });
    }

    private createStringButton(text: string, x: number, y:number, width: number, height: number): StringButton {
        const container = this.add.container(x, y);

        const initialColor = this.getButtonColor(text, false);
        const bg = this.add.rectangle(0, 0, width, height, initialColor)
            .setOrigin(0, 0);
        
        const buttonText = this.add.text(width / 2, height / 2, text, {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, buttonText]);
        container.setSize(width+5, height+5);
        container.setInteractive({ useHandCursor: true });

        const stringButton: StringButton = {
            id: `string_${text}`,
            text,
            container,
            isAttached: false
        };

        // Add click handler for string button
        container.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.selectStringButton(stringButton);
        });

        return stringButton;
    }

    private selectStringButton(stringButton: StringButton): void {

        
        if (this.selectedStringButton === stringButton) {
            // Already selected, deselect
            const prevBg = this.selectedStringButton.container.getAt(0) as Phaser.GameObjects.Rectangle;
            if (prevBg) prevBg.setFillStyle(this.getButtonColor(stringButton.text, false));
            this.resetConnectionState();
            //this.showInstruction(`Deselected "${stringButton.text}". Click a string button to select again.`);
            return;
        }

        // Deselect previous button
        if (this.selectedStringButton) {
            const prevBg = this.selectedStringButton.container.getAt(0) as Phaser.GameObjects.Rectangle;
            if (prevBg) prevBg.setFillStyle(this.getButtonColor(stringButton.text, false));
        }

        // Select new button
        this.selectedStringButton = stringButton;
        const newBg = stringButton.container.getAt(0) as Phaser.GameObjects.Rectangle;
        // Set the new button to the universal "selected" color.
        newBg.setFillStyle(this.getButtonColor(stringButton.text, true));

        // Reset connection state
        this.resetConnectionState();
        this.showInstruction(`Selected "${stringButton.text}". Now click the first card to connect from. (Dragging disabled during connection)`);
        
        // Add visual indicator for connection mode
        this.addConnectionModeIndicator();
    }

    private addConnectionModeIndicator(): void {
        // Remove previous indicator
        const existingIndicator = this.children.getByName('connectionModeIndicator') as Phaser.GameObjects.Text;
        if (existingIndicator) {
            existingIndicator.destroy();
        }

        // Add new indicator
        const indicator = this.add.text(this.cameras.main.centerX, 90, 'CONNECTION MODE - Click cards to connect', {
            fontSize: '14px',
            color: '#e74c3c',
            fontStyle: 'bold',
            backgroundColor: '#2c3e50',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(this.DEPTH.UI);
        indicator.setName('connectionModeIndicator');
    }

    private resetConnectionState(): void {
        this.firstSelectedCard = null;
        this.isConnecting = false;
        this.clearPreviewLine();
        
        // Remove connection mode indicator
        const indicator = this.children.getByName('connectionModeIndicator') as Phaser.GameObjects.Text;
        if (indicator) {
            indicator.destroy();
        }
        
        // Reset card visual states
        const allCards = [...this.leftPanel.getAll(), ...this.rightPanel.getAll()];
        allCards.forEach(card => {
            if (card instanceof Phaser.GameObjects.Container) {
                const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
                if (bg && card.getData('type')) {
                    bg.setFillStyle(0xffffff, 0.9);
                }
            }
        });
    }

    private clearPreviewLine(): void {
        if (this.previewLine) {
            this.previewLine.destroy();
            this.previewLine = null;
        }
    }

    //note til selv, en function som ikke er void skal returnere noget, ellers vil typescript klage
    private createCards(type: 'item' | 'npc', id: string, title: string, imageKey?: string): Phaser.GameObjects.Container {
        const container = new Phaser.GameObjects.Container(this, 0, 0);

        const cardWidth = this.dict_item_npc_container.int_container_width;
        const cardHeight = this.dict_item_npc_container.int_container_height;

        // 1. Create the background. This defines the card's bounds.
        const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0xffffff, 0.9).setOrigin(0, 0);
        container.add(bg);

        const padding = 10;

        if ((type === 'item' || type === 'npc') && imageKey) {
            // Card with Image and Text
            const image = this.add.image(padding, cardHeight / 2, imageKey)
                .setOrigin(0, 0.5) // Align to the left, center vertically
                .setDisplaySize(40, 40);

            const textX = image.x + image.displayWidth + padding;
            const textWidth = cardWidth - textX - padding;

            const name = this.add.text(textX, cardHeight / 2, title, {
                fontSize: '12px',
                color: '#2c3e50',
                fontStyle: 'bold',
                wordWrap: { width: textWidth }
            }).setOrigin(0, 0.5); // Align to the left, center vertically

            container.add([image, name]);

        } else {
            // Card with only Text
            const name = this.add.text(cardWidth / 2, cardHeight / 2, title, {
                fontSize: '12px',
                color: '#2c3e50',
                fontStyle: 'bold',
                wordWrap: { width: cardWidth - padding * 2 }
            }).setOrigin(0.5, 0.5); // Center both horizontally and vertically

            container.add(name);
        }

        // Set the size and interactive area
        container.setSize(cardWidth, cardHeight);
        container.setInteractive({ useHandCursor: true });
        container.setData({ type, id });

        container.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.handleCardClick(container);
        });

        return container;
    }


    private handleCardClick(card: Phaser.GameObjects.Container): void {
        if (!this.selectedStringButton) {
            this.showInstruction('Select a connection type first.');
            return;
        }

        if (!this.isConnecting) {
            // This is the first card click, logic is fine here.
            this.firstSelectedCard = card;
            this.isConnecting = true;
            (card.getAt(0) as Phaser.GameObjects.Rectangle).setFillStyle(this.SELECTED_STRING_COLOR, 0.9);
            this.showInstruction(`Selected first card. Now click the second card to complete the "${this.selectedStringButton.text}" connection.`);
        } else {
            // This is the second card click.
            if (this.firstSelectedCard === card) {
                this.showInstruction('Cannot connect a card to itself.');
                return;
            }

            // Create the connection
            this.createStringLink(this.firstSelectedCard!, card, this.selectedStringButton);

            // --- FIX STARTS HERE ---
            // After the link is made, explicitly reset the color of both cards.
            const firstCardBg = this.firstSelectedCard!.getAt(0) as Phaser.GameObjects.Rectangle;
            firstCardBg.setFillStyle(0xffffff, 0.9); // Reset to default white

            const secondCardBg = card.getAt(0) as Phaser.GameObjects.Rectangle;
            secondCardBg.setFillStyle(0xffffff, 0.9); // Reset to default white
            // --- FIX ENDS HERE ---

            // Now, deselect the button and reset the connection state machine
            if (this.selectedStringButton) {
                const bg = this.selectedStringButton.container.getAt(0) as Phaser.GameObjects.Rectangle;
                bg.setFillStyle(this.getButtonColor(this.selectedStringButton.text, false));
                this.selectedStringButton = null;
            }

            this.resetConnectionState();
        }
    }



    private createStringLink(cardA: Phaser.GameObjects.Container, cardB: Phaser.GameObjects.Container, stringButton: StringButton): void {
        const dataA = this.cardRegistry.get(cardA);
        const dataB = this.cardRegistry.get(cardB);

        if (!dataA || !dataB) {
            console.error("Could not find card data in registry!");
            return;
        }

        // --- THE FIX ---
        // Get the true visual bounds of each card
        const boundsA = cardA.getBounds();
        const boundsB = cardB.getBounds();

        // Use the centerX and centerY from the bounds
        const centerA_x = boundsA.centerX;
        const centerA_y = boundsA.centerY;
        const centerB_x = boundsB.centerX;
        const centerB_y = boundsB.centerY;
        // --- END OF FIX ---


        const line = this.add.line(0, 0, centerA_x, centerA_y, centerB_x, centerB_y, this.getButtonColor(stringButton.text, false)).setLineWidth(3)
            .setOrigin(0, 0)
            .setDepth(this.DEPTH.LINES)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.removeLink(line));

        this.links.push({ a: cardA, b: cardB, line });
        this.showInstruction(`Connected "${stringButton.text}"`);
    }

    private removeLink(lineToRemove: Phaser.GameObjects.Line): void {
        const link = this.links.find(l => l.line === lineToRemove);
        if (link) {
            lineToRemove.destroy();
            if (link.label) link.label.destroy();
            this.links = this.links.filter(l => l.line !== lineToRemove);
            this.showInstruction('Connection removed');
        }
    }

    private setupInputHandlers(allCards: Phaser.GameObjects.Container[]): void {
        // Make all cards draggable
        allCards.forEach(card => {
            if (card instanceof Phaser.GameObjects.Container) {
                this.input.setDraggable(card, true);
            }
        });
        this.input.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container, dragX: number, dragY: number) => {
            if (this.isConnecting) {
                return;
            }

            gameObject.setPosition(dragX, dragY);

            this.links.forEach(link => {
                if (link.a === gameObject || link.b === gameObject) {

                    const boundsA = link.a.getBounds();
                    const boundsB = link.b.getBounds();
                    link.line.setTo(boundsA.centerX, boundsA.centerY, boundsB.centerX, boundsB.centerY);
                    // --- END OF FIX ---
                }
            });
        });

        allCards.forEach(card => {
            if (card instanceof Phaser.GameObjects.Container) {
                card.on(Phaser.Input.Events.POINTER_OVER, () => {
                    if (this.isConnecting && card !== this.firstSelectedCard) {
                        const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
                        if (bg) bg.setFillStyle(this.HOVER_CARD_COLOR, 0.9);
                    }
                });

                card.on(Phaser.Input.Events.POINTER_OUT, () => {
                    if (this.isConnecting && card !== this.firstSelectedCard) {
                        const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
                        if (bg) bg.setFillStyle(0xffffff, 0.9);
                    }
                });
            }
        });
    }

    private showInstruction(message: string): void {
        // Remove previous instruction
        const existingInstruction = this.children.getByName('instruction') as Phaser.GameObjects.Text;
        if (existingInstruction) {
            existingInstruction.destroy();
        }

        // Show new instruction
        const instruction = this.add.text(this.cameras.main.centerX, 120, message, {
            fontSize: '16px',
            color: '#f39c12',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(this.DEPTH.UI);
        instruction.setName('instruction');

        // Auto-remove after 3 seconds
        this.time.delayedCall(3000, () => {
            instruction.destroy();
        });
    }

    private addInstructions(): void {
        const instructions = [
            'ESC: Return to journal',
            'Drag cards to move them around (when not connecting)',
            'Click string buttons, then click two cards to connect them',
            'Click lines to delete connections',
            'Dragging is disabled during connection mode'
        ];

        instructions.forEach((instruction, index) => {
            this.add.text(20, 20 + index * 25, instruction, {
                fontSize: '12px',
                color: '#bdc3c7'
            }).setDepth(this.DEPTH.UI);
        });
    }

    private getButtonColor(text: string, isSelected: boolean): number {
        if (isSelected) {
            // Return a single, consistent "selected" color for all buttons
            return this.SELECTED_STRING_COLOR; // e.g., 0xe67e22 (dark orange)
        }

        // Return a specific color based on the button's text when not selected
        switch (text) {
            case "Connected":
                return 0x2ecc71; // Green
            case "Alibi":
                return 0x3498db; // Blue
            case "Suspecious": // Typo: Should probably be "Suspicious"
                return 0xe74c3c; // Red
            default:
                return this.STRING_BUTTON_COLOR; // Default fallback color
        }
    }

    private addEscapeKeyHandler(): void {
        this.input.keyboard?.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.wake(this.originSceneKey);
        });
    }
} 
