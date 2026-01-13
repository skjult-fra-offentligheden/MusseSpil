
import Phaser from 'phaser';
import { CaseSceneConfig, Condition } from './CaseTypes';
import { UIManager } from '../game/managers/UIManager';                
import { GameState } from '../game/managers/GameState';                
import { GlobalEvents } from '../factories/globalEventEmitter';        
import type { ItemUsedEventPayload } from '../data/events/eventTypes'; 
import { activateTutorialCase } from '../data/cases/tutorialCases';
import { CaseManager } from '../data/cases/CaseManager';

type WitnessableNPC = {
    npcId: string;
    sprite: Phaser.GameObjects.Sprite;
    sensoryRange?: number;
};

export class CaseDirector {
    private scene: Phaser.Scene;
    // private cfg: CaseSceneConfig;
    private ui = UIManager.getInstance();
    private gs: GameState;
    private npcs: WitnessableNPC[];
    private firedLock = false;
    private get cfg(): CaseSceneConfig | null {
        return CaseManager.getInstance().getActiveConfig();
    }

    constructor(
        scene: Phaser.Scene,
        npcs: Array<{ npcId: string; sprite: any; sensoryRange?: number }>
    ) {
        this.scene = scene;
        this.npcs = npcs as WitnessableNPC[];
        this.gs = GameState.getInstance(this.scene);

        // Ensure counters bag exists
        this.gs.counters ??= {};

        // Single, correct subscription (arrow fn preserves 'this')
        GlobalEvents.off('itemUsedFromInventory', this.onItemUse, this);
        GlobalEvents.on('itemUsedFromInventory', this.onItemUse, this);

        console.log('[CaseDirector] Listening for itemUsedFromInventory');
        console.log('[CaseDirector] Initialized. Active Case:', this.cfg?.id ?? 'NONE');
    }

    destroy() {
        GlobalEvents.off('itemUsedFromInventory', this.onItemUse, this);
    }

    // ——— Public API for Accusation UI ———
getAvailableCrimesFor(suspectId: string) {
        if (!this.cfg) return []; // Safety check
        return this.cfg.crimes.filter(c => c.suspectId === suspectId && this.eval(c.unlockWhen));
    }

