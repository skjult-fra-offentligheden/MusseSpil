// src/scenes/Game.ts

import Phaser, { NONE } from 'phaser';
import { EventBus } from '../EventBus';
import { NPC } from '../classes/npc';
import { Player } from '../classes/player';
//import { npcDialogues } from '../../data/npcdialogue';
import { bodyDialogues } from '../../data/deadBodydialogue';
import { DialogueManager } from '../managers/dialogueManager';
import { DialogueNode } from "../classes/dialogues"
import { Body } from '../classes/body';
import { ClueManager } from '../managers/clueManager';
import { InventoryManager } from '../managers/itemMananger';
import { Interactable } from '../managers/interactables';
import { InventoryScene } from './GameScriptScenes/InventoryScene';
import { Item } from '../managers/itemDatastruct';
import { GuideScene } from './GameScriptScenes/guide';
import { ClueDisplayScene } from './clueDisplay';
import { Clue } from '../classes/clue';

const MAX_DIALOGUE_DISTANCE = 125; // SUPER IMPORTANT


export class Game extends Phaser.Scene {
    public inventoryManager!: InventoryManager;
    public GuideScene!: GuideScene;
    private gameControlTexts!: Phaser.GameObjects.Text;
    private camera!: Phaser.Cameras.Scene2D.Camera;
    public cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    private aboveLayer!: Phaser.Tilemaps.TilemapLayer;
    npcs!: NPC[];
    interactionPrompt!: Phaser.GameObjects.Text | null;
    player!: Player;
    body!: Body;
    Objects!: Body[];
    interactables!: Interactable[];
    private clueManager!: ClueManager;
    private clueData: { [key: string]: Clue }
    private dialoguesData!: { [npcId: string]: DialogueNode[] };
    private objectData!: { [npcId: string]: DialogueNode[] };
    private dialogueManager!: DialogueManager;
    private objectManager!: DialogueManager;
    private suspectsData: any;
    public npcIdleFrames: any;
    constructor() {
        super('Game');
        //this.events.on('clueDisplayClosed', this.onClueDisplayClosed, this);
        

    }



    preload() {
        // Preload assets...
        // Preload npcs
        this.load.atlas("cop1", "assets/npc/cop1Sprite/cop1Sprite.png", "assets/npc/cop1Sprite/cop1Sprite.json")
        this.load.atlas("cop2", "assets/npc/cop2Sprite/cop2sprite.png", "assets/npc/cop2Sprite/cop2sprite.json")
        this.load.atlas("CopGirlSprite", "assets/npc/CopGirlSprite/CopGirlSprite.png", "assets/npc/CopGirlSprite/CopGirlSprite.json")
        this.load.atlas("fancyMouse", "assets/npc/fancyMouse/fancyMouse.png", "assets/npc/fancyMouse/fancyMouse.json")
        this.load.atlas("fatMouse", "assets/npc/fatMouse/fatMouse.png", "assets/npc/fatMouse/fatMouse.json")
        this.load.atlas("ghostMouse", "assets/npc/ghostMouse/ghostMouse.png", "assets/npc/ghostMouse/ghostMouse.json")
        this.load.atlas("grannyMouse", "assets/npc/grannyMouse/grannyMouse.png", "assets/npc/grannyMouse/grannyMouse.json")
        this.load.atlas("mageMouse", "assets/npc/mageMouse/mageMouse.png", "assets/npc/mageMouse/mageMouse.json")
        this.load.atlas("orangeShirtMouse", "assets/npc/orangeShirtMouse/orangeShirtMouse.png", "assets/npc/orangeShirtMouse/orangeShirtMouse.json")
        this.load.atlas("pinkDressGirlMouse", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.png", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.json")
        this.load.atlas("redDressCyborgMouse", "assets/npc/redDressCyborgMouse/redDressCyborgMouse.png", "assets/npc/redDressCyborgMouse/redDressCyborgMouse.json");
        this.load.atlas("redDressgirlMouse", "assets/npc/redDressgirlMouse/redDressgirlMouse.png", "assets/npc/redDressgirlMouse/redDressgirlMouse.json")
        this.load.atlas("redShirtMouse", "assets/npc/redShirtMouse/redShirtMouse.png", "assets/npc/redShirtMouse/redShirtMouse.json")
        this.load.atlas("rockerMouse", "assets/npc/rockerMouse/rockerMouse.png", "assets/npc/rockerMouse/rockerMouse.json")
        this.load.atlas("sorcerrorMouse", "assets/npc/sorcerrorMouse/sorcerrorMouse.png", "assets/npc/sorcerrorMouse/sorcerrorMouse.json")
        this.load.atlas("yellowShirtMouse", "assets/npc/yellowShirtMouse/yellowShirtMouse.png", "assets/npc/yellowShirtMouse/yellowShirtMouse.json")


        // NPC Assets
        this.load.image('DeadBody', 'assets/button/deadMouseVictim.png');

        // Murder assets
        this.load.image('knifeBlood', 'assets/button/knife_blood.png');
        this.load.image('grannyBag', 'assets/button/grannyBag.png');
        this.load.image('gun', 'assets/button/gun.png');

        // Inventory item icons
        //this.load.image('knifeBloodIcon', 'assets/button/knife_blood.png');
        //this.load.image('grannyBagIcon', 'assets/button/grannyBag.png');
        //this.load.image('gunIcon', 'assets/button/gun.png');


        //Load bigger Sprites
        // this.load.image("detective", 'assets/storyModeSprites/biggerMouseSprite.png');


    }


