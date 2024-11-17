import { ClueManager } from '../../managers/clueManager';

export class ClueJournal extends Phaser.Scene {
    private clueManager: ClueManager;

    constructor() {
        super({ key: 'ClueJournal' });
    }

    init(data: { clueManager: ClueManager }): void {
        // Receive the ClueManager instance passed from the main scene
        this.clueManager = data.clueManager;
    }

    create(): void {
        // Get all collected clues
        this.add.rectangle(screen.width / 2, screen.height / 2, screen.width, screen.height, 0x000000, 0.6)

        const clues = this.clueManager.getAllClues();

        // Display the clues
        clues.forEach((clue, index) => {
            // Display clue title and description
            this.add.text(
                50,
                50 + index * 100,
                `Title: ${clue.title}\nDescription: ${clue.description}\nFound At: ${clue.foundAt || 'Unknown'}`,
                { fontSize: '16px'}
            );

            // Optionally display the image if imageKey is provided
            if (clue.imageKey) {
                this.add.image(400, 50 + index * 100, clue.imageKey).setOrigin(0, 0);
            }
        });

        // Add a close button or set up input to close the clue journal
        this.input.keyboard.on('keydown-J', () => {
            this.closeClueJournal();
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            this.closeClueJournal();
        });
    }

    private closeClueJournal(): void {
        // Stop this scene
        this.scene.stop();

        // Get the main game scene and resume it
        const gameScene = this.scene.get('Game') as Phaser.Scene;
        if (gameScene) {
            gameScene.scene.resume();
        }
    }
}
