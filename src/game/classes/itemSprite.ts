// src/classes/ItemSprite.ts

//import Phaser from 'phaser';
//import { Item } from '../classes/itemDatastruct';
//import { InventoryManager } from '../managers/itemMananger';

// src/classes/ItemSprite.ts  (extends Body so you keep proximity + dialogue)

import { ITEM_DATA, ItemConfig } from '../../data/items/itemTemplate';
import { InventoryManager } from '../managers/itemMananger';
import { GameState } from '../managers/GameState';
import { artKey } from '../scenes/ToturialScene/evidenceArtHelper';
import { evidenceArt } from '../scenes/ToturialScene/evidenceArtHelper';
import { Clue } from '../classes/clue';

export class ItemSprite extends Body {
    readonly cfg: ItemConfig;

    constructor(scene: Phaser.Scene, x: number, y: number, id: keyof typeof ITEM_DATA) {
        const cfg = ITEM_DATA[id];
        super(scene, x, y,
            typeof cfg.art.large === 'string'
                ? cfg.art.large
                : cfg.art.large.full,
            cfg.dialogue,            // dialogue bundled in cfg
            scene.registry.get('dialogueManager'),
            id,                      // uniqueId = itemId
            cfg.id, cfg.id, cfg.description,
            undefined,               // iconKey handled later
            cfg.collectible,
            undefined, undefined,
            cfg.defaultScale
        );
        this.cfg = cfg;
    }

    /** Called when the player chooses “pick up …” */
    public collect(): void {
        if (!this.cfg.collectible) return;

        /* ---- 1  add to inventory ---------------------------------- */
        const smallKey =
            typeof this.cfg.art.small === 'string'
                ? this.cfg.art.small
                : this.cfg.art.small.full;

        InventoryManager.getInstance().addItem({
            itemId: this.cfg.id,
            itemName: this.cfg.id,
            itemDescription: this.cfg.description,
            iconKey: smallKey,
            quantity: 1
        });

        /* ---- 2  discover clue & stamp icon key -------------------- */
        if (this.cfg.clueId) {
            const cm = GameState.getInstance().getClueManager();
            const clue = cm?.getClue(this.cfg.clueId);
            if (clue && !clue.discovered) {
                clue.discovered = true;
                clue.imageKey = smallKey;               // 32×32 for list / inv
                GameState.getInstance().getOrInitClueState(clue.id);
                this.scene.events.emit('clueCollected', clue);
            }
        }

        /* ---- 3  remove sprite & from interactables ---------------- */
        this.setActive(false).setVisible(false).destroy();
        const s = this.scene as { interactables?: any[] };
        s.interactables?.splice(s.interactables.indexOf(this), 1);

        this.scene.events.emit('inventoryUpdated');
    }
}
