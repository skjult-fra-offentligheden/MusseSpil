import { Scene } from 'phaser';

export class GuideScene extends Scene {
    private originScene: string;

    constructor() {
        super({ key: 'Guide', active: false });
    }

    create(data: { originScene: string }) {
        this.originScene = data.originScene;

        const { width, height } = this.sys.game.canvas;

        // Semi-transparent background
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

        // GUIDE title
        this.add.text(width / 2, height * 0.2, 'GUIDE', {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Controls
        this.add.text(width / 2, height * 0.35, 'CONTROLS', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#FFFFFF',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Movements
        this.add.text(width / 2, height * 0.45, 'Use Arrow Keys (← ↑ → ↓) to Move', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        // Interaction
        this.add.text(width / 2, height * 0.52, "Press 'Spacebar' to interact", {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        // Gameplay Tips
        const tips = [
            '🔍 Collect clues to solve the mystery!',
            '💬 Talk to everyone, gather vital info!',
            '🎒 Check your inventory regularly!'
        ];

        tips.forEach((tip, i) => {
            this.add.text(width / 2, height * 0.62 + i * 30, tip, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#FFFFFF',
                align: 'center'
            }).setOrigin(0.5);
        });

        // Exit instruction
        this.add.text(width / 2, height * 0.85, "Press 'G' or 'ENTER' to exit this guide", {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        // Key bindings to exit
        this.input.keyboard!.on('keydown-G', () => {
            this.scene.stop('Guide');
            this.scene.resume(this.originScene);
        });
        this.input.keyboard!.on('keydown-ENTER', () => {
            this.scene.stop('Guide');
            this.scene.resume(this.originScene);
        });
    }
}
