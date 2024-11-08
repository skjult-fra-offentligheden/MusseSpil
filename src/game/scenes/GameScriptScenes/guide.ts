import { Scene } from 'phaser';

export class GuideScene extends Scene {
  constructor() {
      super({ key: 'Guide', active: false});
  }

  create() {

    this.add.rectangle(screen.width/2, screen.height/2, screen.width, screen.height, 0x000080, 0.6)
    this.add.text(screen.width/2, screen.height*.6, "To move use keys : ← ↑ → ↓ ", {fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center'}).setOrigin(0.5);

    this.add.text(screen.width/2, screen.height*.5, "To interact with mouse or item press 'Spacebar' ", {fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center',}).setOrigin(0.5).setDepth(100);

    this.add.text(screen.width/2, screen.height*.4, "To exit interaction press 'Enter' ", {fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center'}).setOrigin(0.5).setDepth(100);
    this.add.text(screen.width/2, screen.height*.8, "To exit this guide press 'G' or 'ENTER ", {fontFamily: 'Arial Black', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center'}).setOrigin(0.5).setDepth(100);

    this.input.keyboard!.on('keydown-G', () => {
      this.scene.stop('Guide'); // Close the Guide scene
      this.scene.resume('Game');
    });
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.stop('Guide'); // Close the Guide scene
      this.scene.resume('Game');
    });
  }
}