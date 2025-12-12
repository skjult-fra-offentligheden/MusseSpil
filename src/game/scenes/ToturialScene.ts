import Phaser from 'phaser';
import { Player } from '../classes/player';
import { NPC } from '../NPCgeneral/npc';
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
import { AllItemConfigs } from '../../data/items/AllItemConfig'; // Adjust path
import { ItemConfig, PhaseArt } from '../../data/items/itemTemplate';
import { CallbackHandler } from '../managers/CallBackManager';
import { ItemActionHandler, ItemUsedEventPayload } from './ToturialScene/ItemActionHandler';
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs'; // Assuming path to your new AllNPCConfigs
import { NPCConfig } from '../../data/NPCs/npcTemplate';  // Assuming path to your new RichNPCConfig interface
import { setupAllNPCAnimations, spawnNPCsFromList, NpcSpawnInstruction } from '../../factories/npcFactory'; // Or wherever you put animation setup
import { ReactionManager } from '../NPCgeneral/toturialScene/ReactionsManager';
import { CaseDirector } from '../../cases/CaseDirector';
import { TutorialCase } from '../../cases/TutorialCase';
import { tutorialCases } from '../../data/cases/tutorialCases';
import { GlobalEvents } from '../../factories/globalEventEmitter';
import { tutorialCallbacks } from './ToturialScene/callbackToturialScene';

const MAX_DIALOGUE_DISTANCE = 70; // SUPER IMPORTANT

export class ToturialScene extends Phaser.Scene {
    private camera!: Phaser.Cameras.Scene2D.Camera;
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
    private inventoryManager!: InventoryManager; 
    private isIntroDialogueActive: boolean = false;
    public callbackHandler!: CallbackHandler; 
    public dialogueManager!: DialogueManager;

    //NPC Dialogues
    private cop2dialogue: any;
    private rockermousedialogue: any;
    private orangeShirtMouse: any;
    private pinkdressMouse: any;

    public itemActionHandler!: ItemActionHandler;

    //Case
    public caseDirector!: CaseDirector;

    constructor() {
        super({ key: 'ToturialScene' });
    }

