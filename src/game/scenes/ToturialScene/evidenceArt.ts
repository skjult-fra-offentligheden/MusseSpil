export type EvidencePhase = 'full' | 'half' | 'empty';

/** fixed-look asset (always the same file) */
export type FixedKey = string;

/** multi-phase set for a single resolution */
export interface PhaseSet { full: string; half: string; empty: string; broken?: string; }

/** what one clue can provide */
export type EvidenceEntry =
    | { small: FixedKey; large: FixedKey }              // no wear-down
    | { small: PhaseSet; large: PhaseSet };            // with wear-down

export const evidenceArt: Record<string, EvidenceEntry> = {
    /* -------------- fixed-look clues -------------- */
    cluePhone: {
        small: 'assets/tilemaps/toturial_inside/phone_32x32.png',          // 32×32
        large: 'assets/tilemaps/toturial_inside/phone_64x64.png'     // 64×64
    },

    clueGlue: {
        small: 'assets/tilemaps/toturial_inside/glue_32x32.png',          // 32×32
        large: 'assets/tilemaps/toturial_inside/glue_64x64.png'  
    },

    /* -------------- degrading clues -------------- */
    clueCoke: {
        small: {
            full: 'assets/tilemaps/toturial_inside/cokebag_32x32_full.png',
            half: 'assets/tilemaps/toturial_inside/cokebag_32x32_half_empty.png',
            empty: 'assets/tilemaps/toturial_inside/cokebag_32x32_empty.png'
        },
        large: {
            full: 'assets/tilemaps/toturial_inside/cokebag_full_64x64.png',
            half: 'assets/tilemaps/toturial_inside/cokebag_64x64_half_empty.png',
            empty: 'assets/tilemaps/toturial_inside/cokebag_64x64_empty.png'
        }
    },
    clueCheese: {
        small: {
            full: 'assets/tilemaps/toturial_inside/cheese_32x32.png',
            half: 'assets/tilemaps/toturial_inside/cheese_32x32_half.png',
            empty: 'assets/tilemaps/toturial_inside/cheese_32x32_empty.png'
        },
        large: {
            full: 'assets/tilemaps/toturial_inside/cheese_64x64.png',
            half: 'assets/tilemaps/toturial_inside/cheese_64x64_half.png',
            empty: 'assets/tilemaps/toturial_inside/cheese_64x64_eaten.png'
        }
    }
} as const;

