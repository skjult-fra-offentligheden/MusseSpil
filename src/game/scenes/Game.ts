// src/scenes/Game.ts

import Phaser, { NONE } from 'phaser';
import { EventBus } from '../EventBus';
import { NPC } from '../NPCgeneral/npc';
import { Player } from '../classes/player';
import { DialogueManager } from '../dialogues/dialogueManager';
import { DialogueNode } from "../dialogues/dialogues"
import { Body } from '../classes/body';
import { ClueManager } from "../clueScripts/clueManager";
import { InventoryManager } from '../managers/itemMananger';
import { Interactable } from '../managers/interactables';
import { GuideScene } from '../guideScripts/guide';
import { ClueDisplayScene } from './clueDisplay';
import { Clue } from '../classes/clue';
import { createNPCs } from '../../factories/npcFactory';
import { getNPCPositions } from '../../factories/npcPositionsPreProcessing';
import { GameState } from '../managers/GameState';
import { UIManager } from '../managers/UIManager';

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
    private triggers!: Phaser.Physics.Arcade.Group;
    public npcPositions = {};

    constructor() {
        super('Game');
    }

    preload() {
        // Preload assets...
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

        this.load.image('DeadBody', 'assets/button/deadMouseVictim.png');
        this.load.image('knifeBlood', 'assets/button/knifeBlood.png');
        this.load.image('grannyBag', 'assets/button/grannyBag.png');
        this.load.image('gun', 'assets/button/gun.png');
    }

    create() {

        this.events.on('shutdown', () => {
            this.input.keyboard.removeAllListeners();
        });

        this.clueManager = ClueManager.getInstance(); // crasher hvisden ikke tilføjes 
        this.inventoryManager = InventoryManager.getInstance();
        this.inventoryManager.setScene(this);
        //sæt ui elementer.
        const uiManager = UIManager.getInstance();
        uiManager.setScene(this, "Game");
        
        
        const gameState = GameState.getInstance();


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

        this.dialoguesData = { ...this.dialoguesData, ...this.objectData };

        console.log("dialoguedata" + JSON.stringify(this.dialoguesData, null, 2))
        this.dialogueManager = new DialogueManager(this, this.dialoguesData, this.clueManager, this.clueData, this.inventoryManager);

        // Create animations
        const standardAtlasSprites = [
            { "textureKey": "cop1", "framePrefix": "cop1Sprite", "idleFrame": "cop1Sprite.png" },
            { "textureKey": "cop2", "framePrefix": "cop2sprite", "idleFrame": "cop2sprite.png" },
            { "textureKey": "CopGirlSprite", "framePrefix": "CopGirlSprite", "idleFrame": "CopGirlSprite0.png" },
            { "textureKey": "fancyMouse", "framePrefix": "fancyMouse", "idleFrame": "fancyMouse0.png" },
            { "textureKey": "fatMouse", "framePrefix": "fatMouse", "idleFrame": "fatMouse0.png" },
            { "textureKey": "grannyMouse", "framePrefix": "grannyMouse", "idleFrame": "grannyMouse0.png" },
            { "textureKey": "mageMouse", "framePrefix": "mageMouse", "idleFrame": "mageMouse0.png" },
            { "textureKey": "orangeShirtMouse", "framePrefix": "orangeShirtMouse", "idleFrame": "orangeShirtMouse0.png" },
            { "textureKey": "pinkDressGirlMouse", "framePrefix": "pinkDressGirlMouse", "idleFrame": "pinkDressGirlMouse0.png" },
            { "textureKey": "redDressCyborgMouse", "framePrefix": "redDressCyborgMouse", "idleFrame": "redDressCyborgMouse0.png" },
            { "textureKey": "redShirtMouse", "framePrefix": "redShirtMouse", "idleFrame": "redShirtMouse0.png" },
            { "textureKey": "rockerMouse", "framePrefix": "rockerMouse", "idleFrame": "rockerMouse0.png" },
            { "textureKey": "sorcerrorMouse", "framePrefix": "sorcerrorMouse", "idleFrame": "sorcerrorMouse0.png" },
            { "textureKey": "yellowShirtMouse", "framePrefix": "yellowShirtMouse", "idleFrame": "yellowShirtMouse0.png" },
            { "textureKey": "redDressgirlMouse", "framePrefix": "redDressgirlMouse", "idleFrame": "redDressgirlMouse0.png" },
        ]
        this.npcIdleFrames = standardAtlasSprites
        //old
        //this.createNPCAnimations(standardAtlasSprites);
        console.log("created create NPC animations ")
        // Set up the map
        const map = this.make.tilemap({ key: 'scene1' });
        const npcSpawnLayer = map.getObjectLayer('NPCspawnpoints');
        const backgroundTileset = map.addTilesetImage('background_floor', 'background_floor');
        const testHouseTileset = map.addTilesetImage('test_house_more', 'test_house_more');
        const objectsTileset = map.addTilesetImage('objects', 'objects');

        this.npcPositions = getNPCPositions(npcSpawnLayer!);

        const triggersLayer = map.getObjectLayer('Triggers');
        this.triggers = this.physics.add.staticGroup();

        triggersLayer.objects.forEach((objData) => {
            const x = objData.x + objData.width * 0.5;
            const y = objData.y + objData.height * 0.5;

            // Create an invisible rectangle as the trigger
            const trigger = this.add.rectangle(x, y, objData.width, objData.height, undefined, 0);
            this.physics.add.existing(trigger, true);

            const destinationProperty = objData.properties?.find(p => p.name === 'destination');
            trigger.setData('type', objData.name);
            trigger.setData('destination', destinationProperty?.value);

            this.triggers.add(trigger);
        });

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#000000');
        console.log(map.widthInPixels + " " + map.heightInPixels)
        this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cursors = this.input.keyboard.createCursorKeys();

        // Create tilemap layers
        const groundLayer = map.createLayer('Below Player', [backgroundTileset!, testHouseTileset!, objectsTileset!], 0, 0);
        const collisionLayer = map.createLayer('World', [backgroundTileset!, testHouseTileset!, objectsTileset!], 0, 0);
        collisionLayer?.setCollisionByExclusion([-1]);

        // Create the player
        this.player = new Player(this, 300, 300);
        this.player.setDepth(5);
        this.physics.add.collider(this.player, collisionLayer!);
        this.physics.add.overlap(this.player, this.triggers, this.onTriggerOverlap, undefined, this);

        // Create NPCs
        this.createNPCs(collisionLayer!, this.npcPositions);

        // Create Objects (Bodies and Items)
        
        this.createObjects(collisionLayer!);

        this.aboveLayer = map.createLayer('Above Player', [backgroundTileset!, testHouseTileset!, objectsTileset!], 0, 0);
        this.aboveLayer.setDepth(10);

        const debugGraphics = this.add.graphics();
        this.physics.world.createDebugGraphic();
        this.physics.world.drawDebug = true;
        debugGraphics.lineStyle(2, 0xff0000, 1);

        this.camera.startFollow(this.player);

        // Set up interactions
        this.setupInteractions();

        // Launch UI Scene
        this.scene.launch('UIGameScene');
        this.scene.bringToTop('UIGameScene');
        if (!this.scene.get('ClueDisplayScene')) {
            this.scene.add('ClueDisplayScene', ClueDisplayScene, false);
        }


        gameState.suspectsData = this.suspectsData;
        gameState.clueManager = this.clueManager;
        gameState.npcIdleFrames = this.npcIdleFrames;

        EventBus.emit('current-scene-ready', this);
        this.events.on('clueDisplayClosed', this.onClueDisplayClosed, this);

    }

    private onClueDisplayClosed() {
        this.scene.resume('Game');
    }

    private createNPCs(collisionLayer: Phaser.Tilemaps.TilemapLayer, npcPositions: any): void {
        const npcConfigs = [
            {
                scene: this, x: npcPositions['cop1']?.x || 0, y: npcPositions['cop1']?.y || 0, texture: 'cop1', frame: 'cop1Sprite.png', dialogues: this.dialoguesData['cop1'], dialogueManager: this.dialogueManager,
                npcId: 'cop1', movementType: 'patrol', speed: 50, atlasKey: "cop1", isUnique: true, patrolPoints: [{ x: 400, y: 480 }, { x: 550, y: 500 }],
                animationKeys: { walkLeft: 'cop1_walk_left', walkRight: 'cop1_walk_right', idle: 'cop1_idle' }, frames: { walkLeft: ["cop1Sprite2.png", "cop1Sprite3.png"], walkRight: ["cop1Sprite.png", "cop1Sprite1.png"], idle: ["cop1Sprite.png"] }

            },
            {
                scene: this, x: npcPositions['cop2']?.x || 0, y: npcPositions['cop2']?.y || 0, texture: 'cop2', frame: 'cop2sprite.png', dialogues: this.dialoguesData['cop2'], dialogueManager: this.dialogueManager, npcId: 'cop2',
                movementType: 'random', speed: 30, atlasKey: "cop2", isUnique: true, moveArea: new Phaser.Geom.Rectangle(600, 600, 100, 100), animationKeys: { walkLeft: 'cop2_walk_left', walkRight: 'cop2_walk_right', idle: 'cop2_idle' }, frames: { walkLeft: ["cop2sprite2.png", "cop2sprite3.png"], walkRight: ["cop2sprite1.png", "cop2sprite2.png"], idle: ["cop2sprite3.png"] }
            },
            {
                scene: this, x: npcPositions['fancyMouse']?.x || 0, y: npcPositions['fancyMouse']?.y || 0,  texture: "fancyMouse", frame: "fancyMouse0.png", dialogues: this.dialoguesData['placeholderDialogue'], dialogueManager: this.dialogueManager, npcId: "fancyMouse",
                movementType: "idle", speed: 0, atlasKey: "fancyMouse", isUnique: true, animationKeys: { walkLeft: "fancyMouse_walk_left", walkRight: "fancyMouse_walk_right", idle: "fancyMouse_idle" }, frames: { walkLeft: ["fancyMouse2.png", "fancyMouse3.png"], walkRight: ["fancyMouse0.png", "fancyMouse1.png"], idle: ["fancyMouse1.png"] }
            }
        ];

        this.npcs = createNPCs(this, npcConfigs, collisionLayer);
    }

    private createObjects(collisionLayer: Phaser.Tilemaps.TilemapLayer): void {
        const gameState = GameState.getInstance();

        //this.Objects = [
        //    new Body(this, 600, 500, 'DeadBody', this.dialoguesData['DeadBody'], this.dialogueManager, 'DeadBody', undefined, undefined, undefined, undefined, false, undefined, undefined, 1),
        //    new Body(this, 600, 400, 'knifeBlood', this.dialoguesData['knifeBlood'], this.dialogueManager, 'knifeBlood', 'knifeBlood', 'knifeBlood', 'A knife with blood stains. Could this be the murder weapon?', 'knifeBlood', true, undefined, undefined, 0.4),
        //];
        const orig_objects = [
            { x: 600, y: 500, texture: 'DeadBody', dialogueKey: 'DeadBody', itemId: 'DeadBody', description: undefined, scale: 1, collectible: false },
            { x: 600, y: 400, texture: 'knifeBlood', dialogueKey: 'knifeBlood', itemId: 'knifeBlood', description: 'A knife with blood stains. Could this be the murder weapon?', scale: 0.4, collectible: true },
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

            });
    }

    private setupInteractions(): void {
        this.interactables = [...this.npcs, ...this.Objects];
        this.events.on('itemCollected', this.onItemCollected, this);
    }

    update(time: number, delta: number) {
        this.player.update();
        this.npcs.forEach((npc) => npc.update(time, delta));
        this.dialogueManager.update();

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

        if (this.dialogueManager.isDialogueActive()) {
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
            this.hideInteractionPrompt();
            return;
        }

        this.interactables = this.interactables.filter((interactable) => interactable.active);
        let interactableInRange = false;
        let activeInteractable: NPC | Body | null = null;
        //console.log("quick test " + JSON.stringify(this.interactables, null, 2) ) 
        this.interactables.forEach((interactable) => {
            
            interactable.checkProximity(this.player, 60, () => {
                interactableInRange = true;
                activeInteractable = interactable;
                this.showInteractionPrompt();
            });
        });

        if (
            interactableInRange &&
            Phaser.Input.Keyboard.JustDown(this.cursors.space!)
        ) {
            if (activeInteractable) {
                if (activeInteractable instanceof Body && activeInteractable.isCollectible) {
                    activeInteractable.initiateInteraction(this.player, this.inventoryManager);
                } else {
                    activeInteractable.initiateDialogue();
                }
            }
        }

        if (!interactableInRange) {
            this.hideInteractionPrompt();
        }
    }

    changeScene() {
        this.scene.start('GameOver');
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

    private onItemCollected(collectedItem: Body): void {
        this.inventoryManager.addItem({
            itemId: collectedItem.itemId,
            itemName: collectedItem.itemName,
            quantity: 1
        });
        collectedItem.destroy();
    }

    onTriggerOverlap(player, trigger) {
        const type = trigger.getData('type');
        const destination = trigger.getData('destination');

        if (type === 'door') {
            this.showInteractionPrompt('Press E to enter');
            if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('E'))) {
                this.enterHouse(destination);
            }
        }
    }

    enterHouse(destinationScene: string) {
        // Do not pass collectedItems anymore; GameState handles it.
        this.scene.start('HouseScene', {
            fromScene: 'Game',
            startX: 300,
            startY: 500,
            dialoguesData: this.dialoguesData,
            dialogueManager: this.dialogueManager
        });
    }
}
