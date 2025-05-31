import { NPCConfig } from './npcTemplate'; // You'll show me this
import { cop2Config } from './NPC_mice/cop2';       // Your example item
import { OrangeShirtMouseConfig } from './NPC_mice/orangeShirtMouse';
import { rockerMouseConfig } from './NPC_mice/rockerMouse'
import { pinkDressGirlMouseConfig } from './NPC_mice/pinkDressGirlMouse'
// import { otherItem } from '../items/otherItem';

export const AllNPCsConfigs: Record<string, NPCConfig> = {
    cop2: cop2Config,
    orangeShirtMouse: OrangeShirtMouseConfig,
    rockerMouse: rockerMouseConfig,
    pinkDressGirlMouse: pinkDressGirlMouseConfig,
    // otherItemId: otherItem,
    // ... more items
};