import { CaseSceneConfig } from '../../cases/CaseTypes';

export class CaseManager {
    private static instance: CaseManager;
    
    // The currently active scenario rules (e.g., Tutorial OR Murder)
    private activeScenario: CaseSceneConfig | null = null;

    private constructor() {}

    public static getInstance(): CaseManager {
        if (!CaseManager.instance) {
            CaseManager.instance = new CaseManager();
        }
        return CaseManager.instance;
    }

    /**
     * Call this in your Briefing Scene to switch the ENTIRE game context.
     * It wipes the old rules and installs the new ones.
     */
    public loadScenario(config: CaseSceneConfig) {
        console.log(`[CaseManager] 🔄 Switching Scenario to: ${config.id}`);
        this.activeScenario = config; 
    }

    /**
     * Used by CaseDirector to get the current rules.
     */
    public getActiveConfig(): CaseSceneConfig | null {
        return this.activeScenario;
    }

    /**
     * Optional: Helper to check if a specific crime ID is currently tracked
     */
    public isCrimeTracked(crimeId: string): boolean {
        return this.activeScenario?.crimes.some(c => c.id === crimeId) ?? false;
    }
}