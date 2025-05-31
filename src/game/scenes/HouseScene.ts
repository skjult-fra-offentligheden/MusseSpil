import Phaser from 'phaser';
import { Player } from '../classes/player';
import { NPC } from '../classes/npc';
import { createNPCAnimations } from '../../factories/animationFactory';
import { DialogueNode } from "../classes/dialogues"
import { DialogueManager } from '../managers/dialogueManager';
import { Interactable } from '../managers/interactables';
import { Body } from '../classes/body';
import { getNPCPositions } from '../../factories/npcPositionsPreProcessing';
import { GameState } from '../managers/GameState';
import { InventoryManager } from '../managers/itemMananger';
import { UIManager } from '../managers/UIManager';

const MAX_DIALOGUE_DISTANCE = 125; // SUPER IMPORTANT

export class HouseScene extends Phaser.Scene {
    private interactionText!: Phaser.GameObjects.Text;
    npcs!: NPC[];
    public cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    interactionPrompt!: Phaser.GameObjects.Text | null;

    private dialoguesData!: { [npcId: string]: DialogueNode[] };
    private dialogueManager!: DialogueManager;
    private player: Player;
    private triggers!: Phaser.Physics.Arcade.StaticGroup;
    private exitX!: number;
    private exitY!: number;
    private startX: number;
    private startY: number;
    interactables!: Interactable[];

    private inventoryManager!: InventoryManager; 

    constructor() {
        super({ key: 'HouseScene' });
    }

    preload() {
        // Load the house interior tilemap JSON file
        this.load.tilemapTiledJSON('insideHouse', 'assets/tilemaps/Inside_antique/inside_antique.tmj');

        // Load the tileset images used in the house interior tilemap
        this.load.image('insideHouse_more', 'assets/tilemaps/Inside_antique/insideHouse_more.png');
        this.load.image('bigger_furniture', 'assets/tilemaps/Inside_antique/bigger_furniture.png');
    }

    create(data: { fromScene: string; startX?: number; startY?: number; dialoguesData: { [npcId: string]: DialogueNode[] }; dialogueManager: DialogueManager; }) {
        //sæt ui elementer.
        const uiManager = UIManager.getInstance();
        uiManager.setScene(this, "HouseScene");

        this.inventoryManager = InventoryManager.getInstance();
        this.inventoryManager.setScene(this);
        console.log("i set scene")

        this.events.on('shutdown', () => {
            this.input.keyboard.removeAllListeners();
        });

        this.dialoguesData = data.dialoguesData || {};
        this.dialogueManager = data.dialogueManager;
        this.startX = data.startY || 200;
        this.startY = data.startY || 200;
        this.cursors = this.input.keyboard.createCursorKeys();
        this.dialogueManager.setScene(this);

        const map = this.make.tilemap({ key: 'insideHouse' });
        const npcSpawnLayer = map.getObjectLayer('NPCspawnpoints');
        const npcPositions = getNPCPositions(npcSpawnLayer!);

        if (!this.dialogueManager) {
            console.error('DialogueManager is missing in HouseScene');
        }
        if (!this.dialoguesData) {
            console.error('DialoguesData is missing or empty in HouseScene');
        }

        console.log('DialoguesData ' + this.dialogueManager);

        const triggersLayer = map.getObjectLayer('Triggers');
        const door = triggersLayer?.objects.find((obj) => obj.name === 'Door');
        this.triggers = this.physics.add.staticGroup();

        if (door) {
            this.exitX = door.x! + (door.width! / 2);
            this.exitY = door.y! + (door.height! / 2);
            console.log("exitX " + this.exitX)
        } else {
            console.error("Door trigger not found in the 'Triggers' layer");
        }

        const startX = data.startX || 400;
        const startY = data.startY || 400;

        this.player = new Player(this, this.exitX, this.exitY - 50);
        this.player.setAlpha(1);
        this.player.setDepth(5);
        this.add.existing(this.player);

        if (door) {
            this.setupExit(this.exitX, this.exitY, door.width!, door.height!);
        }

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#000000');
        this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        const houseTileset = map.addTilesetImage('insideHouse_more', 'insideHouse_more');
        const bigger_furniture = map.addTilesetImage('bigger_furniture', 'bigger_furniture');

        const groundLayer = map.createLayer('Below Player', [houseTileset!, bigger_furniture!], 0, 0);
        const collisionLayer = map.createLayer('World', [houseTileset!, bigger_furniture!], 0, 0);
        collisionLayer?.setCollisionByExclusion([-1]);

        this.aboveLayer = map.createLayer('Above Player', [houseTileset!, bigger_furniture!], 0, 0);
        this.aboveLayer.setDepth(10);

        const debugGraphics = this.add.graphics();
        this.physics.world.createDebugGraphic();
        this.physics.world.drawDebug = true;
        debugGraphics.lineStyle(2, 0xff0000, 1);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.add.collider(this.player, collisionLayer!);
        this.camera.startFollow(this.player);

        console.log("Player:", this.player);
        console.log("Collision Layer:", collisionLayer);
        console.log("Triggers:", this.triggers);

        this.npcs = createNPCs(this, [
            {
                scene: this, x: npcPositions['mageMouse']?.x || 0, y: npcPositions['mageMouse']?.y || 0, texture: "mageMouse", frame: "mageMouse0.png", dialogues: this.dialoguesData['mageMouse'], dialogueManager: this.dialogueManager, npcId: "mageMouse",
                movementType: "random", moveArea: new Phaser.Geom.Rectangle(25, 190, 50, 500), speed: 25, atlasKey: "mageMouse", isUnique: true, animationKeys: { walkLeft: "mageMouse_walk_left", walkRight: "mageMouse_walk_right", idle: "mageMouse_idle" }, frames: { walkLeft: ["mageMouse2.png", "mageMouse3.png"], walkRight: ["mageMouse0.png", "mageMouse1.png"], idle: ["mageMouse1.png"] }
            },
            {
                scene: this, x: npcPositions['sorcerrrorMouse']?.x || 0, y: npcPositions['sorcerrrorMouse']?.y || 0, texture: "sorcerrorMouse", frame: "sorcerrorMouse0.png", dialogues: this.dialoguesData['sorcererMouse'], dialogueManager: this.dialogueManager, npcId: "sorcerrorMouse",
                movementType: "patrol", patrolPoints: [{ x: 145, y: 220 }, { x: 105, y: 220 }, { x: 115, y: 220 }], speed: 25, atlasKey: "sorcerrorMouse", isUnique: true, animationKeys: { walkLeft: "sorcerrorMouse_walk_left", walkRight: "sorcerrorMouse_walk_right", idle: "sorcerrorMouse_idle" }, frames: { walkLeft: ["sorcerrorMouse2.png", "sorcerrorMouse3.png"], walkRight: ["sorcerrorMouse0.png", "sorcerrorMouse1.png"], idle: ["sorcerrorMouse1.png"] }
            },
            {
                scene: this, x: npcPositions['yellowShirtMouse']?.x || 0, y: npcPositions['yellowShirtMouse']?.y || 0, texture: "yellowShirtMouse", frame: "yellowShirtMouse0.png", dialogues: this.dialoguesData['creator'], dialogueManager: this.dialogueManager, npcId: "yellowShirtMouse",
                movementType: "idle", speed: 0, atlasKey: "yellowShirtMouse", isUnique: true, animationKeys: { walkLeft: "yellowShirtMouse_walk_left", walkRight: "yellowShirtMouse_walk_right", idle: "yellowShirtMouse_idle" }, frames: { walkLeft: ["yellowShirtMouse2.png", "yellowShirtMouse3.png"], walkRight: ["yellowShirtMouse0.png", "yellowShirtMouse1.png"], idle: ["yellowShirtMouse1.png"] }
            }
        ], collisionLayer!);

        this.interactables = [...this.npcs];
    }

