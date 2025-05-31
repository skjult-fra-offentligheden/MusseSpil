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
import { AllItemConfigs } from '../../data/items/AllItemConfig'; // Adjust path
import { ItemConfig, PhaseArt } from '../../data/items/itemTemplate';
import { CallbackHandler } from '../managers/CallBackManager';

import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs'; // Assuming path to your new AllNPCConfigs
import { NPCConfig } from '../../data/NPCs/npcTemplate';  // Assuming path to your new RichNPCConfig interface
import { setupAllNPCAnimations, spawnNPCsFromList, NpcSpawnInstruction } from '../../factories/npcFactory'; // Or wherever you put animation setup

const MAX_DIALOGUE_DISTANCE = 70; // SUPER IMPORTANT

export class ToturialScene extends Phaser.Scene {
    private interactionText!: Phaser.GameObjects.Text;
    npcs!: NPC[];
    public cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    interactionPrompt!: Phaser.GameObjects.Text | null;
    Objects!: Body[];
    private dialoguesData!: { [npcId: string]: DialogueNode[] };
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
    private suspectsData: any;
    private inventoryManager!: InventoryManager; 
    private isIntroDialogueActive: boolean = false;
    public callbackHandler!: CallbackHandler; 
    public dialogueManager!: DialogueManager;

    //NPC Dialogues
    private cop2dialogue: any;
    private rockermousedialogue: any;
    private orangeShirtMouse: any;
    private pinkdressMouse: any;
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

        ////OBJECTS
        //this.load.image('clueCheese', 'assets/tilemaps/toturial_inside/cheese_64x64.png');
        //this.load.image('clueCoke', 'assets/tilemaps/toturial_inside/cokebag_full_64x64.png');
        //this.load.image('glue', 'assets/tilemaps/toturial_inside/glue_64x64.png');
        //this.load.image('cluePhone', 'assets/tilemaps/toturial_inside/phone_64x64.png');


        //npc her
        this.load.atlas("cop2", "assets/npc/cop2Sprite/cop2sprite.png", "assets/npc/cop2Sprite/cop2sprite.json")
        this.load.atlas("orangeShirtMouse", "assets/npc/orangeShirtMouse/orangeShirtMouse.png", "assets/npc/orangeShirtMouse/orangeShirtMouse.json")
        this.load.atlas("rockerMouse", "assets/npc/rockerMouse/rockerMouse.png", "assets/npc/rockerMouse/rockerMouse.json")
        this.load.atlas("pinkDressGirlMouse", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.png", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.json")


