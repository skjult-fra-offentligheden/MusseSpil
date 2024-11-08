import { Button } from "../scripts/buttonScript";
import { Scene } from "phaser";

export class UIGameOverlay extends Scene {
    constructor() {
        super({key: "UIGameScene", active: false})
    }
    create(): void {
        console.log("I am in the ui over lay. It actually ran")
        const gameScene = this.scene.get("Game") as any

        new Button(this,
            { x: this.scale.width - 100, y: 50, width: 120, height: 40 },
            { text: "Inventory", textColor: '#ffffff', strokeColor: '#000000', fontSize: 24, fontFamily: "Arial", align: "center" },
            { backgroundColor: 0x000343, transparency: 0.8 },
            { linewidth: 2, linecolor: 0xffffff },
            () => gameScene.showInventory(),
            'I')

        new Button(this,             
            { x: this.scale.width - 240, y: 50, width: 120, height: 40 },
            { text: "Guide", textColor: '#ffffff', strokeColor: '#000000', fontSize: 24, fontFamily: "Arial", align: "center" },
            { backgroundColor: 0x000343, transparency: 0.8 },
            { linewidth: 2, linecolor: 0xffffff },
            () => gameScene.showGuide(),
            'G')
      
    }
}