import { NPCConfig, NPCMovementType, NPCAnimationConfig as NPCAnimationData, NPCAnimationDefinition, NPCAnimationSet } from '../npcTemplate'; // Adjust path
import { DialogueNode } from "../../../game/dialogues/dialogues";
// Assuming DialogueNode is also imported or defined in npcTemplate for simplicity



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

//const orangeShirtMouseDialogues: DialogueNode[] = [
//    { id: "greeting", text: "orange shirt mouse. What do you need?", options: [/* your options here */] },
//    { id: "orangeshitymouse_briefing", text: "Listen up, newbie, i didn't do it. just let me go", options: [/* ... */] },
//];
 
export const OrangeShirtMouseConfig: NPCConfig = {
    npcId: "orangeShirtMouse",
    displayName: "Mouse Jerry",
    textureKey: "orangeShirtMouse",         // The spritesheet to use (matches animations.atlasKey)
    initialFrame: "orangeShirtMouse0.png",   // The picture to show when Cop2 first appears

    animations: OrangeShirtMouse, // Assign the animation details we defined above

    //dialogues: orangeShirtMouseDialogues,   // Assign the dialogue we defined above
    isSuspect: true, // This NPC is a suspect in the case
    culpritDetails: {
        crimeCommitted: 'Illegal cheese possession',
        keyEvidence: ['blueCheese'],
        motive: 'Loves contraband cheese'
    },
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
    faction: "CocaineGang",
    portrait: {
        textureKey: 'portrait_orangeshirt'
    }
};