    create() {

        this.dialoguesData = this.cache.json.get("npc_dialogues");
        if (!this.dialoguesData) {
            console.error("Failed to load dialogues data.");
        } else {
            console.log("Dialogues data loaded successfully.");
        }

        this.objectData = this.cache.json.get("objects_dialogues");
        if (!this.objectData) {
            console.error("Failed to load object-dialogues data.");
        } else {
            console.log("object-dialogues data loaded successfully.");
        }

        this.clueData = this.cache.json.get("scene_1_clues");
        if (!this.clueData) {
            console.error("Failed to load clues data.");
        } else {
            console.log("clues data loaded successfully.");
        }

        this.suspectsData = this.cache.json.get('suspectsData');
        if (!this.suspectsData) {
            console.error("Failed to load suspectsData.");
        } else {
            console.log("suspectsData loaded successfully.");
        }

        this.clueManager = new ClueManager();
        // Initialize managers
        this.inventoryManager = new InventoryManager();
        this.dialoguesData = {
            ...this.dialoguesData,
            ...this.objectData
        }

        console.log("dialoguedata" + JSON.stringify(this.dialoguesData, null, 2))
        //this.objectManager = new DialogueManager(this, this.objectData, this.clueManager);
        this.dialogueManager = new DialogueManager(this, this.dialoguesData, this.clueManager, this.clueData);

        // Create animations
        const standardAtlasSprites = [{ "textureKey": "cop1", "framePrefix": "cop1Sprite", "idleFrame": "cop1Sprite.png" }, { "textureKey": "cop2", "framePrefix": "cop2sprite", "idleFrame": "cop2sprite.png" },
        { "textureKey": "CopGirlSprite", "framePrefix": "CopGirlSprite", "idleFrame": "CopGirlSprite0.png" }, { "textureKey": "fancyMouse", "framePrefix": "fancyMouse", "idleFrame": "fancyMouse0.png" },
        { "textureKey": "fatMouse", "framePrefix": "fatMouse", "idleFrame": "fatMouse0.png" }, { "textureKey": "grannyMouse", "framePrefix": "grannyMouse", "idleFrame": "grannyMouse0.png" },
        { "textureKey": "mageMouse", "framePrefix": "mageMouse", "idleFrame": "mageMouse0.png" }, { "textureKey": "orangeShirtMouse", "framePrefix": "orangeShirtMouse", "idleFrame": "orangeShirtMouse0.png" },
        { "textureKey": "pinkDressGirlMouse", "framePrefix": "pinkDressGirlMouse", "idleFrame": "pinkDressGirlMouse0.png" }, { "textureKey": "redDressCyborgMouse", "framePrefix": "redDressCyborgMouse", "idleFrame": "redDressCyborgMouse0.png" },
        { "textureKey": "redShirtMouse", "framePrefix": "redShirtMouse", "idleFrame": "redShirtMouse0.png" }, { "textureKey": "rockerMouse", "framePrefix": "rockerMouse", "idleFrame": "rockerMouse0.png" },
        { "textureKey": "sorcerrorMouse", "framePrefix": "sorcerrorMouse", "idleFrame": "sorcerrorMouse0.png" }, { "textureKey": "yellowShirtMouse", "framePrefix": "yellowShirtMouse", "idleFrame": "yellowShirtMouse0.png" },
        { "textureKey": "redDressgirlMouse", "framePrefix": "redDressgirlMouse", "idleFrame": "redDressgirlMouse0.png" },
        ]
        this.npcIdleFrames = standardAtlasSprites
        this.createNPCAnimations(standardAtlasSprites);

        // Set up the map
        const map = this.make.tilemap({ key: 'scene1' });
        const tileset = map.addTilesetImage('tilesetnewupdated', 'standardtilemap');

        // Set up the camera
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#000000');
        this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Set up the physics world bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Initialize cursor keys
        this.cursors = this.input.keyboard.createCursorKeys();

        // Create tilemap layers
        const groundLayer = map.createLayer('Below Player', tileset!, 0, 0);
        const collisionLayer = map.createLayer('World', tileset!, 0, 0);
        collisionLayer?.setCollisionByExclusion([-1]);

        // Create the player
        this.player = new Player(this, 300, 300);
        this.player.setDepth(5);
        this.physics.add.collider(this.player, collisionLayer);

        // Create NPCs
        this.createNPCs(collisionLayer);

        // Create Objects (Bodies and Items)
        this.createObjects(collisionLayer);

        // Create the above layer
        this.aboveLayer = map.createLayer('Above Player', tileset!, 0, 0);
        this.aboveLayer.setDepth(10);

        // Start following the player with the camera
        this.camera.startFollow(this.player);

        // Set up interactions
        this.setupInteractions();

        // Launch UI Scene
        this.scene.launch('UIGameScene');
        this.scene.add('ClueDisplayScene', ClueDisplayScene, false);

        //this.input.keyboard.on('keydown-C', () => {
        //    this.displayClues();
        //});

        //this.input.keyboard.on('keydown-A', () => {
        //    this.scene.launch('AccusationScene', {
        //        suspectsData: this.suspectsData,
        //        clueManager: this.clueManager,
        //    });
        //    this.scene.pause();
        //});

        EventBus.emit('current-scene-ready', this); this.events.on('clueDisplayClosed', this.onClueDisplayClosed, this);

    }

