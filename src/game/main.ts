import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { ToturialScene } from './scenes/ToturialScene';
import { UIGameOverlay } from './scenes/UiGameOverlay';
import { InventoryScene } from './scenes/GameScriptScenes/InventoryScene';
import { GameOver } from './scenes/GameScriptScenes/GameOver';
import { VictoryScene } from './scenes/GameScriptScenes/victoryScene';
import { GuideScene } from './guideScripts/guide';
import { ClueDisplayJournalScene } from './clueScripts/clueDisplay';
import { PeopleDisplayJournalScene } from './clueScripts/peopleDisplay';
import { DevHUD } from './scenes/DevHUD';
import { DragAbleClueScene } from './clueScripts/dragAbleClueScene';
import { Game } from './scenes/Game';
// --- THESE ARE THE NEW, CORRECT IMPORTS ---
import { CaseSelectionScene } from './clueScripts/CaseSelectionScene';
import { CaseDetailsScene } from './clueScripts/CaseDetailsScene';

const LOGICAL_WIDTH = 1920; // Example: choose your desired base width
const LOGICAL_HEIGHT = 1080; // Example: choose your desired base height

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    scale: {
        mode: Phaser.Scale.FIT, // Scale the game to fit the window
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game in the window
        width: '100%',
        height: '100%',
      },
    //parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 }, // Adjust gravity as needed
          debug: false,
        },
    },
    render: {
        pixelArt: true, 
        antialias: false,
    },
    scene: [
        Boot,
        Preloader,
        Game,
        MainMenu,
        ToturialScene,
        UIGameOverlay,
        InventoryScene,
        GameOver,
        VictoryScene,
        GuideScene,
        CaseSelectionScene,
        CaseDetailsScene,
        ClueDisplayJournalScene,
        PeopleDisplayJournalScene,
        DragAbleClueScene,
        DevHUD
    ],
};

export const StartGame = (parent: string) => {
    return new Phaser.Game({ ...config, parent });
}

export default StartGame;
