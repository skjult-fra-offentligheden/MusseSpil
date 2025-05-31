import Phaser from 'phaser'; // Import Phaser to use Scene and Registry
import { ClueManager } from "../clueScripts/clueManager"; // Adjust path if necessary
import { Suspect } from "../Accusation_scripts/suspect"; //
import { EvidencePhase } from "../scenes/ToturialScene/evidenceArt"
import { AllItemConfigs } from "../../data/items/AllItemConfig"
export interface ClueRuntimeState {
    phase: EvidencePhase | 'fixed';
    usesLeft?: number;          // if you need exact counts
}

export interface ClueRuntimeState {
    phase: EvidencePhase | 'fixed'; // EvidencePhase is 'full' | 'half' | 'empty'
    usesLeft?: number;
}

export class GameState {
    private static instance: GameState;
    private scene: Phaser.Scene | null = null; // Store scene reference to access registry

    // --- Your existing GameState properties ---
    public globalFlags: { [key: string]: boolean } = {};
    public collectedItems: Set<string> = new Set();
    public suspectsData: any = {}; // Initialize if needed
    public npcIdleFrames: any[] = []; // Initialize if needed
    public clueState: Record<string, ClueRuntimeState> = {};
    private eventsAddressed: Set<string> = new Set();


    // Make constructor private for Singleton
    // Remove the direct ClueManager instantiation
    private constructor(scene: Phaser.Scene) { // Accept scene on creation
        this.scene = scene;
        console.log("GameState Singleton instance created.");
        console.log("GameState Singleton instance created.");
        // --- REMOVED THIS LINE ---
        // this.clueManager = ClueManager.getInstance();
    }

    // Method to get the singleton instance, passing the scene the FIRST time
    public static getInstance(scene?: Phaser.Scene): GameState {
        if (!GameState.instance) {
            if (!scene) {
                // Throw error or handle - scene is needed initially to access registry later
                throw new Error("GameState requires a Phaser.Scene instance on first call to getInstance.");
            }
            GameState.instance = new GameState(scene);
        }
        if (scene && GameState.instance.scene !== scene) {
            console.log("GameState updating scene reference.");
            GameState.instance.scene = scene;
        }
        
        return GameState.instance;
    }

    private degradePhasedItem(itemId: string, sizeToUpdate: 'small' | 'large'): boolean {
        const gameState = GameState.getInstance(); // Assuming scene is already set for GameState
        const itemConfig = AllItemConfigs[itemId];

        if (!itemConfig || !itemConfig.art || typeof itemConfig.art[sizeToUpdate] === 'string') {
            console.warn(`[InventoryManager] Item ${itemId} is not phased or has no art config for degradation.`);
            return false;
        }

        // Get the current state (this also initializes it if it doesn't exist)
        const clueRuntimeState = gameState.getOrInitClueState(itemId);
        const oldPhase = clueRuntimeState.phase;

        // Use your existing GameState.degradeClue() method
        const newPhase = gameState.degradeClue(itemId); // This method handles the 'full' -> 'half' -> 'empty' logic

        if (newPhase === oldPhase) {
            // Degradation didn't happen (e.g., item was already 'empty' or 'fixed')
            if (oldPhase === 'empty') {
                console.log(`[InventoryManager] Item ${itemId} is already empty.`);
            } else if (oldPhase === 'fixed') {
                console.log(`[InventoryManager] Item ${itemId} is 'fixed', cannot degrade.`);
            }
            return false; // No change occurred
        }

        console.log(`[InventoryManager] Item ${itemId} phase updated from ${oldPhase} to ${newPhase}.`);

        // Update the iconKey of the Item object stored in this.items
        const inventoryItemInstance = this.items.get(itemId);
        if (inventoryItemInstance && itemConfig.art) {
            // We know artForSize is PhaseArt because of the earlier check
            const artSet = itemConfig.art[sizeToUpdate] as PhaseArt;
            // newPhase is 'full' | 'half' | 'empty' | 'fixed'. PhaseArt keys are 'full', 'half', 'empty'.
            // If newPhase is 'fixed', we should probably use 'full' art.
            const phaseKeyForArt = (newPhase === 'fixed' ? 'full' : newPhase) as keyof PhaseArt;

            if (artSet && artSet[phaseKeyForArt]) {
                inventoryItemInstance.iconKey = artSet[phaseKeyForArt];
                console.log(`[InventoryManager] Updated inventory item instance iconKey for ${itemId} to: ${inventoryItemInstance.iconKey}`);
            } else {
                console.warn(`[InventoryManager] Could not find art for phase ${phaseKeyForArt} for item ${itemId}.`);
            }
        }
        return true; // Degradation occurred
    }