    private onClueDisplayClosed() {
        this.scene.resume('Game');
    }

    // General function to create animations for all NPCs - Bør også flyttes - er bare for doven nu. 
    private createNPCAnimations(standard_npcs_atlas: { textureKey: string, framePrefix: string, idleFrame: string }[]): void {

        const npcAnimationData: {
            textureKey: string;
            animationKeyPrefix: string;
            framePrefix: string;
            frameSuffix: string;
            leftFrames: number[];
            rightFrames: number[];
            idleFrame: string;
        }[] = [];
        //Ide bare pass den store dict og loop igennem

        for (const atlas of standard_npcs_atlas) {
            console.log(atlas)
            const { textureKey, framePrefix, idleFrame } = atlas;
            //this.npcIdleFrames.push(idleFrame);
            npcAnimationData.push({
                textureKey: `${textureKey}`,
                animationKeyPrefix: `${textureKey}`,
                framePrefix: `${framePrefix}`,
                frameSuffix: '.png',
                leftFrames: [2, 3], // Frames for walking left
                rightFrames: [0, 1], // Frames for walking right
                idleFrame: `${idleFrame}`, // Idle frame
            })
        };


        npcAnimationData.forEach((npcData) => {
            this.createAnimationForNPC(npcData);
            
            //console.log([this.createAnimationForNPC(npcData)])
        });
    }

