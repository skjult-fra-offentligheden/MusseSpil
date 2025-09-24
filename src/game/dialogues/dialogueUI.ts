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
    //portrait mode
    private portraitImage: Phaser.GameObjects.Image;
    private portraitSize: number = 0;


    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.dialogueBox = this.generateDialogueUI();
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.scene.scale.on('resize', this.onResize, this);
    }

    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
        this.reset();
    }

    private generateDialogueUI(): Phaser.GameObjects.Container {
        const width = this.scene.cameras.main.width;
        const boxHeight = 180; // Slightly taller to better fit portrait
        const padding = 20;

        const container = this.scene.add.container(0, this.scene.cameras.main.height - boxHeight)
            .setDepth(1000)
            .setVisible(false)
            .setScrollFactor(0);

        this.dialogueBackground = this.scene.add.rectangle(0, 0, width, boxHeight, 0x000000, 0.8)
            .setOrigin(0, 0);
        container.add(this.dialogueBackground);

        // --- NEW: PORTRAIT AND LAYOUT LOGIC ---
        this.portraitSize = boxHeight - (padding * 3); // e.g., 140x140
        const portraitX = padding + (this.portraitSize / 2);
        console.log(`[DialogueUI] Portrait X position: ${portraitX}, Size: ${this.portraitSize}`);

        // Create the portrait image, but keep it hidden initially
        this.portraitImage = this.scene.add.image(portraitX, boxHeight / 2, 'portrait_unknown')
            .setDisplaySize(this.portraitSize, this.portraitSize)
            .setOrigin(0.5)
            .setVisible(false);
        container.add(this.portraitImage);

        // --- ADJUSTED: Text and Option Positions ---
        const textStartX = portraitX + (this.portraitSize / 2) + padding;
        const textWidth = width - textStartX - padding;

        this.dialogueText = this.scene.add.text(textStartX, padding, '', {
            fontSize: '20px',
            color: '#ffffff',
            wordWrap: { width: textWidth },
        });
        container.add(this.dialogueText);

        // We will add options dynamically in showDialogue, so no need to create a container here

        return container;
    }

    public setPortrait(textureKey: string) {
        if (this.scene.textures.exists(textureKey)) {
            this.portraitImage.setTexture(textureKey).setVisible(true);
        } else {
            // Fallback to a default or hide it if texture is missing
            this.portraitImage.setTexture('portrait_unknown').setVisible(true);
            console.warn(`Portrait texture not found: ${textureKey}`);
        }
    }

    // --- ADD THIS NEW METHOD to hide the portrait ---
    public hidePortrait() {
        this.portraitImage.setVisible(false);
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
        //console.log("[DialogueUI] showDialogue called for node:", dialogue.id);
        // Render options
        const textBounds = this.dialogueText.getBounds();
        const optionsStartY = textBounds.bottom - this.dialogueBox.y + 15;
        const optionsStartX = this.dialogueText.x;
        const optionsSpacingY = 30;
        dialogue.options.forEach((option, index) => {
            const buttonText = this.scene.add.text(optionsStartX, optionsStartY + index * optionsSpacingY, option.speaker ? `${option.speaker}: ${option.text}` : option.text, {
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
        this.hidePortrait(); // Also hide the portrait when the box is hidden
        this.clearOptions();
    }

    public reset() {
        if (this.dialogueBox) this.dialogueBox.destroy();
        this.dialogueBox = this.generateDialogueUI();
    }


    private onResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;
        const boxHeight = this.dialogueBackground.height;
        this.dialogueBackground.setSize(width, boxHeight);
        this.dialogueBox.setPosition(0, height - boxHeight);

        const padding = 20;
        this.portraitSize = boxHeight - (padding * 2);

        const portraitX = padding + (this.portraitSize / 2);
        this.portraitImage.setPosition(portraitX, boxHeight / 2);
        this.resizeAndPositionPortrait();

        const textStartX = portraitX + (this.portraitSize / 2) + padding;
        const textWidth = width - textStartX - padding;
        this.dialogueText.setPosition(textStartX, padding);
        this.dialogueText.setWordWrapWidth(textWidth);

        const textBounds = this.dialogueText.getBounds();
        const optionsStartY = textBounds.bottom - this.dialogueBox.y + 15;
        const optionsSpacingY = 30;
        this.optionButtons.forEach((button, index) => {
            button.setPosition(textStartX, optionsStartY + index * optionsSpacingY);
            button.setWordWrapWidth(textWidth);
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

    private resizeAndPositionPortrait() {
        if (!this.portraitImage.texture || !this.portraitImage.visible) {
            return; // Nothing to resize
        }

        const texture = this.portraitImage.texture;
        const imageWidth = texture.getSourceImage().width;
        const imageHeight = texture.getSourceImage().height;

        let newWidth, newHeight;
        const ratio = imageWidth / imageHeight;

        // Determine if the image is wider than it is tall (landscape) or taller (portrait)
        if (imageWidth > imageHeight) {
            // Wider image: its width should match the box size
            newWidth = this.portraitSize;
            newHeight = this.portraitSize / ratio;
        } else {
            // Taller image: its height should match the box size
            newHeight = this.portraitSize;
            newWidth = this.portraitSize * ratio;
        }

        // Apply the calculated, non-distorted size
        this.portraitImage.setDisplaySize(newWidth, newHeight);
    }
}