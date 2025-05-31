import { NPCConfig, NPCMovementType, NPCAnimationConfig as NPCAnimationData, NPCAnimationDefinition, NPCAnimationSet } from '../npcTemplate'; // Adjust path
import { DialogueNode } from "../../../game/dialogues/dialogues";
// Assuming DialogueNode is also imported or defined in npcTemplate for simplicity

//scene: this, x: npcPositions['orangeShirtMouse']?.x || 0, y: npcPositions['orangeShirtMouse']?.y || 0,
//        texture: "orangeShirtMouse", frame: "orangeShirtMouse0.png", dialogues: this.dialoguesData['orangeShirtMouse'],
//        dialogueManager: this.dialogueManager, npcId: "orangeShirtMouse",
//        movementType: "idle", patrolPoints: [{ x: 145, y: 220 }, { x: 105, y: 220 }, { x: 115, y: 220 }],
//        speed: 25, atlasKey: "orangeShirtMouse", isUnique: true,
//        animationKeys: { walkLeft: "orangeShirtMouse_walk_left", walkRight: "orangeShirtMouse_walk_right", idle: "orangeShirtMouse_idle" },
//        frames: { walkLeft: ["orangeShirtMouse2.png", "orangeShirtMouse3.png"], walkRight: ["orangeShirtMouse0.png", "orangeShirtMouse1.png"], idle: ["orangeShirtMouse2.png"] },
//        sensoryRange: 500

const OrangeShirtMouse: NPCAnimationSet = { // <<< USE THE CORRECT TYPE: NPCAnimationConfig
    atlasKey: "orangeShirtMouse", 
    definitions: [
        // Definition for Cop2's idle animation
        { keyName: "orangeshirtmouse_anim_idle", frameNames: ["orangeShirtMouse0.png", "orangeShirtMouse1.png"], frameRate: 3, repeat: -1 },
        // Definition for Cop2's walk left animation
        { keyName: "orangeshirtmouse_anim_walk_left", frameNames: ["orangeShirtMouse2.png", "orangeShirtMouse3.png"], frameRate: 8, repeat: -1 },
        // Definition for Cop2's walk right animation
        { keyName: "orangeshirtmouse_anim_walk_right", frameNames: ["orangeShirtMouse0.png", "orangeShirtMouse1.png"], frameRate: 8, repeat: -1 }
    ],
    // These keys MUST match a keyName from the definitions array above
    // And these property names (idleKey, walkLeftKey) MUST match your NPCAnimationConfig interface
    idleKey: "orangeshirtmouse_anim_idle",
    walkLeftKey: "orangeshirtmouse_anim_walk_left",
    walkRightKey: "orangeshirtmouse_anim_walk_right"
};

const orangeShirtMouseDialogues: DialogueNode[] = [
    { id: "greeting", text: "orange shirt mouse. What do you need?", options: [/* your options here */] },
    { id: "orangeshitymouse_briefing", text: "Listen up, newbie, i didn't do it. just let me go", options: [/* ... */] },
];
 
export const OrangeShirtMouseConfig: NPCConfig = {
    npcId: "orangeShirtMouse",
    displayName: "Orange shirt",
    textureKey: "orangeShirtMouse",         // The spritesheet to use (matches animations.atlasKey)
    initialFrame: "orangeShirtMouse0.png",   // The picture to show when Cop2 first appears

    animations: OrangeShirtMouse, // Assign the animation details we defined above

    dialogues: orangeShirtMouseDialogues,   // Assign the dialogue we defined above
    
    movementType: 'idle',
    speed: 0,                   // He's idle, so no speed
    sensoryRange: 250,
    simpleReactions: {
        "clueGlue": "WHY ARE YOU DOING THIS IN PUBLIC?!",
        "coke": "Share some later"
    },
    // ... add other necessary properties like defaultScale, description etc.
    // defaultScale: 1,
    // description: "The stern but fair police chief.",
    // initialMentalState: NPCMentalState.Neutral,
    // faction: "police",
};
