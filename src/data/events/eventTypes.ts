import { ItemConfig } from '../../data/items/itemTemplate'; // Adjust path to your ItemConfig
import { Player } from '../../game/classes/player';             // Adjust path to your Player class

export interface ItemUsedEventPayload { // Add 'export' to make it importable
    itemId: string;
    itemConfig: ItemConfig;
    useResult: {
        newStatus: any;
        message?: string;
        artChanged: boolean;
        consumed?: boolean;
    };
    target?: any;
    player?: Player;
}
