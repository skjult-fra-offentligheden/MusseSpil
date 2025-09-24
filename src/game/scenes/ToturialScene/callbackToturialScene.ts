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

    // add more scene-specific actions here as needed…
};
