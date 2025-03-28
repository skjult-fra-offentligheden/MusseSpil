// src/scenes/AccusationScene.ts
import Phaser from 'phaser';
import { ClueManager } from "../clueScripts/clueManager";
import { AccusationUI, AccusationUIConfig } from './accusationUI';
import { Suspect } from "./suspect";

export class AccusationScene extends Phaser.Scene {
    private suspectsData: { [key: string]: Suspect };
    private clueManager: ClueManager;
    private suspectSprites: any;
    private originScene: string;
    private accusationUI!: AccusationUI;

    constructor() {
        super({ key: 'AccusationScene' });
    }

    init(data: { suspectsData: any; clueManager: ClueManager; suspectsSprites: any; originScene: string }): void {
        console.log("AccusationScene init data:", data);
        if (!data.suspectsData) {
            console.error("No suspectsData passed to AccusationScene!");
        }
        this.suspectsData = data.suspectsData;
        this.clueManager = data.clueManager;
        this.suspectSprites = data.suspectsSprites;
        this.originScene = data.originScene;
    }

    create(): void {
        // Set up UI using our new UI class
        const uiConfig: AccusationUIConfig = {
            suspectsData: this.suspectsData,
            suspectsSprites: this.suspectSprites,
            originScene: this.originScene,
        };

        this.accusationUI = new AccusationUI(this, uiConfig);
        this.accusationUI.createUI(
            (suspect: Suspect) => this.handleSuspectSelected(suspect),
            () => this.returnToGame()
        );

        // Input handler for 'A' key to return to game
        this.input.keyboard.on("keydown-A", () => {
            this.returnToGame();
        });
    }

    private handleSuspectSelected(suspect: Suspect): void {
        // Delegate confirmation dialog to UI
        this.accusationUI.showConfirmation(
            suspect,
            () => this.resolveAccusation(suspect),
            () => { /* Optionally do something on cancel */ }
        );
    }

    private resolveAccusation(suspect: Suspect): void {
        if (suspect.isCulprit) {
            // Correct accusation
            this.scene.stop('Game');
            this.scene.start('VictoryScene', { suspect });
        } else {
            // Incorrect accusation
            this.scene.stop('Game');
            this.scene.start('GameOver', { suspect });
        }
    }

    private returnToGame(): void {
        this.scene.stop();
        this.scene.resume(this.originScene);
    }
}
