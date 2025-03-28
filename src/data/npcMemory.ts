export interface npcMemory {
    events_happened: { [eventKey: string]: boolean };
    reputation_criminals: number;
    reputation_cops: number;
    reputation_civilians: number;
    visitedDialogues: Set<string>;
}