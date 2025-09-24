import { ItemConfig, EvidencePhase, DialogueNode } from '../itemTemplate'; // Adjust path
import { ItemGameContext } from '../../handlers/CallbackHandler';      // Adjust path

export const phone: ItemConfig = {
    id: 'cluePhone', // Consider renaming to 'oldPhone' or 'burnerPhone'
    name: 'Suspicious Cell Phone',
    clueId: 'clue_phone_gang_connection', // Clue generated from its key info
    art: {
        // Phone art likely doesn't change phase from simple use, unless battery dies or screen cracks
        // Using direct string paths as it's not typically "consumed" like food/drugs
        small: 'assets/tilemaps/toturial_inside/phone_32x32.png',
        large: 'assets/tilemaps/toturial_inside/phone_64x64.png'
        // If it had battery states with different art:
        // small: { full: 'path/phone_on.png', empty: 'path/phone_off.png' }
    },
    defaultScale: 0.5,
    description: 'An old, slightly battered cell phone. It seems to have some interesting messages and call logs.',
    collectible: true,

    // --- DIALOGUE (from your original, slightly tweaked for clarity) ---
    dialogue: [
        {
            id: "greeting",
            text: "An old cell phone lies here. It looks like it might still work.",
            options: [
                {
                    id: "inspectCloser",
                    text: "Examine the phone.",
                    nextDialogueId: "inspectionScreenOn" // Let's assume it turns on
                },
                {
                    id: "leaveBody",
                    text: "It's just a phone. Leave it."
                }
            ]
        },
        {
            id: "inspectionScreenOn",
            text: "The screen flickers to life. It's not password protected. The last message thread is open...",
            options: [
                {
                    id: "readMessages",
                    text: "Read the messages.",
                    nextDialogueId: "inspectionDetails"
                },
                {
                    id: "checkCallLog",
                    text: "Check the call log.",
                    nextDialogueId: "callLogDetails" // New node for call log
                },
                {
                    id: "takeAndLeave",
                    text: "Just pick it up for later.",
                    callbackId: "pick_up_phone_silently"
                }
            ]
        },
        {
            id: "inspectionDetails", // Info from messages
            text: "The messages discuss meetups and payments for 'packages'. Definitely drug-related.",
            options: [
                {
                    id: "takeNoteMessages",
                    text: "Note the drug deal texts & take phone.",
                    callbackId: "pick_up_phone_noted_messages",
                    // nextDialogueId: "inspectionEnd" // Optional
                },
                {
                    id: "continueInspecting",
                    text: "Anything else on it?",
                    nextDialogueId: "callLogDetails" // Go to check call log
                }
            ]
        },
        {
            id: "callLogDetails", // Info from call log
            text: "The call log shows frequent calls to a number labeled 'The Butcher' - sounds like a gang contact.",
            options: [
                {
                    id: "takeNoteCallLog",
                    text: "Note gang connection & take phone.",
                    callbackId: "pick_up_phone_noted_gang_call",
                    // nextDialogueId: "inspectionEnd" // Optional
                },
                {
                    id: "continueInspectingMessages",
                    text: "Re-check messages.",
                    nextDialogueId: "inspectionDetails"
                }
            ]
        },
        {
            id: "inspectionEnd", // Generic end after picking up
            text: "You pocket the phone. This could be crucial.",
            options: []
        },
        {
            id: "disregard", // If player chooses to ignore info (though dialogue leads to taking it)
            text: "You decide it's too much hassle and leave the phone.",
            options: []
        }
    ] as DialogueNode[],

    // --- STATE ---
    // 'full' = uninspected / basic info known
    // 'half' = some key info discovered (e.g., messages read)
    // 'empty' = all key info discovered (e.g., messages and call log noted) or battery dead

    // --- CLUE INFO ---
    clueCategory: 'evidence', // Or 'evidence'
    // clueFoundAt: 'Victim's Apartment - Bedside Table',

    getArt: function (this: ItemConfig, size: 'small' | 'large', phase?: EvidencePhase | 'fixed'): string {
        const artPath = this.art[size];
        if (typeof artPath === 'string') {
            return artPath;
        }
        // This part handles if you ever make the art phased (e.g. cracked screen)
        return artPath.full;
    },

    use: function (this: ItemConfig, gameContext: ItemGameContext) {
        // Using the phone from inventory just shows the latest clue description
        const clue = gameContext.clueManager.getClue(this.clueId!);
        const message = clue ? `You check the phone: "${clue.description}"` : "You look at the phone.";

        return {
            newStatus: 'full', // Phone status doesn't change from simple use
            message: message,
            artChanged: false,
            consumed: false
        };
    },

    handleCallback: function (this: ItemConfig, callbackId: string, gameContext: ItemGameContext) {
        const { clueManager, inventoryManager, ui, world, interactedObject, gameState } = gameContext;

        const pickupAndClueActions = (clueDescription: string, clueTitle: string, newPhase: EvidencePhase) => {
            if (!this.collectible) {
                ui.showPlayerMessage(`You can't pick up the ${this.name}.`);
                return;
            }

            ui.showPlayerMessage(`You take the ${this.name}.`);
            // Add to inventory *before* setting clue, so inventory has it
            inventoryManager.addItem(inventoryManager.createInventoryItemData(this));

            // Mark the item as "partially investigated" or "fully investigated" in GameState
            gameState.getOrInitClueState(this.clueId!).phase = newPhase;

            // Add or update the central clue
            if (!clueManager.hasClue(this.clueId!)) {
                clueManager.addClue({
                    id: this.clueId!,
                    title: clueTitle,
                    description: clueDescription,
                    imageKey: this.getArt.call(this, 'small'),
                    category: this.clueCategory!,
                    discovered: true,
                });
            } else {
                clueManager.updateClueDetails(this.clueId!, {
                    title: clueTitle,
                    description: clueDescription,
                });
            }

            if (world.removeItemSprite && interactedObject) {
                world.removeItemSprite(interactedObject);
            }
        };

        switch (callbackId) {
            case 'pick_up_phone_silently':
                pickupAndClueActions(`An old cell phone. You haven't had a chance to look through it properly yet.`, `${this.name} Collected`, 'full');
                break;

            case 'pick_up_phone_noted_messages':
                pickupAndClueActions(`Messages on the phone discuss drug deals involving 'packages' and payments.`, `Drug Texts on ${this.name}`, 'half');
                break;

            case 'pick_up_phone_noted_gang_call':
                pickupAndClueActions(`The phone's call log shows frequent calls to a contact named 'The Butcher', suggesting gang ties.`, `Gang Connection via ${this.name}`, 'empty');
                break;
        }
    }
};