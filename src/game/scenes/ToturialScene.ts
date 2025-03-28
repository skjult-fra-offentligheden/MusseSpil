import Phaser from 'phaser';
import { Player } from '../classes/player';
import { NPC } from '../NPCgeneral/npc';
import { createNPCs } from '../../factories/npcFactory';
import { DialogueNode } from "../dialogues/dialogues"
import { DialogueManager } from '../dialogues/dialogueManager';
import { Interactable } from '../managers/interactables';
import { Body } from '../classes/body';
import { getNPCPositions } from '../../factories/npcPositionsPreProcessing';
import { GameState } from '../managers/GameState';
import { InventoryManager } from '../managers/itemMananger';
import { UIManager } from '../managers/UIManager';
import { ClueManager } from '../clueScripts/clueManager';
import { Clue } from '../classes/clue';
import { ClueDisplayScene } from './clueDisplay';

const MAX_DIALOGUE_DISTANCE = 70; // SUPER IMPORTANT

export class ToturialScene extends Phaser.Scene {
    private interactionText!: Phaser.GameObjects.Text;
    npcs!: NPC[];
    public cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    interactionPrompt!: Phaser.GameObjects.Text | null;
    Objects!: Body[];
    private dialoguesData!: { [npcId: string]: DialogueNode[] };
    private dialogueManager!: DialogueManager;
    private player: Player;
    private triggers!: Phaser.Physics.Arcade.StaticGroup;
    private exitX!: number;
    private exitY!: number;
    private startX: number;
    private startY: number;
    interactables!: Interactable[];
    private clueManager!: ClueManager;
    private clueData: { [key: string]: Clue }
    private objectData!: { [npcId: string]: DialogueNode[] };
    private objectManager!: DialogueManager;
    private suspectsData: any;
    private inventoryManager!: InventoryManager; 

    constructor() {
        super({ key: 'ToturialScene' });
    }

    preload() {
        //dialog skal loades ind her
        //this.load.json("npc_dialogues_toturial", "tilemaps/toturial_inside/npcdialogue.json");
        //this.load.json("objects_dialogues_toturial", "tilemaps/toturial_inside/objectsDialogue.json");
        //this.load.json("toturial_clues", "tilemaps/toturial_inside/clues.json");

        // Load the house interior tilemap JSON file
        this.load.tilemapTiledJSON('policeinside', 'assets/tilemaps/toturial_inside/policeroom.tmj');

        // Load the tileset images used in the house interior tilemap
        this.load.image('background_toturial', 'assets/tilemaps/toturial_inside/background.png');
        this.load.image('big_furniture', 'assets/tilemaps/toturial_inside/big_furniture.png');
        this.load.image('objects_decoration', 'assets/tilemaps/toturial_inside/objects_decoration.png');

        //OBJECTS
        this.load.image('clueCheese', 'assets/tilemaps/toturial_inside/cheese.png');
        this.load.image('clueCoke', 'assets/tilemaps/toturial_inside/cokebag.png');
        this.load.image('glue', 'assets/tilemaps/toturial_inside/glue.png');
        this.load.image('cluePhone', 'assets/tilemaps/toturial_inside/phone.png');


        //npc her
        this.load.atlas("cop2", "assets/npc/cop2Sprite/cop2sprite.png", "assets/npc/cop2Sprite/cop2sprite.json")
        this.load.atlas("orangeShirtMouse", "assets/npc/orangeShirtMouse/orangeShirtMouse.png", "assets/npc/orangeShirtMouse/orangeShirtMouse.json")
        this.load.atlas("rockerMouse", "assets/npc/rockerMouse/rockerMouse.png", "assets/npc/rockerMouse/rockerMouse.json")
        this.load.atlas("pinkDressGirlMouse", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.png", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.json")

    }

