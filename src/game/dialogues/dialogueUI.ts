// src/dialogues/dialogueUI.ts
import Phaser from 'phaser';
import { DialogueNode, DialogueOption } from '../dialogues/dialogues';

export class DialogueUI {
    private scene: Phaser.Scene;
    private dialogueBox: Phaser.GameObjects.Container;
    private dialogueBackground: Phaser.GameObjects.Rectangle;
    private dialogueText: Phaser.GameObjects.Text;
    private optionButtons: Phaser.GameObjects.Text[] = [];
    private selectedOptionIndex: number = 0;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey: Phaser.Input.Keyboard.Key;
    private enterKey: Phaser.Input.Keyboard.Key;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.dialogueBox = this.generateDialogueBackground();
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.scene.scale.on('resize', this.onResize, this);
    }

    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
        this.reset();
    }

    private generateDialogueBackground(): Phaser.GameObjects.Container {
        const width = this.scene.cameras.main.width;
        const height = 200;
        const container = this.scene.add.container(0, this.scene.cameras.main.height - height).setDepth(1000);
        container.setVisible(false);

        this.dialogueBackground = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        this.dialogueBackground.setOrigin(0, 0);
        this.dialogueBackground.setScrollFactor(0);
        container.add(this.dialogueBackground);

        this.dialogueText = this.scene.add.text(40, 40, '', {
            fontSize: '20px',
            color: '#ffffff',
            wordWrap: { width: width - 80 },
            padding: {x:5 , y:5}
        });
        this.dialogueText.setScrollFactor(0);
        container.add(this.dialogueText);

        return container;
    }

    public showDialogue(
        dialogue: DialogueNode,
        onOptionSelect: (option: DialogueOption) => void,
        onExit: () => void
    ) {
        this.dialogueBox.setVisible(true);
        this.dialogueText.setText(dialogue.speaker ? `${dialogue.speaker}: ${dialogue.text}` : dialogue.text);
        this.clearOptions();
        this.selectedOptionIndex = 0;
        console.log("[DialogueUI] showDialogue called for node:", dialogue.id);
        // Render options
        const optionsStartY = 100; // Give more space below main text
        const optionsSpacingY = 40; // Increase space between options
        dialogue.options.forEach((option, index) => {
            const buttonText = this.scene.add.text(40, optionsStartY + index * optionsSpacingY, option.speaker ? `${option.speaker}: ${option.text}` : option.text, {
                fontSize: '16px',
                color: '#00ff00',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 },
                wordWrap: { width: this.dialogueBackground.width - 80 },
            }).setInteractive({ useHandCursor: true });

            buttonText.setScrollFactor(0);
            buttonText.on('pointerup', () => onOptionSelect(option));
            this.optionButtons.push(buttonText);
            this.dialogueBox.add(buttonText);
        });

        // Add exit button
        const exitButton = this.scene.add.text(this.dialogueBackground.width - 40, this.dialogueBackground.height - 30, 'Exit Talk', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#ff0000',
            padding: { x: 10, y: 5 },
        }).setInteractive({ useHandCursor: true }).setOrigin(1,1);

        exitButton.setScrollFactor(0);
        exitButton.on('pointerup', onExit);
        this.dialogueBox.add(exitButton);

        this.updateOptionHighlight();
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
        this.optionButtons.forEach(button => button.destroy());
        this.optionButtons = [];
    }

    public hideDialogue() {
        this.dialogueBox.setVisible(false);
        this.dialogueText.setText('');
        this.clearOptions();
    }

    public reset() {
        if (this.dialogueBox) this.dialogueBox.destroy();
        this.dialogueBox = this.generateDialogueBackground();
    }

    private onResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;
        this.dialogueBackground.setSize(width, 200);
        this.dialogueBox.setPosition(0, height - 200);
        this.dialogueText.setWordWrapWidth(width - 40);
        this.optionButtons.forEach((button, index) => {
            button.setPosition(20, 60 + index * 30);
            button.setWordWrapWidth(width - 40);
        });
    }
    public getSelectedOptionIndex(): number {
        return this.selectedOptionIndex;
    }

    public handleOptionNavigationInput(): void {
        if (this.optionButtons.length === 0) {
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.selectedOptionIndex = Math.max(0, this.selectedOptionIndex - 1);
            this.updateOptionHighlight();
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            // Prevent index from going out of bounds for the number of buttons
            this.selectedOptionIndex = Math.min(this.optionButtons.length - 1, this.selectedOptionIndex + 1);
            this.updateOptionHighlight();
        }
    }
}