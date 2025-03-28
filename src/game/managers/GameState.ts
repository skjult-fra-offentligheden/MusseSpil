export class GameState {
    private static instance: GameState;
    public globalFlags: { [key: string]: boolean } = {};

    public collectedItems: Set<string> = new Set();
    public suspectsData: any;
    public clueManager: ClueManager;
    public npcIdleFrames: any;


    private constructor() { }

    public static getInstance(): GameState {
        if (!GameState.instance) {
            GameState.instance = new GameState();
        }
        return GameState.instance;
    }
}