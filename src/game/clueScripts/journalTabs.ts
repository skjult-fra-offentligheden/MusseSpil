
export type ClueCat =
    | 'caseMainpage'
    | 'Clues'
    | 'People'
    | 'Clueboard'
    | 'Accuse'
    | 'Evidence'
    | 'Places'
    | 'Timeline';

// --- Controller for tabs (can be your main journal scene) ---
export interface ICategorySwitcher {
    switchCat(category: ClueCat, force?: boolean): void;
    getActiveCat?(): ClueCat;
    updateTabVisuals?(): void;

    // Optional convenience hooks if you use them:
    openTimelineBoard?(): void;
    launchAccusationScene?(): void;
    launchClueScene?(): void;
}

// --- Scene contract for any scene that owns its own tab sprites ---
export interface ITabbedJournalScene extends Phaser.Scene {
    tabs: Record<ClueCat, Phaser.GameObjects.Container>;
    activeCat: ClueCat;
    switchCat: (cat: ClueCat, force?: boolean) => void;
    textures: Phaser.Textures.TextureManager;
}

// --- Mapping for which Scene a tab should launch (if any) ---
export type TabActionConfig = {
    /** Phaser.Scene key to launch/wake when this tab is clicked */
    sceneKey: string;
    /**
     * If true, the *current* scene is slept after launching the target scene.
     * Useful for full-screen takeovers (e.g., DragAbleClueScene).
     */
    sleepCurrent?: boolean;
};

// Provide your project defaults here.
// Override per usage via `options.sceneMap`.
export const DEFAULT_TAB_SCENES: Partial<Record<ClueCat, TabActionConfig>> = {
    // caseMainpage handled inside the owning scene -> no external scene
    Clues: { sceneKey: 'ClueDisplayJournalScene' },
    People: { sceneKey: 'AccusationScene' },
    Clueboard: { sceneKey: 'DragAbleClueScene', sleepCurrent: true },
    Accuse: { sceneKey: 'AccusationScene' },

    // Optional aliases if some scenes pass these categories:
    Evidence: { sceneKey: 'ClueDisplayJournalScene' },
    Places: { sceneKey: 'ClueDisplayJournalScene' },
    Timeline: { sceneKey: 'DragAbleClueScene', sleepCurrent: true },
};

// Some of your assets are inconsistently cased (e.g., "places_tab-idle").
// Map categories -> base texture key used in `${base}_tab-(idle|active)`
const DEFAULT_TEXTURE_KEYS: Partial<Record<ClueCat, string>> = {
    // Keep exact-case matches where you already have them:
    Clues: 'Clues',
    People: 'People',
    Clueboard: 'Clueboard',
    Accuse: 'Accuse',
    caseMainpage: 'caseMainpage', // only used if you actually have a tab for it
};

// --- Options controlling behavior/appearance of the created tabs ---
export type CreateJournalTabsOptions = {
    controller?: ICategorySwitcher;
    sceneMap?: Partial<Record<ClueCat, TabActionConfig>>;
    launchData?: Partial<Record<ClueCat, any | ((ctx: { scene: Phaser.Scene; controller: ICategorySwitcher }) => any)>> | undefined;
    textureKeyMap?: Partial<Record<ClueCat, string>>;
    skipIfMissingTexture?: boolean;

    // ⬇️ NEW: TMJ-provided placements (x,y,w,h) in the SAME container space as parentContainer
    positions?: Partial<Record<ClueCat, { x: number; y: number; w: number; h: number }>>;
};

