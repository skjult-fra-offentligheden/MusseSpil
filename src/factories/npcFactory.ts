// src/factories/npcFactory.ts

import Phaser from 'phaser';
import { NPC } from '../game/NPCgeneral/npc';
import type { DialogueController } from '../game/dialogues/dialogueController'; // Adjust path
import { AllNPCsConfigs } from '../data/NPCs/AllNPCsConfigs';   // Adjust path to your aggregated NPC configs
import { NPCConfig as RichNPCConfig, NPCAnimationSet, NPCAnimationDefinition } from '../data/NPCs/npcTemplate'; // Adjust path to your detailed NPCConfig interface and related types

// --- 1. ANIMATION SETUP (Call this ONCE during game preload/global setup) ---

const animationsInitializedForAtlas = new Set<string>(); // Prevent re-creating anims for the same atlas

///**
// * Iterates through AllNPCConfigs and creates all defined animations.
// * Should be called once after all NPC texture atlases are loaded.
// * @param scene The Phaser.Scene to add animations to.
// */
export function setupAllNPCAnimations(scene: Phaser.Scene): void {
    console.log("[NPCFactory] Setting up all NPC animations...");
    Object.values(AllNPCsConfigs).forEach((npcConfig: RichNPCConfig) => {
        if (npcConfig.animations && npcConfig.animations.atlasKey && npcConfig.animations.definitions) {
            if (animationsInitializedForAtlas.has(npcConfig.animations.atlasKey)) {
                // console.log(`[NPCFactory] Animations for atlas ${npcConfig.animations.atlasKey} already initialized.`);
                return; // Skip if this atlas's animations are already done
            }

            if (!scene.textures.exists(npcConfig.animations.atlasKey)) {
                console.error(`[NPCFactory] Texture atlas key "${npcConfig.animations.atlasKey}" not found for NPC "${npcConfig.npcId}". Animations cannot be created. Was it preloaded?`);
                return;
            }

            npcConfig.animations.definitions.forEach((animDef: NPCAnimationDefinition) => {
                if (scene.anims.exists(animDef.keyName)) {
                    // console.log(`[NPCFactory] Animation key "${animDef.keyName}" already exists. Skipping creation.`);
                    return; // Animation already exists, no need to recreate or log verification for creation
                }
                try {
                    scene.anims.create({
                        key: animDef.keyName,
                        frames: scene.anims.generateFrameNames(npcConfig.animations.atlasKey, { frames: animDef.frameNames }),
                        frameRate: animDef.frameRate,
                        repeat: animDef.repeat,
                        yoyo: animDef.yoyo || false
                    });
                    // console.log(`[NPCFactory] Original log: Created animation: ${animDef.keyName} for atlas ${npcConfig.animations.atlasKey}`);

                    // --- YOUR NEW LOGS GO HERE, AFTER SUCCESSFUL CREATION ---
                    console.log(`[NPCFactory] SUCCESSFULLY Created animation: ${animDef.keyName} for atlas ${npcConfig.animations.atlasKey} with frames: ${animDef.frameNames.join(', ')}`);
                    const createdAnim = scene.anims.get(animDef.keyName);
                    if (createdAnim && createdAnim.frames.length > 0) {
                        // To prevent error if frames[0] is undefined (though it shouldn't be if length > 0)
                        const firstFrameName = createdAnim.frames[0]?.frame?.name || 'N/A';
                        console.log(`[NPCFactory] Verified: Animation ${animDef.keyName} has ${createdAnim.frames.length} frames. First frame key: ${firstFrameName}`);
                    } else {
                        console.error(`[NPCFactory] VERIFICATION FAILED: Animation ${animDef.keyName} was 'created' but has 0 or invalid frames. Check frameNames in config ('${animDef.frameNames.join(', ')}') against atlas '${npcConfig.animations.atlasKey}'!`);
                    }
                    // --- END OF NEW LOGS ---

                } catch (e) {
                    console.error(`[NPCFactory] Error creating animation "${animDef.keyName}" for atlas "${npcConfig.animations.atlasKey}":`, e);
                }
            });
            animationsInitializedForAtlas.add(npcConfig.animations.atlasKey);
        } else {
            console.warn(`[NPCFactory] NPC "${npcConfig.npcId}" is missing complete animation data (atlasKey or definitions).`);
        }
    });
    console.log("[NPCFactory] Finished setting up NPC animations.");
}


