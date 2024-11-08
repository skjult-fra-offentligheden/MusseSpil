// src/managers/DialogueManager.ts

import Phaser from 'phaser';
import { DialogueNode, DialogueOption } from '../classes/dialogues';
import { NPC } from '../classes/npc';

export class DialogueManager {
    private scene: Phaser.Scene;
    private dialogueBox: Phaser.GameObjects.Container;
    private dialogueBackground: Phaser.GameObjects.Rectangle;
    private dialogueText: Phaser.GameObjects.Text;
    private optionButtons: Phaser.GameObjects.Text[] = [];
    private isActive: boolean = false;
    private currentDialogues: DialogueNode[] = [];
    private ignoreInitialClicks: boolean = true; 
    private currentNpcId: string = ''; 
    private currentNpc: NPC | null = null;

    //Vælg mulighed
    private selectedOptionIndex: number = 0;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey: Phaser.Input.Keyboard.Key;
    private Enter: Phaser.Input.Keyboard.Key;


    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // Create dialogue box container
        this.dialogueBox = this.scene.add.container(0, 0).setDepth(1000); // High depth to overlay other elements
        this.dialogueBox.setVisible(false);

        // Create dialogue box background and rect
        const width = this.scene.cameras.main.width;
        const height = 200 // Adjust height as needed
        this.dialogueBackground = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        this.dialogueBackground.setOrigin(0, 0);

        this.dialogueBackground.setScrollFactor(0);

        this.dialogueBox.add(this.dialogueBackground);

        // Create text
        this.dialogueText = this.scene.add.text(20, 20, '', {
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: width - 40 },
        });
        this.dialogueText.setScrollFactor(0);
        this.dialogueBox.add(this.dialogueText);

        this.dialogueBox.setPosition(0, this.scene.cameras.main.height - height);

        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.Enter = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        // Handle window scaling
        this.scene.scale.on('resize', this.onResize, this);
    }

    private onResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;
        this.dialogueBackground.width = width;
        this.dialogueBackground.height = 150; 
        this.dialogueBox.setPosition(0, height - this.dialogueBackground.height);
        this.dialogueText.setWordWrapWidth(width - 40);
    }

    public startDialogue(dialogues: DialogueNode[], startDialogueId: string = 'greeting', npcId: string, npcInstance?: NPC) {
        if (this.isActive) return; 
        this.isActive = true;
        this.currentDialogues = dialogues;
        this.currentNpcId = npcId; 
        this.currentNpc = npcInstance;
        const startDialogue = this.getDialogueById(startDialogueId);
        if (startDialogue) {

            this.dialogueBox.setVisible(true);
            this.displayDialogue(startDialogue);

            this.ignoreInitialClicks = true;
            this.scene.time.delayedCall(200, () => { // 200ms delay
                this.ignoreInitialClicks = false;
            }, [], this);
        } else {
            console.log(`Dialogue ID "${startDialogueId}" not found.`);
            this.isActive = false;
        }
    }

    private getDialogueById(id: string): DialogueNode | undefined {
        //los problemos muerdo
        // d=> dialogue node
        // d.id=> dialogue Index
        // id == diaglogue node id
        return this.currentDialogues.find(d => d.id === id);
    }

    private displayDialogue(dialogue: DialogueNode) {
        this.dialogueText.setText(dialogue.text);
        //console.log(`Displaying dialogue: ${dialogue.id} - ${dialogue.text}`);
        this.clearOptions();
        this.selectedOptionIndex = 0;

        // Create option buttons
        dialogue.options.forEach((option, index) => {
            const isSelected = index === this.selectedOptionIndex;
            
            const buttonText = this.scene.add.text(20, 60 + index * 30, option.text, {
              fontSize: '24px',
              color: '#00ff00',
              backgroundColor: '#000000',
              padding: { x: 10, y: 5 },
              wordWrap: { width: this.dialogueBackground.width - 40 },
            }).setInteractive({ useHandCursor: true });
          
            buttonText.setScrollFactor(0);
            // Attach event listener immediately
            buttonText.on('pointerup', () => {
              this.handleOptionSelection(option);
            });
          
            this.optionButtons.push(buttonText);
            this.dialogueBox.add(buttonText);
          });
    }

    private handleOptionSelection(option: DialogueOption) {

        // Execute callback if present
        if (option.callback) {
            option.callback();
        }

        if (option.nextDialogueId) {
            // Find the next dialogue node within currentDialogues
            const nextDialogue = this.getDialogueById(option.nextDialogueId);
            if (nextDialogue) {
                this.displayDialogue(nextDialogue);
                return;
            } else {
            }
        }

        // If no nextDialogueId, end dialogue
        this.endDialogue();
    }

    private handleKeyboardInput() {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
            this.selectedOptionIndex--;
            if (this.selectedOptionIndex < 0) {
                this.selectedOptionIndex = this.optionButtons.length - 1;
            }
            this.updateOptionHighlight();
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
            this.selectedOptionIndex++;
            if (this.selectedOptionIndex >= this.optionButtons.length) {
                this.selectedOptionIndex = 0;
            }
            this.updateOptionHighlight();
        } else if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            const selectedOption = this.currentDialogues.find(dialogue => dialogue.id)?.options[this.selectedOptionIndex];
            if (selectedOption) {
                this.handleOptionSelection(selectedOption);
            }
        }
        else if (Phaser.Input.Keyboard.JustDown(this.Enter)) {
            this.endDialogue()
        }
    }

    private updateOptionHighlight() {
        this.optionButtons.forEach((button, index) => {
            const isSelected = index === this.selectedOptionIndex;
            button.setStyle({
                color: isSelected ? '#ffff00' : '#00ff00',
                backgroundColor: isSelected ? '#333333' : '#000000',
            });
        });
    }

    private clearOptions() {
        try {
            if (this.optionButtons.length === 0) {
            }
            this.optionButtons.forEach((button, index) => {
                if (!button) {
                    return;
                }
                button.destroy();
            });
            this.optionButtons = [];
        } catch (error) {
        }
    }

    public endDialogue() {
        this.isActive = false;
        this.dialogueBox.setVisible(false);
        this.dialogueText.setText('');
        this.clearOptions();
        this.currentNpc = null;
        this.scene.physics.world.resume();

        this.scene.events.emit('dialogueEnded', this.currentNpcId);
    }

    public getCurrentNpc(): Phaser.GameObjects.Sprite | null {
        return this.currentNpc;
    }

    public isDialogueActive(): boolean {
        return this.isActive;
    }

    public getCurrentNpcInstance(): NPC | null {
        return this.currentNpc;
    }

    public update() {
        if (this.isActive) {
            this.handleKeyboardInput();
        }
    }
}
