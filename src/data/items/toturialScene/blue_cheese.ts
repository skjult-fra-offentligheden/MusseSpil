import { ItemConfig, EvidencePhase, DialogueNode } from '../itemTemplate'; // Adjust path
import { ItemGameContext } from '../../../game/managers/CallBackManager';      // Adjust path

export const blueCheese: ItemConfig = {
    id: 'blueCheese',
    name: 'Suspicious Blue Cheese', // User-friendly name for UI
    clueId: 'clue_blue_cheese_interaction', // If interacting/collecting it generates a specific clue
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
                    id: 'tasteOption',
                    text: "Taste the cheese",
                    callbackId: 'taste_cheese', // Will trigger handleCallback
                    // nextDialogueId: 'tastedDescription' // Optional: move to a new node after callback
                },
                {
                    id: 'pickupOption',
                    text: "Pick up the cheese",
                    callbackId: 'pick_up_cheese', // Will trigger handleCallback
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
    getArt: function (this: ItemConfig, size: 'small' | 'large'): string {
        const artSet = this.art[size];
        if (typeof artSet === 'string') {
            return artSet;
        }
        // Ensure currentStatus is a valid key for PhasedArt or provide a fallback
        const statusKey = this.currentStatus as keyof typeof artSet;
        return artSet[statusKey] || artSet.full;
    },

    use: function (this: ItemConfig, gameContext?: Partial<ItemGameContext>) {
        // Called when used from inventory via ItemActionHandler
        let message = "The cheese is already gone!";
        let artChanged = false;
        let aPortionWasUsed = false;

        if (this.currentStatus !== 'empty') {
            this.timesUsed++;
            const previousStatus = this.currentStatus;

            if (this.currentStatus === 'full') {
                this.currentStatus = 'half';
                message = 'You take a big bite. The cheese is surprisingly sweet! It\'s now half-eaten.';
            } else if (this.currentStatus === 'half') {
                this.currentStatus = 'empty';
                message = 'You finish the cheese. It was delicious, with an odd, faint aftertaste of cola.';
            }
            artChanged = this.currentStatus !== previousStatus;
            aPortionWasUsed = artChanged;
        }

        return {
            newStatus: this.currentStatus,
            message: message,
            artChanged: artChanged,
            consumed: this.currentStatus === 'empty' && aPortionWasUsed
        };
    },

    handleCallback: function (this: ItemConfig, callbackId: string, gameContext: ItemGameContext) {
        switch (callbackId) {
            case 'pick_up_cheese':
                if (!this.collectible) {
                    gameContext.ui.showPlayerMessage("You decide against taking the cheese right now.");
                    return;
                }
                if (!(gameContext.inventoryManager as any).createInventoryItemData) {
                    console.error("FATAL: InventoryManager missing createInventoryItemData method!");
                    gameContext.ui.showPlayerMessage("Error: Could not pick up item.");
                    return;
                }

                gameContext.ui.showPlayerMessage("You cautiously pick up the blue cheese.");
                const invItem = (gameContext.inventoryManager as any).createInventoryItemData(this);
                gameContext.inventoryManager.addItem(invItem);

                // Add a clue related to picking up the cheese
                gameContext.clueManager.addClue({
                    id: this.clueId || `${this.id}_collected_clue`, // Unique clue ID
                    title: `${this.name || 'Blue Cheese'} Obtained`,
                    description: `You picked up a piece of ${this.name || 'blue cheese'}. ${this.description}`,
                    imageKey: this.getArt.call(this, 'small'),
                    category: this.clueCategory || 'evidence',
                    discovered: true,
                });

                if (gameContext.world.removeItemSprite && gameContext.interactedObject) {
                    gameContext.world.removeItemSprite(gameContext.interactedObject);
                }
                // If the dialogue should end or change, DialogueManager handles nextDialogueId.
                // If not, the dialogue might just close.
                break;

            case 'taste_cheese':
                // This 'taste_cheese' callback is for when the item is interacted with in the world,
                // NOT when used from inventory.
                // It directly modifies the state of the world item (this ItemConfig instance).

                let messageFromTaste = "It's already gone.";
                let artChangedFromTaste = false;

                if (this.currentStatus !== 'empty') {
                    this.timesUsed++; // Affects the world item's state directly
                    const previousStatus = this.currentStatus;

                    if (this.currentStatus === 'full') {
                        this.currentStatus = 'half';
                        messageFromTaste = 'You nibble a bit of the cheese. Sweet, with a cola aftertaste.';
                    } else if (this.currentStatus === 'half') {
                        this.currentStatus = 'empty';
                        messageFromTaste = 'You finish off the remaining cheese from where it lies. Quite addictive.';
                    }
                    artChangedFromTaste = this.currentStatus !== previousStatus;
                }

                gameContext.ui.showPlayerMessage(messageFromTaste);

                if (artChangedFromTaste && gameContext.interactedObject) {
                    // Update the world sprite's texture if such a function exists
                    // e.g., gameContext.world.updateItemSpriteTexture(gameContext.interactedObject, this.getArt.call(this, 'large'));
                    // For now, we'll assume the Body class might have a method to refresh its own texture.
                    if (typeof (gameContext.interactedObject as any).refreshTexture === 'function') {
                        (gameContext.interactedObject as any).refreshTexture();
                    }
                    console.log(`[blueCheese] World item '${this.id}' status changed to ${this.currentStatus}. Visual update needed for sprite.`);
                }

                // If tasting it generates a specific clue:
                gameContext.clueManager.addClue({
                    id: `${this.id}_tasted_clue`,
                    title: `${this.name || 'Cheese'} Tasted`,
                    description: `The ${this.name || 'cheese'} had a sweet taste with a distinct cola aftertaste. Feels a bit addictive. Current state: ${this.currentStatus}.`,
                    imageKey: this.getArt.call(this, 'small'),
                    category: this.clueCategory || 'evidence',
                    discovered: true,
                });

                // If the cheese becomes 'empty' and should disappear from the world after tasting:
                if (this.currentStatus === 'empty' && artChangedFromTaste && gameContext.world.removeItemSprite && gameContext.interactedObject) {
                    gameContext.world.removeItemSprite(gameContext.interactedObject);
                    gameContext.ui.showPlayerMessage("The cheese is now completely gone from its spot.");
                }
                break;
        }
    },

    onCollect: function (this: ItemConfig, gameContext: ItemGameContext) {
        // This is for a generic ACTION_PICKUP, if 'pick_up_cheese' wasn't directly handled.
        gameContext.ui.showPlayerMessage(`The ${this.name || 'blue cheese'} feels strangely compelling in your hand.`);
        return { collected: true, message: `${(this as any).name || this.id} added to inventory.` };
    }
};