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
import { AllItemConfigs } from '../../data/items/AllItemConfig'; 
import { CallbackHandler } from '../managers/CallBackManager';
import { ItemActionHandler } from './ToturialScene/ItemActionHandler';
import { AllNPCsConfigs } from '../../data/NPCs/AllNPCsConfigs'; 
import { setupAllNPCAnimations, spawnNPCsFromList, NpcSpawnInstruction } from '../../factories/npcFactory'; 
import { ReactionManager } from '../NPCgeneral/toturialScene/ReactionsManager';
import { CaseDirector } from '../../cases/CaseDirector';
import { TutorialCase } from '../../cases/TutorialCase';
import { tutorialCases } from '../../data/cases/tutorialCases';
import { tutorialCallbacks } from './ToturialScene/callbackToturialScene';
import { CaseManager } from '../../data/cases/CaseManager';
// --- NEW IMPORTS ---
import { YarnManager } from '../dialogues/YarnManager';
import { DialogueUI } from '../dialogues/dialogueUI';

const MAX_DIALOGUE_DISTANCE = 70;

export class ToturialScene extends Phaser.Scene {
    // --- PROPERTIES ---
    private yarnManager!: YarnManager;
    private dialogueUI!: DialogueUI; // Shared UI
    
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
    public dialogueManager!: DialogueManager; // Keeping this for other NPCs/Objects

    //NPC Dialogues (Old System)
    private cop2dialogue: any;
    private rockermousedialogue: any;
    private orangeShirtMouse: any;
    private pinkdressMouse: any;

    public itemActionHandler!: ItemActionHandler;
    public caseDirector!: CaseDirector;
    private tutorialArrows: { body: Body, arrow: Phaser.GameObjects.Graphics }[] = [];

    constructor() {
        super({ key: 'ToturialScene' });
    }

    preload() {
        // --- 1. Load Old Dialogues (For other NPCs) ---
        this.load.json("orangeshirt_toturial", "assets/tilemaps/toturial_inside/orangeShirtMouse.json");
        this.load.json("rockerMouse_toturial", "assets/tilemaps/toturial_inside/rockerMouse.json");
        this.load.json("pinkdressMouse_toturial", "assets/tilemaps/toturial_inside/pinkDressGirlMouse.json");
        this.load.json("objects_dialogues_toturial", "assets/tilemaps/toturial_inside/objectsDialogue.json");
        this.load.json("toturial_clues", "assets/tilemaps/toturial_inside/clues.json");

        // --- 2. Load Images, Tilemaps, Atlases ---
        this.load.pack('tutorial_pack', 'assets/packs/toturial_case_packs.json', 'tutorial_assets');

        // --- 3. LOAD YARN FILE (The New System) ---
        // Ensure this path matches where you put the fixed cop2.json!
        this.load.json('cop2_yarn', 'assets/dialogue/yarn/cop2.json');
    }

