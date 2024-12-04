import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, screen.width, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

        //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
        bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game
        this.load.setPath('assets');


        this.load.image('logo', 'widerNewlogoMouse.png');
        this.load.image('star', 'star.png');

        //assets
        this.load.image('background_floor', 'tilemaps/Background_floor.png');
        this.load.image('test_house_more', 'tilemaps/test_house_more.png');
        this.load.image('objects', 'tilemaps/tilemap_objects.png');
        this.load.tilemapTiledJSON('scene1', 'tilemaps/windowsTilemap.tmj');

        //spritesheet
        this.load.spritesheet('player', 'characterSprite/newPlayerSpritesheet.png', {frameWidth: 48, frameHeight: 48});        
        this.load.json("npc_dialogues", "dialogue/npcdialogue.json");
        this.load.json("objects_dialogues", "dialogue/objectsDialogue.json");
        this.load.json("scene_1_clues", "dialogue/clues.json");
        this.load.json('suspectsData', 'dialogue/suspects.json');

        
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
