import Phaser from 'phaser';
import { InventoryManager } from '../../managers/itemMananger';
import { Item } from '../../managers/itemDatastruct';

interface StoryUnit{
  action: Phaser.GameObjects.Sprite| null;
  reaction: Phaser.GameObjects.Sprite| null;
}

export class InventoryScene extends Phaser.Scene {
  private inventoryManager!: InventoryManager;
  private items: Item[] = [];
  public storySlots: Phaser.GameObjects.Rectangle[] = [];
  private inventorySlots: Phaser.GameObjects.Rectangle[] = [];
  private storySlotData: StoryUnit[] = [];
  private storyUnits: { [key: string]: StoryUnit} = {};
  private inventorySlotData: { item: Item | null }[] = [];
  private itemSprites: Phaser.GameObjects.Sprite[] = []; 

  constructor() {
      super({ key: 'InventoryScene' });
  }
  
  preload() {
    // Preload the sprite sheet for the detective (3 frames in this case)

    //in future load necessary sprites from database
    this.load.spritesheet('detectiveCombined', 'assets/storyModeSprites/storyLineDetectiveGun.png', {
      frameWidth: 256,
      frameHeight: 256
    });

    // Preload the gun sprite
    this.load.image('gun', 'assets/storyModeSprites/gun.png');
}

  init(data: { inventoryManager: InventoryManager }) {
      this.inventoryManager = data.inventoryManager;
  }

  create() {
    //const detective = this.add.sprite(400, 300, 'detective', 0); // First frame
    const detectiveSprite = this.add.sprite(400, 300, 'detective', 0); // First frame

    // Create the gun sprite
    const gun = this.add.sprite(200, 300, 'gun');

      // Define the new animation
      this.anims.create({
        key: 'detectiveCombinedAnim',
        frames: this.anims.generateFrameNumbers('detectiveCombined', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
      });

    // Add background rect
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8)
    .setOrigin(0);

    const storyRows = 2;
    const storycols = 3;
    this.createStorySlots(storyRows, storycols)

    

    this.createInventorySlots(3, 6, this.inventoryManager.getItems());
    this.input.keyboard!.on('keydown-I', () => {
      this.scene.stop();
      this.scene.resume('Game');
    });
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.stop();
      this.scene.resume('Game');
    });

}

addItem(item: Item) {
  this.items.push(item);
}

getItems(): Item[] {
  return this.items;
}

private createStorySlots(slotRows: number, slotCols: number) {
  /*
  I want the output to be:
  { row0, col0 : [x1, y1] [x2, y2] .... row0, col2: [x3, y3] [x3, y3]
  row1, col0 : [x1, y1] [x2, y2] .... row1, col2: [x3, y3] [x3, y3] }
  */
  const screenWidth = this.scale.width;
  const screenHeight = this.scale.height;

  const slotWidth = screenWidth / slotCols;
  const slotHeight = (screenHeight * 0.66) / slotRows;

  // Create matrix of slots
  for (let row = 0; row < slotRows; row++) {
    for (let col = 0; col < slotCols; col++) {


      const x = slotWidth * col + slotWidth / 2;
      const y = slotHeight * row + slotHeight / 2;

      const slot = this.add.rectangle(x, y, slotWidth - 10, slotHeight - 10, 0xaaaaaa);
      slot.setStrokeStyle(2, 0x000000);
      //slot.setData('slotIndex', this.storySlots.length);

      // Store slot dimensions for future use
      slot.setData('slotWidth', slotWidth);
      slot.setData('slotHeight', slotHeight);

      const dropSlotAction = this.add.rectangle(x-100, y, 100, 100, 0xaaaffb)
      const dropSlotReaction = this.add.rectangle(x+100, y, 100, 100, 0xaaafff)

      dropSlotAction.setData("slotIndex", this.storySlotData.length);
      dropSlotReaction.setData("slotIndex", this.storySlotData.length);

      dropSlotAction.setInteractive();
      dropSlotReaction.setInteractive();


      dropSlotAction.input.dropZone = true;
      dropSlotReaction.input.dropZone = true;

      this.storySlots.push(dropSlotAction);
      this.storySlots.push(dropSlotReaction);

      const slotKey = `row${row}_col${col}`;
      

      // Initialize the array for this slot key if it doesn't exist
      if (!this.storyUnits[slotKey]) {
        this.storyUnits[slotKey] = { action: null, reaction: null };
      }

      this.storySlots.push(dropSlotAction, dropSlotReaction);
      this.storySlotData.push(this.storyUnits[slotKey]);      


      //slot.input.dropZone = true; // Enable drop zone for story slots

      // Store the slot and its data
      //this.storySlots.push(dropSlotAction);
      console.log("story slot data"+ JSON.stringify(this.storySlotData) ) ;
    }
  }
}

