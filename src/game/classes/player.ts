import { Actor } from './actor'; // Assuming Actor is your base class for player/NPCs

export class Player extends Actor {
    public name: string; // <<< ADD THIS PROPERTY
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    // player!: Phaser.GameObjects.Sprite; // This line is redundant if Player extends Actor (which extends Sprite)

    constructor(scene: Phaser.Scene, x: number, y: number, playerName: string = "Hero") { // <<< ADD playerName PARAMETER
        super(scene, x, y, 'player', 0); // 'player' is the texture key, 0 might be the initial frame

        this.name = playerName; // <<< ASSIGN THE NAME

        // KEYS & ANIMATIONS
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', { start: 2, end: 5 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', { start: 12, end: 14 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "idle",
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 2,
            repeat: -1
        });

        // INPUT
        if (this.scene && this.scene.input && this.scene.input.keyboard) { // Add checks for robustness
            this.cursors = this.scene.input.keyboard.createCursorKeys();
        } else {
            console.error("[Player Constructor] Scene or keyboard input not available to create cursors.");
        }
    }

    update(): void {
        const speed = 200;
        const body = this.getBody(); // Assuming getBody() is from Actor or Phaser.Physics.Arcade.Sprite

        if (!body) return; // Guard if body is not ready

        body.setVelocity(0);

        if (!this.cursors) return; // Guard if cursors are not initialized

        let isMoving = false;

        if (this.cursors.left.isDown) {
            body.setVelocityX(-speed);
            this.anims.play('walk-left', true);
            isMoving = true;
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(speed);
            this.anims.play('walk-right', true);
            isMoving = true;
        }

        if (this.cursors.up.isDown) {
            body.setVelocityY(-speed);
            // If you only have side-ways walk animations, pick one or use idle when moving purely up/down
            // Or, if 'walk-up' is also a side-view, that's fine.
            this.anims.play('walk-up', true);
            isMoving = true;
        } else if (this.cursors.down.isDown) {
            body.setVelocityY(speed);
            this.anims.play('walk-down', true);
            isMoving = true;
        }

        if (!isMoving) {
            this.anims.play('idle', true);
        }
    }
}