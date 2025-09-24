import { ItemConfig, EvidencePhase, DialogueNode } from '../itemTemplate'; // Adjust path
import { ItemGameContext } from '../../../game/managers/CallBackManager';      // Adjust path

export const coke: ItemConfig = {
    id: 'coke',
    name: 'Bag of Coke', // User-friendly name
    clueId: 'clue_cocaine_bag', // More specific clue ID if desired
    art: {
        small: {
            full: 'assets/tilemaps/toturial_inside/cokebag_32x32_full.png',
            half: 'assets/tilemaps/toturial_inside/cokebag_32x32_half_empty.png',
            empty: 'assets/tilemaps/toturial_inside/cokebag_32x32_empty.png'
        },
        large: {
            full: 'assets/tilemaps/toturial_inside/cokebag_full_64x64.png',
            half: 'assets/tilemaps/toturial_inside/cokebag_64x64_half_empty.png',
            empty: 'assets/tilemaps/toturial_inside/cokebag_64x64_empty.png'
        }
    },
    defaultScale: 0.5,
    description: 'A small baggie containing a white powdery substance. Looks like coke. There are some brown hairs stuck to the plastic.',
    collectible: true,

    // --- DIALOGUE (from your original) ---
    dialogue: [
        {
            id: "greeting",
            text: "A small, clear baggie with white powder. Definitely looks like coke.",
            options: [
                {
                    id: "inspectCloser",
                    text: "Inspect the bag",
                    nextDialogueId: "inspectionDetails"
                },
                {
                    id: "leaveBody",
                    text: "Leave the drugs. Not your business."
                }
            ]
        },
        {
            id: "inspectionDetails",
            text: "Upon closer inspection, you notice a few strands of brown hair caught in the seal of the bag.",
            options: [
                {
                    id: "takeNoteAndPickup", // Combined action
                    text: "Take note of the hair and pick up the bag.",
                    callbackId: "pick_up_cocaine_and_note_hair", // More descriptive callback
                    // nextDialogueId: "inspectionEnd" // Optional: DialogueManager handles next node
                },
                {
                    id: "pickupOnly",
                    text: "Just pick up the bag.",
                    callbackId: "pick_up_cocaine", // Simpler pickup
                },
                {
                    id: "doSomething",
                    text: "Disregard the hair, it's probably nothing.",
                    nextDialogueId: "disregard"
                }
            ]
        },
        {
            id: "inspectionEnd",
            text: "You step away from the bag.",
            options: []
        },
        {
            id: "disregard",
            text: "It's just a few hairs, probably contamination.",
            options: []
        }
    ] as DialogueNode[],

    // --- STATE ---
    initialStatus: 'full', // 'full', 'half', 'empty' can represent amount or purity tests, etc.
    timesUsed: 0,          // How many times a "dose" has been taken or tested
    currentStatus: 'full',

    // --- CLUE INFO (Optional) ---
    clueCategory: 'evidence',
    // clueFoundAt: 'Scene of Crime - Back Alley',

    getArt: function (this: ItemConfig, size: 'small' | 'large', phase: EvidencePhase | 'fixed'): string {
        const artSet = this.art[size];
        if (typeof artSet === 'string') return artSet;

        // Determine art from the phase passed as an argument, NOT from 'this.currentStatus'
        const phaseKeyForArt = (phase === 'fixed' ? 'full' : phase) as keyof typeof artSet;
        return artSet[phaseKeyForArt] || artSet.full;
    },

    use: function (this: ItemConfig, gameContext: ItemGameContext) {
        const { gameState, clueManager } = gameContext;
        const clueId = this.clueId || this.id;

        // 1. Get current state FROM GameState
        const currentState = gameState.getOrInitClueState(clueId);

        let message = "There's nothing left in the bag.";
        let artChanged = false;
        let aPortionWasUsed = false;

        if (currentState.phase !== 'empty' && currentState.phase !== 'fixed') {
            aPortionWasUsed = true;
            artChanged = true;

            // 2. DEGRADE the state IN GameState
            const newPhase = gameState.degradeClue(clueId);

            if (newPhase === 'half') {
                message = 'You take a small sample. The powder is fine and has a slight chemical smell.';
            } else if (newPhase === 'empty') {
                message = 'You use the last of the powder. The bag is now empty.';
            }

            // 3. Update the clue using the new state
            if (clueManager) {
                clueManager.updateClueDetails(clueId, {
                    title: `${this.name} (${newPhase === 'half' ? 'Sampled' : 'Empty'})`,
                    description: `You used the item. The official report reads: "${message}"`,
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

    handleCallback: function (this: ItemConfig, callbackId: string, gameContext: ItemGameContext) {
        const itemName = this.name || 'Coke Bag';
        const { gameState, clueManager, inventoryManager, ui, world, interactedObject } = gameContext;
        const clueId = this.clueId || this.id;
        const currentPhase = gameState.getOrInitClueState(clueId).phase;

        switch (callbackId) {
            case 'pick_up_cocaine':
            case 'pick_up_cocaine_and_note_hair':
                if (!this.collectible) {
                    gameContext.ui.showPlayerMessage(`You can't pick up the ${itemName}.`);
                    return;
                }
                if (!(gameContext.inventoryManager as any).createInventoryItemData) {
                    console.error("FATAL: InventoryManager missing createInventoryItemData method!");
                    gameContext.ui.showPlayerMessage("Error: Could not pick up item.");
                    return;
                }

                gameContext.ui.showPlayerMessage(`You carefully pick up the ${itemName}.`);
                const invItem = (gameContext.inventoryManager as any).createInventoryItemData(this);
                gameContext.inventoryManager.addItem(invItem);

                let clueDescription = `A bag of white powder, likely cocaine, has been collected.`;
                if (callbackId === 'pick_up_cocaine_and_note_hair') {
                    clueDescription += ` Several strands of brown hair were found stuck to the bag's seal.`;
                }

                gameContext.clueManager.addClue({
                    id: this.clueId || `${this.id}_collected`,
                    title: `${itemName} Collected`,
                    description: clueDescription,
                    imageKey: this.getArt.call(this, 'small', currentPhase),
                    category: this.clueCategory || 'evidence',
                    discovered: true,
                    relatedNPCs: (callbackId === 'pick_up_cocaine_and_note_hair') ? ['SUSPECT_WITH_BROWN_HAIR'] : undefined // Example
                });

                if (gameContext.world.removeItemSprite && gameContext.interactedObject) {
                    gameContext.world.removeItemSprite(gameContext.interactedObject);
                }
                // If you want to go to a specific dialogue node after pickup:
                // gameContext.dialogueManager.goToNode('inspectionEnd'); // Needs dialogueManager in gameContext
                break;

            // Add other specific callbacks for coke if needed, e.g., 'test_purity_on_site'
            // case 'test_purity_on_site':
            //     if (this.currentStatus !== 'empty') {
            //         this.currentStatus = 'half'; // Assume testing uses some
            //         gameContext.ui.showPlayerMessage("You perform a quick field test. It seems relatively pure.");
            //         if (gameContext.interactedObject && typeof (gameContext.interactedObject as any).refreshTexture === 'function') {
            //            (gameContext.interactedObject as any).refreshTexture();
            //         }
            //     } else {
            //         gameContext.ui.showPlayerMessage("Nothing left to test.");
            //     }
            //     break;
        }
    },

    onCollect: function (this: ItemConfig, gameContext: ItemGameContext) {
        // Fallback for generic 'ACTION_PICKUP' if no specific handleCallback is matched.
        // This is less likely to be used if you have specific 'pick_up_cocaine' callbacks.
        const itemName = this.name || 'Coke Bag';
        gameContext.ui.showPlayerMessage(`The ${itemName} feels illicit in your pocket.`);
        return { collected: true, message: `${itemName} added to inventory.` };
    }
};