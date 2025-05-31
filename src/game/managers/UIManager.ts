import { GameState } from '../managers/GameState';
import { InventoryManager } from '../managers/itemMananger';
export class UIManager {
    private static instance: UIManager;
    private currentScene: Phaser.Scene | null = null;
    private originScene: string;
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
        const gameState = GameState.getInstance();
        const clueManager = gameState.getClueManager();

        if (!this.currentScene) {
            console.error('No current scene set in UIManager.');
            return;
        }
        if (!clueManager) {
            console.error('ClueManager is not available.');
            return;
        }
        if (this.currentScene.scene.isActive('ClueJournal')) {
            console.log('Guide scene is already active, not launching again.');
            return;
        }
        console.log('Launching ClueJournal with ClueManager:', clueManager);
        this.currentScene.scene.pause();
        this.currentScene.scene.launch('ClueJournal', { clueManager, originScene: this.originScene });
        this.currentScene.scene.bringToTop('ClueJournal');
    }

    public showNotification(message: string): void {
        if (!this.currentScene) {
            console.warn("[UIManager] Scene not set in UIManager. Cannot show notification.");
            // Fallback to console if no scene to draw on
            console.log(`[UI NOTIFICATION - NO SCENE]: ${message}`);
            return;
        }
        console.log(`[UIManager] Showing notification: "${message}" on scene ${this.currentScene.scene.key}`);

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

    //public showAccusation() {
    //    if (!this.currentScene) {
    //        console.error('No current scene set in UIManager.');
    //        return;
    //    }
    //    if (this.currentScene.scene.isActive('AccusationScene')) {
    //        console.log('Guide scene is already active, not launching again.');
    //        return;
    //    }

    //    const gameState = GameState.getInstance();
    //    const suspectsData = gameState.suspectsData;
    //    const clueManager = gameState.clueManager;
    //    const suspectsSprites = gameState.npcIdleFrames;

    //    console.log("About to showAccusation", suspectsData, clueManager, suspectsData);
    //    //flyt logiken her ?
    //    this.currentScene.scene.pause();
    //    this.currentScene.scene.launch('AccusationScene', { suspectsData, clueManager, suspectsSprites, originScene: this.originScene });
    //    this.currentScene.scene.bringToTop('AccusationScene');
    //}




}
