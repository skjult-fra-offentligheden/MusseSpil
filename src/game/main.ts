import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { UIGameOverlay } from './scenes/UiGameOverlay';
import { GuideScene } from '../game/guideScripts/guide';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { InventoryScene } from './scenes/GameScriptScenes/InventoryScene';
import { ClueJournal } from "./clueScripts/clueScene";
import { DragAbleClueScene } from "./clueScripts/dragAbleClueScene";
import { AccusationScene } from "./clueScripts/Accusation_scripts/AccusationScene";
import { ClueDisplayJournalScene } from "./clueScripts/clueDisplay";
import { PeopleDisplayJournalScene } from "./clueScripts/peopleDisplay";
import { VictoryScene } from "./scenes/GameScriptScenes/victoryScene";
import { DevHUD } from './scenes/DevHUD';
import { GameOver } from "./scenes/GameScriptScenes/GameOver";
import { HouseScene } from "./scenes/HouseScene";
import { ToturialScene } from "./scenes/ToturialScene";
//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig

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
        MainMenu,
        MainGame,
        UIGameOverlay,
        InventoryScene,
        GuideScene,
        ClueJournal,
        AccusationScene,
        VictoryScene,
        GameOver,
        HouseScene,
        ToturialScene,
        DragAbleClueScene,
        ClueDisplayJournalScene,
        PeopleDisplayJournalScene,
        DevHUD
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
