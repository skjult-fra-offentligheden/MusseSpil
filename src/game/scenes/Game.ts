// src/scenes/Game.ts

import Phaser from 'phaser';
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
import { Clue } from '../classes/clue';
import { getNPCPositions } from '../../factories/npcPositionsPreProcessing';
import { createNPCInstance } from '../../factories/npcFactory';
import { GameState } from '../managers/GameState';
import { UIManager } from '../managers/UIManager';

const MAX_DIALOGUE_DISTANCE = 125;

export class Game extends Phaser.Scene {
    public inventoryManager!: InventoryManager;
    public GuideScene!: GuideScene;
    private camera!: Phaser.Cameras.Scene2D.Camera;
    public cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    
    // Layers for X-Ray effect
    private roofLayerFaded!: Phaser.GameObjects.Image; 
    private roofLayerSolid!: Phaser.GameObjects.Image; 
    private roofMaskGraphics!: Phaser.GameObjects.Graphics;
    
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
    private suspectsData: any;
    public npcIdleFrames: any;
    private triggers!: Phaser.Physics.Arcade.Group;
    
    private mapWalls!: Phaser.Physics.Arcade.StaticGroup;
    private roofZones!: Phaser.Physics.Arcade.StaticGroup;

    public npcPositions = {};

    constructor() {
        super('Game');
    }

    preload() {
        // --- NPC Assets ---
        this.load.atlas("cop1", "assets/npc/cop1Sprite/cop1Sprite.png", "assets/npc/cop1Sprite/cop1Sprite.json");
        this.load.atlas("cop2", "assets/npc/cop2Sprite/cop2sprite.png", "assets/npc/cop2Sprite/cop2sprite.json");
        this.load.atlas("CopGirlSprite", "assets/npc/CopGirlSprite/CopGirlSprite.png", "assets/npc/CopGirlSprite/CopGirlSprite.json");
        this.load.atlas("fancyMouse", "assets/npc/fancyMouse/fancyMouse.png", "assets/npc/fancyMouse/fancyMouse.json");
        this.load.atlas("fatMouse", "assets/npc/fatMouse/fatMouse.png", "assets/npc/fatMouse/fatMouse.json");
        this.load.atlas("ghostMouse", "assets/npc/ghostMouse/ghostMouse.png", "assets/npc/ghostMouse/ghostMouse.json");
        this.load.atlas("grannyMouse", "assets/npc/grannyMouse/grannyMouse.png", "assets/npc/grannyMouse/grannyMouse.json");
        this.load.atlas("mageMouse", "assets/npc/mageMouse/mageMouse.png", "assets/npc/mageMouse/mageMouse.json");
        this.load.atlas("orangeShirtMouse", "assets/npc/orangeShirtMouse/orangeShirtMouse.png", "assets/npc/orangeShirtMouse/orangeShirtMouse.json");
        this.load.atlas("pinkDressGirlMouse", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.png", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.json");
        this.load.atlas("redDressCyborgMouse", "assets/npc/redDressCyborgMouse/redDressCyborgMouse.png", "assets/npc/redDressCyborgMouse/redDressCyborgMouse.json");
        this.load.atlas("redDressgirlMouse", "assets/npc/redDressgirlMouse/redDressgirlMouse.png", "assets/npc/redDressgirlMouse/redDressgirlMouse.json");
        this.load.atlas("redShirtMouse", "assets/npc/redShirtMouse/redShirtMouse.png", "assets/npc/redShirtMouse/redShirtMouse.json");
        this.load.atlas("rockerMouse", "assets/npc/rockerMouse/rockerMouse.png", "assets/npc/rockerMouse/rockerMouse.json");
        this.load.atlas("sorcerrorMouse", "assets/npc/sorcerrorMouse/sorcerrorMouse.png", "assets/npc/sorcerrorMouse/sorcerrorMouse.json");
        this.load.atlas("yellowShirtMouse", "assets/npc/yellowShirtMouse/yellowShirtMouse.png", "assets/npc/yellowShirtMouse/yellowShirtMouse.json");
        
        // --- UI Assets ---
        this.load.image('grannyBag', 'assets/button/grannyBag.png');
        this.load.image('gun', 'assets/button/gun.png');

        // --- Map Assets ---
        // UPDATED: We only load the background and the "above" layer. 
        // The visible "collision_layer.png" is removed as requested.
        this.load.image('background_terrain', 'assets/tilemaps/background_terrain.png');
        this.load.image('above_world', 'assets/tilemaps/above_world.png');
        
        this.load.tilemapTiledJSON('scene1', 'assets/tilemaps/introduction_murder_case.tmj');
    }