private placeItemInStorySlot(sprite: Phaser.GameObjects.Sprite, slotIndex: number, subSlotType: 'action'|'reaction') {
  const slot = this.storySlots[slotIndex];
  const slotData = this.storySlotData[slotIndex];

  console.log("story slot data in place item in story " + JSON.stringify(this.storySlotData) + "  " + slot) ;


  // Clear previous slot data
  const previousSlotType = sprite.getData('currentSlotType');
  const previousSlotIndex = sprite.getData('currentSlotIndex');

  //clear stuff
  if (previousSlotType === 'inventory' && previousSlotIndex !== undefined) {
    /* 
    if it moves from inventory and the previousSlotIndex doesn't exist.
    Remove the thing from inventory
    */
    this.inventorySlotData[previousSlotIndex].item = null;
  } else if (previousSlotType === 'story' && previousSlotIndex !== undefined) {
    /*
    if it moves from story slot to story slot
    */
    const prevSlotData = this.storySlotData[previousSlotIndex];
    const itemIndex = prevSlotData.items.findIndex(i => i === (sprite as any).item);

    if (itemIndex !== -1) {
      prevSlotData.items.splice(itemIndex, 1);
    }
  }

  // Add the item to the slot's items array
  this.storySlotData[slotIndex].items.push(sprite.item);

  // Update the item's current slot index and type
  sprite.setData('currentSlotIndex', slotIndex);
  sprite.setData('currentSlotType', 'story');

  // Position the sprite within the slot
  const itemsInSlot = slotData.items.length;
  const maxItemsPerSlot = 4; // Adjust as needed


  const spacing = (slot.width - 20);

  const positionIndex = itemsInSlot - 1;



  sprite.x = slot.x - (slot.width / 2) + spacing * positionIndex + spacing / 2;
  sprite.y = slot.y;
  console.log(`sprite X and Y ${sprite.x} and ${sprite.y}`);

  // Scale the item to fit within the allocated space
  const scaleFactor = this.scaleToFit(spacing - 10, slot.height - 20, sprite.width, sprite.height);
  sprite.setScale(scaleFactor);

  // Re-enable dragging for the sprite after placing it in the story slot
  sprite.setInteractive({ draggable: true });
  this.input.setDraggable(sprite);
}


private findNearestInventorySlot(sprite: Phaser.GameObjects.Sprite): number | null {
  for (let i = 0; i < this.inventorySlots.length; i++) {
    const slot = this.inventorySlots[i];
    const slotData = this.inventorySlotData[i];

    if (!slotData.item) { // Check if the slot is empty
      return i; // Return the index of the nearest available slot
    }
  }
  return null; // No available slot
}

private scaleToFitSlot(sprite: Phaser.GameObjects.Sprite, slot: Phaser.GameObjects.Rectangle, type: 'npc' | 'item' ) {
  // Get slot dimensions from slot data
  const slotWidth = slot.getData('slotWidth');
  const slotHeight = slot.getData('slotHeight');

  // Get sprite dimensions (item or NPC)
  const spriteWidth = sprite.width;
  const spriteHeight = sprite.height;

  // Calculate scaling factor using the scaleToFit function
  const scaleFactor = this.scaleToFit(slotWidth, slotHeight, spriteWidth, spriteHeight);

  // Apply the scaling factor to the sprite (item or NPC)
  sprite.setScale(scaleFactor);

}