    create() {
        //sæt ui elementer.
        this.clueManager = ClueManager.getInstance(); // crasher hvisden ikke tilføjes 
        this.inventoryManager = InventoryManager.getInstance();
        this.inventoryManager.setScene(this);
        const uiManager = UIManager.getInstance();
        uiManager.setScene(this, "ToturialScene");

        this.inventoryManager = InventoryManager.getInstance();
        this.inventoryManager.setScene(this);
        console.log("i set scene")

        this.events.on('shutdown', () => {
            this.input.keyboard.removeAllListeners();
        });
        this.dialoguesData = this.cache.json.get("npc_dialogues_toturial") || {};
        this.objectData = this.cache.json.get("objects_dialogues_toturial");
        this.clueData = this.cache.json.get("toturial_clues") || {};
        this.suspectsData = this.cache.json.get('suspectsData');

        //this.dialogueManager = data.dialogueManager;
        console.log("suspect data: " + JSON.stringify(this.suspectsData, null, 2))

        this.dialoguesData = { ...this.dialoguesData, ...this.objectData };

        this.dialogueManager = new DialogueManager(this, this.dialoguesData, this.clueManager, this.clueData, this.inventoryManager);
        
        this.cursors = this.input.keyboard.createCursorKeys(); //up, down, left, right, spacebar, shift (avoid binding these keys)
        //this.dialogueManager.setScene(this);

        const map = this.make.tilemap({ key: 'policeinside' });

        //tiljøj billeder til tilemap
        const backgroundTileset = map.addTilesetImage('background_toturial', 'background_toturial');
        const bigFurnitureTileset = map.addTilesetImage('big_furniture', 'big_furniture');
        const objectsDecorationTileset = map.addTilesetImage('objects_decoration', 'objects_decoration');

        //CollisionLayer

        const groundLayer = map.createLayer('Below Player', [
            backgroundTileset!,
            bigFurnitureTileset!,
            objectsDecorationTileset!
        ], 0, 0);

        const groundLayer2 = map.createLayer('Below Player 2', [
            backgroundTileset!,
            bigFurnitureTileset!,
            objectsDecorationTileset!
        ], 0, 0);

        const collisionLayer2 = map.createLayer('CollisionLayer', [
            backgroundTileset!,
            bigFurnitureTileset!,
            objectsDecorationTileset!
        ], 0, 0);

        const collisionLayer = map.createLayer('World', [
            backgroundTileset!,
            bigFurnitureTileset!,
            objectsDecorationTileset!
        ], 0, 0);
        collisionLayer2?.setCollisionByExclusion([-1]);
        collisionLayer?.setCollisionByExclusion([-1]);
        //end map gen

        //add npc
        const npcSpawnLayer = map.getObjectLayer('NPCspawnpoints');
        const npcPositions = getNPCPositions(npcSpawnLayer!);

        if (!this.dialogueManager) {
            console.error('DialogueManager is missing in policeinside');
        }
        if (!this.dialoguesData) {
            console.error('DialoguesData is missing or empty in policeinside');
        }

        //console.log('DialoguesData ' + this.dialogueManager);

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

        const startX = 400;
        const startY = 400;

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

        const debugGraphics = this.add.graphics();
        this.physics.world.createDebugGraphic();
        this.physics.world.drawDebug = true;
        debugGraphics.lineStyle(2, 0xff0000, 1);

        //add collisions:
        this.physics.add.collider(this.player, collisionLayer!);
        this.physics.add.collider(this.player, collisionLayer2!);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.camera.startFollow(this.player);

        console.log("Player:", this.player);
        console.log("Collision Layer:", collisionLayer);
        console.log("Triggers:", this.triggers);

        // Launch UI Scene

        if (!this.scene.get('ClueDisplayScene')) {
            this.scene.add('ClueDisplayScene', ClueDisplayScene, false);
        }

        const npcConfigs = [
            {
                scene: this, x: npcPositions['cop2']?.x || 0, y: npcPositions['cop2']?.y || 0,
                texture: "cop2", frame: "cop2.png", dialogues: this.dialoguesData['cop2'],
                dialogueManager: this.dialogueManager, npcId: "cop2",
                movementType: "idle", moveArea: new Phaser.Geom.Rectangle(25, 190, 50, 500),
                speed: 25, atlasKey: "cop2", isUnique: true,
                animationKeys: { walkLeft: "cop2_walk_left", walkRight: "cop2_walk_right", idle: "cop2_idle" },
                frames: { walkLeft: ["cop2sprite2.png", "cop2sprite3.png"], walkRight: ["cop2sprite1.png", "cop2sprite2.png"], idle: ["cop2sprite1.png"] }
            },
            {
                scene: this, x: npcPositions['orangeShirtMouse']?.x || 0, y: npcPositions['orangeShirtMouse']?.y || 0,
                texture: "orangeShirtMouse", frame: "orangeShirtMouse0.png", dialogues: this.dialoguesData['orangeShirtMouse'],
                dialogueManager: this.dialogueManager, npcId: "orangeShirtMouse",
                movementType: "idle", patrolPoints: [{ x: 145, y: 220 }, { x: 105, y: 220 }, { x: 115, y: 220 }],
                speed: 25, atlasKey: "orangeShirtMouse", isUnique: true,
                animationKeys: { walkLeft: "orangeShirtMouse_walk_left", walkRight: "orangeShirtMouse_walk_right", idle: "orangeShirtMouse_idle" },
                frames: { walkLeft: ["orangeShirtMouse2.png", "orangeShirtMouse3.png"], walkRight: ["orangeShirtMouse0.png", "orangeShirtMouse1.png"], idle: ["orangeShirtMouse2.png"] }
            },
            {
                scene: this, x: npcPositions['rockerMouse']?.x || 0, y: npcPositions['rockerMouse']?.y || 0, texture: "rockerMouse", frame: "rockerMouse0.png", dialogues: this.dialoguesData['rockerMouse'], dialogueManager: this.dialogueManager, npcId: "rockerMouse",
                movementType: "idle", speed: 0, atlasKey: "rockerMouse", isUnique: true, animationKeys: { walkLeft: "rockerMouse_walk_left", walkRight: "rockerMouse_walk_right", idle: "rockerMouse_idle" }
                , frames: { walkLeft: ["rockerMouse2.png", "rockerMouse3.png"], walkRight: ["rockerMouse0.png", "rockerMouse1.png"], idle: ["rockerMouse2.png"] }
            },
            {
                scene: this, x: npcPositions['pinkDressGirlMouse']?.x || 0, y: npcPositions['pinkDressGirlMouse']?.y || 0, texture: "pinkDressGirlMouse", frame: "pinkDressGirlMouse0.png", dialogues: this.dialoguesData['pinkDressGirlMouse'], dialogueManager: this.dialogueManager, npcId: "pinkDressGirlMouse",
                movementType: "idle", speed: 0, atlasKey: "pinkDressGirlMouse", isUnique: true, animationKeys: { walkLeft: "pinkDressGirlMouse_walk_left", walkRight: "pinkDressGirlMouse_walk_right", idle: "pinkDressGirlMouse_idle" }
                , frames: { walkLeft: ["pinkDressGirlMouse2.png", "pinkDressGirlMouse3.png"], walkRight: ["pinkDressGirlMouse0.png", "pinkDressGirlMouse1.png"], idle: ["pinkDressGirlMouse2.png"] }

            }
        ];

        this.npcs = createNPCs(this, npcConfigs, [collisionLayer!, collisionLayer2!]);
        const state = GameState.getInstance();
        state.suspectsData = this.suspectsData;
        state.npcIdleFrames = npcConfigs.map(config => {
            return {
                id: config.npcId,
                textureKey: config.atlasKey,
                idleFrame: config.frames?.idle?.[0] || config.frame 
            };
        });
        //generate Objects
        const Objectsclue = map.getObjectLayer('ObjectCluesSpawnpoints');
        this.createObjects(collisionLayer!, collisionLayer!, Objectsclue)

        this.interactables = [...this.npcs, ...this.Objects];



        this.scene.launch('UIGameScene');
        this.scene.bringToTop('UIGameScene');

        // play scenes.

        // first scene will the the cop going up to the player, introducing himself, the case, the controls.
        // 1 stop player movements. or take control of player movements.
        // initiate the dialogue screen with the player, start talking, here it's ok it's only the npc talking.
        // introduce something. 
        // go back to start location and release the player.


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
            const currentNpc = this.dialogueManager.getCurrentNpc();
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
            interactable.checkProximity(this.player, MAX_DIALOGUE_DISTANCE, () => {
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
            const y = camera.scrollY + camera.height - 170;

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

    private createObjects(collisionLayer: Phaser.Tilemaps.TilemapLayer, collisionLayer2: Phaser.Tilemaps.TilemapLayer, Objectsclue: any): void {
        const gameState = GameState.getInstance();
        const objectsCluePos = getNPCPositions(Objectsclue)
        //første del skal være objects layer
        const orig_objects = [
            { x: objectsCluePos["cluePhone"].x || 600, y: objectsCluePos["cluePhone"].y || 500, texture: 'cluePhone', dialogueKey: 'cluePhone', itemId: 'cluePhone', description: "A phone used in the drug traficking business", scale: .5, collectible: true },
            { x: objectsCluePos["clueCoke"].x || 600, y: objectsCluePos["clueCoke"].y || 400, texture: 'clueCoke', dialogueKey: 'clueCoke', itemId: 'clueCoke', description: 'A bag of coke.', scale: 0.6, collectible: true },
            { x: objectsCluePos["glue"].x || 600, y: objectsCluePos["glue"].y || 400, texture: 'glue', dialogueKey: 'glue', itemId: 'glue', description: 'some glue ? ', scale: 0.7, collectible: true },
            { x: objectsCluePos["clueCheese"].x || 600, y: objectsCluePos["clueCheese"].y || 400, texture: 'clueCheese', itemId: "clueCheese", dialogueKey: 'clueCheese', description: 'Hmm, some delicious cheese.', scale: 0.6, collectible: true },
        ];


        this.Objects = [];
        orig_objects.filter(objectData => !gameState.collectedItems.has(objectData.itemId))
            .forEach(objectData => {
                const body = new Body(
                    this,
                    objectData.x,
                    objectData.y,
                    objectData.texture,
                    this.dialoguesData[objectData.dialogueKey],
                    this.dialogueManager,
                    objectData.itemId,
                    objectData.itemId,
                    objectData.itemId,
                    objectData.description,
                    objectData.itemId,
                    objectData.collectible,
                    undefined,
                    undefined,
                    objectData.scale
                );
                this.Objects.push(body);
                this.add.existing(body);
                this.physics.add.existing(body);
                body.setDepth(5);
                this.physics.add.collider(this.player, body);
                this.physics.add.collider(body, collisionLayer);
                this.physics.add.collider(body, collisionLayer2);
            });
    }

}
