import { Scene } from 'phaser';
import { GameState } from '../../managers/GameState';
import { Suspect } from '../../Accusation_scripts/suspect'; // Adjust path if needed

type GameOverData = {
    suspect?: Suspect | null;     // present for wrong-accusation flows
    reason?: string;              // present for instant-fail flows (e.g., misconduct)
    fromSceneKey?: string;        // optional: where to "Retry" back to
};
export class GameOver extends Scene {
    private wronglyAccused: Suspect | null = null;
    private reason: string | undefined;
    private fromSceneKey: string | undefined;
    constructor() {
        super('GameOver');
    }

    private fullResetToMain() {
        try { window.localStorage?.removeItem('GameStateV1'); } catch {}
        try { window.location.reload(); } catch { /* fallback below */ }
        const stopIf = (k: string) => { if (this.scene.isActive(k) || this.scene.isSleeping(k)) this.scene.stop(k); };
        ['UIGameScene','ClueJournal','ClueDisplayJournalScene','PeopleDisplayJournalScene','AccusationScene','DragAbleClueScene']
            .forEach(stopIf);
        this.scene.start('MainMenu');
    }

    /**
     * The init method is called when a scene is started.
     * We'll use it to receive the suspect data from the AccusationScene.
     */
    init(data: GameOverData): void {
        this.wronglyAccused = data?.suspect ?? null;
        this.reason = data?.reason;
        this.fromSceneKey = data?.fromSceneKey;    }

    create() {
        const { width, height } = this.scale;
        // Ensure this scene is visible above others
        this.scene.bringToTop(this.scene.key);

        const origStart = this.scene.start;
        (this.scene as any).start = (...args: any[]) => {
            if (args[0] === 'GameOver') {
                console.trace('[TRACE] scene.start("GameOver") caller', { args });
            }
            // @ts-ignore
            return origStart.apply(this.scene, args);
        };

        // backdrop
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        // styles
        const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        };
        const subtitleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#cccccc',
            align: 'center',
            wordWrap: { width: Math.min(0.7 * width, 720) }
        };

        // dynamic content
        const title =
            this.reason ? "You're Fired!" :
                this.wronglyAccused ? 'Case Failed' :
                    'Game Over';

        const detail =
            this.reason ??
            (this.wronglyAccused
                ? `You accused ${this.wronglyAccused.name}, but they were innocent. The real culprit got away.`
                : 'The case could not be completed.');

        this.add.text(width / 2, height / 2 - 80, title, titleStyle).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 20, detail, subtitleStyle).setOrigin(0.5);

        // buttons
        const makeBtn = (y: number, label: string, onClick: () => void) => {
            const t = this.add.text(width / 2, y, label, {
                fontFamily: 'Arial',
                fontSize: '22px',
                color: '#111111',
                backgroundColor: '#ffffff',
                padding: { x: 16, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            t.on('pointerup', onClick);
            t.on('pointerover', () => t.setStyle({ backgroundColor: '#e9e9e9' }));
            t.on('pointerout', () => t.setStyle({ backgroundColor: '#ffffff' }));
            return t;
        };

        makeBtn(height * 0.62, 'Retry', () => this.fullResetToMain());

        makeBtn(height * 0.72, 'Main Menu', () => {
            this.scene.stop('GameOver');
            this.scene.start('MainMenu'); // adjust if your entry scene differs
        });

        // Arm inputs after a short delay to avoid immediately consuming the click
        this.time.delayedCall(200, () => {
            this.input.once('pointerup', () => this.fullResetToMain());
            this.input.keyboard?.once('keydown-R', () => {
                this.fullResetToMain();
            });
            this.input.keyboard?.once('keydown-ESC', () => {
                this.fullResetToMain();
            });
        });
    }
}
