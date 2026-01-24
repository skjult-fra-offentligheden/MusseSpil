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
import { GameState } from '../managers/GameState';
import { UIManager } from '../managers/UIManager';
import type { NPCConfig } from '../../data/NPCs/npcTemplate';

const MAX_DIALOGUE_DISTANCE = 125;

export class Game extends Phaser.Scene {
    public inventoryManager!: InventoryManager;
    public GuideScene!: GuideScene;
    private camera!: Phaser.Cameras.Scene2D.Camera;
    public cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    
    // Layers for X-Ray effect
    private abovePlayerLayers: Phaser.Tilemaps.TilemapLayer[] = [];
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
    
    private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];

    public npcPositions = {};

    constructor() {
        super('Game');
    }

    preload() {
        this.load.pack('introduction_murder_case_pack', 'assets/packs/introduction_city_murder_pack.json', 'murder_case_assets');
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
        // this needs to change to real game asset
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

        // Background image layer (from Tiled imagelayer)
        this.createImageLayersFromMap(map);

        const tilesets = [
            map.addTilesetImage('house_sprites', 'house_sprites'),
            map.addTilesetImage('detail_sprites', 'detail_sprites')
        ].filter(t => t !== null) as Phaser.Tilemaps.Tileset[];

        if (tilesets.length === 0) {
            console.error('[Game] No tilesets were created for introduction_murder_case.tmj.');
        }

        const baseLayerNames = ['Details_1'];
        baseLayerNames.forEach((layerName, index) => {
            const layer = map.createLayer(layerName, tilesets, 0, 0);
            if (layer) {
                layer.setDepth(1 + index);
            }
        });

        const collisionLayerNames = ['Collision_layer_1', 'Collision_layer_2', 'Collision_layer_3', 'Houses_layer', 'houses_layer_3', 'houses_layer_4', 'Houses'];
        this.collisionLayers = collisionLayerNames
            .map((layerName) => map.createLayer(layerName, tilesets, 0, 0))
            .filter((layer): layer is Phaser.Tilemaps.TilemapLayer => !!layer);

        this.collisionLayers.forEach((layer) => {
            layer.setCollisionByExclusion([-1]);
            layer.setVisible(false);
        });

        // --- Above Player Layers (X-Ray Effect) ---
        const aboveLayerNames = ['Above_player_1', 'Above_player_2'];
        this.abovePlayerLayers = [];

        aboveLayerNames.forEach((layerName, index) => {
            const solidLayer = map.createLayer(layerName, tilesets, 0, 0);
            if (!solidLayer) {
                return;
            }
            solidLayer.setDepth(11 + index);
            this.abovePlayerLayers.push(solidLayer);

            const fadedLayer = map.createBlankLayer(
                `${layerName}_faded`,
                tilesets,
                0,
                0,
                map.width,
                map.height,
                map.tileWidth,
                map.tileHeight
            );
            if (fadedLayer) {
                this.copyLayerTiles(solidLayer, fadedLayer);
                fadedLayer.setDepth(10 + index);
                fadedLayer.setAlpha(0.5);
            }
        });

        this.roofMaskGraphics = this.make.graphics();
        const roofMask = this.roofMaskGraphics.createGeometryMask();
        roofMask.setInvertAlpha(true); // Invert so drawing a shape creates a hole
        this.abovePlayerLayers.forEach((layer) => layer.setMask(roofMask));
        this.add.rectangle(0, 0, map.widthInPixels, map.heightInPixels, 0x000000, 0.3)
            .setOrigin(0, 0)
            .setDepth(100);

        // --- NPC SPAWNING ---
        const npcSpawnLayer = map.getObjectLayer('Spawnpoints');
        this.npcPositions = npcSpawnLayer ? getNPCPositions(npcSpawnLayer) : {};

        const playerSpawn = npcSpawnLayer?.objects.find(obj => obj.name === 'Player' || obj.name === 'player');
        const startX = playerSpawn?.x ?? 300;
        const startY = playerSpawn?.y ?? 300;

        // --- TRIGGERS ---
        const triggersLayer = map.getObjectLayer('Triggers') ?? map.getObjectLayer('Entrances');
        this.triggers = this.physics.add.staticGroup();
        if (triggersLayer) {
            triggersLayer.objects.forEach((objData) => {
                const width = objData.width ?? 0;
                const height = objData.height ?? 0;
                const x = (objData.x ?? 0) + width * 0.5;
                const y = (objData.y ?? 0) + height * 0.5;
                const trigger = this.add.rectangle(x, y, width, height, undefined, 0);
                this.physics.add.existing(trigger, true);
                const destinationProperty = objData.properties?.find(p => p.name === 'destination');
                const triggerName = objData.name || '';
                const isDoor = triggerName.toLowerCase().includes('entrance') || triggerName.toLowerCase().includes('door');
                trigger.setData('type', isDoor ? 'door' : triggerName);
                trigger.setData('destination', destinationProperty?.value ?? triggerName);
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
        this.collisionLayers.forEach((layer) => this.physics.add.collider(this.player, layer));

        // --- Create NPCs ---
        this.createNPCs(this.npcPositions, this.collisionLayers);

        // --- Create Objects ---
        this.Objects = []; 
        this.createObjects();

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

        // 2. Check if player is under a roof tile
        let isUnderRoof = false;
        for (const layer of this.abovePlayerLayers) {
            const tile = layer.getTileAtWorldXY(this.player.x, this.player.y);
            if (tile && tile.index !== -1) {
                isUnderRoof = true;
                break;
            }
        }

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

    private resolveNpcTextureKey(spawnName: string): string | null {
        const aliases: Record<string, string> = {
            'Cop Whiskers': 'cop2',
            'Cop Grayson': 'greysonSprite',
            'Mouse Jared': 'rockerMouse',
            'Ghost': 'ghostMouse'
        };

        const aliased = aliases[spawnName];
        if (aliased && this.textures.exists(aliased)) {
            return aliased;
        }

        if (this.textures.exists(spawnName)) {
            return spawnName;
        }

        return null;
    }

    private getImageKeyFromTiledImage(imagePath: string): string {
        const normalized = imagePath.replace(/\\/g, '/');
        const fileName = normalized.split('/').pop() ?? normalized;
        return fileName.replace(/\.[^.]+$/, '');
    }

    private createImageLayersFromMap(map: Phaser.Tilemaps.Tilemap): void {
        const images = (map as unknown as { images?: Array<{ name: string; image: string; x: number; y: number; alpha: number; visible: boolean }> }).images;

        if (!images || images.length === 0) {
            if (this.textures.exists('background_terrain')) {
                this.add.image(0, 0, 'background_terrain').setOrigin(0, 0).setDepth(0);
            }
            return;
        }

        images.forEach((imageLayer, index) => {
            const keyFromLayer = this.getImageKeyFromTiledImage(imageLayer.image);
            const key = this.textures.exists(keyFromLayer)
                ? keyFromLayer
                : (this.textures.exists('background_terrain') ? 'background_terrain' : keyFromLayer);

            const img = this.add.image(imageLayer.x ?? 0, imageLayer.y ?? 0, key)
                .setOrigin(0, 0)
                .setDepth(index);

            if (typeof imageLayer.alpha === 'number') {
                img.setAlpha(imageLayer.alpha);
            }
            if (imageLayer.visible === false) {
                img.setVisible(false);
            }
        });
    }

    private bindTilesetImagesByName(map: Phaser.Tilemaps.Tilemap): Phaser.Tilemaps.Tileset[] {
        map.tilesets.forEach((tileset) => {
            const key = tileset.name;
            if (!this.textures.exists(key)) {
                console.warn(`[Game] Tileset texture key "${key}" not found for tileset "${tileset.name}".`);
                return;
            }
            tileset.setImage(this.textures.get(key));
        });

        return map.tilesets;
    }

    private getFirstFrameName(textureKey: string): string | null {
        const frames = this.textures.get(textureKey).getFrameNames();
        return frames.length > 0 ? frames[0] : null;
    }

    private ensureIdleAnimation(textureKey: string, npcId: string, frameName: string): string {
        const safeId = npcId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const animKey = `${textureKey}_idle_${safeId}`;

        if (!this.anims.exists(animKey)) {
            this.anims.create({
                key: animKey,
                frames: [{ key: textureKey, frame: frameName }],
                frameRate: 1,
                repeat: -1
            });
        }

        return animKey;
    }

    private copyLayerTiles(
        source: Phaser.Tilemaps.TilemapLayer,
        target: Phaser.Tilemaps.TilemapLayer
    ): void {
        const data = source.layer.data;
        for (let y = 0; y < data.length; y += 1) {
            const row = data[y];
            for (let x = 0; x < row.length; x += 1) {
                const tile = row[x];
                if (tile && tile.index !== -1) {
                    target.putTileAt(tile.index, x, y);
                }
            }
        }
    }

    private createNPCs(
        npcPositions: Record<string, { x?: number; y?: number }>,
        collisionLayers: Phaser.Tilemaps.TilemapLayer[]
    ): void {
        const created: NPC[] = [];

        Object.entries(npcPositions || {}).forEach(([spawnName, rawPos]) => {
            if (spawnName.toLowerCase() === 'player') return;

            const textureKey = this.resolveNpcTextureKey(spawnName);
            if (!textureKey) return;

            const frameName = this.getFirstFrameName(textureKey);
            if (!frameName) {
                console.warn(`[Game] No frames found for NPC texture "${textureKey}".`);
                return;
            }

            const pos = rawPos || {};
            const x = typeof pos.x === 'number' ? pos.x : 0;
            const y = typeof pos.y === 'number' ? pos.y : 0;

            const idleKey = this.ensureIdleAnimation(textureKey, spawnName, frameName);

            const npcConfig: NPCConfig = {
                npcId: spawnName,
                displayName: spawnName,
                textureKey,
                initialFrame: frameName,
                defaultScale: 1,
                dialogues: [],
                movementType: 'idle',
                speed: 0,
                animations: {
                    atlasKey: textureKey,
                    definitions: [
                        { keyName: idleKey, frameNames: [frameName], frameRate: 1, repeat: -1 }
                    ],
                    idleKey
                }
            };

            const npc = new NPC(this, x, y, npcConfig, [], this.dialogueManager);
            npc.disableInteractive(); // No dialogue interactions in this scene
            created.push(npc);
            this.physics.add.collider(this.player, npc);
            collisionLayers.forEach((layer) => this.physics.add.collider(npc, layer));
        });

        this.npcs = created;
    }

    private createObjects(): void {
        this.Objects = [];
    }
    
    private setupInteractions(): void {
        const npcInteractables = this.npcs.filter((npc) => !!this.dialoguesData?.[npc.npcId]);
        npcInteractables.forEach((npc) => {
            if (!npc.input?.enabled) {
                npc.setInteractive();
            }
        });
        this.interactables = [...npcInteractables, ...this.Objects];
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