private scaleToFit(containerWidth: number, containerHeight: number, npcWidth: number, npcHeight: number): number {
  // Calculate the scaling factor for both width and height
  const widthScale = containerWidth / npcWidth;
  const heightScale = containerHeight / npcHeight;

  // Use the smaller scaling factor to maintain the aspect ratio
  return Math.min(widthScale, heightScale);
}

private placeItemInInventorySlot(sprite: Phaser.GameObjects.Sprite, slotIndex: number) {
  const slot = this.inventorySlots[slotIndex];
  const slotData = this.inventorySlotData[slotIndex];

  // Check if the inventory slot is already occupied
  if (slotData.item) {
    // The slot is already occupied, return the item to its original position
    sprite.x = sprite.input.dragStartX;
    sprite.y = sprite.input.dragStartY;
    return;
  }

  // Clear previous slot data
  const previousSlotType = sprite.getData('currentSlotType');
  const previousSlotIndex = sprite.getData('currentSlotIndex');

  if (previousSlotType === 'story' && previousSlotIndex !== undefined) {
    const prevSlotData = this.storySlotData[previousSlotIndex];
    const itemIndex = prevSlotData.items.findIndex(i => i === sprite.item);
    if (itemIndex !== -1) {
      prevSlotData.items.splice(itemIndex, 1);
    }
  } else if (previousSlotType === 'inventory' && previousSlotIndex !== undefined) {
    this.inventorySlotData[previousSlotIndex].item = null;
  }

  // Position the sprite in the inventory slot (centered)
  sprite.x = slot.x;
  sprite.y = slot.y;

  // Update the item's current slot index and type
  sprite.setData('currentSlotIndex', slotIndex);
  sprite.setData('currentSlotType', 'inventory');

  // Mark the slot as occupied
  slotData.item = sprite.item;

  // Scale the item to fit the inventory slot
  this.scaleToFitSlot(sprite, slot, 'item');
}

private createInventorySlots(itemRows: number, itemCols: number, items: Item[]) {
  const screenWidth = this.scale.width;
  const screenHeight = this.scale.height;

  const itemWidth = screenWidth / itemCols;
  const itemHeight = (screenHeight * 0.33) / itemRows;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    const row = Math.floor(index / itemCols);
    const col = index % itemCols;

    const x = itemWidth * col + itemWidth / 2;
    const y = itemHeight * row + screenHeight * 0.66 + itemHeight / 2;

    // Create the inventory slot rectangle (optional)
    const slot = this.add.rectangle(x, y, itemWidth - 10, itemHeight - 10, 0xCC0000);
    slot.setStrokeStyle(2, 0x000000);
    slot.setData('slotIndex', this.inventorySlots.length);
    slot.setData('type', 'slot');  // Set type as "slot"
    slot.setData('slotWidth', itemWidth - 10);
    slot.setData('slotHeight', itemHeight - 10);

    // Add to the inventorySlots array
    this.inventorySlots.push(slot);
    this.inventorySlotData.push({ item: null });

    // Create sprite for the item's icon
    const sprite = this.add.sprite(x, y, item.iconKey) as DraggableSprite;
    sprite.item = item;
    sprite.setInteractive({ draggable: true });
    sprite.setData('type', 'item');  // Set type as "item"
    sprite.setData('itemKey', item.iconKey);

    // Handle drag events
    this.input.setDraggable(sprite);

    sprite.on('dragstart', (pointer, dragX, dragY) => {
      sprite.setDepth(1000); // Bring to front
      sprite.input.dragStartX = sprite.x;
      sprite.input.dragStartY = sprite.y;
    });

    sprite.on('drag', (pointer, dragX, dragY) => {
      sprite.x = dragX;
      sprite.y = dragY;
    });

    // Handle the dragend event
    sprite.on('dragend', (pointer, dragX, dragY, dropped) => {
      const thresholdY = this.scale.height * 0.66; // Define the threshold for inventory section
    
      if (!dropped) {
        if (sprite.y > thresholdY) {
          // The item is in the inventory zone, place it in the nearest available inventory slot
          const nearestInventorySlot = this.findNearestInventorySlot(sprite);
          if (nearestInventorySlot !== null) {
            this.placeItemInInventorySlot(sprite, nearestInventorySlot);
          } else {
            // If no inventory slot available, return to original position
            sprite.x = sprite.input.dragStartX;
            sprite.y = sprite.input.dragStartY;
          }
        } else {
          // The item is above the threshold, return to original position
          sprite.x = sprite.input.dragStartX;
          sprite.y = sprite.input.dragStartY;
        }
      }
    });

    // Apply scaling to the item to fit the inventory slot
    this.scaleToFitSlot(sprite, slot, 'item');  // Pass 'item' as the type
    sprite.on('drop', (pointer, dropZone) => {
      const slotIndex = dropZone.getData('slotIndex');
      const isStorySlot = this.storySlots.includes(dropZone);
      const isInventorySlot = this.inventorySlots.includes(dropZone);
    
      if (isStorySlot) {
        this.placeItemInStorySlot(sprite, slotIndex, 'item');
    
        const currentItemsInSlot = this.storySlotData[slotIndex].items;
        const hasDetective = currentItemsInSlot.some(item => item.iconKey === 'detective');
        const hasGun = currentItemsInSlot.some(item => item.iconKey === 'gun');
    
        console.log("has detective and has gun", hasDetective, hasGun);
    
        if (hasDetective && hasGun) {
          // Get the combined items
          const combinedItems = currentItemsInSlot.filter(item => item.iconKey === 'detectiveCombined' || item.iconKey === 'gun');
    
          this.triggerDetectiveAnimation(slotIndex, combinedItems);
        }
      } else if (isInventorySlot) {
        // Handle inventory slot placement
        this.placeItemInInventorySlot(sprite, slotIndex);
      } else {
        // Return to original position
        sprite.x = sprite.input.dragStartX;
        sprite.y = sprite.input.dragStartY;
      }
    });
        

    this.itemSprites.push(sprite);
  }
}