        console.log("[ToturialScene Preload] Loading item assets from AllItemConfigs...");
        Object.values(AllItemConfigs).forEach((itemConfig: ItemConfig) => {
            // Load large art (world sprite)
            if (itemConfig.art && itemConfig.art.large) {
                if (typeof itemConfig.art.large === 'string') {
                    this.load.image(itemConfig.art.large, itemConfig.art.large);
                    // console.log(`  Loaded large art (string): ${itemConfig.art.large}`);
                } else { // It's PhaseArt
                    const phaseArt = itemConfig.art.large as PhaseArt;
                    this.load.image(phaseArt.full, phaseArt.full);
                    this.load.image(phaseArt.half, phaseArt.half);
                    this.load.image(phaseArt.empty, phaseArt.empty);
                    // console.log(`  Loaded large art (PhaseArt): ${phaseArt.full}, ${phaseArt.half}, ${phaseArt.empty}`);
                }
            }

            // Load small art (inventory icon)
            if (itemConfig.art && itemConfig.art.small) {
                if (typeof itemConfig.art.small === 'string') {
                    this.load.image(itemConfig.art.small, itemConfig.art.small);
                    // console.log(`  Loaded small art (string): ${itemConfig.art.small}`);
                } else { // It's PhaseArt
                    const phaseArt = itemConfig.art.small as PhaseArt;
                    this.load.image(phaseArt.full, phaseArt.full);
                    this.load.image(phaseArt.half, phaseArt.half);
                    this.load.image(phaseArt.empty, phaseArt.empty);
                    // console.log(`  Loaded small art (PhaseArt): ${phaseArt.full}, ${phaseArt.half}, ${phaseArt.empty}`);
                }
            }
        });
        // Load the fallback texture
        this.load.image('fallback_missing_item_texture', 'assets/tilemaps/toturial_inside/cheese_32x32.png');
    }

    create() {
        //sæt ui elementer.
        const state = GameState.getInstance(this);

        this.clueData = this.cache.json.get('toturial_clues') || {};
        this.clueManager = new ClueManager(this.clueData);   // build with the JSON that was just cached
        this.registry.set('clueManager', this.clueManager);
        if (Object.keys(this.clueData).length === 0) {
            console.warn("No clue data loaded for 'toturial_clues'. Check preload path and JSON content.");
        }
        this.clueManager = this.registry.get('clueManager');

        const uiManager = UIManager.getInstance();
        uiManager.setScene(this, "ToturialScene");

        this.inventoryManager = InventoryManager.getInstance();
        this.inventoryManager.setScene(this);
        console.log("i set scene")

        this.events.on('shutdown', () => {
            this.input.keyboard.removeAllListeners();
        });

        this.cop2dialogue = this.cache.json.get("cop2_toturial") || {};
        this.rockermousedialogue = this.cache.json.get("rockerMouse_toturial") || {};
        this.pinkdressMouse = this.cache.json.get("pinkdressMouse_toturial") || {}
        this.orangeShirtMouse = this.cache.json.get("orangeshirt_toturial") || {}

        //this.dialoguesData = this.cache.json.get("npc_dialogues_toturial") || {}; NO LONGER EXIST
        this.objectData = this.cache.json.get("objects_dialogues_toturial") || {};
        this.suspectsData = this.cache.json.get('suspectsData');

        //this.dialogueManager = data.dialogueManager;
        console.log("suspect data: " + JSON.stringify(this.suspectsData, null, 2))
        function bundle(id: string, raw: any) {
            return Array.isArray(raw) || raw?.id ? { [id]: raw } : raw;
        }
        this.dialoguesData = {
            ...bundle('orangeShirtMouse', this.orangeShirtMouse),
            ...bundle('pinkDressGirlMouse', this.pinkdressMouse),
            ...bundle('cop2', this.cop2dialogue),
            ...bundle('rockerMouse', this.rockermousedialogue),
            ...this.objectData
        };
        this.callbackHandler = new CallbackHandler(
            this,
            this.clueManager,
            this.inventoryManager,
            uiManager
        );
        console.log("[ToturialScene Create] CallbackHandler initialized:", this.callbackHandler);

        this.dialogueManager = new DialogueManager(this, this.dialoguesData, this.clueManager, this.inventoryManager, this.callbackHandler);

        const map = this.make.tilemap({ key: 'policeinside' });

        //tiljøj billeder til tilemap
        const backgroundTileset = map.addTilesetImage('background_toturial', 'background_toturial');
        const bigFurnitureTileset = map.addTilesetImage('big_furniture', 'big_furniture');
        const objectsDecorationTileset = map.addTilesetImage('objects_decoration', 'objects_decoration');

        //CollisionLayer
        const mapOffsetX = 200;
        const mapOffsetY = 200;

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

        const npcSpawnInstructions: NpcSpawnInstruction[] = [
            { npcId: "cop2", x: npcPositions['cop2']?.x || 100, y: npcPositions['cop2']?.y || 100 },
            { npcId: "orangeShirtMouse", x: npcPositions['orangeShirtMouse']?.x || 150, y: npcPositions['orangeShirtMouse']?.y || 150 },
            { npcId: "rockerMouse", x: npcPositions['rockerMouse']?.x || 200, y: npcPositions['rockerMouse']?.y || 200 },
            { npcId: "pinkDressGirlMouse", x: npcPositions['pinkDressGirlMouse']?.x || 250, y: npcPositions['pinkDressGirlMouse']?.y || 250 }
            //// Add more if defined in AllNPCConfigs and have Tiled spawn points
        ];

        const npcMapCollisionLayers = [collisionLayer!, collisionLayer2!].filter(Boolean) as Phaser.Tilemaps.TilemapLayer[];
        this.npcs = [];
        this.npcs = spawnNPCsFromList(
            this,
            npcSpawnInstructions,
            this.dialogueManager,
            npcMapCollisionLayers
        ) || [];

        if (this.npcs.length > 0 && this.player) {
            this.physics.add.collider(this.player, this.npcs);
        }

        // Update GameState with NPC idle frames (now derived from AllNPCConfigs)
        state.npcIdleFrames = Object.values(AllNPCsConfigs).map(config => ({
            id: config.npcId,
            textureKey: config.textureKey, // This is the atlas key
            // Get initialFrame from config, or derive from the first frame of the idle animation definition
            idleFrame: config.initialFrame || config.animations?.definitions?.find(def => def.keyName === config.animations?.idleKey)?.frameNames[0] || 'default_frame_if_all_else_fails'
        }));

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

        this.player = new Player(this, this.exitX, this.exitY - 50, "Detective Mouse");
        this.registry.set('player', this.player);
        this.player.setAlpha(1);
        this.player.setDepth(5);
        this.add.existing(this.player);
        this.cursors = this.input.keyboard.createCursorKeys(); //up, down, left, right, spacebar, shift (avoid binding these keys)

        if (door) {
            this.setupExit(this.exitX, this.exitY, door.width!, door.height!);
        }

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#000000');
        //move camera to set it center
        this.camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

        //this.camera.setBounds(-1 * (map.widthInPixels / 2), -1 * (map.heightInPixels / 2, map).widthInPixels, map.heightInPixels);

        const debugGraphics = this.add.graphics();
        this.physics.world.createDebugGraphic();
        this.physics.world.drawDebug = true;
        if (this.physics.world.drawDebug) {
            debugGraphics.lineStyle(2, 0xff0000, 1);
        }

        //add collisions:
        this.physics.add.collider(this.player, collisionLayer!);
        this.physics.add.collider(this.player, collisionLayer2!);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.camera.startFollow(this.player);

        console.log("Player:", this.player);
        console.log("Collision Layer:", collisionLayer);
        console.log("Triggers:", this.triggers);

        const gameWidth = this.scale.width;  // Game logical width (from config)
        const gameHeight = this.scale.height; // Game logical height (from config)
        if (map.widthInPixels < gameWidth || map.heightInPixels < gameHeight) {
            // Center the camera view on the center of the tilemap
            // This makes the smaller map appear centered within the larger game viewport
            this.camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

            // If you were following the player, you might need to stop it initially
            // if you want the whole map centered at the start, regardless of player position.
            // You could re-enable follow later based on game events.
            this.camera.stopFollow(); // Optional: Uncomment if needed
        }
        // Launch UI Scene

        this.events.on('dialogueOptionCallback', (callbackId: string) => {
            if (this.callbackHandler) { // Check if it's initialized
                this.callbackHandler.handleCallback(callbackId);
            }
        }, this);

        if (!this.scene.get('ClueDisplayScene')) {
            this.scene.add('ClueDisplayScene', ClueDisplayScene, false);
        }

        console.log("[ToturialScene] About to call setupAllNPCAnimations."); // Add this
        setupAllNPCAnimations(this); // <--- THIS IS THE CRUCIAL CALL
        console.log("[ToturialScene] Finished calling setupAllNPCAnimations."); // Add this

        //this.npcs = createNPCs(this, npcConfigs, [collisionLayer!, collisionLayer2!]);
        state.suspectsData = this.suspectsData;
        //state.npcIdleFrames = npcConfigs.map(config => {
        //    return {
        //        id: config.npcId,
        //        textureKey: config.atlasKey,
        //        idleFrame: config.frames?.idle?.[0] || config.frame 
        //    };
        //});
        //generate Objects
        const Objectsclue = map.getObjectLayer('ObjectCluesSpawnpoints');
        this.createObjects(collisionLayer!, collisionLayer!, Objectsclue)

        this.interactables = [...this.npcs, ...this.Objects];



        this.scene.launch('UIGameScene');
        this.scene.bringToTop('UIGameScene');

        // play scenes.
        console.log("--- Attempting to start tutorial briefing ---"); // Log Start

        const chiefWhiskers = this.npcs.find(npc => npc.npcId === 'cop2');
        console.log("Found chiefWhiskers NPC:", chiefWhiskers);
        if (this.dialogueManager) {
            console.log("DialogueManager exists."); // Log DM existence
        } else {
            console.error("DialogueManager does NOT exist here!");
        }
        if (chiefWhiskers && this.dialogueManager) {
            // ... (optional: disable player input temporarily)
            this.isIntroDialogueActive = true;
            // Call startDialogue with the SPECIFIC briefing ID
            console.log("Conditions met. Calling startDialogue with 'cop2', 'cop2_tutorial_briefing'.");
            this.dialogueManager.startDialogue('cop2', 'cop2_tutorial_briefing', chiefWhiskers); // <-- Use the new ID here!

            // ... (optional: setup listener for dialogueEnded to re-enable input)
        } else {
            console.warn("Did not start dialogue. chiefWhiskers found:", !!chiefWhiskers, "DialogueManager found:", !!this.dialogueManager); // Log failure reason
        }
        console.log("--- Finished attempt to start tutorial briefing ---");

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
        if (this.dialogueManager) { // Check if it exists
            this.dialogueManager.update();
        }

        if (this.dialogueManager && this.dialogueManager.isDialogueActive() && !this.isIntroDialogueActive) {
            const currentNpc = this.dialogueManager.getCurrentNpc();
            if (currentNpc) {
                const playerPosition = new Phaser.Math.Vector2(this.player.x, this.player.y);
                const npcPosition = new Phaser.Math.Vector2(currentNpc.x, currentNpc.y);
                const distance = Phaser.Math.Distance.BetweenPoints(playerPosition, npcPosition);

                if (distance > MAX_DIALOGUE_DISTANCE) {
                    console.warn(`[ToturialScene] Ending dialogue due to distance! Player: (${playerPosition.x}, ${playerPosition.y}), NPC: (${npcPosition.x}, ${npcPosition.y}), Distance: ${distance}, Max: ${MAX_DIALOGUE_DISTANCE}`);
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
                this.showInteractionPrompt(activeInteractable);
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
                    activeInteractable.initiateDialogue(); //start dialogue i deleted
                }
            }
        }

        if (!interactableInRange) {
            this.hideInteractionPrompt();
        }
    }

    showInteractionPrompt(target: Interactable | null = null) {
        if (!this.interactionPrompt) {
            let promptText = 'Press [SPACE] to interact';
            if (target) {
                if (target instanceof NPC) {
                    promptText = `Press [SPACE] to talk to ${target.npcId}`; // Or use a display name if NPCs have one
                } else if (target instanceof Body) {
                    promptText = `Press [SPACE] to examine ${target.itemId}`; // Or use an item display name
                }
                // Add more checks if you have other interactable types
            }

            const camera = this.cameras.main;
            const x = camera.scrollX + camera.width / 2;
            const y = camera.scrollY + camera.height - 50;

            this.interactionPrompt = this.add
                .text(x, y, promptText, {
                    fontSize: '16px',
                    color: '#ffffff',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: { x: 8, y: 4 },
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

    private createObjects(
        collisionLayer: Phaser.Tilemaps.TilemapLayer | null, // Allow null if optional
        collisionLayer2: Phaser.Tilemaps.TilemapLayer | null,
        ObjectsclueLayer: Phaser.Types.Tilemaps.ObjectLayer | null
    ): void {
        const gameState = GameState.getInstance();
        const objectSpawnPoints = ObjectsclueLayer ? getNPCPositions(ObjectsclueLayer) : {};

        // Define items to spawn with their itemId and Tiled object name (for position)
        const itemsToSpawn = [
            { itemId: 'cluePhone', spawnPointName: 'cluePhone' },
            { itemId: 'coke', spawnPointName: 'clueCoke' },
            { itemId: 'clueGlue', spawnPointName: 'glue' },
            { itemId: 'blueCheese', spawnPointName: 'clueCheese' },
            // ... add all items you want to spawn in this scene
        ];

        this.Objects = []; // Initialize if not already

        itemsToSpawn.forEach(itemDataToSpawn => {
            // 1. Check if item should be spawned (not collected, config exists, spawn point exists)
            if (gameState.collectedItems.has(itemDataToSpawn.itemId)) {
                // console.log(`[createObjects] Item ${itemDataToSpawn.itemId} already collected. Skipping.`);
                return; // Skip this item
            }
            if (!AllItemConfigs[itemDataToSpawn.itemId]) {
                console.warn(`[createObjects] No ItemConfig found for itemId: "${itemDataToSpawn.itemId}". Skipping.`);
                return; // Skip this item
            }
            const spawnPosition = objectSpawnPoints[itemDataToSpawn.spawnPointName];
            if (!spawnPosition) {
                console.warn(`[createObjects] No spawn point found for: "${itemDataToSpawn.spawnPointName}" (itemId: ${itemDataToSpawn.itemId}). Skipping.`);
                return; // Skip this item
            }

            // 2. Create the Body instance using the new constructor
            console.log(`[createObjects] Creating Body for itemId: ${itemDataToSpawn.itemId}`);
            const body = new Body(
                this,
                spawnPosition.x,
                spawnPosition.y,
                itemDataToSpawn.itemId,
                this.dialogueManager // Pass the scene's dialogue manager
            );

            this.Objects.push(body);
            // scene.add.existing(body) and scene.physics.add.existing(body) are handled in Body constructor.
            body.setDepth(5); // Set depth if needed (or Body could handle its default depth)

            // Setup colliders (player vs item, item vs world layers)
            if (this.player && collisionLayer) this.physics.add.collider(this.player, body);
            if (collisionLayer) this.physics.add.collider(body, collisionLayer);
            if (collisionLayer2) this.physics.add.collider(body, collisionLayer2);
        });

        // Update the scene's interactables list
        this.interactables = [...this.npcs, ...this.Objects]; // Assuming this.npcs is already populated
    }


}