// --- 2. NPC INSTANCE CREATION ---

///**
// * Creates a single NPC instance based on its ID and places it in the scene.
// * @param scene The Phaser.Scene to add the NPC to.
// * @param x The x-coordinate for the NPC.
// * @param y The y-coordinate for the NPC.
// * @param npcId The ID of the NPC (used to look up its RichNPCConfig).
// * @param dialogueManager The DialogueManager instance for this scene.
// * @param collisionLayers Map layer(s) for the NPC to collide with.
// * @returns The created NPC instance, or null if config not found.
// */
export function createNPCInstance(
    scene: Phaser.Scene,
    x: number,
    y: number,
    npcId: string,
    dialogueManager: DialogueController,
    collisionLayers?: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapLayer[] // Optional
): NPC | null {
    const npcConfigData = AllNPCsConfigs[npcId];
    if (!npcConfigData) {
        console.error(`[NPCFactory] RichNPCConfig not found for npcId: "${npcId}". Cannot create NPC.`);
        return null;
    }

    const nodesForNpc =
        (dialogueManager as any).dialoguesData?.[npcId]
        ?? [];

    // The NPC constructor now takes the rich npcConfigData and handles most of its internal setup
    // (like adding itself to the scene, physics, setting properties from config).
    const npc = new NPC(
        scene,
        x,
        y,
        npcConfigData, // Pass the full RichNPCConfig,
        nodesForNpc,
        dialogueManager
    );

    // Factory can still handle scene-level common setup like map collision.
    if (collisionLayers) {
        if (Array.isArray(collisionLayers)) {
            collisionLayers.forEach(layer => {
                if (layer) scene.physics.add.collider(npc, layer);
            });
        } else {
            scene.physics.add.collider(npc, collisionLayers);
        }
    }

    // Player-NPC collision is often better handled centrally or by the Player class,
    // but can be added here if it's a generic NPC behavior.
    // Example: if (scene.registry.get('player')) {
    //     scene.physics.add.collider(scene.registry.get('player') as Phaser.GameObjects.GameObject, npc);
    // }

    // Depth can be set here or come from npcConfigData.defaultDepth if you add it.
    npc.setDepth(npcConfigData.depth || 5); // Example: use config.depth or default to 5

    return npc;
}

/**
 * Defines the data needed to spawn an NPC instance.
 */
export interface NpcSpawnInstruction {
    npcId: string;
    x: number;
    y: number;
    // You could add per-instance overrides here if absolutely necessary, e.g.:
    // overrideInitialDialogueNodeId?: string;
    // overrideFaction?: string;
}

///**
// * Spawns multiple NPCs in a scene based on a list of spawn instructions.
// * @param scene The Phaser.Scene.
// * @param spawnList An array of NpcSpawnInstruction objects.
// * @param dialogueManager The DialogueManager instance.
// * @param collisionLayers Map layer(s) for NPCs to collide with.
// * @returns An array of the created NPC instances.
// */
export function spawnNPCsFromList(
    scene: Phaser.Scene,
    spawnList: NpcSpawnInstruction[],
    dialogueManager: DialogueController,
    collisionLayers: Phaser.Tilemaps.TilemapLayer[] // Assuming always an array
): NPC[] {
    const createdNpcs: NPC[] = [];

    spawnList.forEach(spawnData => {
        console.warn(scene, dialogueManager)
        const npcInstance = createNPCInstance(
            scene,
            spawnData.x,
            spawnData.y,
            spawnData.npcId,
            dialogueManager,
            collisionLayers
            // If you had instance overrides in NpcSpawnInstruction, pass them here:
            // spawnData.overrides
        );
        if (npcInstance) {
            createdNpcs.push(npcInstance);
        }
    });
    return createdNpcs;
}
