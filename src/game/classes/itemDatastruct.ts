export class Item{
    itemName: string;
    itemId: string;
    itemDescription: string;
    iconKey?: string;
    quantity?: number;
    isClue?: boolean;
    constructor(
        itemId: string,
        itemName: string,
        itemDescription: string,
        iconKey?: string,
        quantity: number = 1,
        isClue?: boolean = false
    ) {
        this.itemId = itemId;
        this.itemName = itemName;
        this.itemDescription = itemDescription;
        this.iconKey = iconKey;
        this.quantity = quantity;
        this.isClue = isClue;
    }
}

