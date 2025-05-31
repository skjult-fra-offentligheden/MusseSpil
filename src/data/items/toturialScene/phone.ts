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
    // For a phone, 'status' could track level of information extraction or battery.
    initialStatus: 'full', // Represents "not fully investigated yet" or "battery full"
    timesUsed: 0,          // Could count how many times info is accessed from inventory
    currentStatus: 'full',

    // --- CLUE INFO ---
    clueCategory: 'device', // Or 'evidence'
    // clueFoundAt: 'Victim's Apartment - Bedside Table',

    // --- METHODS ---
    getArt: function (this: ItemConfig, size: 'small' | 'large'): string {
        const artPath = this.art[size];
        if (typeof artPath === 'string') {
            return artPath; // Direct path if not phased by battery/screen state
        }
        // If art was phased (e.g., by battery):
        // const statusKey = this.currentStatus as keyof typeof artPath;
        // return artPath[statusKey] || artPath.full;
        return artPath.full; // Assuming 'full' is the default/only art if using PhasedArt structure
    },

    use: function (this: ItemConfig, gameContext?: Partial<ItemGameContext>) {
        // Called when "used" from inventory.
        // Could allow re-reading messages, checking contacts, or trying to make a call.
        this.timesUsed++;

        if (this.currentStatus === 'empty') { // 'empty' could mean "battery dead"
            return {
                newStatus: this.currentStatus,
                message: "The phone's battery is dead. Can't use it.",
                artChanged: false, // Art might change if 'empty' status has different art
                consumed: false
            };
        }

        // Example: Using phone from inventory cycles through discovered info or allows specific actions.
        // This is a simplified example. A real phone might have its own mini-UI or more complex interactions.
        let message = "You scroll through the phone again...\n";
        if (this.clueId === 'clue_phone_gang_connection') { // Check if the key clue was already generated
            message += "- Last call to 'The Butcher' (gang).\n- Texts about 'package' deals.";
        } else if (this.clueId === 'clue_phone_drug_texts') { // Simpler clue from messages only
            message += "- Texts about 'package' deals.";
        } else {
            message += "It seems to be a regular old phone, but you haven't checked it thoroughly yet.";
        }

        // Potentially, using it could "drain battery" and change currentStatus to 'empty'
        // if (this.timesUsed > 5) { this.currentStatus = 'empty'; artChanged = true; }

        return {
            newStatus: this.currentStatus,
            message: message,
            artChanged: false, // Unless battery state changes art
            consumed: false    // Phone isn't typically "consumed" by use
        };
    },

    handleCallback: function (this: ItemConfig, callbackId: string, gameContext: ItemGameContext) {
        const itemName = this.name || 'Phone';
        let clueTitle = `${itemName} Info`;
        let clueDescription = `The ${itemName} was examined.`;
        let specificClueId = this.clueId || `${this.id}_info`; // Default clueId

        const pickupAndClueActions = () => {
            if (!this.collectible) {
                gameContext.ui.showPlayerMessage(`You can't pick up the ${itemName}.`);
                return;
            }
            if (!(gameContext.inventoryManager as any).createInventoryItemData) {
                console.error("FATAL: InventoryManager missing createInventoryItemData method!");
                gameContext.ui.showPlayerMessage("Error: Could not pick up item.");
                return;
            }

            gameContext.ui.showPlayerMessage(`You take the ${itemName}.`);
            const invItem = (gameContext.inventoryManager as any).createInventoryItemData(this);
            gameContext.inventoryManager.addItem(invItem);

            gameContext.clueManager.addClue({
                id: specificClueId,
                title: clueTitle,
                description: clueDescription,
                imageKey: this.getArt.call(this, 'small'),
                category: this.clueCategory || 'device',
                discovered: true,
            });

            if (gameContext.world.removeItemSprite && gameContext.interactedObject) {
                gameContext.world.removeItemSprite(gameContext.interactedObject);
            }
            // Optionally move to a specific dialogue node after pickup
            if ((gameContext as any).dialogueManager && typeof (gameContext as any).dialogueManager.goToNode === 'function') {
                (gameContext as any).dialogueManager.goToNode('inspectionEnd');
            }
        };

        switch (callbackId) {
            case 'pick_up_phone_silently': // Just pick up, no specific info noted yet
                clueTitle = `${itemName} Collected`;
                clueDescription = `An old cell phone. You haven't had a chance to look through it properly yet.`;
                specificClueId = `${this.id}_collected_uninspected`;
                this.currentStatus = 'full'; // Represents "uninspected" or "info not extracted"
                pickupAndClueActions();
                break;

            case 'pick_up_phone_noted_messages':
                clueTitle = `Drug Texts on ${itemName}`;
                clueDescription = `Messages on the ${itemName} discuss drug deals involving 'packages' and payments.`;
                specificClueId = 'clue_phone_drug_texts'; // Specific clue for this info
                this.currentStatus = 'half'; // Some info extracted
                pickupAndClueActions();
                break;

            case 'pick_up_phone_noted_gang_call': // This was your original "pick_up_phone"
                clueTitle = `Gang Connection via ${itemName}`;
                clueDescription = `The ${itemName}'s call log shows frequent calls to a contact named 'The Butcher', suggesting gang ties. Messages also mention drug deals.`;
                specificClueId = 'clue_phone_gang_connection'; // The main clue this phone offers
                this.currentStatus = 'empty'; // All (or key) info extracted
                pickupAndClueActions();
                break;
        }
    },

    onCollect: function (this: ItemConfig, gameContext: ItemGameContext) {
        // Fallback for a generic 'ACTION_PICKUP', less likely used with specific callbacks.
        const itemName = this.name || 'Phone';
        gameContext.ui.showPlayerMessage(`This ${itemName} looks like it holds secrets.`);
        // This would create a very generic clue. Prefer specific callbacks.
        gameContext.clueManager.addClue({
            id: `${this.id}_generic_collect`,
            title: `${itemName} Found`,
            description: `An old cell phone was found. It might contain useful information.`,
            imageKey: this.getArt.call(this, 'small'),
            category: this.clueCategory || 'device',
            discovered: true,
        });
        return { collected: true, message: `${itemName} added to inventory.` };
    }
};