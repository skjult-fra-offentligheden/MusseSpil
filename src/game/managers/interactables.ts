import { Player } from '../classes/player';
import { InventoryManager } from './itemMananger';
import Phaser from 'phaser';

export interface Interactable extends Phaser.GameObjects.GameObject {
    checkProximity(
      player: Player,
      range: number,
      onInRange: () => void
    ): void;
    initiateInteraction(
      player: Player,
      inventoryManager: InventoryManager
    ): void;
  }
