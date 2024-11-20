import Phaser, { Geom } from 'phaser';
import { ClueManager } from "../../managers/clueManager"
import { Button } from '../../scripts/buttonScript';
import { Suspect } from "../GameScriptScenes/suspect"
export class AccusationScene extends Phaser.Scene {
    private suspectsData: { [key: string]: Suspect };
    private clueManager: ClueManager;
    private suspectSlot: Phaser.GameObjects.Rectangle[] = [];
    private suspectSlotWidth: number;
    private suspectSlotHeight: number;
    private padding: number = 20;
    private spacing: number = 20;
    private suspectSprites: any;

    constructor() {
        super({ key: 'AccusationScene' });
    }

    init(data: { suspectsData: any; clueManager: ClueManager, suspectsSprites: any }): void {
        this.suspectsData = data.suspectsData;
        this.clueManager = data.clueManager;
        this.suspectSprites = data.suspectsSprites;

    }

    create(): void {
        //Background
        //this.add.rectangle(screen.width / 2, screen.height / 2, screen.width, screen.height, 0x000080, 0.6)
        this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000080,
            0.8
        );

        console.log("suspect sprites: " + this.anims.get("sorcerrorMouse_idle").frames[1].frame + " " + JSON.stringify(this.anims.get("sorcerrorMouse_idle").frames[1], null, 2));

        const suspects = Object.values(this.suspectsData);
        // Define starting positions
        const startX = 100;
        let startY = 100;

        // Keep track of the current X position
        let currentX = startX;

        // Loop through suspects and create interactive buttons
        suspects.forEach((suspect, index) => {
            const { textureKey, idleFrame } = this.suspectSprites.find(sprite => sprite.textureKey === suspect.id) || {};
            console.log("init suspect sprites " + textureKey + " " + idleFrame + " "); // + JSON.stringify(this.suspectSprites, null, 2)
            // Create temporary text to measure its width
            const tempText = this.add.text(0, 0, suspect.name, {
                fontSize: '22px',
                fontFamily: 'Arial',
                color: '#ffffff'
            });
            const textWidth = tempText.width;
            const textHeight = tempText.height;

            // Calculate button dimensions
            const buttonWidth = textWidth + this.padding * 2;
            const buttonHeight = textHeight + this.padding+100;

            if (currentX + buttonWidth > screen.width) {
                currentX = startX;
                startY = startY + 150;
            }

            // Calculate button position
            const buttonX = currentX + buttonWidth / 2;
            const buttonY = startY;
            //add images of chars
            this.add.sprite(buttonX, buttonY+50, textureKey, idleFrame)


            // Create a container for the button
            const buttonContainer = this.add.container(buttonX, buttonY);

            // Create rectangle background
            const buttonBackground = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000343, 0.6)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });

            // Create button text
            const buttonText = this.add.text(0, 0, suspect.name, {
                fontSize: '22px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }).setOrigin(0.5,1);


            // Add background and text to the container
            buttonContainer.add([buttonBackground, buttonText]);

            // Add interactivity
            buttonBackground.on('pointerdown', () => {
                this.confirmAccusation(suspect);
            });

            // Update currentX for the next button
            currentX += buttonWidth + this.spacing;

            // Destroy temporary text
            tempText.destroy();
        });

        // Input handler for 'A' key to return to game
        this.input.keyboard.on("keydown-A", () => {
            this.returnToGame();
        });

        // Create "Back to Game" button using the Button class
        const backButtonConfig = {
            text: "Back to Game",
            textColor: '#ffffff',
            strokeColor: '#000000',
            fontSize: 24,
            fontFamily: "Arial Black",
            align: "center" // Changed to center for better alignment
        };
        const backButtonRect = { backgroundColor: 0x000343, transparency: 0.8, fill: "white" };
        const backButtonOutline = { linewidth: 5, linecolor: 0xffffff };
        const backButtonSize = { x: this.scale.width * 0.75, y: this.scale.height * 0.85, width: 200, height: 50 };

        new Button(this, backButtonSize, backButtonConfig, backButtonRect, backButtonOutline, () => this.returnToGame(), "A");

    }

    private confirmAccusation(suspect: Suspect): void {
        // Display confirmation dialogue
        const tempRect = this.add.rectangle(0, 280, screen.width, 100, 0x000ff, 1).setOrigin(0, 0);
        const confirmText = this.add.text(
            400,
            300,
            `Are you sure you want to accuse ${suspect.name}?`,
            { fontSize: '18px', fill: '#fff' }
        );

        const yesButton = this.add.text(400, 350, 'Yes', { fontSize: '18px' })
            .setInteractive()
            .on('pointerdown', () => {
                this.resolveAccusation(suspect);
            });

        const noButton = this.add.text(500, 350, 'No', { fontSize: '18px' })
            .setInteractive()
            .on('pointerdown', () => {
                confirmText.destroy();
                yesButton.destroy();
                noButton.destroy();
                tempRect.destroy()
            });
    }

    private resolveAccusation(suspect: Suspect): void {
        if (suspect.isCulprit) {
            // Correct accusation
            this.scene.stop('Game');
            this.scene.start('VictoryScene', { suspect });
        } else {
            // Incorrect accusation
            this.scene.stop('Game');
            this.scene.start('GameOver', { suspect });
        }
    }

    private returnToGame(): void {
        this.scene.stop();
        this.scene.resume("Game");
    }

}
