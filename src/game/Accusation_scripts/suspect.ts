export interface Suspect {
    id: string;
    name: string;
    description: string;
    imageKey?: string;
    isCulprit: boolean;
}