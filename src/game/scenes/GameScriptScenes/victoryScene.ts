export class VictoryScene extends Phaser.Scene {
    private culprit: Suspect;

    constructor() {
        super({ key: 'VictoryScene' });
    }

    init(data: { suspect: Suspect }): void {
        this.culprit = data.suspect;
    }

    create(): void {
        this.add.text(400, 300, `You correctly identified ${this.culprit.name} as the culprit!`, {
            fontSize: '24px',
        }).setOrigin(0.5);

        // Optionally, add a button to restart or exit
        this.add.text(400, 400, 'Play Again', { fontSize: '18px', fill: '#fff' })
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.start('Game');
            });
    }
}
