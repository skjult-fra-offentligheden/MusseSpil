import { Actor } from './actor';
export class Player extends Actor {
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  player!: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player', 0);
    // KEYS
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('player', { start: 2, end: 5 }), 
      frameRate: 10, // Speed of animation
      repeat: -1     // Repeat the animation indefinitely
    });
    
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('player', { start: 12, end: 14 }), 
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'walk-left',
      frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }), // Adjust frame range
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'walk-right',
      frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }), // Adjust frame range
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers('player', {start: 0, end: 1}),
      frameRate: 2,
      repeat: -1
    });
    // PHYSICS
    this.cursors = this.scene.input.keyboard!.createCursorKeys();

    
  }
  update(): void {
    //console.log(this); // Check if this.anims is defined
    const speed = 200;
    const body = this.getBody();

    body.setVelocity(0);

    // Handle movement input
    if (this.cursors.left.isDown) {
      body.setVelocityX(-speed);
      this.anims.play('walk-left', true); // This line is causing the issue
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(speed);
      this.anims.play('walk-right', true);
    }

    if (this.cursors.up.isDown) {
      body.setVelocityY(-speed);
      this.anims.play('walk-up', true);
    } else if (this.cursors.down.isDown) {
      body.setVelocityY(speed);
      this.anims.play('walk-down', true);
    }

    // Idle animation when no movement keys are pressed
    if (
      this.cursors.left.isUp &&
      this.cursors.right.isUp &&
      this.cursors.up.isUp &&
      this.cursors.down.isUp
    ) {
      this.anims.play('idle', true);
    }
}

  
}