    private setupExit(exitX: number, exitY: number, width: number, height: number) {
        const trigger = this.add.rectangle(exitX, exitY, width, height, undefined, 0);
        this.physics.add.existing(trigger, true);

        this.physics.add.overlap(this.player, trigger, () => {
            this.showInteractionPrompt('Press E to exit');
            if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('E'))) {
                this.exitHouse();
            }
        });

        this.triggers.add(trigger);
    }

    exitHouse() {
        // Return to the main game scene
        this.scene.start('Game', { fromScene: 'HouseScene', playerX: this.startX, playerY: this.startY });
    }

    update(time: number, delta: number) {
        this.player.update();
        this.npcs.forEach((npc) => npc.update(time, delta));

        if (this.dialogueManager && this.dialogueManager.isDialogueActive()) {
            const currentNpc = this.dialogueManager.getCurrentNpcInstance();
            if (currentNpc) {
                const playerPosition = new Phaser.Math.Vector2(this.player.x, this.player.y);
                const npcPosition = new Phaser.Math.Vector2(currentNpc.x, currentNpc.y);
                const distance = Phaser.Math.Distance.BetweenPoints(playerPosition, npcPosition);

                if (distance > MAX_DIALOGUE_DISTANCE) {
                    this.dialogueManager.endDialogue();
                    this.hideInteractionPrompt();
                }
            }
            return;
        }

        this.interactables = this.interactables.filter((interactable) => interactable.active);
        let interactableInRange = false;
        let activeInteractable: NPC | Body | null = null;

        this.interactables.forEach((interactable) => {
            interactable.checkProximity(this.player, 60, () => {
                interactableInRange = true;
                activeInteractable = interactable;
                this.showInteractionPrompt();
            });
        });

        if (
            interactableInRange &&
            this.cursors &&
            Phaser.Input.Keyboard.JustDown(this.cursors.space!)
        ) {
            if (activeInteractable) {
                if (activeInteractable instanceof Body) {
                    activeInteractable.initiateInteraction(this.player);
                } else {
                    activeInteractable.initiateDialogue();
                }
            }
        }

        if (!interactableInRange) {
            this.hideInteractionPrompt();
        }
    }

    showInteractionPrompt() {
        if (!this.interactionPrompt) {
            const camera = this.cameras.main;
            const x = camera.scrollX + camera.width / 2;
            const y = camera.scrollY + camera.height - 50;

            this.interactionPrompt = this.add
                .text(x, y, 'Press n to interact', {
                    fontSize: '14px',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 10, y: 5 },
                })
                .setOrigin(0.5, 0);
        }
    }

    hideInteractionPrompt() {
        if (this.interactionPrompt) {
            this.interactionPrompt.destroy();
            this.interactionPrompt = null;
        }
    }

}
