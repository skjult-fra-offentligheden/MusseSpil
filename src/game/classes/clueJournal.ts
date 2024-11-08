import { ClueManager } from '../managers/clueManager';
import { Game } from "../scenes/Game";
import { Clue } from './clue';

export class ClueJournal extends Phaser.Scene {
  private clueManager: ClueManager;
  private clueList: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'ClueJournal' });
  }

  create() {
    this.clueManager = (this.scene.get('Game') as Game).cluemanager;

    // Background
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8).setOrigin(0);

    // Clue List
    this.clueList = this.add.container(50, 50);
    this.displayClues();

    // Close journal on 'enter' key
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.stop();
    });
  }

  private displayClues() {
    const clues = this.clueManager.getAllClues();
    clues.forEach((clue, index) => {
      const clueText = this.add.text(0, index * 30, clue.title, { fontSize: '18px', color: '#ffffff' })
        .setInteractive()
        .on('pointerdown', () => this.showClueDetails(clue));
      this.clueList.add(clueText);
    });
  }

  private showClueDetails(clue: Clue) {
    // Display clue details
  }
}