    // --- Method to GET the ClueManager WHEN NEEDED ---
    public getClueManager(): ClueManager | undefined {
        // Check if scene reference exists and registry is available
        if (!this.scene || !this.scene.registry) {
            console.error("GameState cannot access registry (Scene reference missing or invalid).");
            // Attempt to get the scene from the game manager as a fallback? Risky.
            // const game = Phaser.Game // How to get game instance here? Dependency injection might be needed.
            return undefined;
        }
        // Retrieve from the registry attached to the scene
        const manager = this.scene.registry.get('clueManager') as ClueManager;
        if (!manager) {
            console.error("ClueManager not found in registry when requested by GameState.");
            // This indicates the ClueManager wasn't created and stored correctly after preload
        }
        return manager;
    }

    public setSuspectsData(data: { [key: string]: Suspect }) {
        this.suspectsData = data;
        console.log("GameState: Suspects data set:", this.suspectsData);
    }

    public getSuspectsData(): { [key: string]: Suspect } {
        return this.suspectsData;
    }

    public getSuspect(key: string): Suspect | undefined {
        return this.suspectsData[key];
    }

    // --- Add other methods to manage game state ---
    public setFlag(key: string, value: boolean) {
        this.globalFlags[key] = value;
    }

    public getFlag(key: string): boolean {
        return !!this.globalFlags[key]; // Return false if undefined
    }

    public addItem(itemId: string) {
        this.collectedItems.add(itemId);
        console.log(`GameState: Item added - ${itemId}. Collection:`, this.collectedItems);
    }

    public hasItem(itemId: string): boolean {
        return this.collectedItems.has(itemId);
    }

    // Optional: Reset method if needed for starting a new game
    public static resetInstance(scene: Phaser.Scene) {
        console.log("Resetting GameState instance.");
        GameState.instance = new GameState(scene);
    }

    public getOrInitClueState(clueId: string): ClueRuntimeState {
        if (!this.clueState[clueId]) {
            this.clueState[clueId] = { phase: 'full' }; // Default to 'full'
        }
        return this.clueState[clueId];
    }

    public degradeClue(clueId: string): EvidencePhase | 'fixed' {
        const s = this.getOrInitClueState(clueId); // s is ClueRuntimeState

        if (s.phase === 'fixed' || s.phase === 'empty') return s.phase; // No change

        // This is the core logic:
        s.phase = s.phase === 'full' ? 'half' : 'empty'; // If 'full' -> 'half', else (must be 'half') -> 'empty'
        return s.phase;
    }

    public markEventAsAddressed(eventName: string): void {
        this.eventsAddressed.add(eventName);
        console.log(`[GameState] Event marked as addressed: ${eventName}. Current addressed:`, Array.from(this.eventsAddressed));
    }

    public hasEventBeenAddressed(eventName: string): boolean {
        const isAddressed = this.eventsAddressed.has(eventName);
        // console.log(`[GameState] Checking if event '${eventName}' has been addressed: ${isAddressed}`); // Optional: for debugging
        return isAddressed;
    }

    public resetEventsAddressed(): void { // Useful if you need to reset for a new game or scene
        this.eventsAddressed.clear();
        console.log("[GameState] eventsAddressed has been reset.");
    }
}