    create() {
        this.events.on('shutdown', () => {
            this.input.keyboard.removeAllListeners();
        });

        // --- Managers Setup ---
        this.inventoryManager = InventoryManager.getInstance();
        this.inventoryManager.setScene(this);
        const uiManager = UIManager.getInstance();
        uiManager.setScene(this, "Game");

        const state = GameState.getInstance(this);
        try {
            // @ts-ignore
            if (typeof tutorialCases !== 'undefined' && tutorialCases.cases) {
                 // @ts-ignore
                const firstActive = Object.entries(tutorialCases.cases).find(([id, c]: any) => c && (c as any).active);
                if (firstActive && (firstActive[1] as any).culpritNpcId) {
                    const npcId = (firstActive[1] as any).culpritNpcId as string;
                    state.culpritId = npcId;
                    // @ts-ignore
                    const cfg: any = (AllNPCsConfigs as any)[npcId];
                    state.culpritDetails = cfg?.culpritDetails ?? state.culpritDetails;
                } else {
                    // @ts-ignore
                    state.determineCulprit(AllNPCsConfigs);
                }
            }
        } catch {}

        this.clueData = this.cache.json.get('toturial_clues') || {};
        this.clueManager = new ClueManager(this.clueData, state, this);
        this.registry.set('clueManager', this.clueManager);
        uiManager.setClueManager(this.clueManager);
        if (!this.scene.isActive('UIGameScene')) {
            this.scene.launch('UIGameScene');
        }

        const gameState = state;

        this.dialoguesData = this.cache.json.get("npc_dialogues");
        this.objectData = this.cache.json.get("objects_dialogues");
        this.clueData = this.cache.json.get("scene_1_clues");
        this.suspectsData = this.cache.json.get('suspectsData');
        this.dialoguesData = { ...this.dialoguesData, ...this.objectData };

        this.dialogueManager = new DialogueManager(this, this.dialoguesData, this.clueManager, this.clueData, this.inventoryManager);
        this.npcIdleFrames = []; 

        // --- MAP LOADING ---
        const map = this.make.tilemap({ key: 'scene1' });

        // 1. Background (Layer "background" in Tiled)
        this.add.image(0, 0, 'background_terrain').setOrigin(0, 0).setDepth(0);
        
        // 2. No Visible Collision Layer (As requested)
        
        // --- COLLISION LOGIC (Walls) ---
        // Generates invisible walls from the "Collisions" Object Layer
        this.mapWalls = this.physics.add.staticGroup();
        const collisionLayer = map.getObjectLayer('Collisions'); 
        
        if (collisionLayer) {
            collisionLayer.objects.forEach(obj => {
                const width = obj.width ?? 32;
                const height = obj.height ?? 32;
                // Tiled objects are top-left origin, Phaser bodies are center origin
                const x = (obj.x ?? 0) + width / 2;
                const y = (obj.y ?? 0) + height / 2;
                
                // Invisible wall for physics
                const wall = this.add.rectangle(x, y, width, height, 0x000000, 0); 
                this.physics.add.existing(wall, true);
                this.mapWalls.add(wall);
            });
        }

        // --- TRANSPARENCY ZONES ---
        // Generates sensors from the "Above Player" Object Layer
        this.roofZones = this.physics.add.staticGroup();
        const roofLayer = map.getObjectLayer('Above Player'); 

        if (roofLayer) {
            roofLayer.objects.forEach(obj => {
                const width = obj.width ?? 32;
                const height = obj.height ?? 32;
                const x = (obj.x ?? 0) + width / 2;
                const y = (obj.y ?? 0) + height / 2;
                
                // Invisible sensor zone
                const zone = this.add.rectangle(x, y, width, height, 0x0000ff, 0); 
                this.physics.add.existing(zone, true);
                this.roofZones.add(zone);
            });
        }

        // --- NPC SPAWNING ---
        const npcSpawnLayer = map.getObjectLayer('NPCspawnpoints');
        this.npcPositions = getNPCPositions(npcSpawnLayer!);

        const playerSpawn = npcSpawnLayer?.objects.find(obj => obj.name === 'Player' || obj.name === 'player');
        const startX = playerSpawn?.x ?? 300;
        const startY = playerSpawn?.y ?? 300;

        // --- TRIGGERS ---
        const triggersLayer = map.getObjectLayer('Triggers');
        this.triggers = this.physics.add.staticGroup();
        if (triggersLayer) {
             triggersLayer.objects.forEach((objData) => {
                const x = objData.x! + objData.width! * 0.5;
                const y = objData.y! + objData.height! * 0.5;
                const trigger = this.add.rectangle(x, y, objData.width, objData.height, undefined, 0);
                this.physics.add.existing(trigger, true);
                const destinationProperty = objData.properties?.find(p => p.name === 'destination');
                trigger.setData('type', objData.name);
                trigger.setData('destination', destinationProperty?.value);
                this.triggers.add(trigger);
            });
        }

        // --- Camera & Physics Bounds ---
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#000000');
        this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cursors = this.input.keyboard.createCursorKeys();

        // --- Create Player ---
        this.player = new Player(this, startX, startY);
        this.player.setDepth(5);
        this.physics.add.overlap(this.player, this.triggers, this.onTriggerOverlap, undefined, this);
        this.physics.add.collider(this.player, this.mapWalls);

        // --- Create NPCs ---
        this.createNPCs(null, this.npcPositions);

        // --- Create Objects ---
        this.Objects = []; 
        this.createObjects(null);

        // --- VISUALS FOR ROOFS (X-Ray Effect) ---
        // Layer 1: Faded version (Bottom) - Always visible
        this.roofLayerFaded = this.add.image(0, 0, 'above_world').setOrigin(0, 0).setDepth(10).setAlpha(0.5);

        // Layer 2: Solid version (Top) - Masked
        this.roofLayerSolid = this.add.image(0, 0, 'above_world').setOrigin(0, 0).setDepth(11);

        // Create Mask
        this.roofMaskGraphics = this.make.graphics();
        const mask = this.roofMaskGraphics.createGeometryMask();
        mask.setInvertAlpha(true); // Invert so drawing a shape creates a hole
        this.roofLayerSolid.setMask(mask);
        this.add.rectangle(0, 0, map.widthInPixels, map.heightInPixels, 0x000000, 0.3)
            .setOrigin(0, 0)
            .setDepth(100);

        this.camera.startFollow(this.player);
        this.camera.setZoom(1.6);
        this.setupInteractions();

        this.scene.launch('UIGameScene');
        this.scene.bringToTop('UIGameScene');

        gameState.suspectsData = this.suspectsData;
        gameState.clueManager = this.clueManager;
        gameState.npcIdleFrames = this.npcIdleFrames;

        EventBus.emit('current-scene-ready', this);
    }