// --- Public: create tabs with centralized switching ---
export function createJournalTabs(
    scene: ITabbedJournalScene,
    parentContainer: Phaser.GameObjects.Container,
    _ninesliceBackground: Phaser.GameObjects.GameObject, // kept for call-site compatibility, unused
    cats: ClueCat[],
    options?: CreateJournalTabsOptions
): void {
    const controller: ICategorySwitcher =
        options?.controller ?? (scene as unknown as ICategorySwitcher);

    const sceneMap: Partial<Record<ClueCat, TabActionConfig>> = {
        ...DEFAULT_TAB_SCENES,
        ...(options?.sceneMap ?? {}),
    };
    const texMap: Partial<Record<ClueCat, string>> = {
        ...DEFAULT_TEXTURE_KEYS,
        ...(options?.textureKeyMap ?? {}),
    };
    const skipIfMissing = !!options?.skipIfMissingTexture;

    // Ensure tabs map exists on the owning scene
    scene.tabs = scene.tabs ?? ({} as Record<ClueCat, Phaser.GameObjects.Container>);
    console.info('[createJournalTabs] tabs:', options?.positions);
    const texKeyFor = (cat: ClueCat, state: 'active' | 'idle') => {
        const base = texMap[cat] ?? cat;
        return `${base}_tab-${state}`;
    };

    const launchOrWake = (targetKey: string, data: any) => {
        const sp = scene.scene;
        if (sp.isSleeping(targetKey)) sp.wake(targetKey);
        else if (!sp.isActive(targetKey)) sp.launch(targetKey, data);
        sp.bringToTop(targetKey);
    };

    const payloadFor = (cat: ClueCat) => {
        const base = { originScene: scene.scene.key, switcher: controller };
        const provider = options?.launchData?.[cat];
        if (!provider) return base;
        try {
            if (typeof provider === 'function') {
                const extra = provider({ scene, controller });
                return { ...base, ...(extra ?? {}) };
            }
            return { ...base, ...(provider ?? {}) };
        } catch (err) {
            console.error(`[createJournalTabs] launchData provider for "${cat}" threw:`, err);
            return base;
        }
    };

    const positions = options?.positions ?? {};

    cats.forEach((cat) => {
        const isActive = controller.getActiveCat?.() === cat || scene.activeCat === cat;

        const initialKey = texKeyFor(cat, isActive ? 'active' : 'idle');
        if (!scene.textures.exists(initialKey)) {
            const altKey = texKeyFor(cat, 'idle');
            if (!scene.textures.exists(altKey)) {
                const msg = `[createJournalTabs] Texture key missing for tab "${cat}": "${initialKey}" / "${altKey}".`;
                if (skipIfMissing) { console.warn(msg, 'Skipping tab.'); return; }
                else { console.error(msg); return; }
            }
        }

        const pos = positions[cat];
        if (!pos || (!pos.w && !pos.h)) {
            // No TMJ rect -> skip (we're TMJ-only now)
            console.warn(`[createJournalTabs] No position for "${cat}" (or zero size). Skipping.`);
            return;
        }

        const btnX = pos.x + pos.w / 2;
        const btnY = pos.y + pos.h / 2;

        const tabContainer = scene.add.container(btnX, btnY);
        parentContainer.add(tabContainer);

        const bg = scene.add.image(0, 0, initialKey).setOrigin(0.5);
        tabContainer.add(bg);

        const text = scene.add.text(10, 0, cat, {
            fontSize: '22px',
            color: '#4a4a4a',
            fontFamily: 'Georgia, serif',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        tabContainer.add(text);

        // Make the clickable area match the TMJ rect
        tabContainer.setSize(pos.w, pos.h);
        tabContainer.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, pos.w, pos.h),
            Phaser.Geom.Rectangle.Contains
        );
        if (tabContainer.input) tabContainer.input.cursor = 'pointer';

        scene.tabs[cat] = tabContainer;

        // Click handler
        tabContainer.on(Phaser.Input.Events.POINTER_DOWN, () => {
            const currentActive =
                controller.getActiveCat?.() ?? (scene as unknown as ITabbedJournalScene).activeCat;
            if (currentActive === cat) return;

            controller.switchCat?.(cat);

            const action = sceneMap[cat];
            if (action && action.sceneKey) {
                const data = payloadFor(cat);
                launchOrWake(action.sceneKey, data);
                // Only sleep the current scene if it's actually active;
                // some controllers may have already stopped/slept it.
                if (action.sleepCurrent && scene.scene.isActive(scene.scene.key)) {
                    scene.scene.sleep(scene.scene.key);
                }
            } else {
                if (cat === 'Clueboard' && controller.openTimelineBoard) controller.openTimelineBoard();
                else if ((cat === 'Accuse' || cat === 'People') && controller.launchAccusationScene) controller.launchAccusationScene();
                else if ((cat === 'Clues' || cat === 'Evidence') && controller.launchClueScene) controller.launchClueScene();
            }

            (scene as ITabbedJournalScene).activeCat = cat;
            updateTabVisuals(scene);
            controller.updateTabVisuals?.();
        });
    });
}
export function updateTabVisuals(scene: ITabbedJournalScene): void {
    if (!scene.tabs) return;
    const active = (scene as ITabbedJournalScene).activeCat;

    // Try both the scene’s own activeCat and (optionally) a controller basis
    Object.entries(scene.tabs).forEach(([cat, container]) => {
        const c = cat as ClueCat;
        const bg = container.getAt(0) as Phaser.GameObjects.Image;
        const text = container.getAt(1) as Phaser.GameObjects.Text;
        const isActive = c === active;

        // If the exact key doesn’t exist, try the 'idle' to avoid crashes, then keep current texture
        const desiredKey = `${(DEFAULT_TEXTURE_KEYS[c] ?? c)}_tab-${isActive ? 'active' : 'idle'}`;
        if (scene.textures.exists(desiredKey)) {
            bg.setTexture(desiredKey);
        } else {
            // Fallback: try idle
            const idleKey = `${(DEFAULT_TEXTURE_KEYS[c] ?? c)}_tab-idle`;
            if (scene.textures.exists(idleKey)) {
                bg.setTexture(idleKey);
            } else {
                // Last resort: leave as-is
                // (Console noise avoided here to prevent spamming every frame.)
            }
        }

        text.setColor(isActive ? '#000000' : '#4a4a4a');
    });
}
