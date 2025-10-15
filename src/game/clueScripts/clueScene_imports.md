# ClueJournal Imports

| Import Source | Symbols | Type | Purpose / Usage |
| --- | --- | --- | --- |
| `./clueManager` | `ClueManager` | Game logic class | Central manager for the player's clue collection. The journal keeps a reference (from `init`) and hands it to tab scenes so they can list/filter clues and build the clueboard. |
| `../classes/clue` | `Clue` | Type definition | Interface describing a clue (id, title, description, category, etc.). Used for type safety when iterating clues and passing data to other scenes. |
| `../managers/GameState` | `GameState` | Singleton manager | Global state store (flags, culprit info, progress). The journal consults it when activating cases and when syncing state back to the main game. |
| `./Accusation_scripts/suspect` | `Suspect` | Type definition | Shape of suspect data (name, portrait key, motive). Gives typed helpers when the journal interacts with accusation tabs. |
| `./journalTabs` | `ClueCat`, `ICategorySwitcher`, `createJournalTabs`, `updateTabVisuals` | Types & helpers | Provides the tab enum, controller contract, and the shared routine that builds/refreshes the vertical tab UI. |
| `../../data/NPCs/AllNPCsConfigs` | `AllNPCsConfigs` | Data map | Master NPC config list (names, portrait keys). Passed to the clueboard scene so the player can place suspects on the board. |
| `../../data/cases/tutorialCases` | `tutorialCases` | Data object | JSON-like definition for tutorial cases. Supplies the case title/body that the main journal page renders. |
| `./journalLayoutConfig` | `JOURNAL_LAYOUTS`, `computeJournalLayout`, `JournalLayoutResult` | Layout utilities | Shared sizing/scale definitions. The journal uses them to compute responsive sizes and to keep the page centered across different resolutions. |
