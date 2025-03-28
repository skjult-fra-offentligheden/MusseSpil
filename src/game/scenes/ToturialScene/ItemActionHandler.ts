// src/handlers/ItemActionHandler.ts
import { Item } from "../../classes/itemDatastruct";
import Phaser from "phaser";
import { GlobalEvents } from '../../../factories/globalEventEmitter';

export class ItemActionHandler {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public useItem(activeItem: Item | null) {
        if (!activeItem) {
            console.warn("⚠️ No active item selected!");
            return;
        }

        const currentScene = this.scene.scene.key;
        //if (!activeItem.usableInScenes.includes(currentScene)) {
        //    console.warn(`❌ ${activeItem.itemName} cannot be used in ${currentScene}`);
        //    this.showTemporaryMessage(`🚫 You can't use ${activeItem.itemName} here.`);
        //    return;
        //}

        console.log(` Using active item: ${activeItem.itemId} in ${currentScene}`);
        GlobalEvents.emit('itemUsed', activeItem);

        switch (activeItem.itemId) {
            case "clueCheese":
                this.eatCheese(activeItem);
                break;
            case "glue":
                this.clueGlue();
                break;
            case "clueCoke":
                this.clueCoke();
                break;
            case "cluePhone":
                this.cluePhone();
                break;
            default:
                this.inspectItem(activeItem);
                break;
        }
    }

    /** Example: "Eat" item action */
    private eatCheese(item: Item) {
        this.showTemporaryMessage(`${item.itemName} was eaten!`);
    }
    
    private clueGlue() {
        this.showTemporaryMessage("sniff the glue");
    }

    private clueCoke() {
        this.showTemporaryMessage("Try the cocaine");
    }

    private cluePhone() {
        this.showTemporaryMessage("Hmm... the phone doesn't have battery");
    }

    /** Example: Inspecting an item */
    private inspectItem(item: Item) {
        this.showTemporaryMessage(`🔍 ${item.itemDescription}`);
    }

    /** Shows a temporary message */
    private showTemporaryMessage(message: string) {
        const messageText = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height - 100,
            message,
            {
                fontSize: "16px",
                color: "#ffffff",
                backgroundColor: "#000000",
                padding: { x: 10, y: 5 },
            }
        )
            .setOrigin(0.5)
            .setDepth(1005);

        // Make message disappear after 2 seconds
        this.scene.time.delayedCall(2000, () => {
            messageText.destroy();
        });
    }
}
