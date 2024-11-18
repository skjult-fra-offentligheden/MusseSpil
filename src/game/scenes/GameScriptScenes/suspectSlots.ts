import Phaser from "phaser";
import { Suspect } from "../GameScriptScenes/suspect"

export class SuspectSlot {
    public rectangle: Phaser.GameObjects.Rectangle;
    public assignedSuspect: Suspect | null = null;
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {

        this.scene = scene;
        // Lav rectangle på x, y coords og sæt som interaktiv
        this.scene.add.rectangle(x, y, width, height).setStrokeStyle(2, 0xffffff).setInteractive({ dropZone: true });
        // Sæt en text på rectangel
        this.scene.add.text(x, y, "Primary Suspect", { fontSize: '16px', color: '#fffff'})

    }

    //sæt hovedsuspect
    public assignSuspect(suspect: Suspect) {
        this.assignedSuspect = suspect;

        this.scene.add.text(this.rectangle.x, this.rectangle.y, suspect.name, { fontSize: '18px', color: '#fffff' }).setOrigin(0.5).setDepth(1);
    }

    public removeSuspect(): void {
        this.assignedSuspect = null;
    }
}