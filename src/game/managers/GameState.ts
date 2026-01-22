import Phaser from 'phaser'; // Import Phaser to use Scene and Registry
import { ClueManager } from "../clueScripts/clueManager"; // Adjust path if necessary
import { Suspect } from "../Accusation_scripts/suspect"; //
import { EvidencePhase } from "../scenes/ToturialScene/evidenceArt"
import { AllItemConfigs } from "../../data/items/AllItemConfig"

export interface ClueRuntimeState {
    phase: EvidencePhase | 'fixed';
    usesLeft?: number;          // if you need exact counts
}

export type BoardNodePosition = { x: number; y: number };
export type BoardConnectionData = { fromId: string; toId: string };

export class GameState {
    private static instance: GameState;
    private scene: Phaser.Scene | null = null; // Store scene reference to access registry
    public discoveredClues: Set<string> = new Set();
    // --- Your existing GameState properties ---
    public globalFlags: { [key: string]: boolean } = {};
    public collectedItems: Set<string> = new Set();
    public suspectsData: any = {}; // Initialize if needed
    public npcIdleFrames: any[] = []; // Initialize if needed
    public clueState: Record<string, ClueRuntimeState> = {};
    private eventsAddressed: Set<string> = new Set();

    public boardNodePositions: { [caseId: string]: { [nodeId: string]: BoardNodePosition } } = {};

    // Vi gemmer et array af connections per Case ID
    public boardConnections: { [caseId: string]: BoardConnectionData[] } = {};

    public culpritId: string | null = null;
    public culpritDetails: any | null = null;
    // Make constructor private for Singleton
    // Remove the direct ClueManager instantiation
    private constructor(scene: Phaser.Scene) { // Accept scene on creation
        this.scene = scene;
        console.log("GameState Singleton instance created.");
        console.log("GameState Singleton instance created.");
        // --- REMOVED THIS LINE ---
        // this.clueManager = ClueManager.getInstance();

        // Attempt to load previous state
        this.load();
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
        this.save();
    }

    public getFlag(key: string): boolean {
        return !!this.globalFlags[key]; // Return false if undefined
    }

    public addItem(itemId: string) {
        this.collectedItems.add(itemId);
        console.log(`GameState: Item added - ${itemId}. Collection:`, this.collectedItems);
        this.save();
    }

    public hasItem(itemId: string): boolean {
        return this.collectedItems.has(itemId);
    }

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
        this.save();
        return s.phase;
    }

    public markEventAsAddressed(eventName: string): void {
        this.eventsAddressed.add(eventName);
        console.log(`[GameState] Event marked as addressed: ${eventName}. Current addressed:`, Array.from(this.eventsAddressed));
    }

    public hasEventBeenAddressed(eventName: string): boolean {
        const isAddressed = this.eventsAddressed.has(eventName);
        console.log(`[GameState] Checking if event '${eventName}' has been addressed: ${isAddressed}`); // Optional: for debugging
        return isAddressed;
    }

    public resetEventsAddressed(): void { // Useful if you need to reset for a new game or scene
        this.eventsAddressed.clear();
        console.log("[GameState] eventsAddressed has been reset.");
    }

    public markClueAsDiscovered(clueId: string): void {
        this.discoveredClues.add(clueId);
        console.log(`[GameState] Clue discovered and persisted: ${clueId}`);
        this.save();
    }

    public isClueDiscovered(clueId: string): boolean {
        return this.discoveredClues.has(clueId);
    }

    public determineCulprit(allNpcConfigs: { [key: string]: NPCConfig }): void {
        const configs = Object.values(allNpcConfigs);
        for (const config of configs) {
            if (config.culpritDetails) {
                this.culpritId = config.npcId;
                this.culpritDetails = config.culpritDetails;
                console.log(`[GameState] The culprit has been determined: ${this.culpritId}`);
                return; // Stop after finding the first one
            }
        }
        console.warn("[GameState] No culprit was defined in any NPC configuration!");
    }

    public counters: Record<string, number> = {};

    public getCounter(id: string): number {
        return this.counters[id] ?? 0;
    }

    public incrementCounter(id: string, by: number = 1): number {
        const v = (this.counters[id] ?? 0) + by;
        this.counters[id] = v;
        this.save();
        return v;
    }

    public setCounter(id: string, value: number): number {
        this.counters[id] = value;
        this.save();
        return value;
    }

    // ---- Persistence ----
    private storageKey = 'GameStateV1';

    public save() {
        try {
            const payload = {
                globalFlags: this.globalFlags,
                collectedItems: Array.from(this.collectedItems),
                discoveredClues: Array.from(this.discoveredClues),
                clueState: this.clueState,
                counters: this.counters,
                culpritId: this.culpritId,
                culpritDetails: this.culpritDetails,
                // --- ADD THESE TO THE PAYLOAD ---
                boardNodePositions: this.boardNodePositions,
                boardConnections: this.boardConnections
            };
            window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
        } catch (e) {
            console.warn('[GameState] save failed:', e);
        }
    }

    public load() {
        try {
            const raw = window.localStorage.getItem(this.storageKey);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.globalFlags) this.globalFlags = data.globalFlags;
            if (Array.isArray(data.collectedItems)) this.collectedItems = new Set<string>(data.collectedItems);
            if (Array.isArray(data.discoveredClues)) this.discoveredClues = new Set<string>(data.discoveredClues);
            if (data.clueState) this.clueState = data.clueState;
            if (data.counters) this.counters = data.counters;
            this.culpritId = data.culpritId ?? null;
            this.culpritDetails = data.culpritDetails ?? null;
            
            // --- ADD THESE TO LOAD THE DATA ---
            if (data.boardNodePositions) this.boardNodePositions = data.boardNodePositions;
            if (Array.isArray(data.boardConnections)) this.boardConnections = data.boardConnections;

        } catch (e) {
            console.warn('[GameState] load failed:', e);
        }
    }
}
