import { ItemConfig, EvidencePhase, DialogueNode } from '../itemTemplate'; // Adjust path
import { ItemGameContext } from '../../../game/managers/CallBackManager';      // Adjust path

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
    getArt: function (this: ItemConfig, size: 'small' | 'large', phase?: EvidencePhase | 'fixed'): string {
        const artPath = this.art[size];
        if (typeof artPath === 'string') {
            return artPath;
        }
        return artPath.full;
    },

    // --- FIX: Updated use method to be stateless ---
    use: function (this: ItemConfig, gameContext: ItemGameContext) {
        const { gameState } = gameContext;

        // 1. Check if we have already sniffed it multiple times
        if (!gameState.getFlag("playerDidGlue_1")) {
            gameState.setFlag("playerDidGlue_1", true);
            return { 
                message: "You take a deep sniff of the glue. Whoa, that smells strong... and chemically.", 
                artChanged: false, 
                consumed: false 
            };
        } 
        else if (!gameState.getFlag("playerDidGlue_2")) {
            gameState.setFlag("playerDidGlue_2", true);
            return { 
                message: "You sniff it again. Your head starts spinning slightly. Why are you doing this?", 
                artChanged: false, 
                consumed: false 
            };
        } 
        else {
            // Depending on how far you want to go, you can keep setting this or stop at 3
            gameState.setFlag("playerDidGlue_3", true); 
            return { 
                message: "Okay, you definitely have a problem now. The world looks a bit wobbly.", 
                artChanged: false, 
                consumed: false 
            };
        }
    },

    // --- FIX: Updated handleCallback to be stateless ---
    handleCallback: function (this: ItemConfig, callbackId: string, gameContext: ItemGameContext) {
        const { clueManager, inventoryManager, ui, world, interactedObject } = gameContext;

        switch (callbackId) {
            case 'pick_up_glue':
            case 'pick_up_glue_and_note':
                if (!this.collectible) {
                    ui.showPlayerMessage(`You can't pick up the ${this.name}.`);
                    return;
                }

                ui.showPlayerMessage(`You pick up the ${this.name}.`);
                inventoryManager.addItem(inventoryManager.createInventoryItemData(this));

                let clueDescription = `A tube of strong adhesive collected.`;
                if (callbackId === 'pick_up_glue_and_note') {
                    clueDescription += ` It appears to be unused.`;
                }

                clueManager.addClue({
                    id: this.clueId!,
                    title: `${this.name} Obtained`,
                    description: clueDescription,
                    imageKey: this.getArt.call(this, 'small'),
                    category: this.clueCategory!,
                    discovered: true,
                });

                if (world.removeItemSprite && interactedObject) {
                    world.removeItemSprite(interactedObject);
                }
                break;
        }
    }
};