import { ItemConfig } from '../../data/items/itemTemplate'; // Adjust path to your ItemConfig
import { Player } from '../../game/classes/player';             // Adjust path to your Player class
import type { ItemId } from '../../data/items/AllItemConfig';
export interface ItemUsedEventPayload { // Add 'export' to make it importable
    itemId: ItemId;
    itemConfig: ItemConfig;
    px: number;
    py: number;
    result?: unknown;
    useResult: {
        newStatus: any;
        message?: string;
        artChanged: boolean;
        consumed?: boolean;
    };
    target?: any;
    player?: Player;
}
