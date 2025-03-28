
export function createNPCAnimations(scene: Phaser.Scene, standardAtlasSprites: { textureKey: string, framePrefix: string, idleFrame: string }[]) {
    standardAtlasSprites.forEach((atlas) => {
        scene.anims.create({
            key: `${atlas.textureKey}_walk_left`,
            frames: scene.anims.generateFrameNames(atlas.textureKey, { prefix: `${atlas.framePrefix}`, start: 2, end: 3, suffix: '.png' }),
            frameRate: 8,
            repeat: -1,
        });

        scene.anims.create({
            key: `${atlas.textureKey}_walk_right`,
            frames: scene.anims.generateFrameNames(atlas.textureKey, { prefix: `${atlas.framePrefix}`, start: 0, end: 1, suffix: '.png' }),
            frameRate: 8,
            repeat: -1,
        });

        scene.anims.create({
            key: `${atlas.textureKey}_idle`,
            frames: [{ key: atlas.textureKey, frame: atlas.idleFrame }],
            frameRate: 1,
            repeat: -1,
        });
    });
}