    // ——— Internals ———
    private onItemUse = (p: ItemUsedEventPayload) => {
        if (!this.cfg) return;
        const status = p.useResult?.newStatus as 'half' | 'empty' | undefined;

        // 1) Witnesses in range (use helper)
        const witnesses =
            p.player ? this.getWitnessIds(p.player.x, p.player.y) : new Set<string>();

        // 1a) If cheese eaten near Officer Whiskers twice, he rushes and pushes the player
    // Trigger shove/assault case only when the cheese is fully eaten near Whiskers (second use)
    if (p.itemId === 'blueCheese' && (status === 'empty') && p.player) {
    console.log('[CaseDirector] Cheese eaten near whiskers check: status=', status);
    const whiskers = this.npcs.find(n => n.npcId === 'cop2');
    if (!whiskers) return;

    const scene = this.scene as Phaser.Scene;
    const cam = scene.cameras.main;

    const player = p.player as unknown as Phaser.Physics.Arcade.Sprite & {
        applyKnockbackStun?: (ms: number) => void;
    };

    // Use body centers if available
    const wx = (whiskers.sprite.body?.center?.x ?? whiskers.sprite.x);
    const wy = (whiskers.sprite.body?.center?.y ?? whiskers.sprite.y);
    const px = (player.body?.center?.x ?? player.x);
    const py = (player.body?.center?.y ?? player.y);

    const d = Phaser.Math.Distance.Between(wx, wy, px, py);
    if (d > 130) { console.log('[CaseDirector] Too far from Whiskers for shove, d=', d); return; }

    // Optional: prevent spammy triggers for ~600ms
    if (this.gs.getFlag('whiskersShoveCooldown')) return;

    const c = this.gs.incrementCounter('whiskersCloseCheeseCount', 1);
    const firstTime = !this.gs.getFlag('whiskersPushedAfterCheese');

    if (c >= 2 && firstTime) {
        this.gs.setFlag('whiskersPushedAfterCheese', true);
        this.gs.setFlag('assaultCaseActive', true);
        // Activate the assault case when Whiskers rushes the player (first time only)
        try { console.log('[CaseDirector] Activating officer_whiskers_case'); activateTutorialCase('officer_whiskers_case' as any, true); } catch {}
        this.ui.showNotification?.('New case added: Get revenge for assault');
    }

    // From here, do the behavior regardless of whether it’s the first time,
    // or restrict to firstTime if that’s intended:
    if (!firstTime) return; // <-- keep if it must be one-shot

    // Cooldown so we don’t re-trigger while moving
    this.gs.setFlag('whiskersShoveCooldown', true);
    scene.time.delayedCall(600, () => this.gs.setFlag('whiskersShoveCooldown', false));

    // Kill any existing tweens to avoid stacking
    scene.tweens.killTweensOf(whiskers.sprite);
    scene.tweens.killTweensOf(player);

    // 1) Cop approaches the player (sprite tween is OK for NPC; not a collider)
    const approachSpeed = 650; // px/s
    const approachDuration = Math.max(120, (d / approachSpeed) * 1000);
    // Capture approach direction at the start so knockback aligns with Whiskers' rush
    const dir0x = px - wx;
    const dir0y = py - wy;
    const len0 = Math.max(1, Math.hypot(dir0x, dir0y));
    const nx0 = dir0x / len0;
    const ny0 = dir0y / len0;

    scene.tweens.add({
        targets: whiskers.sprite,
        x: px,
        y: py,
        duration: approachDuration,
        ease: 'Quad.easeOut',
        onUpdate: () => {
        // keep any attached shadow/label in sync if you have them
        },
        onComplete: () => {
        // 2) Physics-friendly knockback in the same direction as Whiskers' rush
        const nx = nx0;
        const ny = ny0;

        // Clear displacement target (~130px), but via velocity over a short window
        const pushDistance = 130; // px
        const pushTime = 220;     // ms
        const pushSpeed = (pushDistance / (pushTime / 1000)); // px/s

        // Apply velocity
        player.setVelocity(nx * pushSpeed, ny * pushSpeed);

        // Optionally disable player input briefly during stun
        player.applyKnockbackStun?.(pushTime);

        // Stop movement after pushTime
        scene.time.delayedCall(pushTime, () => {
            // only stop if we didn’t start another motion
            player.setVelocity(0, 0);
        });

        // Camera shake for impact
        cam.shake(120, 0.006);
        }
    });
    }

        // 2) Depletion flags from canonical status
        if (status === 'empty') {
            if (p.itemId === 'coke' && !this.gs.getFlag('cokeDepleted')) {
                console.log('[CaseDirector] cokeDepleted := true');
                this.gs.setFlag('cokeDepleted', true);
            }
            if (p.itemId === 'blueCheese' && !this.gs.getFlag('cheeseDepleted')) {
                console.log('[CaseDirector] cheeseDepleted := true');
                this.gs.setFlag('cheeseDepleted', true);
            }
        }

        // 3) Apply all matching event rules (respect witness gating)
        for (const r of this.cfg.eventRules ?? []) {
            if (r.whenItem !== p.itemId) continue;
            if (r.requireWitness && !witnesses.has(r.requireWitness)) continue;

            r.setFlags?.forEach(f => {
                if (!this.gs.getFlag(f)) {
                    console.log('[CaseDirector] setFlag', f, ':= true');
                    this.gs.setFlag(f, true);
                }
            });
            r.addCounters?.forEach(c => {
                console.log('[CaseDirector] incrementCounter', c.id, '+=', c.by);
                this.gs.incrementCounter(c.id, c.by);
            });
        }

        // Fallback activation: if the rules have set the illegalCheeseEatenTwiceInFrontOfWhiskers flag,
        // ensure the Assault case is activated even if the shove path didn't run (e.g., out-of-range earlier)
        try {
            if (this.gs.getFlag('illegalCheeseEatenTwiceInFrontOfWhiskers') && !this.gs.getFlag('assaultCaseActive')) {
                console.log('[CaseDirector] Flag illegalCheeseEatenTwiceInFrontOfWhiskers detected — activating Assault case');
                this.gs.setFlag('assaultCaseActive', true);
                activateTutorialCase('officer_whiskers_case' as any, true);
            }
        } catch {}

        if (this.gs.incrementCounter('whiskersCheeseCount', 2)) {
            console.warn('[CaseDirector] Whiskers cheese count incremented to 2+');
            if (this.gs.getFlag('illegalCheeseEatenTwiceInFrontOfWhiskers')) {
                
                // move the notification to above officer whiskers. 
                this.ui.showNotification('🚨 Officer Whiskers is furious about the illegal cheese!');
                // Add any other effect logic here
            }
        }

        // 4) Evaluate fail states once, after updates
        if (this.firedLock) return;

        const failStates = this.cfg.failStates ?? [];
        console.log('[CaseDirector] evaluating failStates...', failStates);

        for (const f of failStates) {
            const ok = this.eval(f.when);
            console.log('[CaseDirector] eval', f.id, '→', ok, f.when);
            if (ok) {
                this.firedLock = true;
                const msg = f.message ?? 'Game Over';
                this.ui.showNotification(msg);
                this.scene.time.delayedCall(500, () => {
                    this.scene.scene.start('GameOver', { reason: msg, fromSceneKey: this.scene.scene.key });
                });
                return;
            }
        }
    };

    private eval(c: Condition): boolean {
        if (c.kind === 'flag') {
            const v = this.gs.getFlag(c.id);
            return c.value === undefined ? !!v : v === c.value;
        }
        if (c.kind === 'counterAtLeast') {
            return this.gs.getCounter(c.id) >= c.count;
        }
        if (c.kind === 'all') return c.of.every(x => this.eval(x));
        if (c.kind === 'any') return c.of.some(x => this.eval(x));
        return false;
    }

    private getWitnessIds(px: number, py: number): Set<string> {
        const set = new Set<string>();
        const Rdefault = 200;
        for (const n of this.npcs) {
            const R = n.sensoryRange ?? Rdefault;
            if (Phaser.Math.Distance.Between(n.sprite.x, n.sprite.y, px, py) <= R) {
                set.add(n.npcId);
            }
        }
        return set;
    }
}
