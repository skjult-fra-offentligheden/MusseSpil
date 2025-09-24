import Phaser from 'phaser';
import { GameState } from '../managers/GameState';

export class DevHUD extends Phaser.Scene {
  private flagsText?: Phaser.GameObjects.Text;
  private countersText?: Phaser.GameObjects.Text;
  private closeBtn?: Phaser.GameObjects.Text;

  constructor() { super({ key: 'DevHUDScene' }); }

  create() {
    const gs = GameState.getInstance(this);
    const pad = 12;
    const bg = this.add.rectangle(8, 8, this.cameras.main.width - 16, this.cameras.main.height - 16, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(99997);

    const title = this.add.text(pad + 8, pad + 6, 'Dev HUD (F2 to close)', { fontSize: '16px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(99999);

    this.closeBtn = this.add.text(this.cameras.main.width - 28, 10, 'X', { fontSize: '18px', color: '#ffffff', backgroundColor: '#cc0000' })
      .setScrollFactor(0).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }).setDepth(99999);
    this.closeBtn.on('pointerdown', () => this.scene.stop());

    const flags = Object.entries(gs.globalFlags).map(([k, v]) => `${k}: ${v ? 'true' : 'false'}`).sort().join('\n') || '(none)';
    const counters = Object.entries(gs.counters).map(([k, v]) => `${k}: ${v}`).sort().join('\n') || '(none)';

    this.flagsText = this.add.text(pad + 8, 36, `Flags:\n${flags}`, { fontSize: '14px', color: '#ffffaa' })
      .setScrollFactor(0).setDepth(99998);
    this.countersText = this.add.text(this.cameras.main.width / 2, 36, `Counters:\n${counters}`, { fontSize: '14px', color: '#aaffff' })
      .setScrollFactor(0).setDepth(99998);

    this.input.keyboard?.on('keydown-F2', () => this.scene.stop());
  }
}