private findNearestEmptyInventorySlot(): number | null {
  for (let i = 0; i < this.inventorySlots.length; i++) {
    const slotData = this.inventorySlotData[i];

    if (!slotData.item) { // Check if the slot is empty
      return i; // Return the index of the first available slot
    }
  }
  return null; // No available slot
}

private returnItemToInventory(item: Item) {
  // Find an empty inventory slot
  const slotIndex = this.findNearestEmptyInventorySlot();

  if (slotIndex !== null) {
    const slot = this.inventorySlots[slotIndex];
    const slotData = this.inventorySlotData[slotIndex];

    // Reuse the existing sprite
    const sprite = item.sprite;
    if (!sprite) {
      console.warn('Item sprite not found.');
      return;
    }

    // Remove from the story slot
    sprite.removeAllListeners();
    sprite.setPosition(slot.x, slot.y);
    sprite.setInteractive({ draggable: true });
    sprite.setData('type', 'item');
    sprite.setData('itemKey', item.iconKey);

    // Handle drag events again
    this.input.setDraggable(sprite);

    sprite.on('dragstart', (pointer, dragX, dragY) => {
      sprite.setDepth(1000); // Bring to front
      sprite.input.dragStartX = sprite.x;
      sprite.input.dragStartY = sprite.y;
    });

    sprite.on('drag', (pointer, dragX, dragY) => {
      sprite.x = dragX;
      sprite.y = dragY;
    });

    sprite.on('dragend', (pointer, dragX, dragY, dropped) => {
      const thresholdY = this.scale.height * 0.66;

      if (!dropped) {
        if (sprite.y > thresholdY) {
          const nearestInventorySlot = this.findNearestInventorySlot(sprite);
          if (nearestInventorySlot !== null) {
            this.placeItemInInventorySlot(sprite, nearestInventorySlot);
          } else {
            sprite.x = sprite.input.dragStartX;
            sprite.y = sprite.input.dragStartY;
          }
        } else {
          sprite.x = sprite.input.dragStartX;
          sprite.y = sprite.input.dragStartY;
        }
      }
    });

    // Place the sprite in the inventory slot
    this.placeItemInInventorySlot(sprite, slotIndex);

  } else {
    console.warn("No empty inventory slots available to return item.");
  }
}


