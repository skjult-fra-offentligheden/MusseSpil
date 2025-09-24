import { ItemConfig } from './itemTemplate'; // You'll show me this
import { glue } from '../items/toturialScene/glue';       // Your example item
import { blueCheese } from "../items/toturialScene/blue_cheese"
import { phone } from "../items/toturialScene/phone"
import { coke } from "./toturialScene/coke"
// import { otherItem } from '../items/otherItem';

const ALL_ITEMS = {
    clueGlue: glue,
    blueCheese: blueCheese,
    cluePhone: phone,
    coke: coke,
} satisfies Record<string, ItemConfig>;

export type ItemId = keyof typeof ALL_ITEMS;
export const AllItemConfigs: Record<ItemId, ItemConfig> = ALL_ITEMS;