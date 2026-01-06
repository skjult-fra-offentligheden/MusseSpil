import { Scene } from 'phaser';
import { tutorialCases } from '../../../data/cases/tutorialCases';

export class TutorialBriefingScene extends Scene {
    private fullText: string = "";
    private displayedText: string = "";
    private textObject!: Phaser.GameObjects.Text;
    private charIndex: number = 0;
    private timerEvent!: Phaser.Time.TimerEvent;
    private isFinished: boolean = false;
    private nextSceneKey: string = 'ToturialScene'; // The scene to start after this

    constructor() {
        super('TutorialBriefingScene');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Black Background
        this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);

        // 2. Find the Active Case Data
        // We look for the first case marked "active" in your data
        const activeEntry = Object.entries(tutorialCases.cases).find(([_, c]) => c.active);
        const activeCase = activeEntry ? activeEntry[1] : tutorialCases.cases.maincase; // Fallback

        // Prepare the text
        const title = activeCase.case_title.toUpperCase();
        // const description = activeCase.case_description_task;
        const description = "Welcome to your day as a detective, your job is to investigate crimes, gather clues, and solve mysteries. You're smart, observant, and likely a nepo-baby hire. This case is about finding the owner of the drugs, however the police accidentally arrested too many people, and it's your job to find the real culprit."
        
        // Format: TITLE \n\n DESCRIPTION
        this.fullText = `${title}\n\n${description}`;

        // 3. Create Text Objects
        // "Classified" stamp or Case File Header
        this.add.text(100, 100, "CONFIDENTIAL // CASE FILE", {
            fontFamily: 'Courier',
            fontSize: '24px',
            color: '#ff0000'
        });

        // The main content text (starts empty)
        this.textObject = this.add.text(100, 160, '', {
            fontFamily: 'Courier', // Monospace fonts look best for typewriters
            fontSize: '28px',
            color: '#ffffff',
            wordWrap: { width: width - 200 }
        });

        // Skip prompt (bottom right)
        const skipText = this.add.text(width - 50, height - 50, "Press [SPACE] to Start", {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#666666'
        }).setOrigin(1, 1);

        // Blinking cursor effect for skip text
        this.tweens.add({
            targets: skipText,
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // 4. Start Typewriter Effect
        // Speed: 30ms per character
        this.timerEvent = this.time.addEvent({
            delay: 30,
            callback: this.nextChar,
            callbackScope: this,
            loop: true
        });

        // 5. Input Handling (Skip or Continue)
        this.input.keyboard?.on('keydown-SPACE', () => {
            if (!this.isFinished) {
                // If text is still typing, finish it instantly
                this.skipTypewriter();
            } else {
                // If text is done, move to next scene
                this.startGame();
            }
        });
    }

    private nextChar() {
        if (this.charIndex < this.fullText.length) {
            this.displayedText += this.fullText[this.charIndex];
            this.textObject.setText(this.displayedText);
            this.charIndex++;
            // (Sound would go here: this.sound.play('typewriter_click'))
        } else {
            // Finished typing
            this.finishTypewriter();
        }
    }

    private skipTypewriter() {
        // Show full text immediately
        this.textObject.setText(this.fullText);
        this.finishTypewriter();
    }

    private finishTypewriter() {
        this.isFinished = true;
        if (this.timerEvent) this.timerEvent.remove();
        
        // Optional: Change the skip text to indicate readiness
        // this.skipText.setText("Press [SPACE] to Begin Investigation");
    }

    private startGame() {
        // Fade out to black, then switch scenes
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start(this.nextSceneKey);
        });
    }
}