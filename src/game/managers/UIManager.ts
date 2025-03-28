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
        const clueManager = gameState.clueManager;

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

    public showAccusation() {
        if (!this.currentScene) {
            console.error('No current scene set in UIManager.');
            return;
        }
        if (this.currentScene.scene.isActive('AccusationScene')) {
            console.log('Guide scene is already active, not launching again.');
            return;
        }

        const gameState = GameState.getInstance();
        const suspectsData = gameState.suspectsData;
        const clueManager = gameState.clueManager;
        const suspectsSprites = gameState.npcIdleFrames;

        console.log("About to showAccusation", suspectsData, clueManager, suspectsData);
        //flyt logiken her ?
        this.currentScene.scene.pause();
        this.currentScene.scene.launch('AccusationScene', { suspectsData, clueManager, suspectsSprites, originScene: this.originScene });
        this.currentScene.scene.bringToTop('AccusationScene');
    }




}
