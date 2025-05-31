// src/game/scenes/ClueDisplayScene.ts

import Phaser from 'phaser';
import { Clue } from '../classes/clue';
import { ClueManager } from '../clueScripts/clueManager';
import { Button } from "../scripts/buttonScript"
import { artKey } from '../scenes/ToturialScene/evidenceArtHelper';
interface ClueDisplaySceneData {
    clueManager: ClueManager;
}
export class ClueDisplayScene extends Phaser.Scene {
    private clueManager: ClueManager;
    private cluesContainer: Phaser.GameObjects.Container;
    private closeButton: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'ClueDisplayScene' });
    }

    init(data: ClueDisplaySceneData) {
        this.clueManager = data.clueManager;
    }

    create() {


        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const background = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        // Create container for clues
        this.cluesContainer = this.add.container(width / 2, height / 2).setScrollFactor(0);

        // Create a panel for clues
        const panelWidth = 600;
        const panelHeight = 400;
        const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x333333, 0.9);
        panel.setOrigin(0.5, 0.5);
        this.cluesContainer.add(panel);

        // Title
        const title = this.add.text(0, -panelHeight / 2 + 20, 'Collected Clues', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
        }).setOrigin(0.5, 0);

        this.cluesContainer.add(title);

        // Display clues
        const clues = this.clueManager.getAllClues().filter(clue => clue.discovered);
        if (clues.length === 0) {
            const noCluesText = this.add.text(0, 50, 'No clues collected yet.', {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 },
            }).setOrigin(0.5, 0);
            this.cluesContainer.add(noCluesText);
        } else {
            const clueSpacing = 80;
            clues.forEach((clue, index) => {
                // Display clue title
                const titleText = this.add.text(-250, -panelHeight / 2 + 60 + index * clueSpacing, `• ${clue.title}`, {
                    fontSize: '20px',
                    color: '#ffff00',
                    backgroundColor: '#000000',
                    padding: { x: 5, y: 5 },
                }).setOrigin(0, 0.5);

                this.cluesContainer.add(titleText);

                // Display clue description
                const descriptionText = this.add.text(-250, -panelHeight / 2 + 60 + index * clueSpacing + 30, clue.description, {
                    fontSize: '16px',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    wordWrap: { width: 500 },
                    padding: { x: 5, y: 5 },
                }).setOrigin(0, 0.5);

                this.cluesContainer.add(descriptionText);

                // Optionally, display clue image if available
                if (clue.imageKey) {
                    const clueImage = this.add.image(200, -panelHeight / 2 + 60 + index * clueSpacing, clue.imageKey)
                        .setScale(0.5)
                        .setOrigin(0, 0.5);
                    this.cluesContainer.add(clueImage);
                }
            });
        }

        // Create "Close" button
        this.closeButton = this.add.text(0, panelHeight / 2 - 50, 'Close', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#ff0000',
            padding: { x: 10, y: 5 },
        }).setOrigin(0.5, 0.5)
            .setInteractive({ useHandCursor: true });

        this.closeButton.on('pointerup', () => {
            this.closeClueDisplay();
        });

        this.cluesContainer.add(this.closeButton);

        // Handle Esc key to close
        this.input.keyboard.on('keydown-ESC', () => {
            this.closeClueDisplay();
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

        new Button(this, backButtonSize, backButtonConfig, backButtonRect, backButtonOutline, () => this.closeClueDisplay(), "J");

    }

    private closeClueDisplay() {
        // Emit event to notify Game scene to resume
        this.scene.get('Game').events.emit('clueDisplayClosed');

        // Stop this scene
        this.scene.stop();
    }

    private returnToGame(): void {
        this.scene.stop();
        this.scene.resume("Game");
    }

}
