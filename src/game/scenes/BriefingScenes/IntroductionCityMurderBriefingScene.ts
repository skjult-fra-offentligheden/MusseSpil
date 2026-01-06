import { CaseManager } from '../../../data/cases/CaseManager';
import { IntroductionCityMurderCase } from '../../../cases/IntroductionCityMurderCase';

export class Introduction_city_murder extends Phaser.Scene {
    constructor() {
        super('introduction_city_murder');
    }

    preload() {
        // 1. UNLOAD OLD ASSETS (Optional but good for 15+ cases)
        // This clears textures from the tutorial that are no longer needed
        // this.textures.remove('tutorial_specific_texture'); 

        // 2. LOAD NEW ASSETS (Using your new pack system!)
        this.load.pack('murder_pack', 'assets/packs/introduction_city_murder_pack.json', 'murder_assets');
    }

    create() {
        // 3. SWITCH THE LOGIC
        // This completely removes Tutorial rules (e.g. sniffing glue) 
        // and activates Murder rules (e.g. inspecting body)
        CaseManager.getInstance().loadScenario(IntroductionCityMurderCase);

        // 4. Show Briefing UI (Text, Images, etc.)
        this.add.text(400, 300, "Briefing: A murder has occurred...", { fontSize: '24px' }).setOrigin(0.5);

        // 5. Start the Game Scene
        this.input.keyboard?.once('keydown-SPACE', () => {
             // You can reuse the 'Game' scene class, but now it will 
             // read the Murder config from CaseManager!
             this.scene.start('Game'); 
        });
    }
}