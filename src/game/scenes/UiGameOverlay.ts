import { Button } from "../scripts/buttonScript";
import { Scene } from "phaser";

export class UIGameOverlay extends Scene {
    constructor() {
        super({key: "UIGameScene", active: false})
    }
    create(): void {
        console.log("I am in the UI overlay. It actually ran");
        const gameScene = this.scene.get("Game") as any;

        // Define button configurations
        const buttonsConfig = [
            {
                text: "Inventory",
                callback: () => gameScene.showInventory(),
                key: 'I'
            },
            {
                text: "Guide",
                callback: () => gameScene.showGuide(),
                key: 'G'
            },
            {
                text: "Clue Journal",
                callback: () => gameScene.showJournal(),
                key: 'J'
            },
            {
                text: "Accuse",
                callback: () => gameScene.showAccusation(),
                key: 'A'
            }
        ];

        const buttonWidth = 140;
        const buttonHeight = 40;
        const spacing = 10; // Space between buttons

        // Calculate total width of all buttons including spacing
        const totalWidth = buttonsConfig.length * buttonWidth + (buttonsConfig.length - 1) * spacing;

        // Calculate starting X position to center the buttons
        const startX = (this.scale.width - totalWidth) / 2 + buttonWidth / 2;

        // Position and create each button
        buttonsConfig.forEach((btnConfig, index) => {
            const x = startX + index * (buttonWidth + spacing);
            const y = 50; // Y position for all buttons

            new Button(this,
                { x: x, y: y, width: buttonWidth, height: buttonHeight },
                {
                    text: btnConfig.text,
                    textColor: '#ffffff',
                    strokeColor: '#000000',
                    fontSize: 24,
                    fontFamily: "Arial",
                    align: "center"
                },
                { backgroundColor: 0x000343, transparency: 0.8 },
                { linewidth: 2, linecolor: 0xffffff },
                btnConfig.callback,
                btnConfig.key
            );
        });
    }
}