export interface Clue {
    id: string;
    title: string;
    description: string;
    imageKey?: string;
    foundAt?: string;
    relatedNPCs?: string[];
    discovered: boolean;
  }