import { ItemConfig, EvidencePhase, DialogueNode } from '../itemTemplate'; // Adjust path
import { ItemGameContext } from '../../../game/managers/CallBackManager';      // Adjust path
import { activateTutorialCase } from '../../cases/tutorialCases';

export const blueCheese: ItemConfig = {
    id: 'blueCheese',
    name: 'Suspicious Blue Cheese',
    clueId: 'blueCheese',
    
    // --- ARTWORK ---
    art: {
        small: {
            full: 'assets/tilemaps/toturial_inside/cheese_32x32.png',
            half: 'assets/tilemaps/toturial_inside/cheese_32x32_half.png',
            empty: 'assets/tilemaps/toturial_inside/cheese_32x32_empty.png'
        },
        large: {
            full: 'assets/tilemaps/toturial_inside/cheese_64x64.png',
            half: 'assets/tilemaps/toturial_inside/cheese_64x64_half.png',
            empty: 'assets/tilemaps/toturial_inside/cheese_64x64_eaten.png'
        }
    },
    defaultScale: 0.5,
    description: 'A pungent blue cheese. It has a surprisingly sweet undertone.',
    collectible: true,

    // --- DIALOGUE ---
    dialogue: [
        {
            id: 'greeting',
            text: "This is some rather odorous blue cheese. It looks... edible?",
            options: [
                {
                    id: 'pickupOption',
                    text: "Pick up the cheese",
                    callbackId: "pick_up_cheese",
                },
                {
                    id: 'leaveOption',
                    text: "Leave it alone."
                }
            ]
        },
        {
            id: 'pickedUpMessage',
            text: "You pocket the cheese.",
            options: [
                { id: 'ok_collected', text: "Alright." }
            ]
        }
    ] as DialogueNode[],

    // --- STATE ---
    initialStatus: 'full',
    timesUsed: 0,
    currentStatus: 'full',

    // --- CLUE INFO ---
    clueCategory: 'evidence',

    // --- METHODS ---
    getArt: function (this: ItemConfig, size: 'small' | 'large', phase: EvidencePhase | 'fixed'): string {
        const artSet = this.art[size];
        if (typeof artSet === 'string') return artSet;
        const phaseKeyForArt = (phase === 'fixed' ? 'full' : phase) as keyof typeof artSet;
        return artSet[phaseKeyForArt] || artSet.full;
    },

    // --- THE IMPORTANT PART: USE FUNCTION ---
    use: function (this: ItemConfig, gameContext: ItemGameContext) {
        const { gameState, clueManager } = gameContext;
        const clueId = this.clueId || this.id;

        // 1. Check if already empty
        const currentState = gameState.getOrInitClueState(clueId);
        if (currentState.phase === 'empty') {
            return {
                message: "You already ate all the cheese! You greedy mouse.",
                artChanged: false,
                consumed: false
            };
        }

        // 2. Degrade the item (Full -> Half -> Empty)
        const newPhase = gameState.degradeClue(clueId);
        let message = "You nibble the cheese.";

        // 3. Set the FLAGS for the Dialogue Manager
        if (newPhase === 'half') {
            // Level 1: Ate it once
            gameState.setFlag('player_ate_cheese_1', true);
            message = 'You take a big bite. The cheese is surprisingly sweet! It\'s now half-eaten.';
        } 
        else if (newPhase === 'empty') {
            // Level 2: Ate it twice (finished it)
            gameState.setFlag('player_ate_cheese_2', true);
            message = 'You finish the cheese. It was delicious... but wait, was that evidence?';
        }

        // 4. Update the Clue/Journal Entry
        if (clueManager) {
            clueManager.updateClueDetails(clueId, {
                title: `${this.name} (${newPhase === 'half' ? 'Half-Eaten' : 'Eaten'})`,
                description: `You've eaten some of the cheese. ${message}`,
                imageKey: this.getArt.call(this, 'small', newPhase)
            });
        }

        return {
            newStatus: newPhase,
            message: message,
            artChanged: true, // Updates UI icon
            consumed: newPhase === 'empty' // Should we remove it from inventory? (True = yes)
        };
    },

    // --- CALLBACKS ---
    handleCallback: function (this: ItemConfig, callbackId: string, gameContext: ItemGameContext) {
        const { clueManager, inventoryManager, ui, world, interactedObject, gameState } = gameContext;
        const clueId = this.clueId || this.id;
        const currentPhase = gameState.getOrInitClueState(clueId).phase;

        switch (callbackId) {
            case 'pick_up_cheese':
                if (!this.collectible) {
                    ui.showPlayerMessage("You decide against taking the cheese right now.");
                    return;
                }

                ui.showPlayerMessage("You cautiously pick up the blue cheese.");
                
                // Add to Inventory
                if ((inventoryManager as any).createInventoryItemData) {
                    const invItem = (inventoryManager as any).createInventoryItemData(this);
                    inventoryManager.addItem(invItem);
                }

                // Add to Clue Journal
                clueManager.addClue({
                    id: clueId,
                    title: `${this.name} Obtained`,
                    description: `You picked up a piece of ${this.name}. ${this.description}`,
                    imageKey: this.getArt.call(this, 'small', currentPhase),
                    category: this.clueCategory || 'evidence',
                    discovered: true,
                });

                // Trigger the Tutorial Case
                activateTutorialCase('bluecheese_case', true);
                if (ui.showNotification) {
                    ui.showNotification('New case added: WHOSE CHEESE IS THIS');
                }

                // Remove from World
                if (world.removeItemSprite && interactedObject) {
                    world.removeItemSprite(interactedObject);
                }
                break;
        }
    },

    onCollect: function (this: ItemConfig, gameContext: ItemGameContext) {
        gameContext.ui.showPlayerMessage(`The ${this.name || 'blue cheese'} feels strangely compelling in your hand.`);
        return { collected: true, message: `${(this as any).name || this.id} added to inventory.` };
    }
};