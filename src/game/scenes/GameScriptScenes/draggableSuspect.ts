import Phaser from 'phaser';
import { Suspect } from "../GameScriptScenes/suspect"

export class DraggableSuspect extends Phaser.GameObjects.Container {
    public suspect: Suspect;
    private background: Phaser.GameObjects.Rectangle;
    private text: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, suspect: Suspect) {
        super(scene, x, y);
        this.suspect = suspect;

        //lav baggrund for rectangel
        this.background = scene.add.rectangle(0, 0, 140, 40, 0x000343, 0.8).setStrokeStyle(2, 0xfffff).setInteractive({ draggable: true });

        this.text = scene.add.text(0, 0, suspect.name, { fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', align: 'center' }).setOrigin(0.5);
        this.add([this.background, this.text])

        scene.input.setDraggable(this.background);

        this.background.on('dragstart', this.onDragStart, this);
        this.background.on('drag', this.onDrag, this);
        this.background.on('dragend', this.onDragEnd, this);

    }

    private onDragStart(pointer: Phaser.Input.Pointer): void {
        this.setDepth(1)
    }

    private onDrag(pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void {
        this.x = dragX;
        this.y = dragY;
    }

    private onDragEnd(pointer: Phaser.Input.Pointer, dragX: number, dragY: number, dropped: boolean): void {
        if (!dropped) {
            // Return to original position if not dropped on a slot
            this.x = this.originX;
            this.y = this.originY;
        }
        this.setDepth(0); // Reset depth
    } 

    private originX: number = 0;
    private originY: number = 0;

    public setOriginalPosition(x: number, y: number): void {
        this.originX = x;
        this.originY = y;
        this.x = x;
        this.y = y;
    }
}