    // Function to create animations for a single NPC - Burde flyttes til egen function sammen med assigns. 
    private createAnimationForNPC(npcData: {
        textureKey: string;
        animationKeyPrefix: string;
        framePrefix: string;
        frameSuffix: string;
        leftFrames: number[];
        rightFrames: number[];
        idleFrame: string;
    }): void {
        // Create walk left animation
        this.anims.create({
            key: `${npcData.animationKeyPrefix}_walk_left`,
            frames: npcData.leftFrames.map((frameNumber) => {
                const frameName = frameNumber === 0 ? `${npcData.framePrefix}.png` : `${npcData.framePrefix}${frameNumber}.png`;
                return {
                    key: npcData.textureKey,
                    frame: frameName,
                };
            }),
            frameRate: 8,
            repeat: -1,
        });

        // Create walk right animation
        this.anims.create({
            key: `${npcData.animationKeyPrefix}_walk_right`,
            frames: npcData.rightFrames.map((frameNumber) => {
                const frameName = frameNumber === 0 ? `${npcData.framePrefix}.png` : `${npcData.framePrefix}${frameNumber}.png`;
                return {
                    key: npcData.textureKey,
                    frame: frameName,
                };
            }),
            frameRate: 8,
            repeat: -1,
        });

        // Create idle animation
        this.anims.create({
            key: `${npcData.animationKeyPrefix}_idle`,
            frames: npcData.rightFrames.map((frameNumber) => {
                const frameName = frameNumber === 0 ? `${npcData.framePrefix}.png` : `${npcData.framePrefix}${frameNumber}.png`;
                return {
                    key: npcData.textureKey,
                    frame: frameName,
                };
            }),
            frameRate: 1,
            repeat: -1,
        });
    }

