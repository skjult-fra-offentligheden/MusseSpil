import { Game } from 'phaser';
import { Clue } from '../classes/clue';

export class ClueManager {
    private game: Game
    private clues: Map<string, Clue>;
    static addClue: any;

  constructor() {
    this.clues = new Map();
  }

  addClue(clue: Clue) {
    this.clues.set(clue.id, clue);
    // Show notification to the player
    this.showClueNotification(clue);
  }

  getClue(clueId: string): Clue | undefined {
    return this.clues.get(clueId);
  }

  getAllClues(): Clue[] {
    return Array.from(this.clues.values());
  }

  private showClueNotification(clue: Clue) {
    // Implement UI logic to show a notification
  }

  private showClueNotification(clue: Clue) {
    const notification = this.scene.add.text(this.scene.scale.width / 2, 50, `New Clue: ${clue.title}`, {
      fontSize: '24px',
      color: '#ff0',
      backgroundColor: '#000',
    }).setOrigin(0.5);
  
    this.scene.tweens.add({
      targets: notification,
      alpha: 0,
      duration: 3000,
      onComplete: () => notification.destroy(),
    });
  }

  saveClues() {
    const cluesArray = Array.from(this.clues.values());
    localStorage.setItem('clues', JSON.stringify(cluesArray));
  }
  
  loadClues() {
    const cluesData = localStorage.getItem('clues');
    if (cluesData) {
      const cluesArray: Clue[] = JSON.parse(cluesData);
      cluesArray.forEach(clue => this.clues.set(clue.id, clue));
    }
  }
}
