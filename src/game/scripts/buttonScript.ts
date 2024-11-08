import { Scene } from "phaser";

export class Button {
    constructor(
        scene: Scene,
        sizes: { x: number, y: number, width: number, height: number },
        text_info: { text: string, textColor: string, strokeColor: string, fontSize: number, fontFamily: string, align: string },
        rect_info: { backgroundColor?: number, transparency: number, fill: string },
        outline_info: { linewidth: number, linecolor: number },
        onClick?: () => void,
        hotkey?: string
    ) { 
        console.log("sizes:", sizes);
        console.log("text:", text_info);
    
        // Create button outline
        const outline = scene.add.graphics();
        outline.lineStyle(outline_info.linewidth, outline_info.linecolor);
        outline.strokeRect(sizes.x - sizes.width / 2, sizes.y - sizes.height / 2, sizes.width, sizes.height);

        // Create button background
        const buttonBackground = scene.add.rectangle(
            sizes.x,
            sizes.y,
            sizes.width,
            sizes.height,
            0x13001, /* rect_info.backgroundColor ||  */
            rect_info.transparency
        );

        // Optional hotkey label
        if (hotkey) {
            const hotkeyText = scene.add.text(sizes.x + sizes.width / 2 - 15, sizes.y + sizes.height / 2 - 15, hotkey, {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }).setOrigin(1, 1);
        }
    
        // Main button text
        const buttonText = scene.add.text(sizes.x, sizes.y, text_info.text, {
            fontSize: `${text_info.fontSize}px`,
            color: text_info.textColor,
            stroke: text_info.strokeColor,
            strokeThickness: 10,
            align: text_info.align,
            fontFamily: text_info.fontFamily
        }).setOrigin(0.5, 0.5);
    
        // Set up interactivity for the button background
        buttonBackground.setInteractive({ useHandCursor: true })
            .on("pointerover", () => {
                buttonBackground.setFillStyle(0x00008b, Math.min(1, rect_info.transparency + 0.3));
                buttonBackground.y -= 5;
                outline.y -= 5;
                buttonText.y -= 5;
            })
            .on("pointerout", () => {
                buttonBackground.setFillStyle(rect_info.backgroundColor || 0x000343, rect_info.transparency);
                buttonBackground.y += 5;
                outline.y += 5;
                buttonText.y += 5;
            })
            .on("pointerdown", () => {
                buttonBackground.setFillStyle(0x87cefa);
            })
            .on("pointerup", () => {
                buttonBackground.setFillStyle(rect_info.backgroundColor || 0x000343, rect_info.transparency);
                console.log("Button clicked");
                if (onClick) onClick(); // Execute the callback if provided
            });
    
        // Set up hotkey to trigger the button
        if (hotkey) {
            const key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[hotkey.toUpperCase()]);
            key.on('down', () => {
                if (onClick) onClick();
            });
        }
    
        // Group button elements as one unit
        scene.add.container(0, 0, [outline, buttonBackground, buttonText]);
    }
}
