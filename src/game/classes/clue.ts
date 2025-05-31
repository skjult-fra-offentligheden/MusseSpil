export interface Clue {
    id: string;             // Derived from itemConfig.clueId or itemConfig.id
    title: string;          // Derived from itemConfig.name or itemConfig.id
    description: string;    // Derived from itemConfig.description
    imageKey?: string;      // Derived from itemConfig.art.small (or large)
    foundAt?: string;       // Needs a source - ItemConfig or game context?
    relatedNPCs?: string[]; // Needs a source - ItemConfig or game context?
    discovered: boolean;    // Managed by ClueManager / CallbackHandler
    category: string;       // Needs a source - ItemConfig or default?
}