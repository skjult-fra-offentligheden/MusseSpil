// src/managers/InventoryManager.ts

import { Item } from '../managers/itemDatastruct';

export class InventoryManager {
  private items: Map<string, Item>;

  constructor() {
    this.items = new Map();
  }

  addItem(newItem: Item) {
    console.log("new item: " + newItem)
    console.log("new item id " + newItem.itemId)
    if (this.items.has(newItem.itemId)) {
      const existingItem = this.items.get(newItem.itemId)!;
      existingItem.quantity += newItem.quantity;
    } else {
      this.items.set(newItem.itemId, { ...newItem });
    }
    this.showItemNotification(newItem);
  }

  removeItem(itemId: string, quantity: number = 1) {
    if (this.items.has(itemId)) {
      const item = this.items.get(itemId)!;
      item.quantity -= quantity;
      if (item.quantity <= 0) {
        this.items.delete(itemId);
      }
    }
  }

  getItems(): Item[] {
    return Array.from(this.items.values());
  }

  private showItemNotification(item: Item) {
    // Implement a notification to inform the player of the new item
  }

  saveInventory() {
    // Implement saving the inventory state
  }

  loadInventory() {
    // Implement loading the inventory state
  }
}