    create() {
        // 1. Setup Managers & State
        const state = GameState.getInstance(this);
        CaseManager.getInstance().loadScenario(TutorialCase);
        
        state.counters['tutorial_step'] = 0; 
        state.setFlag('tutorial_completed', false);

        // Debugging Flags
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

        // --- SETUP YARN MANAGER (NEW) ---
        // We create a DialogueUI explicitly to pass to YarnManager
        this.dialogueUI = new DialogueUI(this);
        this.yarnManager = new YarnManager(this, this.dialogueUI);
        
        // Load the data into Yarn
        const yarnData = this.cache.json.get('cop2_yarn');
        this.yarnManager.loadDialogue(yarnData);


        // --- SETUP OLD DIALOGUE MANAGER (For Objects/Other NPCs) ---
        const loadDialogue = (key: string, propName: string) => {
            const data = this.cache.json.get(key) || {};
            return Array.isArray(data) ? data : (data[propName] || []);
        };

        this.rockermousedialogue = loadDialogue("rockerMouse_toturial", "rockerMouse");
        this.pinkdressMouse = loadDialogue("pinkdressMouse_toturial", "pinkDressGirlMouse");
        this.orangeShirtMouse = loadDialogue("orangeshirt_toturial", "orangeShirtMouse");
        this.objectData = this.cache.json.get("objects_dialogues_toturial") || {};

        this.dialoguesData = {
            'orangeShirtMouse': this.orangeShirtMouse,
            'pinkDressGirlMouse': this.pinkdressMouse,
            'rockerMouse': this.rockermousedialogue,
            ...this.objectData
        };

        this.callbackHandler = new CallbackHandler(this, this.clueManager, this.inventoryManager, uiManager);
        this.callbackHandler.registerHandlers('tutorial', tutorialCallbacks);
        this.dialogueManager = new DialogueManager(this, this.dialoguesData, this.clueManager, this.inventoryManager, this.callbackHandler);

        // 3. Setup Map & Physics
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
        this.createTutorialArrows();
        this.interactables = [...this.npcs, ...this.Objects];

        // 7. Final Logic Setup
        this.events.on('dialogueOptionCallback', (callbackId: string) => {
            if (this.callbackHandler) this.callbackHandler.handleCallback(callbackId);
        }, this);

        if (!this.sound.get('background_music')) {
            this.sound.play('background_music', { loop: true, volume: 0.2 });
        }


        this.events.on('shutdown', this.onShutdown, this);
        this.caseDirector = new CaseDirector(
            this,
            this.npcs.map(n => ({ 
                npcId: n.npcId, 
                sprite: n, 
                sensoryRange: (n as any).sensoryRange 
            }))
        );
        
        this.setupTutorialEvents();
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
        this.scene.start('Introduction_city_murder');
    }