    preload() {
        //dialog skal loades ind her
        this.load.json("cop2_toturial", "assets/tilemaps/toturial_inside/cop2.json");
        this.load.json("orangeshirt_toturial", "assets/tilemaps/toturial_inside/orangeShirtMouse.json");
        this.load.json("rockerMouse_toturial", "assets/tilemaps/toturial_inside/rockerMouse.json");
        this.load.json("pinkdressMouse_toturial", "assets/tilemaps/toturial_inside/pinkDressGirlMouse.json");
        this.load.json("objects_dialogues_toturial", "assets/tilemaps/toturial_inside/objectsDialogue.json");
        this.load.json("toturial_clues", "assets/tilemaps/toturial_inside/clues.json");

        // --- 2. Load Images & Tilemaps ---
        console.log("[ToturialScene Preload] Loading NPC portraits...");
        this.load.image('portrait_cop2', 'assets/npc/cop2Sprite/neutral_portrait_officer_whiskers.png');
        this.load.image('portrait_rockermouse', 'assets/npc/rockerMouse/Neutral_rockermouse_portrait.png');
        this.load.image('portrait_orangeshirt', 'assets/npc/orangeShirtMouse/Neutralorangeshirtmouseportrait.png');
        this.load.image('portrait_pinkdress', 'assets/npc/pinkDressGirlMouse/Neutralpinkdressgirlmouse.png');
        this.load.image('portrait_unknown', 'assets/npc/cop2Sprite/neutral_portrait_officer_whiskers.png');
        
        // Tilemap assets
        this.load.tilemapTiledJSON('policeinside', 'assets/tilemaps/toturial_inside/policeroom.tmj');
        this.load.image('background_toturial', 'assets/tilemaps/toturial_inside/background.png');
        this.load.image('big_furniture', 'assets/tilemaps/toturial_inside/big_furniture.png');
        this.load.image('objects_decoration', 'assets/tilemaps/toturial_inside/objects_decoration.png');

        // NPC Atlases
        this.load.atlas("cop2", "assets/npc/cop2Sprite/cop2sprite.png", "assets/npc/cop2Sprite/cop2sprite.json");
        this.load.atlas("orangeShirtMouse", "assets/npc/orangeShirtMouse/orangeShirtMouse.png", "assets/npc/orangeShirtMouse/orangeShirtMouse.json");
        this.load.atlas("rockerMouse", "assets/npc/rockerMouse/rockerMouse.png", "assets/npc/rockerMouse/rockerMouse.json");
        this.load.atlas("pinkDressGirlMouse", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.png", "assets/npc/pinkDressGirlMouse/pinkDressGirlMouse.json");
        console.log("[ToturialScene Preload] Loading item assets from AllItemConfigs...");
        Object.values(AllItemConfigs).forEach((itemConfig: ItemConfig) => {
             // (Keep your existing item loading logic here...)
             if (itemConfig.art && itemConfig.art.large) {
                if (typeof itemConfig.art.large === 'string') {
                    this.load.image(itemConfig.art.large, itemConfig.art.large);
                } else {
                    const phaseArt = itemConfig.art.large as PhaseArt;
                    this.load.image(phaseArt.full, phaseArt.full);
                    this.load.image(phaseArt.half, phaseArt.half);
                    this.load.image(phaseArt.empty, phaseArt.empty);
                }
            }
            if (itemConfig.art && itemConfig.art.small) {
                if (typeof itemConfig.art.small === 'string') {
                    this.load.image(itemConfig.art.small, itemConfig.art.small);
                } else { 
                    const phaseArt = itemConfig.art.small as PhaseArt;
                    this.load.image(phaseArt.full, phaseArt.full);
                    this.load.image(phaseArt.half, phaseArt.half);
                    this.load.image(phaseArt.empty, phaseArt.empty);
                }
            }
        });
        
        this.load.image('fallback_missing_item_texture', 'assets/tilemaps/toturial_inside/cheese_32x32.png');
    
    }

create() {
        // 1. Setup Managers & State
        const state = GameState.getInstance(this);
        
        // --- LOGIC: ALWAYS RESTART TUTORIAL ---
        state.counters['tutorial_step'] = 0; 
        state.setFlag('tutorial_completed', false);
        // --------------------------------------

        {
            const gs = GameState.getInstance();
            const _setFlag = gs.setFlag.bind(gs);
            gs.setFlag = (id: string, value: any) => {
                if (id === 'cokeDepleted' || id === 'cheeseDepleted') {
                    console.trace(`[TRACE setFlag] ${id} := ${value}`);
                }
                return _setFlag(id, value);
            };
        }

        // Determine Culprit
        const firstActive = Object.entries(tutorialCases.cases).find(([id, c]: any) => c && (c as any).active);
        if (firstActive && (firstActive[1] as any).culpritNpcId) {
            const npcId = (firstActive[1] as any).culpritNpcId as string;
            state.culpritId = npcId;
            const cfg: any = (AllNPCsConfigs as any)[npcId];
            state.culpritDetails = cfg?.culpritDetails ?? state.culpritDetails;
        } else {
            state.determineCulprit(AllNPCsConfigs);
        }

        // Clues & Inventory
        this.clueData = this.cache.json.get('toturial_clues') || {};
        this.clueManager = new ClueManager(this.clueData, state, this);
        this.registry.set('clueManager', this.clueManager);
        
        const uiManager = UIManager.getInstance();
        uiManager.setScene(this, "ToturialScene");
        uiManager.setClueManager(this.clueManager);
        uiManager.setJournalHotkeyEnabled(false); 

        this.inventoryManager = InventoryManager.getInstance();
        this.inventoryManager.setScene(this);
        this.itemActionHandler = new ItemActionHandler(this);

        if (!this.scene.isActive('UIGameScene')) {
            this.scene.launch('UIGameScene');
        }

        // --- 2. LOAD & UNWRAP DIALOGUE DATA (THE FIX) ---
        const loadDialogue = (key: string, propName: string) => {
            const data = this.cache.json.get(key) || {};
            // If the JSON is { "cop2": [...] }, we want the array inside.
            return Array.isArray(data) ? data : (data[propName] || []);
        };

        this.cop2dialogue = loadDialogue("cop2_toturial", "cop2");
        this.rockermousedialogue = loadDialogue("rockerMouse_toturial", "rockerMouse");
        this.pinkdressMouse = loadDialogue("pinkdressMouse_toturial", "pinkDressGirlMouse");
        this.orangeShirtMouse = loadDialogue("orangeshirt_toturial", "orangeShirtMouse");
        this.objectData = this.cache.json.get("objects_dialogues_toturial") || {};

        // (We removed the manual dialogue injection because cop2.json now has the data)
        const introNode = this.cop2dialogue.find((node: any) => node.id === 'cop2_tutorial_briefing');
        if (introNode) {
            // We overwrite the options to include the Skip button.
            // Note: We intentionally don't set 'nextDialogueId' so the options menu appears.
            introNode.options = [
                {
                    id: "opt_start",
                    text: "I'm on it. What's the situation?",
                    nextDialogueId: "cop2_tutorial_briefing_2" // Continue normal flow
                },
                {
                    id: "opt_skip",
                    text: "[Skip Tutorial] I know the drill.",
                    callbackId: "tutorial/skip_tutorial" // Trigger skip callback
                }
            ];
            // Clear the nextDialogueId so the manager stops to show options
            introNode.nextDialogueId = undefined; 
        }
        // Combine into one map for the Manager
        this.dialoguesData = {
            'orangeShirtMouse': this.orangeShirtMouse,
            'pinkDressGirlMouse': this.pinkdressMouse,
            'cop2': this.cop2dialogue,
            'rockerMouse': this.rockermousedialogue,
            ...this.objectData
        };

        // Initialize Callbacks & Dialogue Manager
        this.callbackHandler = new CallbackHandler(
            this,
            this.clueManager,
            this.inventoryManager,
            uiManager
        );
        this.callbackHandler.registerHandlers('tutorial', tutorialCallbacks);
        this.dialogueManager = new DialogueManager(this, this.dialoguesData, this.clueManager, this.inventoryManager, this.callbackHandler);

        // 3. Setup Map & Physics (The "World")
        const map = this.make.tilemap({ key: 'policeinside' });
        const backgroundTileset = map.addTilesetImage('background_toturial', 'background_toturial');
        const bigFurnitureTileset = map.addTilesetImage('big_furniture', 'big_furniture');
        const objectsDecorationTileset = map.addTilesetImage('objects_decoration', 'objects_decoration');

        const mapLayers = [backgroundTileset!, bigFurnitureTileset!, objectsDecorationTileset!];

        map.createLayer('Below Player', mapLayers, 0, 0);
        map.createLayer('Below Player 2', mapLayers, 0, 0);
        const collisionLayer2 = map.createLayer('CollisionLayer', mapLayers, 0, 0);
        const collisionLayer = map.createLayer('World', mapLayers, 0, 0);
        
        collisionLayer2?.setCollisionByExclusion([-1]);
        collisionLayer?.setCollisionByExclusion([-1]);

        // 4. Spawn NPCs
        const npcSpawnLayer = map.getObjectLayer('NPCspawnpoints');
        const npcPositions = getNPCPositions(npcSpawnLayer!);
        const npcSpawnInstructions: NpcSpawnInstruction[] = [
            { npcId: "cop2", x: npcPositions['cop2']?.x || 100, y: npcPositions['cop2']?.y || 100 },
            { npcId: "orangeShirtMouse", x: npcPositions['orangeShirtMouse']?.x || 150, y: npcPositions['orangeShirtMouse']?.y || 150 },
            { npcId: "rockerMouse", x: npcPositions['rockerMouse']?.x || 200, y: npcPositions['rockerMouse']?.y || 200 },
            { npcId: "pinkDressGirlMouse", x: npcPositions['pinkDressGirlMouse']?.x || 250, y: npcPositions['pinkDressGirlMouse']?.y || 250 }
        ];

        const npcMapCollisionLayers = [collisionLayer!, collisionLayer2!].filter(Boolean) as Phaser.Tilemaps.TilemapLayer[];
        this.npcs = spawnNPCsFromList(this, npcSpawnInstructions, this.dialogueManager, npcMapCollisionLayers) || [];
        
        state.npcIdleFrames = Object.values(AllNPCsConfigs).map(config => ({
            id: config.npcId,
            textureKey: config.textureKey,
            idleFrame: config.initialFrame || config.animations?.definitions?.find(def => def.keyName === config.animations?.idleKey)?.frameNames[0] || 'default_frame_if_all_else_fails'
        }));

        ReactionManager.getInstance().init(this, this.npcs.map(n => ({ id: n.npcId, sprite: n })));
        setupAllNPCAnimations(this); 

        // 5. Setup Player & Camera
        const triggersLayer = map.getObjectLayer('Triggers');
        const door = triggersLayer?.objects.find((obj) => obj.name === 'Door');
        this.triggers = this.physics.add.staticGroup();

        if (door) {
            this.exitX = door.x! + (door.width! / 2);
            this.exitY = door.y! + (door.height! / 2);
        }

        this.player = new Player(this, this.exitX, this.exitY - 50, "Detective Mouse");
        this.registry.set('player', this.player);
        this.player.setAlpha(1);
        this.player.setDepth(5);
        this.add.existing(this.player);
        this.cursors = this.input.keyboard.createCursorKeys();

        if (door) this.setupExit(this.exitX, this.exitY, door.width!, door.height!);
        if (this.npcs.length > 0) this.physics.add.collider(this.player, this.npcs);

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor('#000000');
        this.camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.camera.startFollow(this.player);
        this.physics.add.collider(this.player, collisionLayer!);
        this.physics.add.collider(this.player, collisionLayer2!);

        // 6. Setup Objects (Bodies/Clues)
        const Objectsclue = map.getObjectLayer('ObjectCluesSpawnpoints');
        this.createObjects(collisionLayer!, collisionLayer!, Objectsclue);
        this.interactables = [...this.npcs, ...this.Objects];

        // 7. Final Logic Setup
        this.events.on('dialogueOptionCallback', (callbackId: string) => {
            if (this.callbackHandler) this.callbackHandler.handleCallback(callbackId);
        }, this);

        this.caseDirector = new CaseDirector(
            this,
            TutorialCase,
            this.npcs.map(n => ({ npcId: n.npcId, sprite: n, sensoryRange: (n as any).sensoryRange }))
        );

        this.events.on('shutdown', this.onShutdown, this);
        
        this.setupTutorialEvents();
        
        // This will now trigger the intro (because step is 0)
        // And DialogueManager will find the node because we fixed the data structure!
        this.checkTutorialState(); 
        
        this.scene.launch('UIGameScene');
        this.scene.bringToTop('UIGameScene');
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

private setupTutorialEvents() {
        // Advance tutorial when specific dialogues end
        this.events.on('dialogueEnded_cop2', () => {
             const gs = GameState.getInstance();
             const step = gs.getCounter('tutorial_step');
             this.isIntroDialogueActive = false;
             // If we just finished the intro (step 0), move to step 1
             if (step === 0) {
                 gs.incrementCounter('tutorial_step'); // Now 1
                 this.checkTutorialState();
             }
        });

        // Advance tutorial when a clue is collected
        this.events.on('clueCollected', (clue: Clue) => {
            const gs = GameState.getInstance();
            // If we are looking for evidence (Step 1) and find the phone or coke
            if (gs.getCounter('tutorial_step') === 1) {
                gs.incrementCounter('tutorial_step'); // Now 2
                this.checkTutorialState();
            }
        });
    }

    private checkTutorialState() {
        const gs = GameState.getInstance();
        const step = gs.getCounter('tutorial_step');
        const chiefWhiskers = this.npcs.find(n => n.npcId === 'cop2');

        console.log(`[Tutorial] Checking state: ${step}`);

        switch (step) {
            case 0:
                // STEP 0: INTRO
                // Force start the briefing dialogue immediately
                if (chiefWhiskers) {
                    this.isIntroDialogueActive = true;
                    // Slight delay to let the scene fade in
                    this.time.delayedCall(500, () => {
                        this.dialogueManager.startDialogue('cop2', 'cop2_tutorial_briefing', chiefWhiskers);
                    });
                }
                break;

            case 1:
                // STEP 1: INVESTIGATION
                // Player has control. Show a hint?
                this.showInteractionPrompt(null); // Clear prompt
                UIManager.getInstance().setJournalHotkeyEnabled(true);
                UIManager.getInstance().showNotification("Objective: Search the room for clues.");
                break;

            case 2:
                // STEP 2: EVIDENCE FOUND
                // Unlock the Journal
                UIManager.getInstance().setJournalHotkeyEnabled(true);
                
                UIManager.getInstance().showNotification("Journal Unlocked! Press 'J'");
                
                // Force Cop to talk again about the evidence
                if (chiefWhiskers) {
                    this.time.delayedCall(1000, () => {
                         this.dialogueManager.startDialogue('cop2', 'cop2_evidence_reaction', chiefWhiskers);
                    });
                }
                // Advance step automatically so we don't loop this logic
                gs.incrementCounter('tutorial_step'); 
                break;
            
            case 3:
                 // Free roam / End of scripted tutorial
                 break;
        }
    }
    
    private onShutdown() {
        this.events.off('dialogueEnded_cop2');
        this.events.off('clueCollected');
        this.input.keyboard.removeAllListeners();
    }
}
