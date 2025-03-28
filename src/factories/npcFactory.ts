// src/factories/npcFactory.ts

import { NPC } from '../game/NPCgeneral/npc';
import { DialogueManager } from '../game/dialogues/dialogueManager';

interface NPCAnimationFrames {
    walkLeft: string[];    
    walkRight: string[];   
    idle: string[];       
}

interface NPCConfig {
    scene: Phaser.Scene;
    x: number;
    y: number;
    texture: string;
    frame: string;
    dialogues: any;
    dialogueManager: DialogueManager;
    npcId: string;
    movementType: string;
    speed: number;
    atlasKey: string;
    isUnique: boolean;
    animationKeys: {
        walkLeft: string;
        walkRight: string;
        idle: string;
    };
    patrolPoints?: Phaser.Types.Math.Vector2Like[];
    moveArea?: Phaser.Geom.Rectangle;
    frames?: NPCAnimationFrames;

}

export function createNPC(config: NPCConfig, collisionLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapLayer[]): NPC {
    const npc = new NPC({
        scene: config.scene,
        x: config.x,
        y: config.y,
        texture: config.texture,
        frame: config.frame,
        dialogues: config.dialogues,
        dialogueManager: config.dialogueManager,
        npcId: config.npcId,
        movementType: config.movementType,
        speed: config.speed,
        atlasKey: config.atlasKey,
        isUnique: config.isUnique,
        animationKeys: config.animationKeys,
        patrolPoints: config.patrolPoints,
        moveArea: config.moveArea,
    });

    createAnimationsForNPC(config.scene, config);

    // Add NPC to the scene and set up physics
    config.scene.add.existing(npc);
    config.scene.physics.add.existing(npc);
    config.scene.physics.add.collider(config.scene.player, npc);
    if (Array.isArray(collisionLayer)) {
        collisionLayer.forEach(layer => {
            config.scene.physics.add.collider(npc, layer);
        });
    } else {
        config.scene.physics.add.collider(npc, collisionLayer);
    }

    // Set depth for NPCs to make sure they are drawn in the correct order
    npc.setDepth(5);

    return npc;
}
export function createAnimationsForNPC(scene: Phaser.Scene, config: NPCConfig) {
    const { atlasKey, animationKeys, frames } = config;

    // If this NPC config doesn't define frames, we skip
    if (!frames) {
        return;
    }

    // 1) Walk Left
    scene.anims.create({
        key: animationKeys.walkLeft,
        frames: frames.walkLeft.map((frameName) => ({
            key: atlasKey,
            frame: frameName,
        })),
        frameRate: 8,
        repeat: -1,
    });

    // 2) Walk Right
    scene.anims.create({
        key: animationKeys.walkRight,
        frames: frames.walkRight.map((frameName) => ({
            key: atlasKey,
            frame: frameName,
        })),
        frameRate: 8,
        repeat: -1,
    });

    // 3) Idle
    scene.anims.create({
        key: animationKeys.idle,
        frames: frames.idle.map((frameName) => ({
            key: atlasKey,
            frame: frameName,
        })),
        frameRate: 3,
        repeat: -1,
    });
}
export function createNPCs(scene: Phaser.Scene, npcConfigs: NPCConfig[], collisionLayer: Phaser.Tilemaps.TilemapLayer[]): NPC[] {
    const npcs: NPC[] = [];

    npcConfigs.forEach((config) => {
        const npc = createNPC(config, collisionLayer);
        npcs.push(npc);
    });

    return npcs;
}
