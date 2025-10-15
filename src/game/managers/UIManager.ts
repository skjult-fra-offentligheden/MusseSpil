import { GameState } from '../managers/GameState';
import { InventoryManager } from '../managers/itemMananger';
import { ClueManager } from '../clueScripts/clueManager';
export class UIManager {
    private static instance: UIManager;
    private currentScene: Phaser.Scene | null = null;
    private originScene: string;
    private clueManager: ClueManager | null = null;
    private journalHotkeyEnabled = true;
    private constructor() { }

    init(data: { originScene: string }) {
        this.originScene = data.originScene;
    }

    public static getInstance(): UIManager {
        if (!UIManager.instance) {
            console.log('UIManager instance created.');
            UIManager.instance = new UIManager();
        }
        return UIManager.instance;
    }

    public setClueManager(manager: ClueManager) {
        this.clueManager = manager;
    }

    public setScene(scene: Phaser.Scene, originSceneKey: string) {
        if (!scene) {
            console.error('Attempting to set a null or undefined scene in UIManager.');
            return;
        }
        this.currentScene = scene;
        this.originScene = originSceneKey;

        console.log(`Current scene set to: ${scene.scene.key} and origin is ${this.originScene}`);
    }

    public showInventory() {
        if (!this.currentScene) {
            console.error('No active scene to manage UI.');
            return;
        }
        if (!this.currentScene.scene.get('InventoryScene')) {
            console.error('InventoryScene does not exist.');
            return;
        }
        if (this.currentScene.scene.isActive('InventoryScene')) {
            console.log('iventory scene is already active, not launching again.');
            return;
        }

        const manager = InventoryManager.getInstance()
        console.info("printing some fuckingbullshit here, im in uimanager " + this.originScene);
        this.currentScene.scene.pause();
        this.currentScene.scene.launch('InventoryScene', { inventoryManager: manager, originScene: this.originScene });
        this.currentScene.scene.bringToTop('InventoryScene');
    }

    public showGuide() {
        if (!this.currentScene) {
            console.error('No current scene set in UIManager.');
            return;
        }
        if (this.currentScene.scene.isActive('Guide')) {
            console.log('Guide scene is already active, not launching again.');
            return;
        }
        console.log("launching game guide")
        this.currentScene.scene.pause();
        this.currentScene.scene.launch('Guide', {originScene: this.originScene });
        this.currentScene.scene.bringToTop('Guide');
    }

    public showJournal() {
        // --- Keep all these initial checks ---
        if (!this.journalHotkeyEnabled) {
            return;
        }
        if (!this.currentScene) {
            console.error('No current scene set in UIManager.');
            return;
        }
        if (!this.clueManager) {
            console.error('ClueManager is not available.');
            return;
        }
        // Prevent opening if it's already open
        if (this.currentScene.scene.isActive('CaseSelectionScene') || this.currentScene.scene.isActive('CaseDetailsScene')) {
            return;
        }

        console.log('UIManager: Launching CaseSelectionScene...');

        // --- This is the core logic ---

        // 1. Pause the main game scene (e.g., ToturialScene)
        this.currentScene.scene.pause(this.originScene);

        // 2. If the UI overlay is active, put it to sleep
        if (this.currentScene.scene.isActive('UIGameScene')) {
            this.currentScene.scene.sleep('UIGameScene');
        }
        
        // 3. Launch the new case selection menu
        this.currentScene.scene.launch('CaseSelectionScene', { 
            originScene: this.originScene 
        });
    }

    // QoL: allow scenes to temporarily disable J hotkey relaunch
    public setJournalHotkeyEnabled(enabled: boolean) {
        this.journalHotkeyEnabled = enabled;
    }
    public isJournalHotkeyEnabled() {
        return this.journalHotkeyEnabled;
    }

    public showNotification(message: string): void {
        if (!this.currentScene) {
            console.warn("[UIManager] Scene not set in UIManager. Cannot show notification.");
            // Fallback to console if no scene to draw on
            console.log(`[UI NOTIFICATION - NO SCENE]: ${message}`);
            return;
        }
        console.log(`[UIManager] Showing notification: "${message}" on scene ${this.currentScene.scene.key}`);
        if (
            typeof message === "string" &&
            (message.includes("You're fired for misconduct") ||
                message.includes("Fired for misconduct"))
        ) {
            const gs = GameState.getInstance();
            console.trace('[TRACE] UIManager.showNotification fired-misconduct');
            console.log('[TRACE] Flags at toast', {
                usedCoke: gs.getFlag?.('usedCoke'),
                tastedCheese: gs.getFlag?.('tastedCheese'),
                cokeDepleted: gs.getFlag?.('cokeDepleted'),
                cheeseDepleted: gs.getFlag?.('cheeseDepleted'),
            });
        }
        // Simple notification display logic
        const notificationText = this.currentScene.add.text(
            this.currentScene.cameras.main.centerX,    // Center X of the camera
            this.currentScene.cameras.main.scrollY + this.currentScene.cameras.main.height - 60, // Bottom of camera view, minus offset
            message,
            {
                fontSize: '16px',
                fontFamily: '"Verdana", "Arial", sans-serif', // Specify a common font
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.75)',
                padding: { x: 15, y: 8 },
                align: 'center',
                wordWrap: { width: this.currentScene.cameras.main.width - 60, useAdvancedWrap: true } // Word wrap
            }
        )
            .setOrigin(0.5)
            .setDepth(Phaser.Math.MAX_SAFE_INTEGER) // Ensure it's on top of everything
            .setScrollFactor(0); // Make it fixed to the camera, so it doesn't scroll with the world

        // Automatically destroy the text after a few seconds
        this.currentScene.tweens.add({
            targets: notificationText,
            alpha: { from: 1, to: 0 }, // Fade out
            delay: 2500,               // Start fading after 2.5 seconds
            duration: 500,             // Fade out over 0.5 seconds
            onComplete: () => {
                notificationText.destroy();
            }
        });
    }
}
