import { ItemConfig, EvidencePhase, DialogueNode } from '../itemTemplate'; // Adjust path
import { ItemGameContext } from '../../handlers/CallbackHandler';      // Adjust path

export const glue: ItemConfig = {
    id: 'clueGlue', // Maybe rename to 'glueTube' or similar if 'clue' prefix is just for Tiled
    name: 'Tube of Glue',
    clueId: 'clue_glue_tube', // Specific clue ID
    art: {
        // For non-phased items, art can be a direct string if ItemConfig supports it,
        // or you can use PhasedArt with only a 'full' entry.
        // The itemTemplate's art property was: string | PhaseArt
        // So this is valid:
        small: 'assets/tilemaps/toturial_inside/glue_32x32.png',
        large: 'assets/tilemaps/toturial_inside/glue_64x64.png'
        // Alternatively, if you strictly use PhasedArt for all:
        // small: { full: 'assets/tilemaps/toturial_inside/glue_32x32.png' },
        // large: { full: 'assets/tilemaps/toturial_inside/glue_64x64.png' }
    },
    defaultScale: 0.5,
    description: 'A standard tube of strong adhesive. Could be useful for repairs... or something more nefarious.',
    collectible: true,

    // --- DIALOGUE (from your original) ---
    dialogue: [
        {
            id: "greeting",
            text: "You see a tube of glue on the table.",
            options: [
                {
                    id: "inspectCloser",
                    text: "Inspect the glue.",
                    nextDialogueId: "inspectionDetails"
                },
                {
                    id: "leaveBody",
                    text: "Leave the glue alone."
                }
            ]
        },
        {
            id: "inspectionDetails",
            text: "It's a tube of industrial-strength adhesive. The nozzle seems clean, like it hasn't been used recently.",
            options: [
                {
                    id: "takeNoteAndPickup",
                    text: "Take note and pick up the glue.",
                    callbackId: "pick_up_glue_and_note", // Descriptive callback
                    // nextDialogueId: "inspectionEnd" // Optional: DM handles next node
                },
                {
                    id: "pickupOnly",
                    text: "Just pick up the glue.",
                    callbackId: "pick_up_glue",
                },
                {
                    id: "doSomething",
                    text: "It's just glue. Probably not important.",
                    nextDialogueId: "disregard"
                }
            ]
        },
        {
            id: "inspectionEnd", // This node might be better reached via nextDialogueId from a callback
            text: "You pocket the tube of glue.",
            options: []
        },
        {
            id: "disregard",
            text: "You leave the glue on the table, deciding it's not relevant.",
            options: []
        }
    ] as DialogueNode[],

    // --- STATE ---
    // For glue, 'status' might represent if it's been used for a specific quest purpose.
    // 'full' = unused, 'empty' = used for its one quest purpose.
    initialStatus: 'full', // 'full' meaning "available/unused"
    timesUsed: 0,          // Could track if it's been used for its quest purpose
    currentStatus: 'full', // Starts as 'full' (available)

    // --- CLUE INFO (Optional) ---
    clueCategory: 'evidence', // Or 'evidence' if its presence is a clue
    clueFoundAt: 'police Table',

    // --- METHODS ---
    getArt: function (this: ItemConfig, size: 'small' | 'large'): string {
        const artPath = this.art[size];
        if (typeof artPath === 'string') {
            return artPath; // Direct path for non-phased art
        }
        // If it were PhasedArt, you'd select based on this.currentStatus:
        // const statusKey = this.currentStatus as keyof typeof artPath;
        // return artPath[statusKey] || artPath.full;
        return artPath.full; // Default to 'full' if using PhasedArt structure with one entry
    },

    use: function (this: ItemConfig, gameContext?: Partial<ItemGameContext> & { targetItem?: ItemConfig }) {
        // Called when "used" from inventory, possibly on another item/object.
        // For glue, 'use' might require a target.
        if (this.currentStatus === 'empty') { // 'empty' means "used for its purpose"
            return {
                newStatus: this.currentStatus,
                message: "You've already used this glue.",
                artChanged: false,
                consumed: false // It's already "consumed" in the sense of being used up
            };
        }

        if (gameContext?.targetItem) {
            // Example: Trying to use glue on a 'brokenVase'
            if (gameContext.targetItem.id === 'brokenVase' && gameContext.targetItem.currentStatus === 'broken') {
                this.currentStatus = 'empty'; // Glue is now "used up"
                this.timesUsed++;
                // gameContext.targetItem.currentStatus = 'repaired'; // Update target item's state
                // (gameContext.targetItem as any).updateArt?.(); // If target item needs visual update
                return {
                    newStatus: this.currentStatus,
                    message: `You skillfully used the glue to repair the ${gameContext.targetItem.name || 'item'}! The glue tube is now empty.`,
                    artChanged: false, // Glue's art doesn't change, but it's "conceptually" empty
                    consumed: true    // The glue item is now "used up" and could be removed
                };
            } else {
                return {
                    newStatus: this.currentStatus,
                    message: `You can't use the glue on the ${gameContext.targetItem.name || 'item'} right now.`,
                    artChanged: false,
                    consumed: false
                };
            }
        }

        // If used without a target, or on an invalid target
        return {
            newStatus: this.currentStatus,
            message: "You look at the tube of glue. What do you want to use it on?",
            artChanged: false, // Glue's art itself doesn't change based on doses
            consumed: false   // Not consumed if just inspected or used improperly
        };
    },

    handleCallback: function (this: ItemConfig, callbackId: string, gameContext: ItemGameContext) {
        const itemName = this.name || 'Glue Tube';

        switch (callbackId) {
            case 'pick_up_glue':
            case 'pick_up_glue_and_note':
                if (!this.collectible) {
                    gameContext.ui.showPlayerMessage(`You can't pick up the ${itemName}.`);
                    return;
                }
                if (!(gameContext.inventoryManager as any).createInventoryItemData) {
                    console.error("FATAL: InventoryManager missing createInventoryItemData method!");
                    gameContext.ui.showPlayerMessage("Error: Could not pick up item.");
                    return;
                }

                gameContext.ui.showPlayerMessage(`You pick up the ${itemName}.`);
                const invItem = (gameContext.inventoryManager as any).createInventoryItemData(this);
                gameContext.inventoryManager.addItem(invItem);

                let clueDescription = `A tube of strong adhesive collected.`;
                if (callbackId === 'pick_up_glue_and_note') {
                    clueDescription += ` It appears to be unused. Could it be related to something?`;
                }

                gameContext.clueManager.addClue({
                    id: this.clueId || `${this.id}_collected`,
                    title: `${itemName} Obtained`,
                    description: clueDescription,
                    imageKey: this.getArt.call(this, 'small'),
                    category: this.clueCategory || 'tool',
                    discovered: true,
                });

                if (gameContext.world.removeItemSprite && gameContext.interactedObject) {
                    gameContext.world.removeItemSprite(gameContext.interactedObject);
                }
                // Optionally, trigger a specific dialogue node if desired, e.g., by setting nextDialogueId
                // in the dialogue option, or by having DialogueManager react to an event.
                // For example, after pickup, directly go to 'inspectionEnd' if you want that text.
                // This usually requires gameContext to have a reference to dialogueManager.
                // if (gameContext.dialogueManager) gameContext.dialogueManager.goToNode('inspectionEnd');
                break;
        }
    },

    onCollect: function (this: ItemConfig, gameContext: ItemGameContext) {
        // Fallback for generic 'ACTION_PICKUP'.
        const itemName = this.name || 'Glue Tube';
        gameContext.ui.showPlayerMessage(`The ${itemName} might come in handy.`);
        return { collected: true, message: `${itemName} added to inventory.` };
    }
};