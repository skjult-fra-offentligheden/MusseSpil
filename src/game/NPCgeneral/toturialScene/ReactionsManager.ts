import Phaser from 'phaser';
import { GlobalEvents } from '../../../factories/globalEventEmitter';
import { UIManager } from '../../managers/UIManager';
import { GameState } from '../../managers/GameState';
import { ItemUsedEventPayload } from '../../data/events/eventTypes';

type Mood = 'neutral' | 'annoyed' | 'angry' | 'shocked';
type Effect =
    | { kind: 'bark'; npcId: string; text: string }
    | { kind: 'mood'; npcId: string; to?: Mood; addShock?: number; addAnger?: number }
    | { kind: 'flag'; set: string }
    | { kind: 'unlock'; id: string }             // unlock dialogue/accusation
    | { kind: 'attack'; attackerId: string }     // simple stub for now
    | { kind: 'gameover'; reason: string };

export class ReactionManager {
    private static i: ReactionManager;
    private scene!: Phaser.Scene;
    private npcs: { id: string; sprite: Phaser.GameObjects.Sprite }[] = [];
    private ui = UIManager.getInstance();
    private gs = GameState.getInstance();

    static getInstance() {
        return this.i ?? (this.i = new ReactionManager());
    }

    init(scene: Phaser.Scene, npcs: { id: string; sprite: Phaser.GameObjects.Sprite }[]) {
        this.scene = scene;
        this.npcs = npcs;
        GlobalEvents.on('itemUsedFromInventory', (payload: ItemUsedEventPayload) => this.onItemUsed(payload));
    }

    private onItemUsed(p: ItemUsedEventPayload) {
        const witnesses = this.getWitnesses(p); // naive radius; LOS later
        const effects = this.resolveEffects(p, witnesses);
        this.applyEffects(effects);
    }

    private getWitnesses(p: ItemUsedEventPayload) {
        const player = p.player; if (!player) return [];
        const px = player.x, py = player.y;
        const R = 220; // tune
        return this.npcs.filter(n => Phaser.Math.Distance.Between(n.sprite.x, n.sprite.y, px, py) <= R);
    }

    // Plug your rules here:
    private resolveEffects(p: ItemUsedEventPayload, witnesses: { id: string }[]): Effect[] {
        const e: Effect[] = [];
        const wIds = new Set(witnesses.map(w => w.id));
        // Book-keeping flags for the instant-fail
        if (p.itemId === 'blueCheese') e.push({ kind: 'flag', set: 'didTasteCheese' });
        if (p.itemId === 'coke') e.push({ kind: 'flag', set: 'didSniffCoke' });

        // Glue: everyone barks (if in range)
        if (p.itemId === 'clueGlue') {
            for (const w of wIds) e.push({ kind: 'bark', npcId: w, text: this.pickBark(w, 'clueGlue') });
        }

        if (p.itemId === 'coke') {
            for (const w of wIds) e.push({ kind: 'mood', npcId: w, to: 'shocked', addShock: 2 });
            if (wIds.has('pinkDressGirlMouse')) e.push({ kind: 'mood', npcId: 'pinkDressGirlMouse', addShock: 3 });
            if (wIds.has('rockerMouse')) e.push({ kind: 'mood', npcId: 'rockerMouse', addShock: 3 });
            // enable cocaine accusation gate when phone+coke discovered
            if (this.gs.isClueDiscovered?.('cluePhone')) e.push({ kind: 'unlock', id: 'accuseJennieCocaine' });
        }

        if (p.itemId === 'blueCheese') {
            if (wIds.has('orangeShirtMouse')) e.push({ kind: 'bark', npcId: 'orangeShirtMouse', text: this.pickBark('orangeShirtMouse', 'blueCheese') });
            if (wIds.has('cop2')) e.push({ kind: 'bark', npcId: 'cop2', text: this.pickBark('cop2', 'clueCheese') });
            // track charges eaten in front of Whiskers
            if (wIds.has('cop2')) {
                const k = 'cheeseEatenInFrontOfWhiskers';
                const count = (this.gs as any)[k] = ((this.gs as any)[k] ?? 0) + 1;
                if (count >= 3) e.push({ kind: 'attack', attackerId: 'cop2' }, { kind: 'unlock', id: 'accuseWhiskersViolence' });
            }
            // Cheese contraband unlock requires journal inspection + tasting in front of Jerry
            if (wIds.has('orangeShirtMouse') && this.gs.getFlag('cheeseMarkedIllegal')) {
                e.push({ kind: 'unlock', id: 'accuseJerryIllegalCheese' });
            }

            // NEW: Popup reaction only if cheese is eaten within 130px of Officer Whiskers
            const ate = p.useResult?.newStatus === 'half' || p.useResult?.newStatus === 'empty';
            if (ate && this.withinDistanceOf('cop2', p, 130)) {
                e.push({ kind: 'bark', npcId: 'cop2', text: 'Hey! Are you eating that cheese right here?!' });
            }
        }

        return e;
    }

    private withinDistanceOf(npcId: string, p: ItemUsedEventPayload, dist: number): boolean {
        const player = p.player; if (!player) return false;
        const npc = this.npcs.find(n => n.id === npcId);
        if (!npc) return false;
        return Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, player.x, player.y) <= dist;
    }

    private pickBark(npcId: string, itemId: string): string {
        // fallback to your current map
        const map = (window as any).NPCReactionsMap as { [k: string]: { [itemId: string]: string } } | undefined;
        return map?.[npcId]?.[itemId] ?? '...';
    }

    private applyEffects(effects: Effect[]) {
        for (const fx of effects) {
            switch (fx.kind) {
                case 'bark':
                    this.ui.showNotification(`${fx.npcId}: ${fx.text}`); // simple for now
                    break;
                case 'flag':
                    this.gs.setFlag(fx.set, true);
                    break;
                case 'unlock':
                    this.gs.setFlag(fx.id, true); // keep it simple: flags drive UI/accusations
                    break;
                case 'attack':
                    this.ui.showNotification(`⚠ ${fx.attackerId} lashes out at you!`);
                    break;
                case 'gameover':
                    this.ui.showNotification(`🚫 ${fx.reason}`);
                    this.scene.time.delayedCall(900, () => this.scene.scene.start('GameOver'));
                    break;
                case 'mood':
                    // TODO: store per-npc mood if you want UI/movement changes
                    break;
            }
        }
    }
}