    // Function to create NPCs - burde flyttes med CreateAnimationForNpc
    private createNPCs(collisionLayer: Phaser.Tilemaps.TilemapLayer): void {
        this.npcs = [
            new NPC({
                scene: this, x: 500, y: 400, texture: 'cop1', frame: 'cop1Sprite.png', dialogues: this.dialoguesData['cop1'], dialogueManager: this.dialogueManager,
                npcId: 'cop1', movementType: 'patrol', speed: 50, atlasKey: "cop1", isUnique: true, patrolPoints: [{ x: 400, y: 450 }, { x: 575, y: 500 },],
                animationKeys: { walkLeft: 'cop1_walk_left', walkRight: 'cop1_walk_right', idle: 'cop1_idle', },
            }),
            new NPC({
                scene: this, x: 600, y: 700, texture: 'cop2', frame: 'cop2sprite.png', dialogues: this.dialoguesData['cop2'], dialogueManager: this.dialogueManager, npcId: 'cop2',
                movementType: 'random', speed: 30, atlasKey: "cop2", isUnique: true, moveArea: new Phaser.Geom.Rectangle(700, 650, 100, 100), animationKeys: { walkLeft: 'cop2_walk_left', walkRight: 'cop2_walk_right', idle: 'cop2_idle', },
            }),
            // Add more NPCs here, ensuring you provide the appropriate animationKeys
            new NPC({
                scene: this, x: 500, y: 450, texture: "CopGirlSprite", frame: "CopGirlSprite0.png", dialogues: this.dialoguesData['copGirl'], dialogueManager: this.dialogueManager, npcId: "CopGirlSprite",
                movementType: "idle", speed: 0, atlasKey: "CopGirlSprite", isUnique: true, animationKeys: { walkLeft: "CopGirlSprite_walk_left", walkRight: "CopGirlSprite_walk_right", idle: "CopGirlSprite_idle" }
            }),
            new NPC({
                scene: this, x: 1385, y: 700, texture: "fancyMouse", frame: "fancyMouse0.png", dialogues: this.dialoguesData['placeholderDialogue'], dialogueManager: this.dialogueManager, npcId: "fancyMouse",
                movementType: "idle", speed: 0, atlasKey: "fancyMouse", isUnique: true, animationKeys: { walkLeft: "fancyMouse_walk_left", walkRight: "fancyMouse_walk_right", idle: "fancyMouse_idle" }
            }),
            new NPC({
                scene: this, x: 1500, y: 1450, texture: "fatMouse", frame: "fatMouse0.png", dialogues: this.dialoguesData['fatMouse'], dialogueManager: this.dialogueManager, npcId: "fatMouse",
                movementType: "patrol", speed: 15, atlasKey: "fatMouse", isUnique: true, animationKeys: { walkLeft: "fatMouse_walk_left", walkRight: "fatMouse_walk_right", idle: "fatMouse_idle" }, patrolPoints: [{ x: 1300, y: 1450 }, { x: 1600, y: 1450 },]
            }),
            new NPC({
                scene: this, x: 800, y: 1250, texture: "grannyMouse", frame: "grannyMouse0.png", dialogues: this.dialoguesData['grannyMouse'], dialogueManager: this.dialogueManager, npcId: "grannyMouse",
                movementType: "random", speed: 35, moveArea: new Phaser.Geom.Rectangle(750, 1220, 300, 300), atlasKey: "grannyMouse", isUnique: true, animationKeys: { walkLeft: "grannyMouse_walk_left", walkRight: "grannyMouse_walk_right", idle: "grannyMouse_idle" }
            }),
            new NPC({
                scene: this, x: 50, y: 2000, texture: "mageMouse", frame: "mageMouse0.png", dialogues: this.dialoguesData['mageMouse'], dialogueManager: this.dialogueManager, npcId: "mageMouse",
                movementType: "random", moveArea: new Phaser.Geom.Rectangle(25, 1900, 50, 500), speed: 25, atlasKey: "mageMouse", isUnique: true, animationKeys: { walkLeft: "mageMouse_walk_left", walkRight: "mageMouse_walk_right", idle: "mageMouse_idle" }
            }),
            new NPC({
                scene: this, x: 1600, y: 900, texture: "orangeShirtMouse", frame: "orangeShirtMouse0.png", dialogues: this.dialoguesData['albino'], dialogueManager: this.dialogueManager, npcId: "orangeShirtMouse",
                movementType: "random", moveArea: new Phaser.Geom.Rectangle(1550, 875, 300, 50), speed: 40, atlasKey: "orangeShirtMouse", isUnique: true, animationKeys: { walkLeft: "orangeShirtMouse_walk_left", walkRight: "orangeShirtMouse_walk_right", idle: "orangeShirtMouse_idle" }
            }),
            new NPC({
                scene: this, x: 2000, y: 1300, texture: "pinkDressGirlMouse", frame: "pinkDressGirlMouse0.png", dialogues: this.dialoguesData['pinkDressGirlMouse'], dialogueManager: this.dialogueManager, npcId: "pinkDressGirlMouse",
                movementType: "random", moveArea: new Phaser.Geom.Rectangle(2000, 1300, 400, 400), speed: 30, atlasKey: "pinkDressGirlMouse", isUnique: true, animationKeys: { walkLeft: "pinkDressGirlMouse_walk_left", walkRight: "pinkDressGirlMouse_walk_right", idle: "pinkDressGirlMouse_idle" }
            }),
            new NPC({
                scene: this, x: 2300, y: 2300, texture: "redDressCyborgMouse", frame: "redDressCyborgMouse0.png", dialogues: this.dialoguesData['redDressCyborgMouse'], dialogueManager: this.dialogueManager, npcId: "redDressCyborgMouse",
                movementType: "patrol", patrolPoints: [{ x: 2300, y: 2300 }, { x: 2105, y: 2300 }, { x: 2205, y: 2200 }, { x: 2400, y: 2200 }], speed: 15, atlasKey: "redDressCyborgMouse", isUnique: true, animationKeys: { walkLeft: "redDressCyborgMouse_walk_left", walkRight: "redDressCyborgMouse_walk_right", idle: "redDressCyborgMouse_idle" }
            }),
            new NPC({
                scene: this, x: 2300, y: 600, texture: "redShirtMouse", frame: "redShirtMouse0.png", dialogues: this.dialoguesData['placeholderDialogue'], dialogueManager: this.dialogueManager, npcId: "redShirtMouse",
                movementType: "random", moveArea: new Phaser.Geom.Rectangle(1000, 500, 2000, 1500), speed: 40, atlasKey: "redShirtMouse", isUnique: true, animationKeys: { walkLeft: "redShirtMouse_walk_left", walkRight: "redShirtMouse_walk_right", idle: "redShirtMouse_idle" }
            }),
            new NPC({
                scene: this, x: 2200, y: 420, texture: "rockerMouse", frame: "rockerMouse0.png", dialogues: this.dialoguesData['mouseRocker'], dialogueManager: this.dialogueManager, npcId: "rockerMouse",
                movementType: "idle", speed: 0, atlasKey: "rockerMouse", isUnique: true, animationKeys: { walkLeft: "rockerMouse_walk_left", walkRight: "rockerMouse_walk_right", idle: "rockerMouse_idle" }
            }),
            new NPC({
                scene: this, x: 1500, y: 2300, texture: "sorcerrorMouse", frame: "sorcerrorMouse0.png", dialogues: this.dialoguesData['sorcererMouse'], dialogueManager: this.dialogueManager, npcId: "sorcerrorMouse",
                movementType: "patrol", patrolPoints: [{ x: 1450, y: 2250 }, { x: 1805, y: 2250 }, { x: 1105, y: 2200 }], speed: 25, atlasKey: "sorcerrorMouse", isUnique: true, animationKeys: { walkLeft: "sorcerrorMouse_walk_left", walkRight: "sorcerrorMouse_walk_right", idle: "sorcerrorMouse_idle" }
            }),
            new NPC({
                scene: this, x: 1000, y: 1100, texture: "yellowShirtMouse", frame: "yellowShirtMouse0.png", dialogues: this.dialoguesData['creator'], dialogueManager: this.dialogueManager, npcId: "yellowShirtMouse",
                movementType: "idle", speed: 0, atlasKey: "yellowShirtMouse", isUnique: true, animationKeys: { walkLeft: "yellowShirtMouse_walk_left", walkRight: "yellowShirtMouse_walk_right", idle: "yellowShirtMouse_idle" }
            }),
            new NPC({
                scene: this, x: 1000, y: 200, texture: "redDressgirlMouse", frame: "redDressgirlMouse0.png", dialogues: this.dialoguesData['redDressgirlMouse'], dialogueManager: this.dialogueManager, npcId: "redDressgirlMouse",
                movementType: "idle", speed: 0, atlasKey: "redDressgirlMouse", isUnique: true, animationKeys: { walkLeft: "redDressgirlMouse_walk_left", walkRight: "redDressgirlMouse_walk_right", idle: "redDressgirlMouse_idle" }
            }),
        ];

        this.npcs.forEach((npc) => {
            this.add.existing(npc);
            this.physics.add.existing(npc);
            this.physics.add.collider(this.player, npc);
            this.physics.add.collider(npc, collisionLayer);
            npc.setDepth(5); // Set depth for NPCs
        });
    }

