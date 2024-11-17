import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { UIGameOverlay } from './scenes/UiGameOverlay';
import { GuideScene } from './scenes/GameScriptScenes/guide';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { InventoryScene } from './scenes/GameScriptScenes/InventoryScene';
import { ClueJournal } from "./scenes/GameScriptScenes/clueScene"
import { AccusationScene } from "./scenes/GameScriptScenes/AccusationScene"
import { VictoryScene } from "./scenes/GameScriptScenes/victoryScene"
import { GameOver } from "./scenes/GameScriptScenes/GameOver"
//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    
    width: screen.width,
    height: screen.height,
    scale: {
        mode: Phaser.Scale.FIT, // Scale the game to fit the window
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game in the window
        width: '100%',
        height: '100%',
      },
    parent: 'game-container',
    backgroundColor: '#028af8',
    physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 }, // Adjust gravity as needed
          debug: true,
        },
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        UIGameOverlay,
        InventoryScene,
        GuideScene,
        ClueJournal,
        AccusationScene,
        VictoryScene,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
