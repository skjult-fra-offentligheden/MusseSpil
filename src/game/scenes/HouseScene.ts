import Phaser from 'phaser';
import { Player } from '../classes/player';

export class HouseScene extends Phaser.Scene {
    private interactionText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'HouseScene' });
    }

    preload() {
        // Load the house interior tilemap JSON file
        this.load.tilemapTiledJSON('insideHouse', 'assets/tilemaps/Inside_antique/inside_antique.tmj');

        // Load the tileset images used in the house interior tilemap
        this.load.image('insideHouse', 'assets/tilemaps/Inside_antique/insideHouse.png');
        // Load any additional tileset images or assets needed for the house interior
    }

    create(data: { fromScene: string; startX?: number; startY?: number }) {
        // Load the house interior tilemap
        const map = this.make.tilemap({ key: 'insideHouse' });
        // Load tilesets and layers...

        // Set up player starting position inside the house
        const startX = data.startX || 500; // Set appropriate coordinates
        const startY = data.startY || 500;

        this.player = new Player(this, startX, startY);
        this.add.existing(this.player);

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#000000');
        console.log(map.widthInPixels + " " + map.heightInPixels)
        this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        // Set up camera, physics, etc.
        const houseTileset = map.addTilesetImage('insideHouse', 'insideHouse');

        const groundLayer = map.createLayer('Below Player', houseTileset!, 0, 0);
        const collisionLayer = map.createLayer('World', houseTileset!, 0, 0);
        collisionLayer?.setCollisionByExclusion([-1]);
        // Create the above layer
        this.aboveLayer = map.createLayer('Above Player', houseTileset!, 0, 0);
        this.aboveLayer.setDepth(10);

        const debugGraphics = this.add.graphics();
        this.physics.world.createDebugGraphic();
        this.physics.world.drawDebug = true;
        debugGraphics.lineStyle(2, 0xff0000, 1);

        // Set up physics world bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Enable collision between the player and collision layer
        this.physics.add.collider(this.player, collisionLayer!);

        // Start following the player with the camera
        this.camera.startFollow(this.player);
        // Set up exit trigger
        this.setupExit();
    }

    setupExit() {
        // Create an exit trigger similar to the door trigger
        // Place it at the interior door location
        const exitTrigger = this.physics.add.sprite(exitX, exitY, null);
        exitTrigger.visible = false;
        exitTrigger.body.setSize(width, height);

        this.physics.add.overlap(this.player, exitTrigger, () => {
            this.showInteractionPrompt('Press E to exit');
            if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('E'))) {
                this.exitHouse();
            }
        });
    }

    private showInteractionPrompt(message: string) {
        if (!this.interactionText) {
            this.interactionText = this.add.text(400, 300, '', {
                fontSize: '16px',
                fill: '#ffffff',
                backgroundColor: '#000000',
            });
            this.interactionText.setOrigin(0.5);
            this.interactionText.setScrollFactor(0);
        }
        this.interactionText.setText(message);
        this.interactionText.visible = true;
    }

    private hideInteractionPrompt() {
        if (this.interactionText) {
            this.interactionText.visible = false;
        }
    }

    exitHouse() {
        // Return to the main game scene
        this.scene.start('Game', { fromScene: 'HouseScene', playerX: exitX, playerY: exitY });
    }

    update() {
        this.player.update();
        this.hideInteractionPrompt();
    }

    // Include the showInteractionPrompt and hideInteractionPrompt methods as before
}