    // Function to create Objects (Bodies and Items)
    private createObjects(collisionLayer: Phaser.Tilemaps.TilemapLayer): void {
        this.Objects = [
            new Body(this, 600, 500, 'DeadBody', this.dialoguesData['DeadBody'], this.dialogueManager, 'DeadBody', undefined, undefined, undefined, undefined, false),
            new Body(this, 600, 400, 'knifeBlood', this.dialoguesData['knifeBlood'], this.dialogueManager, 'knifeBlood', 'knifeBlood', 'Bloody Knife', 'A knife with blood stains. Could this be the murder weapon?', 'knifeBloodIcon', true),
            // Add more objects here
        ];

        this.Objects.forEach((body) => {
            this.add.existing(body);
            this.physics.add.existing(body);
            body.setDepth(5); // Set depth for objects
            this.physics.add.collider(this.player, body);
            this.physics.add.collider(body, collisionLayer)
        });
    }

    // Function to set up interactions
    private setupInteractions(): void {
        // Combine interactables
        this.interactables = [...this.npcs, ...this.Objects];

        // Handle item collection events
        this.events.on('itemCollected', this.onItemCollected, this);

        // Input handlers for inventory and guide
        this.input.keyboard.on('keydown-I', () => {
            this.showInventory();
            this.scene.pause('Game');
        });
        this.input.keyboard.on('keydown-G', () => {
            this.showGuide();
            this.scene.pause("Game");

        });
    }

