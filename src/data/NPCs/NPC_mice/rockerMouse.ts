import { NPCConfig, NPCMovementType, NPCAnimationConfig as NPCAnimationData, NPCAnimationDefinition, NPCAnimationSet } from '../npcTemplate'; // Adjust path
import { DialogueNode } from "../../../game/dialogues/dialogues";
// Assuming DialogueNode is also imported or defined in npcTemplate for simplicity

const rockerMouseAnimationsData: NPCAnimationSet = { // <<< USE THE CORRECT TYPE: NPCAnimationConfig
    atlasKey: "rockerMouse", // This is the 'cop2' spritesheet you load in ToturialScene.preload
    definitions: [
        { keyName: "rockerMouse_anim_idle", frameNames: ["rockerMouse2.png", "rockerMouse3.png"], frameRate: 3, repeat: -1 },
        { keyName: "rockerMouse_anim_walk_left", frameNames: ["rockerMouse2.png", "rockerMouse3.png"], frameRate: 8, repeat: -1 },
        { keyName: "rockerMouse2_anim_walk_right", frameNames: ["rockerMouse0.png", "rockerMouse1.png"], frameRate: 8, repeat: -1 }
    ],
    // These keys MUST match a keyName from the definitions array above
    // And these property names (idleKey, walkLeftKey) MUST match your NPCAnimationConfig interface
    idleKey: "rockerMouse_anim_idle",
    walkLeftKey: "rockerMouse_anim_walk_left",
    walkRightKey: "rockerMouse_anim_walk_right"
};

const rockerMouseDialogues: DialogueNode[] = [
    { id: "greeting", text: "Chief Whiskers. What do you need?", options: [/* your options here */] },
    { id: "rockerMouse_tutorial_briefing", text: "Listen up, rookie...", options: [/* ... */] },
];
 
export const rockerMouseConfig: NPCConfig = {
    npcId: "rockerMouse",
    displayName: "Rocker ratto",
    textureKey: "rockerMouse",         // The spritesheet to use (matches animations.atlasKey)
    initialFrame: "rockerMouse2.png",   // The picture to show when Cop2 first appears

    animations: rockerMouseAnimationsData, // Assign the animation details we defined above

    dialogues: rockerMouseDialogues,   // Assign the dialogue we defined above
    
    movementType: 'idle',
    speed: 0,                   // He's idle, so no speed
    sensoryRange: 250,
    simpleReactions: {
        "clueGlue": "Don't sniff that on the job, Detective!",
        "coke": "Evidence, detective. Don't get any ideas."
    },
    // ... add other necessary properties like defaultScale, description etc.
    // defaultScale: 1,
    // description: "The stern but fair police chief.",
    // initialMentalState: NPCMentalState.Neutral,
    // faction: "police",
};
