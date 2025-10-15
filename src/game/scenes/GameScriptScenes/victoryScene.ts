import { Scene } from 'phaser';
import { Suspect } from "../../../game/clueScripts/Accusation_scripts/suspect"; 

export class VictoryScene extends Scene {
    private correctlyAccused: Suspect;
    private culprintDetailsMotive: string;
    private culprintDetailsCrime: string;

    constructor() {
        super({ key: 'VictoryScene' });
    }

    init(data: { suspect: Suspect; culprintDetailsMotive: string; culprintDetailsCrime: string }): void {
        this.correctlyAccused = data.suspect;
        this.culprintDetailsMotive = data.culprintDetailsMotive;
        this.culprintDetailsCrime = data.culprintDetailsCrime;
    }

    create(): void {
        console.log('[VictoryScene] STARTED VICTORY');
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

        this.add.text(width / 2, height / 2 - 100, 'Case Closed!', titleStyle).setOrigin(0.5);

        const victoryMessage = `You correctly identified ${this.correctlyAccused.name} as the culprit!\n\nCrime: ${this.culprintDetailsCrime}\nMotive: "${this.culprintDetailsMotive}"`;

        this.add.text(width / 2, height / 2 + 20, victoryMessage, subtitleStyle).setOrigin(0.5);

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
