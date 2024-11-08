// src/scenes/MainMenu.ts
import { GameObjects, Scene } from 'phaser';
import { Button } from '../scripts/buttonScript';

export class MainMenu extends Scene {
    background!: GameObjects.Image;
    logo!: GameObjects.Image;
    title!: GameObjects.Text;
    text?: GameObjects.Text;

    constructor() {
        super('MainMenu');
    }

    create(): void {
        const { width, height } = this.scale;
        
        //THIS IS IMPORTANT SET LOGO. DO NOT FUCK WITH THE SCALING
        this.logo = this.add.image(width/2, height/2, 'logo').setDepth(0);
        const logoScale = width; // Basic scaling factor... useless probably
        this.logo.setScale(width, height);

        this.logo.setDisplaySize(width, height);


        this.text = this.add.text(200, 200, "Still in dev, be gentle", {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'justify'
        }).setOrigin(0.5).setDepth(100);
        
        //Create buttons to play.
        const text_info = {text: "Play Game", 
            textColor: '#ffffff' , strokeColor: '#000000', fontSize: 24, fontFamily: "Arial Black", align:"justify"};
        const rect_info =  {backgroundColor: 10, transparency: 0.6, fill: "white"};
        const outline_info = {linewidth: 5, linecolor: 10}
        const sizes = {x: width * 0.85 , y: height* 0.55, width: 200, height: 100}

        new Button(this, sizes, text_info, rect_info, outline_info, this.goToGame.bind(this), "G");
        
        text_info.text = "Options";
        sizes.x = width * 0.85; sizes.y = height* 0.40;
        new Button(this, sizes, text_info, rect_info, outline_info, this.goToOptions, "O")
        text_info.text = "Login";
        sizes.x = width * 0.85; sizes.y = height* 0.25;
        new Button(this, sizes, text_info, rect_info, outline_info, this.goToLogin, "L")
 
        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            const newWidth = gameSize.width;
            const newHeight = gameSize.height;
            this.resize(newWidth, newHeight);
        });
    }

    resize(width: number, height: number): void {
        // Resize background
        this.logo.setPosition(width /2, height / 2);
        const logoScale = width / 1024;
        this.logo.setScale(logoScale);

        this.title.setPosition(width / 2, height / 2 + 50);
        this.title.setFontSize(Math.min(38, width / 27)); 
    }

    goToGame(): void {
        console.log("Started game");
        this.scene.start("Game");
        //this.scene.launch('UIGameScene');

    }

    goToOptions(): void {
        console.log("Going to options but not really")
    }

    goToLogin(): void {
        console.log("Going to login but not really")
    }
}


