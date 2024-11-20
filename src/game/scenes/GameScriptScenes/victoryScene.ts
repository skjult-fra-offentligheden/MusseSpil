export class VictoryScene extends Phaser.Scene {
    private culprit: Suspect;

    constructor() {
        super({ key: 'VictoryScene' });
    }

    init(data: { suspect: Suspect }): void {
        this.culprit = data.suspect;
    }

    create(): void {

        const main_text_width = screen.width / 2;
        const main_text_height = screen.height / 2
        this.add.text(main_text_width, main_text_height, `You correctly identified ${this.culprit.name} as the culprit!`, {
            fontSize: '24px',
        }).setOrigin(0.5);

        // Optionally, add a button to restart or exit
        this.add.text(main_text_width, main_text_height+150, 'Play Again', { fontSize: '18px', fill: '#fff' })
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.start('Game');
            });
    }
}
