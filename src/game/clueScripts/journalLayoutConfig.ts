import Phaser from 'phaser';

export type JournalSceneKey = 'main' | 'clues' | 'people' | 'accuse' | 'clueboard';

export interface JournalLayoutSettings {
    designWidth: number;
    designHeight: number;
    screenCoverage: { width: number; height: number };
    scaleBounds: { min: number; max: number };
    pagePadding?: { x: number; y: number };
    list?: { rowHeight: number; rowGap?: number; rowPadX?: number };
    innerPage?: { width: number; listWidth: number; gap: number };
    closeButton?: { size: number; padding: number };
    panelSpacing?: number;
    stringButton?: { width: number; height: number; gap: number };
}

export interface JournalLayoutRuntime {
    designWidth: number;
    designHeight: number;
    scale: number;
    scaledWidth: number;
    scaledHeight: number;
}

export interface JournalLayoutResult {
    settings: JournalLayoutSettings;
    runtime: JournalLayoutRuntime;
}

export const JOURNAL_LAYOUTS: Record<JournalSceneKey, JournalLayoutSettings> = {
    main: {
        designWidth: 500,
        designHeight: 900,
        screenCoverage: { width: 0.82, height: 0.88 },
        scaleBounds: { min: 0.6, max: 1.35 },
        innerPage: { width: 885, listWidth: 445, gap: 445 / 2 },
        closeButton: { size: 28, padding: 16 },
    },
    clues: {
        designWidth: 1033,
        designHeight: 900,
        screenCoverage: { width: 0.86, height: 0.9 },
        scaleBounds: { min: 0.6, max: 1.3 },
        pagePadding: { x: 80, y: 120 },
        list: { rowHeight: 56, rowGap: 10, rowPadX: 12 },
    },
    people: {
        designWidth: 1000,
        designHeight: 900,
        screenCoverage: { width: 0.86, height: 0.9 },
        scaleBounds: { min: 0.6, max: 1.3 },
        list: { rowHeight: 56, rowGap: 10, rowPadX: 12 },
    },
    accuse: {
        designWidth: 1033,
        designHeight: 900,
        screenCoverage: { width: 0.86, height: 0.9 },
        scaleBounds: { min: 0.6, max: 1.3 },
        list: { rowHeight: 56, rowGap: 8, rowPadX: 12 },
    },
    clueboard: {
        designWidth: 1280,
        designHeight: 900,
        screenCoverage: { width: 0.94, height: 0.92 },
        scaleBounds: { min: 0.5, max: 1.25 },
        panelSpacing: 20,
        stringButton: { width: 200, height: 42, gap: 12 },
        closeButton: { size: 28, padding: 16 },
    },
};

export function computeJournalLayout(
    scene: Phaser.Scene,
    key: JournalSceneKey,
    overrides?: Partial<{ designWidth: number; designHeight: number }>
): JournalLayoutResult {
    const settings = JOURNAL_LAYOUTS[key];
    if (!settings) {
        throw new Error(`Unknown journal layout key: ${key}`);
    }

    const designWidth = overrides?.designWidth ?? settings.designWidth;
    const designHeight = overrides?.designHeight ?? settings.designHeight;

    const coverage = settings.screenCoverage ?? { width: 1, height: 1 };
    const bounds = settings.scaleBounds ?? { min: 0.1, max: 2 };

    const availableW = scene.scale.width * coverage.width;
    const availableH = scene.scale.height * coverage.height;

    const rawScale = Math.min(availableW / designWidth, availableH / designHeight);
    const scale = Phaser.Math.Clamp(rawScale, bounds.min, bounds.max);

    const runtime: JournalLayoutRuntime = {
        designWidth,
        designHeight,
        scale,
        scaledWidth: designWidth * scale,
        scaledHeight: designHeight * scale,
    };

    return { settings, runtime };
}