    update(time: number, delta: number) {
        // Update player movement
        this.player.update();

        // Update NPCs
        this.npcs.forEach((npc) => {
            npc.update(time, delta);
        });

        // Update dialogue manager
        this.dialogueManager.update();

        // Handle the above layer transparency
        const playerX = this.player.x;
        const playerY = this.player.y;
        const tileAtPlayer = this.aboveLayer.getTileAtWorldXY(playerX, playerY);

        this.aboveLayer.forEachTile((tile) => (tile.alpha = 1));

        if (tileAtPlayer) {
            const tileX = tileAtPlayer.x;
            const tileY = tileAtPlayer.y;

            const range = 1;
            for (let dx = -range; dx <= range; dx++) {
                for (let dy = -range; dy <= range; dy++) {
                    const tile = this.aboveLayer.getTileAt(tileX + dx, tileY + dy);
                    if (tile) {
                        tile.alpha = 0.5;
                    }
                }
            }
        }

        // Check if dialogue is active
        if (this.dialogueManager.isDialogueActive()) {
            const currentNpc = this.dialogueManager.getCurrentNpcInstance();
            if (currentNpc) {
                // Get positions of player and NPC
                const playerPosition = new Phaser.Math.Vector2(
                    this.player.x,
                    this.player.y
                );
                const npcPosition = new Phaser.Math.Vector2(currentNpc.x, currentNpc.y);

                // Calculate distance between player and NPC
                const distance = Phaser.Math.Distance.BetweenPoints(
                    playerPosition,
                    npcPosition
                );

                // If distance exceeds maximum, end dialogue
                if (distance > MAX_DIALOGUE_DISTANCE) {
                    this.dialogueManager.endDialogue();
                    this.hideInteractionPrompt();
                }
            }
            this.hideInteractionPrompt();
            return;
        }

        // Interaction handling
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

        // Handle interaction initiation
        if (
            interactableInRange &&
            Phaser.Input.Keyboard.JustDown(this.cursors.space!)
        ) {
            if (activeInteractable) {
                if (
                    activeInteractable instanceof Body &&
                    activeInteractable.isCollectible
                ) {
                    activeInteractable.initiateInteraction(
                        this.player,
                        this.inventoryManager
                    );
                } else {
                    activeInteractable.initiateDialogue();
                }
            }
        }

        if (!interactableInRange) {
            this.hideInteractionPrompt();
        }
    }

    showInventory() {
        this.scene.launch('InventoryScene', {
            inventoryManager: this.inventoryManager,
        });
        this.scene.pause();
    }

    showGuide() {
        this.scene.launch('Guide');
        this.scene.pause();
    }

    changeScene() {
        this.scene.start('GameOver');
    }

    showJournal() {
        // Launch the Clue Display Scene and pass the ClueManager instance
        this.scene.launch('ClueJournal', { clueManager: this.clueManager });

        // Optionally, pause the Game scene if you want the ClueDisplayScene to overlay
        this.scene.pause('Game');
    }

    showAccusation() {
        this.scene.launch('AccusationScene', {
            suspectsData: this.suspectsData,
            clueManager: this.clueManager,
            suspectsSprites: this.npcIdleFrames
        });
        this.scene.pause();

    }

    showInteractionPrompt() {
        if (!this.interactionPrompt) {
            // Position the prompt near the bottom center of the screen
            const camera = this.cameras.main;
            const x = camera.scrollX + camera.width / 2;
            const y = camera.scrollY + camera.height - 170; // Adjust based on dialogue box height

            this.interactionPrompt = this.add
                .text(x, y, 'Press Spacebar to interact', {
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

    private onItemCollected(collectedItem: Body): void {
        // Remove the item from the interactables array
        const index = this.interactables.indexOf(collectedItem);
        if (index > -1) {
            this.interactables.splice(index, 1);
        }
    }
}