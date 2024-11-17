import Phaser, { Geom } from 'phaser';
import { ClueManager } from "../../managers/clueManager"
import { Button } from '../../scripts/buttonScript';

export class AccusationScene extends Phaser.Scene {
  private suspectsData: { [key: string]: Suspect };
  private clueManager: ClueManager;
    private suspectSlot: Phaser.GameObjects.Rectangle[] = [];
    private suspectSlotWidth: number;
    private suspectSlotHeight: number;
    private padding: number = 20;
    private spacing: number = 20;
  constructor() {
    super({ key: 'AccusationScene' });
  }

  init(data: { suspectsData: any; clueManager: ClueManager }): void {
    this.suspectsData = data.suspectsData;
    this.clueManager = data.clueManager;
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
            0.6
        );

        const suspects = Object.values(this.suspectsData);

        // Define starting positions
        const startX = 100;
        const startY = 100;

        // Keep track of the current X position
        let currentX = startX;

        // Loop through suspects and create interactive buttons
        suspects.forEach((suspect, index) => {
            // Create temporary text to measure its width
            const tempText = this.add.text(0, 0, suspect.name, {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#ffffff'
            });

            const textWidth = tempText.width;
            const textHeight = tempText.height;

            // Calculate button dimensions
            const buttonWidth = textWidth + this.padding * 2;
            const buttonHeight = textHeight + this.padding;

            // Calculate button position
            const buttonX = currentX + buttonWidth / 2;
            const buttonY = startY;

            // Create a container for the button
            const buttonContainer = this.add.container(buttonX, buttonY);

            // Create rectangle background
            const buttonBackground = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000343, 0.8)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });

            // Create button text
            const buttonText = this.add.text(0, 0, suspect.name, {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }).setOrigin(0.5);

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
        const backButtonSize = { x: this.scale.width * 0.25, y: this.scale.height * 0.85, width: 200, height: 50 };

        new Button(this, backButtonSize, backButtonConfig, backButtonRect, backButtonOutline, () => this.returnToGame(), "A");

  }

  private confirmAccusation(suspect: Suspect): void {
    // Display confirmation dialogue
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

    private suspectsList() {
        for (let col = 0; col < 4; col++) {
            //const x = this.suspectSlotWidth * col + this.suspectSlotWidth / 2;
            //const y = this.suspectSlotHeight * row + this.suspectSlotHeight / 2;

            const slot = this.add.rectangle(100 * col, 100, this.suspectSlotWidth - 10, this.suspectSlotHeight - 10, 0xaaaaaa);
            slot.setDepth(10);
            console.log("slot " + JSON.stringify(slot));
            slot.setStrokeStyle(2, 0x000000);
            //slot.setData('slotIndex', this.storySlots.length);

            // Store slot dimensions for future use
            slot.setData('slotWidth', this.suspectSlotWidth);
            slot.setData('slotHeight', this.suspectSlotHeight);

            //const dropSlotAction = this.add.rectangle(x, y, 100, 100, 0xaaaffb);
            //console.log(dropSlotAction);
            //dropSlotAction.setData("slotIndex", this.storySlotData.length);
            //dropSlotReaction.setData("slotIndex", this.storySlotData.length);

            //dropSlotAction.setInteractive();
            //dropSlotReaction.setInteractive();


            //dropSlotAction.input.dropZone = true;
            //dropSlotReaction.input.dropZone = true;

            //this.suspectSlot.push();
            //this.storySlots.push(dropSlotReaction);

            //const slotKey = `row${row}_col${col}`;


            // Initialize the array for this slot key if it doesn't exist
            //if (!this.storyUnits[slotKey]) {
            //    this.storyUnits[slotKey] = { action: null, reaction: null };
            //}

            //this.storySlots.push(dropSlotAction, dropSlotReaction);
            //this.storySlotData.push(this.storyUnits[slotKey]);


            //slot.input.dropZone = true; // Enable drop zone for story slots

            // Store the slot and its data
            //this.storySlots.push(dropSlotAction);
            //console.log("story slot data" + JSON.stringify(this.storySlotData));

        }
    }
}