    update(time: number, delta: number) {
        this.player.update();
        this.npcs.forEach((npc) => npc.update(time, delta));
        
        // Update both managers
        if (this.dialogueManager) this.dialogueManager.update();
        // YarnManager handles updates internally via its UI callbacks

        // Check if ANY dialogue is active to freeze player/camera
        const isYarnActive = (this.yarnManager as any).isRunning; // Accessing private prop (safe if you add a getter in YarnManager)
        const isOldActive = this.dialogueManager && this.dialogueManager.isDialogueActive();

        if ((isYarnActive || isOldActive) && !this.isIntroDialogueActive) {
            // Distance check logic for OLD system (Yarn can have its own if needed)
            if (isOldActive) {
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

        // --- INTERACTION LOGIC ---
        if (
            interactableInRange &&
            this.cursors &&
            Phaser.Input.Keyboard.JustDown(this.cursors.space!)
        ) {
            if (activeInteractable) {
                if (activeInteractable instanceof Body) {
                    activeInteractable.initiateInteraction(this.player);
                } 
                else if (activeInteractable instanceof NPC) {
                    // *** YARN INTEGRATION FOR COP2 ***
                    if (activeInteractable.npcId === 'cop2') {
                        // 1. Tell GameState we are talking to Cop2 (for memory checks)
                        GameState.getInstance().setCurrentNpc('cop2');
                        // 2. Start the Master Node (it handles logic internally)
                        this.yarnManager.startDialogue('Cop2_Start'); 
                    } 
                    else {
                        // All other NPCs use the old system
                        activeInteractable.initiateDialogue();
                    }
                }
            }
        }

        this.tutorialArrows = this.tutorialArrows.filter(item => {
            if (!item.body.active) {
                item.arrow.destroy(); 
                return false; 
            }
            return true; 
        });

        if (!interactableInRange) {
            this.hideInteractionPrompt();
        }
    }

    showInteractionPrompt(target: Interactable | null = null) {
        if (!this.interactionPrompt) {
            let promptText = 'Press [SPACE] to interact';
            if (target) {
                if (target instanceof NPC) {
                    promptText = `Press [SPACE] to talk to ${target.npcId}`; 
                } else if (target instanceof Body) {
                    promptText = `Press [SPACE] to examine ${target.itemId}`; 
                }
            } else if (typeof target === 'string') {
                promptText = target;
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
        collisionLayer: Phaser.Tilemaps.TilemapLayer | null, 
        collisionLayer2: Phaser.Tilemaps.TilemapLayer | null,
        ObjectsclueLayer: Phaser.Types.Tilemaps.ObjectLayer | null
    ): void {
        const gameState = GameState.getInstance();
        const objectSpawnPoints = ObjectsclueLayer ? getNPCPositions(ObjectsclueLayer) : {};

        const itemsToSpawn = [
            { itemId: 'cluePhone', spawnPointName: 'cluePhone' },
            { itemId: 'coke', spawnPointName: 'clueCoke' },
            { itemId: 'clueGlue', spawnPointName: 'glue' },
            { itemId: 'blueCheese', spawnPointName: 'clueCheese' },
        ];

        this.Objects = []; 

        itemsToSpawn.forEach(itemDataToSpawn => {
            if (gameState.collectedItems.has(itemDataToSpawn.itemId)) return; 
            if (!AllItemConfigs[itemDataToSpawn.itemId]) return; 
            
            const spawnPosition = objectSpawnPoints[itemDataToSpawn.spawnPointName];
            if (!spawnPosition) return; 

            const body = new Body(
                this,
                spawnPosition.x,
                spawnPosition.y,
                itemDataToSpawn.itemId,
                this.dialogueManager 
            );

            this.Objects.push(body);
            body.setDepth(5); 

            if (this.player && collisionLayer) this.physics.add.collider(this.player, body);
            if (collisionLayer) this.physics.add.collider(body, collisionLayer);
            if (collisionLayer2) this.physics.add.collider(body, collisionLayer2);
        });

        this.interactables = [...this.npcs, ...this.Objects]; 
    }

    private setupTutorialEvents() {
        // Advance tutorial when a clue is collected
        this.events.on('clueCollected', (clue: Clue) => {
            const gs = GameState.getInstance();
            if (gs.getCounter('tutorial_step') === 1) {
                gs.incrementCounter('tutorial_step'); // Now 2
                this.checkTutorialState();
            }
        });
    }

    private checkTutorialState() {
        const gs = GameState.getInstance();
        const step = gs.getCounter('tutorial_step');
        
        // This is important for Yarn checks to work during the intro!
        gs.setCurrentNpc('cop2'); 

        console.log(`[Tutorial] Checking state: ${step}`);

        switch (step) {
            case 0:
                // STEP 0: INTRO - Force start Yarn Dialogue
                this.isIntroDialogueActive = true;
                this.time.delayedCall(500, () => {
                    // Logic handles the "visited" check, so just run the start node
                    this.yarnManager.startDialogue('Cop2_Start');
                    
                    // Note: Your Yarn file checks if visited("Cop2_Tutorial_Briefing") is false.
                    // If it is false, it plays the briefing.
                    // Once that finishes, the player is free.
                    
                    // Manually advance step after delay or assume player will talk again?
                    // Usually you'd put a command like <<advanceTutorialStep>> in Yarn,
                    // but for now let's just assume once they close the box, they are free.
                    this.isIntroDialogueActive = false;
                    gs.incrementCounter('tutorial_step');
                });
                break;

            case 1:
                this.showInteractionPrompt(null);
                UIManager.getInstance().setJournalHotkeyEnabled(true);
                UIManager.getInstance().showNotification("Objective: Search the room for clues.");
                break;

            case 2:
                UIManager.getInstance().setJournalHotkeyEnabled(true);
                UIManager.getInstance().showNotification("Journal Unlocked! Press 'J'");
                gs.incrementCounter('tutorial_step'); 
                break;
            
            case 3:
                 break;
        }
    }

    private createTutorialArrows() {
        this.tutorialArrows = [];
        this.Objects.forEach((obj) => {
            if (obj.active && obj.isItemCollectible) {
                const arrow = this.add.graphics();
                arrow.fillStyle(0xffff00, 1); 
                arrow.lineStyle(2, 0x000000, 1); 
                
                const w = 16;
                const h = 16;
                arrow.beginPath();
                arrow.moveTo(-w/2, -h); 
                arrow.lineTo(w/2, -h); 
                arrow.lineTo(0, 0); 
                arrow.closePath();
                arrow.fillPath();
                arrow.strokePath();

                arrow.x = obj.x;
                arrow.y = obj.y - 40;
                arrow.setDepth(20); 

                this.tweens.add({
                    targets: arrow,
                    y: arrow.y - 10,
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.tutorialArrows.push({ body: obj, arrow: arrow });
            }
        });
    }
    
    private onShutdown() {
        this.events.off('dialogueEnded_cop2');
        this.events.off('clueCollected');
        this.input.keyboard.removeAllListeners();
    }
}