// src/managers/DialogueManager.ts

import Phaser from 'phaser';
import { DialogueNode, DialogueOption } from '../classes/dialogues';
import { NPC } from '../classes/npc';
import { ClueManager } from "../managers/clueManager";
import { Clue } from  '../classes/clue'
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
    private clueManager: ClueManager;
    private cluesData: { [key: string]: Clue };
    private currentDialogueNode!: DialogueNode;
    //Vælg mulighed
    private selectedOptionIndex: number = 0;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey: Phaser.Input.Keyboard.Key;
    private Enter: Phaser.Input.Keyboard.Key;
    private exitButton: Phaser.GameObjects.Text;
    private dialoguesData: { [npcId: string]: DialogueNode };


    constructor(scene: Phaser.Scene, dialoguesData: any, clueManager: ClueManager, cluesData: any) {
        this.scene = scene;
        this.dialoguesData = dialoguesData;
        this.clueManager = clueManager;
        this.cluesData = cluesData;
        console.log("cluesdata " + this.cluesData);
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

    public startDialogue(npcId: string, startDialogueId: string = 'greeting', npcInstance?: NPC, dialogues?: DialogueNode[]) {
        try {
            if (this.isActive) return;
            this.isActive = true;
            this.currentNpcId = npcId;
            this.currentNpc = npcInstance;

            // Use dialogues from the NPC instance if available
            if (npcInstance && npcInstance.dialogues) {
                this.currentDialogues = npcInstance.dialogues;
            } else {
                this.currentDialogues = this.dialoguesData[npcId] || [];
            }

            const startDialogue = this.getDialogueById(startDialogueId);
            if (startDialogue) {
                // Display the dialogue
                this.dialogueBox.setVisible(true);
                this.displayDialogue(startDialogue);
            } else {
                console.log(`Dialogue ID "${startDialogueId}" not found for NPC "${npcId}". NPC instance "${npcInstance}"`);
                this.isActive = false;
            }
        } catch (error) {
            console.error("startDialogue error:", error);
        }
    }


    private getDialogueById(id: string): DialogueNode | undefined {
        //los problemos muerdo
        // d=> dialogue node
        // d.id=> dialogue Index
        // id == diaglogue node id
        console.log(`getDialogueById called with id: ${id}  stringify ${JSON.stringify(id,null,2)}`);
        return this.currentDialogues.find(d => d.id === id);
    }

    private displayDialogue(dialogue: DialogueNode) {
        this.currentDialogueNode = dialogue;
        let set_dialogue_text = ''
        if (dialogue.speaker) {
            set_dialogue_text = `${dialogue.speaker}: ${dialogue.text}`
        }
        else { set_dialogue_text = `${dialogue.text}` }
        this.dialogueText.setText(set_dialogue_text);
        
        //console.log(`Displaying dialogue: ${dialogue.id} - ${dialogue.text}`);
        this.clearOptions();
        this.selectedOptionIndex = 0;

        // Create option buttons
        dialogue.options.forEach((option, index) => {
            const isSelected = index === this.selectedOptionIndex;
            let set_option_text = ''
            if (option.speaker) { set_option_text = `${option.speaker} : ${option.text}` }
            else { set_option_text = `${option.text}` }

            const buttonText = this.scene.add.text(20, 60 + index * 30, set_option_text, {
              fontSize: '24px',
              color: '#00ff00',
              backgroundColor: '#000000',
              padding: { x: 10, y: 5 },
              wordWrap: { width: this.dialogueBackground.width - 40 },
            }).setInteractive({ useHandCursor: true });
          
            buttonText.setScrollFactor(0);
            // Attach event listener immediately
            buttonText.on('pointerup', () => {
                console.log("selectedOption " + this.currentDialogueNode.options[this.selectedOptionIndex])
                this.handleOptionSelection(option);

            });
          
            this.optionButtons.push(buttonText);
            this.dialogueBox.add(buttonText);
        });

        const exitButton = this.scene.add.text(this.dialogueBackground.width - 120, this.dialogueBackground.height - 40, 'Exit Talk', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#ff0000',
            padding: { x: 10, y: 5 },
        }).setInteractive({ useHandCursor: true });

        exitButton.setScrollFactor(0);
        exitButton.on('pointerup', () => {
            this.handleExitTalk();
        });

        this.dialogueBox.add(exitButton);
    }

    private handleExitTalk() {
        // Cleanup dialogue UI
        this.clearOptions();
        this.dialogueBox.setVisible(false);
        this.dialogueText.setText('');
        // Destroy any remaining buttons if necessary

        // Reset dialogue state
        this.isActive = false;
        this.currentNpc = null;

        // Optionally, emit an event if other systems need to respond
        this.scene.events.emit('dialogueEnded', this.currentNpcId);
    }

    private handleOptionSelection(option: DialogueOption) {
        console.log(`handleOptionSelection called with option:`, option);
        console.log(`Type of option.nextDialogueId:`, typeof option.nextDialogueId);
        console.log(`option.nextDialogueId: ${option.nextDialogueId}`);
        // Execute callback if present
        
        if (option.callbackId) {
            console.log("doing callback")
            this.handleCallback(option.callbackId);

            console.log("success callback")
        }

        if (option.nextDialogueId) {
            // Find the next dialogue node within currentDialogues
            const nextDialogue = this.getDialogueById(option.nextDialogueId);
            if (nextDialogue) {
                this.displayDialogue(nextDialogue);
                return;
            } else {
                console.warn(`Next dialogue ID "${option.nextDialogueId}" not found.`);
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
            const selectedOption = this.currentDialogueNode.options[this.selectedOptionIndex];
            if (selectedOption) {
                console.log("selectedOption " + this.currentDialogueNode.options[this.selectedOptionIndex])
                this.handleOptionSelection(selectedOption);
            }
        } else if (Phaser.Input.Keyboard.JustDown(this.Enter)) {
            this.endDialogue();
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
                console.error("Clear options length 1")
            }
            this.optionButtons.forEach((button, index) => {
                if (!button) {
                    return;
                }
                button.destroy();
            });
            this.optionButtons = [];
        } catch (error) {
            console.error("console error: " + error)
        }
    }

    private handleCallback(callbackId: string) {
        switch (callbackId) 
        {
            case "Investigate_body": {
                console.log(`Adding clue ${this.cluesData}`);
                const data = this.cluesData[callbackId];
                console.log("added data")
                this.clueManager.addClue({ ...data, discovered: true });
                const message = `New Clue Collected: ${data}`;
                // Implement your UI logic to show the message
                console.log(message); // Replace with actual UI code
                break
            }
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