    update(time: number, delta: number) {
        this.player.update();
        this.npcs.forEach((npc) => npc.update(time, delta));
        this.dialogueManager.update();

        // --- ROOF X-RAY LOGIC ---
        // 1. Clear the mask (restores solid roof everywhere)
        this.roofMaskGraphics.clear();

        // 2. Check if player is under a roof
        let isUnderRoof = false;
        this.physics.overlap(this.player, this.roofZones, () => {
             isUnderRoof = true;
        });

        // 3. If under roof, punch a hole
        if (isUnderRoof) {
            this.roofMaskGraphics.fillStyle(0x000000, 1);
            // Draw a circle at player position to "erase" the solid roof there
            this.roofMaskGraphics.fillCircle(this.player.x, this.player.y, 60);
        }

        if (this.dialogueManager.isDialogueActive()) {
             const currentNpc = this.dialogueManager.getCurrentNpc();
             if (currentNpc) {
                 const playerPosition = new Phaser.Math.Vector2(this.player.x, this.player.y);
                 const npcPosition = new Phaser.Math.Vector2(currentNpc.x, currentNpc.y);
                 if (Phaser.Math.Distance.BetweenPoints(playerPosition, npcPosition) > MAX_DIALOGUE_DISTANCE) {
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
        
        this.interactables.forEach((interactable) => {
            interactable.checkProximity(this.player, 60, () => {
                interactableInRange = true;
                activeInteractable = interactable;
                this.showInteractionPrompt();
            });
        });

        if (interactableInRange && Phaser.Input.Keyboard.JustDown(this.cursors.space!)) {
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
    
    // --- Helper Methods ---

    private createNPCs(collisionLayer: Phaser.Tilemaps.TilemapLayer | null, npcPositions: any): void {
        const created: NPC[] = [];
        if (npcPositions) {
            Object.entries(npcPositions).forEach(([npcId, rawPos]) => {
                if (npcId.toLowerCase() === 'player') return;

                const pos = (rawPos as { x?: number; y?: number }) || {};
                const x = typeof pos.x === 'number' ? pos.x : 0;
                const y = typeof pos.y === 'number' ? pos.y : 0;
                
                const npc = createNPCInstance(this, x, y, npcId, this.dialogueManager, collisionLayer!);
                if (npc) {
                    created.push(npc);
                    this.physics.add.collider(this.player, npc);
                    this.physics.add.collider(npc, this.mapWalls); 
                }
            });
        }
        this.npcs = created;
    }

    private createObjects(collisionLayer: Phaser.Tilemaps.TilemapLayer | null): void {
        this.Objects = [];
    }
    
    private setupInteractions(): void {
        this.interactables = [...this.npcs, ...this.Objects];
        this.events.on('itemCollected', this.onItemCollected, this);
    }
    
    private onItemCollected(collectedItem: Body): void {
        this.inventoryManager.addItem({
            itemId: collectedItem.itemId,
            itemName: collectedItem.itemName,
            quantity: 1
        });
        collectedItem.destroy();
    }
    
    changeScene() {
        this.scene.start('GameOver');
    }

    showInteractionPrompt(text: string = 'Press n to interact') {
        if (!this.interactionPrompt) {
            const camera = this.cameras.main;
            const x = camera.scrollX + camera.width / 2;
            const y = camera.scrollY + camera.height - 170;
            this.interactionPrompt = this.add
                .text(x, y, text, {
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
        this.scene.start('HouseScene', {
            fromScene: 'Game',
            startX: 300,
            startY: 500,
            dialoguesData: this.dialoguesData,
            dialogueManager: this.dialogueManager
        });
    }

    private onClueDisplayClosed() {
        this.scene.resume('Game');
    }
}