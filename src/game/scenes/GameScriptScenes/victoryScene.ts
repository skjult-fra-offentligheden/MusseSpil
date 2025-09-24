//
// ─── START OF UPDATED FILE: victoryScene.ts ────────────────
//
import { Scene } from 'phaser';
import { Suspect } from '../../Accusation_scripts/suspect'; // Adjust path if needed
import { CulpritDetails } from '../../data/NPCs/npcTemplate'; // Import CulpritDetails

export class VictoryScene extends Scene {
    private correctlyAccused: Suspect;
    private culpritDetails: CulpritDetails;

    constructor() {
        super({ key: 'VictoryScene' });
    }

    // UPDATED: Accept culpritDetails in init
    init(data: { suspect: Suspect, culpritDetails: CulpritDetails }): void {
        this.correctlyAccused = data.suspect;
        this.culpritDetails = data.culpritDetails;
    }

    create(): void {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        };

        const subtitleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#eeeeee',
            align: 'center',
            wordWrap: { width: width * 0.7 }
        };

        this.add.text(width / 2, height / 2 - 100, "Case Closed!", titleStyle)
            .setOrigin(0.5);

        // UPDATED: Display more details about the case
        const victoryMessage = `You correctly identified ${this.correctlyAccused.name} as the culprit!\n\nCrime: ${this.culpritDetails?.crimeCommitted}\nMotive: "${this.culpritDetails?.motive}"`;

        this.add.text(width / 2, height / 2 + 20, victoryMessage, subtitleStyle)
            .setOrigin(0.5);

        this.add.text(width / 2, height - 80, 'Click anywhere to Play Again', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