private triggerDetectiveAnimation(slotIndex: number, combinedItems: Item[]) {
  const slot = this.storySlots[slotIndex];

  // Remove existing items from the slot
  const currentItems = this.storySlotData[slotIndex].items;
  currentItems.forEach(item => {
    if (item.sprite) {
      item.sprite.destroy();
    }
  });
  this.storySlotData[slotIndex].items = [];

  // Create a new sprite at the position of the slot
  const animationSprite = this.add.sprite(slot.x, slot.y, 'detectiveCombined');

  // Scale the sprite to fit the slot
  this.scaleToFitSlot(animationSprite, slot, 'npc');

  // Play the new animation
  animationSprite.play('detectiveCombinedAnim');

  // After the animation completes, return items to inventory
  animationSprite.on('animationcomplete', () => {
    animationSprite.destroy();

    // Return combined items to inventory
    combinedItems.forEach(item => {
      this.returnItemToInventory(item);
    });
  });
}

private replaceWithCombinedSprite(slotIndex: number, combinedSpriteKey: string) {
  const slot = this.storySlots[slotIndex];
  
  // Remove all current sprites in the slot
  const currentItems = this.storySlotData[slotIndex].items;
  currentItems.forEach(item => {
    if (item.sprite) {
      item.sprite.destroy();
    }
  });
  
  // Clear the items array
  this.storySlotData[slotIndex].items = [];

  // Create and place the combined sprite
  const combinedSprite = this.add.sprite(slot.x, slot.y, combinedSpriteKey);

  // Scale and make interactive
  this.scaleToFitSlot(combinedSprite, slot, 'npc');
  combinedSprite.setInteractive({ draggable: true });
  this.input.setDraggable(combinedSprite);

  // Store the combined sprite as the only item in the slot
  this.storySlotData[slotIndex].items.push({ sprite: combinedSprite, iconKey: combinedSpriteKey } as Item);
}




private toggleClueSelection(item: Item, textObject: Phaser.GameObjects.Text, selectedClues: Item[]) {
  if (selectedClues.includes(item)) {
      // Deselect the clue
      selectedClues.splice(selectedClues.indexOf(item), 1);
      textObject.setColor('#FFD700'); // Reset color
  } else {
      // Select the clue
      selectedClues.push(item);
      textObject.setColor('#00FF00'); // Highlight selected clue in green
  }
}

  private attemptClueCombination(selectedClues: Item[]) {
      if (selectedClues.length < 2) {
        this.showMessage('Select at least two clues to combine.');
        return;
      }
    
      // Implement your logic to check if the selected clues form a valid combination
      const isValidCombination = this.checkClueCombination(selectedClues);
    
      if (isValidCombination) {
        this.showMessage('You have discovered a new insight!');
        // Optionally, add a new clue representing the insight
      } else {
        this.showMessage('These clues do not seem to be related.');
      }
    
      // Reset selections
      selectedClues.length = 0;
      this.refreshInventoryDisplay();
    }

    private checkClueCombination(selectedClues: Item[]): boolean {
      // Example logic: Check if the combination of clue IDs matches a predefined set
      const combinationIds = selectedClues.map((clue) => clue.id).sort().join(',');
    
      const validCombinations = [
        'clue1,clue2', // Replace with actual clue IDs
        'clue3,clue4',
      ];
    
      return validCombinations.includes(combinationIds);
    }
    
    private showMessage(message: string) {
      // Display a temporary message to the player
      const messageText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        message,
        { fontSize: '24px', color: '#FFFFFF' }
      );
      messageText.setOrigin(0.5);
    
      this.time.delayedCall(2000, () => {
        messageText.destroy();
      });
    }
    
    private refreshInventoryDisplay() {
      // Reload the scene or update the displayed items to reset selections
      this.scene.restart();
    }
  }
