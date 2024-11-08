// src/classes/ItemSprite.ts

import Phaser from 'phaser';
import { Item } from '../managers/itemDatastruct';
import { InventoryManager } from '../managers/itemMananger';

export class ItemSprite extends Phaser.Physics.Arcade.Sprite {
  private itemData: Item;
  private collected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, itemData: Item) {
    super(scene, x, y, texture);
    this.itemData = itemData;

    // Enable physics
    scene.physics.world.enable(this);
    this.setInteractive({ useHandCursor: true });
  }

  update() {
    // Optional: Add any animations or behaviors
  }

  collect(inventoryManager: InventoryManager) {
    if (!this.collected) {
      inventoryManager.addItem(this.itemData);
      this.collected = true;
      this.destroy(); // Remove the item from the world
    }
  }
}
