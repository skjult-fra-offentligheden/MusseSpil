// src/ui/AccusationUI.ts
import Phaser from 'phaser';
import { Suspect } from './suspect'; // adjust import as needed

export interface AccusationUIConfig {
    suspectsData: { [key: string]: Suspect };
    suspectsSprites: any;
    originScene: string;
}

export class AccusationUI {
    private scene: Phaser.Scene;
    private config: AccusationUIConfig;
    // Store created UI elements if needed for later cleanup
    private buttonContainers: Phaser.GameObjects.Container[] = [];

    constructor(scene: Phaser.Scene, config: AccusationUIConfig) {
        this.scene = scene;
        this.config = config;
    }

    public createUI(onSuspectSelected: (suspect: Suspect) => void, onReturn: () => void): void {
        // Create background
        this.scene.add.rectangle(
            screen.width / 2,
            screen.height / 2,
            screen.width,
            screen.height,
            0x000080,
            0.8
        );

        const suspects = Object.values(this.config.suspectsData);
        const startX = 100;
        let startY = 100;
        let currentX = startX;
        const padding = 20;
        const spacing = 20;

        // Create suspect buttons
        suspects.forEach((suspect) => {
            // Find matching sprite info
            const spriteInfo = this.config.suspectsSprites.find((sprite: any) => sprite.textureKey === suspect.id) || {};
            // Measure text for button dimensions
            const tempText = this.scene.add.text(0, 0, suspect.name, {
                fontSize: '22px',
                fontFamily: 'Arial',
                color: '#ffffff'
            });
            const buttonWidth = tempText.width + padding * 2;
            const buttonHeight = tempText.height + padding + 100;
            tempText.destroy();

            if (currentX + buttonWidth > screen.width) {
                currentX = startX;
                startY += 150;
            }
            const buttonX = currentX + buttonWidth / 2;
            const buttonY = startY;

            // Add suspect sprite image
            this.scene.add.sprite(buttonX, buttonY + 50, spriteInfo.textureKey, spriteInfo.idleFrame);

            // Create a container for the button
            const buttonContainer = this.scene.add.container(buttonX, buttonY);
            // Create rectangle background
            const buttonBackground = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000343, 0.6)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });
            // Create button text
            const buttonText = this.scene.add.text(0, 0, suspect.name, {
                fontSize: '22px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }).setOrigin(0.5, 1);

            buttonContainer.add([buttonBackground, buttonText]);
            buttonBackground.on('pointerdown', () => {
                onSuspectSelected(suspect);
            });

            this.buttonContainers.push(buttonContainer);
            currentX += buttonWidth + spacing;
        });

        // Optionally, add a back button
        // This could also be delegated to a separate Button class, similar to your existing implementation.
        const backButton = this.scene.add.text(this.scene.scale.width * 0.75, this.scene.scale.height * 0.85, 'Back to Game', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#ffffff',
            backgroundColor: '#000343',
            padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true });
        backButton.on('pointerdown', onReturn);
    }

    public showConfirmation(suspect: Suspect, onConfirm: () => void, onCancel: () => void): void {
        // Create a simple confirmation dialog
        const dialogBg = this.scene.add.rectangle(0, 280, screen.width, 100, 0x0000ff, 1).setOrigin(0, 0);
        const confirmText = this.scene.add.text(
            400,
            300,
            `Are you sure you want to accuse ${suspect.name}?`,
            { fontSize: '18px', fill: '#fff' }
        );

        const yesButton = this.scene.add.text(400, 350, 'Yes', { fontSize: '18px' })
            .setInteractive()
            .on('pointerdown', () => {
                dialogBg.destroy();
                confirmText.destroy();
                yesButton.destroy();
                noButton.destroy();
                onConfirm();
            });

        const noButton = this.scene.add.text(500, 350, 'No', { fontSize: '18px' })
            .setInteractive()
            .on('pointerdown', () => {
                dialogBg.destroy();
                confirmText.destroy();
                yesButton.destroy();
                noButton.destroy();
                onCancel();
            });
    }
}
