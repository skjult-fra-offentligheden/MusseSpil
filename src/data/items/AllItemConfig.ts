import { ItemConfig } from './itemTemplate'; // You'll show me this
import { glue } from '../items/toturialScene/glue';       // Your example item
import { blueCheese } from "../items/toturialScene/blue_cheese"
import { phone } from "../items/toturialScene/phone"
import { coke } from "./toturialScene/coke"
// import { otherItem } from '../items/otherItem';

export const AllItemConfigs: Record<string, ItemConfig> = {
    clueGlue: glue,
    blueCheese: blueCheese,
    cluePhone: phone,
    coke: coke
    // otherItemId: otherItem,
    // ... more items
};