// src/game/PhaserGame.tsx
import Phaser from 'phaser';
import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './main'; // Import the StartGame function

// Define the props the component receives
interface Props {
    currentActiveScene?: (scene: Phaser.Scene) => void;
}

// Define the methods exposed via the ref
export interface IRefPhaserGame {
    game: Phaser.Game | null;
    getActiveScene: () => Phaser.Scene | undefined;
}

// Unique ID for the container div
const PHASER_CONTAINER_ID = 'phaser-game-container';

export const PhaserGame = forwardRef<IRefPhaserGame, Props>(({ currentActiveScene }, ref) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    // Refs to store listener functions for easy removal
    const sceneStartListenerRef = useRef<((scene: Phaser.Scene) => void) | null>(null);
    const gameReadyListenerRef = useRef<(() => void) | null>(null);


    useLayoutEffect(() => {
        if (gameRef.current) {
            console.log("PhaserGame: Game instance already exists, skipping creation.");
            return;
        }

        console.log(`PhaserGame: Calling StartGame with ID: ${PHASER_CONTAINER_ID}`);
        const currentGame = StartGame(PHASER_CONTAINER_ID);
        gameRef.current = currentGame; // Assign immediately for cleanup reference
        console.log("PhaserGame: StartGame returned, gameRef.current:", currentGame);

        // --- Setup listener for Phaser Core READY event ---
        gameReadyListenerRef.current = () => {
            console.log("PhaserGame: Phaser.Core.Events.READY event received.");
            // Now it's safe to access game.scene.eventEmitter

            // GUARD: Ensure game instance and callback function still exist when READY fires
            if (currentGame && currentActiveScene) {
                // GUARD: Double-check scene manager/emitter are ready (should be now)
                if (currentGame.scene && currentGame.scene.eventEmitter) {
                    console.log("PhaserGame: Attaching scene START listener inside READY callback.");
                    // Store the listener function itself for removal
                    sceneStartListenerRef.current = currentActiveScene;
                    currentGame.scene.eventEmitter.on(Phaser.Scenes.Events.START, sceneStartListenerRef.current);
                } else {
                    console.error("PhaserGame Error: Scene manager or emitter still not ready even after game READY event!");
                }
            } else {
                console.log("PhaserGame: Skipping scene listener setup inside READY (game or callback missing).");
            }

            // Expose methods/properties via the ref passed from App.tsx
            // Do this *after* the game is ready
            if (ref) {
                (ref as React.MutableRefObject<IRefPhaserGame>).current = {
                    game: currentGame,
                    getActiveScene: () => currentGame?.scene.getScenes(true)[0],
                };
            }
        };

        // Attach the READY listener to the game's main event emitter
        if (currentGame && currentGame.events) {
            console.log("PhaserGame: Attaching Phaser.Core.Events.READY listener.");
            currentGame.events.on(Phaser.Core.Events.READY, gameReadyListenerRef.current);
        } else {
            console.error("PhaserGame Error: Game instance or game.events missing immediately after creation!");
        }
        // --------------------------------------------------

        // --- Cleanup function ---
        return () => {
            console.log("PhaserGame: Cleanup function running.");
            const gameToDestroy = gameRef.current; // Capture ref before potential nullification

            if (gameToDestroy) {
                console.log("PhaserGame: Game instance exists during cleanup.");

                // Remove Phaser Core READY listener
                if (gameReadyListenerRef.current && gameToDestroy.events) {
                    console.log("PhaserGame: Removing Phaser.Core.Events.READY listener.");
                    gameToDestroy.events.off(Phaser.Core.Events.READY, gameReadyListenerRef.current);
                }

                // Remove scene START listener if it was added
                if (sceneStartListenerRef.current && gameToDestroy.scene && gameToDestroy.scene.eventEmitter) {
                    console.log("PhaserGame: Removing scene START listener.");
                    gameToDestroy.scene.eventEmitter.off(Phaser.Scenes.Events.START, sceneStartListenerRef.current);
                }

                // Destroy the game instance
                console.log("PhaserGame: Destroying Phaser game instance.");
                gameToDestroy.destroy(true);
                gameRef.current = null; // Set ref to null *after* cleanup

                if (ref) {
                    (ref as React.MutableRefObject<IRefPhaserGame>).current = { game: null, getActiveScene: () => undefined };
                }
            } else {
                console.log("PhaserGame: Game instance was already null during cleanup.");
            }
            // Clear listener refs
            gameReadyListenerRef.current = null;
            sceneStartListenerRef.current = null;
        };
        // Dependencies for the effect
    }, [ref, currentActiveScene]); // Include dependencies used inside effect

    // Render the div that Phaser will use as its parent container
    console.log("PhaserGame: Rendering div with ID:", PHASER_CONTAINER_ID);
    return <div id={PHASER_CONTAINER_ID} />;
});