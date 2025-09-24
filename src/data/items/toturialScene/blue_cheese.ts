import { ItemConfig, EvidencePhase, DialogueNode } from '../itemTemplate'; // Adjust path
import { ItemGameContext } from '../../../game/managers/CallBackManager';      // Adjust path
import { activateTutorialCase } from '../../cases/tutorialCases';

export const blueCheese: ItemConfig = {
    id: 'blueCheese',
    name: 'Suspicious Blue Cheese', // User-friendly name for UI
    clueId: 'blueCheese', // If interacting/collecting it generates a specific clue
    art: {
        small: { // Example paths - replace with your actual asset paths
            full: 'assets/tilemaps/toturial_inside/cheese_32x32.png',
            half: 'assets/tilemaps/toturial_inside/cheese_32x32_half.png',
            empty: 'assets/tilemaps/toturial_inside/cheese_32x32_empty.png'
        },
        large: { // Example paths - replace with your actual asset paths
            full: 'assets/tilemaps/toturial_inside/cheese_64x64.png',
            half: 'assets/tilemaps/toturial_inside/cheese_64x64_half.png',
            empty: 'assets/tilemaps/toturial_inside/cheese_64x64_eaten.png'
        }
    },
    defaultScale: 0.5, // If used as a world sprite
    description: 'A pungent blue cheese. It has a surprisingly sweet undertone.',
    collectible: true,

    // --- DIALOGUE ---
    dialogue: [
        {
            id: 'greeting', // Initial dialogue when interacting with the cheese
            text: "This is some rather odorous blue cheese. It looks... edible?",
            options: [
                {
                    id: 'pickupOption',
                    text: "Pick up the cheese",
                    callbackId: "pick_up_cheese", // Will trigger handleCallback
                    // nextDialogueId: 'pickedUpMessage' // Optional
                },
                {
                    id: 'leaveOption',
                    text: "Leave it alone."
                    // No nextDialogueId or callbackId, just closes dialogue
                }
            ]
        },
        {
            id: 'tastedDescription', // Example followup if taste_cheese had a nextDialogueId
            text: "It's strangely compelling...",
            options: [
                { id: 'ok', text: "Interesting." }
            ]
        },
        {
            id: 'pickedUpMessage', // Example followup if pick_up_cheese had a nextDialogueId
            text: "You pocket the cheese.",
            options: [
                { id: 'ok_collected', text: "Alright." }
            ]
        }
        // You can add more dialogue nodes as needed for more complex interactions
    ] as DialogueNode[], // Type assertion for clarity

    // --- STATE ---
    initialStatus: 'full',
    timesUsed: 0,
    currentStatus: 'full',

    // --- CLUE INFO (Optional) ---
    clueCategory: 'evidence',
    // clueFoundAt: 'Police Station - Break Room', // Can be set if needed

    // --- METHODS ---
    getArt: function (this: ItemConfig, size: 'small' | 'large', phase: EvidencePhase | 'fixed'): string {
        const artSet = this.art[size];
        if (typeof artSet === 'string') {
            return artSet;
        }
        // Determine art from the phase passed as an argument, NOT from 'this.currentStatus'
        const phaseKeyForArt = (phase === 'fixed' ? 'full' : phase) as keyof typeof artSet;
        return artSet[phaseKeyForArt] || artSet.full;
    },


    use: function (this: ItemConfig, gameContext: ItemGameContext) {
        const { gameState, clueManager } = gameContext;
        const clueId = this.clueId || this.id;

        // 1. Get current state FROM GameState
        const currentState = gameState.getOrInitClueState(clueId);

        let message = "The cheese is already gone!";
        let artChanged = false;
        let aPortionWasUsed = false;

        if (currentState.phase !== 'empty' && currentState.phase !== 'fixed') {
            aPortionWasUsed = true;
            artChanged = true;

            // 2. DEGRADE the state IN GameState
            const newPhase = gameState.degradeClue(clueId);

            if (newPhase === 'half') {
                message = 'You take a big bite. The cheese is surprisingly sweet! It\'s now half-eaten.';
            } else if (newPhase === 'empty') {
                message = 'You finish the cheese. It was delicious, with an odd, faint aftertaste of cola.';
            }

            // 3. Update the clue using the new state
            if (clueManager) {
                clueManager.updateClueDetails(clueId, {
                    title: `${this.name} (${newPhase === 'half' ? 'Half-Eaten' : 'Eaten'})`,
                    description: `You've eaten some of the cheese. ${message}`,
                    // 4. Get the new art using the new state
                    imageKey: this.getArt.call(this, 'small', newPhase)
                });
            }
        }

        return {
            newStatus: gameState.getOrInitClueState(clueId).phase,
            message: message,
            artChanged: artChanged,
            consumed: gameState.getOrInitClueState(clueId).phase === 'empty' && aPortionWasUsed
        };
    },

    // --- FIX: UPDATED handleCallback METHOD ---
    handleCallback: function (this: ItemConfig, callbackId: string, gameContext: ItemGameContext) {
        const { gameState, clueManager, inventoryManager, ui, world, interactedObject } = gameContext;
        const clueId = this.clueId || this.id;

        const currentPhase = gameState.getOrInitClueState(clueId).phase;

        switch (callbackId) {
            case 'pick_up_cheese':
                if (!this.collectible) {
                    ui.showPlayerMessage("You decide against taking the cheese right now.");
                    return;
                }

                ui.showPlayerMessage("You cautiously pick up the blue cheese.");
                const invItem = inventoryManager.createInventoryItemData(this);
                inventoryManager.addItem(invItem);

                // Add a clue related to picking up the cheese
                clueManager.addClue({
                    id: clueId,
                    title: `${this.name} Obtained`,
                    description: `You picked up a piece of ${this.name}. ${this.description}`,
                    // Get the art for the CURRENT phase when creating the clue
                    imageKey: this.getArt.call(this, 'small', currentPhase),
                    category: this.clueCategory || 'evidence',
                    discovered: true,
                });

                // Activate the Illegal Cheese case when the player picks it up
                activateTutorialCase('bluecheese_case', true);
                ui.showNotification?.('New case added: WHOSE CHEESE IS THIS');

                if (world.removeItemSprite && interactedObject) {
                    world.removeItemSprite(interactedObject);
                }
                break;

            case 'taste_cheese':
                // This logic is for tasting the cheese in the world, before it's picked up.
                if (currentPhase !== 'empty' && currentPhase !== 'fixed') {
                    const newPhase = gameState.degradeClue(clueId);
                    let messageFromTaste = "You nibble a bit of the cheese. Sweet, with a cola aftertaste.";
                    if (newPhase === 'empty') {
                        messageFromTaste = 'You finish off the remaining cheese from where it lies. Quite addictive.';
                    }
                    ui.showPlayerMessage(messageFromTaste);

                    // Update the world sprite's texture if it can be refreshed
                    if (interactedObject && typeof (interactedObject as any).refreshTexture === 'function') {
                        (interactedObject as any).refreshTexture();
                    }

                    if (newPhase === 'empty' && world.removeItemSprite && interactedObject) {
                        world.removeItemSprite(interactedObject);
                    }
                } else {
                    ui.showPlayerMessage("It's already gone.");
                }
                break;
        }
    },

    onCollect: function (this: ItemConfig, gameContext: ItemGameContext) {
        gameContext.ui.showPlayerMessage(`The ${this.name || 'blue cheese'} feels strangely compelling in your hand.`);
        return { collected: true, message: `${(this as any).name || this.id} added to inventory.` };
    }

};
