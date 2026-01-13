// cases/tutorial/Callbacks.ts
import type { CallbackFn } from '../../managers/CallBackManager'; // adjust path

export const tutorialCallbacks: Record<string, CallbackFn> = {
    read_phone_text: ({ gs, ui }) => {
        if (!gs.getFlag('phoneTextRead')) {
            gs.setFlag('phoneTextRead', true);
            ui.showNotification('📱 Phone log noted (Butter text).');
        }
    },

    mark_cheese_illegal: ({ gs, ui }) => {
        if (!gs.getFlag('cheeseMarkedIllegal')) {
            gs.setFlag('cheeseMarkedIllegal', true);
            ui.showNotification('🧀 Cheese marked as illegal contraband.');
        }
    },
    start_investigation: ({ gs, ui }) => {
        gs.incrementCounter('tutorial_step'); 
        ui.showNotification('Objective: Search for clues.');
    },

    skip_tutorial: ({ scene, gs, ui }) => {
        console.log("Skipping tutorial...");
        
        // 1. Mark tutorial as fully complete
        gs.setFlag('tutorial_completed', true);
        gs.incrementCounter('tutorial_step', 10); // Set to a high number to effectively end it

        // 2. Unlock functionality (like journal) just in case
        ui.setJournalHotkeyEnabled(true);
        scene.scene.start('Game', { fromScene: 'ToturialScene' });
    }

    
};
