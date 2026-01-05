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
    
    // Portrait mode
    private portraitImage: Phaser.GameObjects.Image;
    private portraitSize: number = 0;

    // Continue Indicator
    private continueIndicator: Phaser.GameObjects.Text; 
    private continueTween: Phaser.Tweens.Tween | null = null;
    
    // NEW: We store the function we want to run when the button is clicked here
    private currentAction: (() => void) | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.dialogueBox = this.generateDialogueUI();
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.scene.scale.on('resize', this.onResize, this);
        this.scene.events.once('shutdown', this.destroy, this);
    }

    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
        this.reset();
    }

    private generateDialogueUI(): Phaser.GameObjects.Container {
        const width = this.scene.cameras.main.width;
        const boxHeight = 180;
        const padding = 20;

        const container = this.scene.add.container(0, this.scene.cameras.main.height - boxHeight)
            .setDepth(1000)
            .setVisible(false)
            .setScrollFactor(0);

        this.dialogueBackground = this.scene.add.rectangle(0, 0, width, boxHeight, 0x000000, 0.8)
            .setOrigin(0, 0);
        container.add(this.dialogueBackground);

        // --- Portrait ---
        this.portraitSize = boxHeight - (padding * 3);
        const portraitX = padding + (this.portraitSize / 2);
        
        this.portraitImage = this.scene.add.image(portraitX, boxHeight / 2, 'portrait_unknown')
            .setDisplaySize(this.portraitSize, this.portraitSize)
            .setOrigin(0.5)
            .setVisible(false);
        container.add(this.portraitImage);

        // --- Text ---
        const textStartX = portraitX + (this.portraitSize / 2) + padding;
        const textWidth = width - textStartX - padding;

        this.dialogueText = this.scene.add.text(textStartX, padding, '', {
            fontSize: '20px',
            color: '#ffffff',
            wordWrap: { width: textWidth },
        });
        container.add(this.dialogueText);

        // --- Continue Button ---
        this.continueIndicator = this.scene.add.text(width - 20, boxHeight - 20, 'Continue', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#00ff00', 
            padding: { x: 10, y: 5 },
        })
        .setOrigin(1, 1)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

        // FIX: Permanent listener. It never gets removed.
        // It simply executes whatever "this.currentAction" is set to at that moment.
        this.continueIndicator.on('pointerdown', () => {
            if (this.currentAction) {
                this.currentAction();
            }
        });

        container.add(this.continueIndicator);

        return container;
    }

    public showDialogue(
        dialogue: DialogueNode,
        onOptionSelect: (option: DialogueOption) => void,
        onExit: () => void,
        onContinue: () => void
    ) {
        this.dialogueBox.setVisible(true);
        this.dialogueText.setText(dialogue.speaker ? `${dialogue.speaker}: ${dialogue.text}` : dialogue.text);
        
        this.clearOptions();
        this.selectedOptionIndex = 0;
        
        // --- CLEAN LOGIC SPLIT ---
        if (dialogue.options && dialogue.options.length > 0) {
            this.hideContinueIndicator();
            this.showContinueIndicator(dialogue, onExit, onContinue);
            this.renderOptions(dialogue, onOptionSelect);
        } else {
            this.showContinueIndicator(dialogue, onExit, onContinue);

        this.updateOptionHighlight();
        }
    }

private renderOptions(
        dialogue: DialogueNode,
        onOptionSelect: (option: DialogueOption) => void
    ) {
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

        // const exitButton = this.scene.add.text(this.dialogueBackground.width - 40, this.dialogueBackground.height - 30, 'Exit Talk', {
        //     fontSize: '20px',
        //     color: '#ffffff',
        //     backgroundColor: '#ff0000',
        //     padding: { x: 10, y: 5 },
        // }).setInteractive({ useHandCursor: true }).setOrigin(1, 1);

        // exitButton.setScrollFactor(0);
        // exitButton.on('pointerup', onExit);
        
        // this.optionButtons.push(exitButton);
        // this.dialogueBox.add(exitButton);
        // We do NOT add the "Exit Talk" button here anymore, forcing the player to choose.
    }

    private showContinueIndicator(currentDialogue: DialogueNode, onExit: () => void, onContinue: () => void) {
        this.continueIndicator.setVisible(true);
        this.continueIndicator.setAlpha(1);

        // Determine if this is the last node
        const isLastNode = !currentDialogue.nextDialogueId;

        // 1. Set Appearance and Action based on state
        if (!isLastNode) {
            this.continueIndicator.setText("Continue");
            this.continueIndicator.setBackgroundColor('#00ff00'); // Green
            this.currentAction = onContinue; // Store the "Continue" function
        } else {
            this.continueIndicator.setText("End");
            this.continueIndicator.setBackgroundColor('#ff0000'); // Red
            this.currentAction = onExit; // Store the "Exit" function
        }

        this.continueIndicator.setInteractive({ useHandCursor: true });
        this.continueIndicator.setScrollFactor(0);


        if (this.continueTween) return;

        this.continueTween = this.scene.tweens.add({
            targets: this.continueIndicator,
            alpha: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
        });
    }

    private hideContinueIndicator() {
        this.continueIndicator.setVisible(false);
        this.currentAction = null; // Disable the button action
        if (this.continueTween) {
            this.continueTween.stop();
            this.continueTween = null;
        }
    }

    public destroy() {
        this.scene.scale.off('resize', this.onResize, this);
        if (this.dialogueBox) {
            this.dialogueBox.destroy();
        }
    }

    public setPortrait(textureKey: string) {
        if (this.scene.textures.exists(textureKey)) {
            this.portraitImage.setTexture(textureKey).setVisible(true);
        } else {
            this.portraitImage.setTexture('portrait_unknown').setVisible(true);
            console.warn(`Portrait texture not found: ${textureKey}`);
        }
    }

    public hidePortrait() {
        this.portraitImage.setVisible(false);
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
        this.hidePortrait(); 
        this.hideContinueIndicator(); 
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

        this.continueIndicator.setPosition(width - 20, boxHeight - 20);

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
        if (this.optionButtons.length === 0) return;

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.selectedOptionIndex = Math.max(0, this.selectedOptionIndex - 1);
            this.updateOptionHighlight();
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.selectedOptionIndex = Math.min(this.optionButtons.length - 1, this.selectedOptionIndex + 1);
            this.updateOptionHighlight();
        }
    }

    private resizeAndPositionPortrait() {
        if (!this.portraitImage.texture || !this.portraitImage.visible) return;

        const texture = this.portraitImage.texture;
        const imageWidth = texture.getSourceImage().width;
        const imageHeight = texture.getSourceImage().height;

        let newWidth, newHeight;
        const ratio = imageWidth / imageHeight;

        if (imageWidth > imageHeight) {
            newWidth = this.portraitSize;
            newHeight = this.portraitSize / ratio;
        } else {
            newHeight = this.portraitSize;
            newWidth = this.portraitSize * ratio;
        }

        this.portraitImage.setDisplaySize(newWidth, newHeight);
    }
}