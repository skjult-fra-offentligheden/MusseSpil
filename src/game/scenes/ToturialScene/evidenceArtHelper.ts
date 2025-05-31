//import { evidenceArt, EvidencePhase } from './evidenceArt';
import { GameState } from "../../managers/GameState"
import { ItemConfig, PhaseArt } from '../../../data/items/itemTemplate';
import { AllItemConfigs } from '../../../data/items/AllItemConfig';
/**
 * Resolve the texture key (or file-path) for a clue.
 * – size:  'small' | 'large'
 * – phase: 'full' | 'half' | 'empty' | 'fixed'
 */


export function artKey(
    clueIdToLookup: string, // This ID is used to find the ItemConfig
    size: 'small' | 'large',
): string {
    // ----- CONFIG LOOKUP (Handle Scenario A or B for clueIdToLookup) -----
    let itemConfig: ItemConfig | undefined = AllItemConfigs[clueIdToLookup];

    // If your journal might use item.clueId as the lookup key, and it can differ from item.id:
    // if (!itemConfig) {
    //     itemConfig = Object.values(AllItemConfigs).find(config => config.clueId === clueIdToLookup);
    // }
    // For now, assuming clueIdToLookup is the itemConfig.id

    if (!itemConfig) {
        console.error(`[artKey] No ItemConfig found for ID: "${clueIdToLookup}". Check AllItemConfigs and how the journal gets this ID.`);
        throw new Error(`Unknown item/clue: ${clueIdToLookup}`);
    }

    if (!itemConfig.art) {
        console.error(`[artKey] ItemConfig for "${clueIdToLookup}" has no 'art' definition.`);
        throw new Error(`Art not defined for ${clueIdToLookup}`);
    }

    const artForSize = itemConfig.art[size]; // This will be string | PhaseArt (or undefined if bad itemConfig)

    if (artForSize === undefined) { // Should not happen if ItemConfig type is enforced
        console.error(`[artKey] No art defined for size "${size}" in ItemConfig for "${clueIdToLookup}".`);
        throw new Error(`Art for size ${size} not defined for ${clueIdToLookup}`);
    }

    // Case 1: Art is a simple string (not phased)
    if (typeof artForSize === 'string') {
        return artForSize;
    }

    // Case 2: Art is an object with phases (PhaseArt)
    // Since your ItemTemplate defines PhaseArt with non-optional full, half, empty,
    // we can be more direct, but still use GameState for the phase.
    const phaseArt: PhaseArt = artForSize; // Now we know it's PhaseArt

    const clueSpecificState = GameState.getInstance().clueState[itemConfig.id]; // Use itemConfig.id for GameState
    const currentPhaseFromGameState = clueSpecificState?.phase; // 'full', 'half', 'empty', 'fixed', or undefined

    // Determine which key of PhaseArt to use
    let phaseToFetchKey: keyof PhaseArt = 'full'; // Default

    if (currentPhaseFromGameState === 'fixed') {
        phaseToFetchKey = 'full';
    } else if (currentPhaseFromGameState === 'half') {
        phaseToFetchKey = 'half';
    } else if (currentPhaseFromGameState === 'empty') {
        phaseToFetchKey = 'empty';
    }
    // If currentPhaseFromGameState is 'full' or undefined, it defaults to 'full'

    const imagePath = phaseArt[phaseToFetchKey];

    // This check is mostly a safeguard; if PhaseArt is correctly typed and data populated,
    // phaseArt[phaseToFetchKey] should always yield a string.
    if (typeof imagePath !== 'string') {
        console.error(`[artKey] CRITICAL: Path for ${clueIdToLookup}, size ${size}, phase ${phaseToFetchKey} is not a string or is missing. PhaseArt:`, phaseArt);
        // Fallback to 'full' if possible, otherwise error.
        if (typeof phaseArt.full === 'string') return phaseArt.full;
        throw new Error(`Invalid art path for ${clueIdToLookup}`);
    }

    return imagePath;
}