import { Scene } from 'phaser';

export class GuideScene extends Scene {
    private originScene : string;
  constructor() {
      super({ key: 'Guide', active: false});
  }

    create(data: { originScene: string }) {
        this.originScene = data.originScene
      console.log("started Guide scene inside guide scene")

    //this.add.rectangle(screen.width/2, screen.height/2, screen.width, screen.height, 0x000080, 0.6)
    //this.add.text(screen.width/2, screen.height*.6, "To move use keys : ← ↑ → ↓ ", {fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center'}).setOrigin(0.5);
      const rect = this.add.rectangle(200, 200, 200, 200, 0x000080, 0.6)
      this.add.text(200, 200, "To move use keys : ← ↑ → ↓ ", { fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center' }).setOrigin(0.5);
      rect.setDepth(0.5)
      console.log("started guide scene inside guide scene 1 ");
    this.add.text(screen.width/2, screen.height*.5, "To interact with mouse or item press 'n' ", {fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center',}).setOrigin(0.5).setDepth(100);
      console.log("started guide scene inside guide scene 2 ");
    this.add.text(screen.width/2, screen.height*.4, "To exit interaction press 'Enter' ", {fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center'}).setOrigin(0.5).setDepth(100);
    this.add.text(screen.width/2, screen.height*.8, "To exit this guide press 'G' or 'ENTER ", {fontFamily: 'Arial Black', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center'}).setOrigin(0.5).setDepth(100);
      console.log("started guide scene inside guide scene 3");


      //skal resume den scene den kom fra
      this.input.keyboard!.on('keydown-G', () => {
          console.log("started guide scene inside guide scene 4 ");
          this.scene.stop('Guide'); // Close the Guide scene
      this.scene.resume(this.originScene);
    });
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.stop('Guide'); 
      this.scene.resume(this.originScene);
    });
  }
}