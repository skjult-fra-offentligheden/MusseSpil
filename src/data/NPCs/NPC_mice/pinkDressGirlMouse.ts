import { NPCConfig, NPCMovementType, NPCAnimationConfig as NPCAnimationData, NPCAnimationDefinition, NPCAnimationSet } from '../npcTemplate'; // Adjust path
// Assuming DialogueNode is also imported or defined in npcTemplate for simplicity

const pinkDressGirlMouseAnimationsData: NPCAnimationSet = { // <<< USE THE CORRECT TYPE: NPCAnimationConfig
    atlasKey: "pinkDressGirlMouse", // This is the 'cop2' spritesheet you load in ToturialScene.preload
    definitions: [
        { keyName: "pinkDressGirlMouse_anim_idle", frameNames: ["pinkDressGirlMouse2.png", "pinkDressGirlMouse3.png"], frameRate: 3, repeat: -1 },
        { keyName: "pinkDressGirlMouse_anim_walk_left", frameNames: ["pinkDressGirlMouse2.png", "pinkDressGirlMouse3.png"], frameRate: 8, repeat: -1 },
        { keyName: "pinkDressGirlMouse_anim_walk_right", frameNames: ["pinkDressGirlMouse0.png", "pinkDressGirlMouse1.png"], frameRate: 8, repeat: -1 }
    ],
    // These keys MUST match a keyName from the definitions array above
    // And these property names (idleKey, walkLeftKey) MUST match your NPCAnimationConfig interface
    idleKey: "pinkDressGirlMouse_anim_idle",
    walkLeftKey: "pinkDressGirlMouse_anim_walk_left",
    walkRightKey: "pinkDressGirlMouse_anim_walk_right"
};

//const pinkDressGirlMouseDialogues: DialogueNode[] = [
//    { id: "greeting", text: "Chief Whiskers. What do you need?", options: [/* your options here */] },
//    { id: "pinkDressGirlMouse_tutorial_briefing", text: "Listen up, rookie...", options: [/* ... */] },
//];

const theCrime: CulpritDetails = {
    crimeCommitted: "Doing cocaine",
    keyEvidence: ["clueGlue", "cluePhone"],
    motive: "She's a bum, she's an addict, she belongs behind BAAARRS"
};

export const pinkDressGirlMouseConfig: NPCConfig = {
    npcId: "pinkDressGirlMouse",
    displayName: "Mouse Jennie",
    textureKey: "pinkDressGirlMouse",         // The spritesheet to use (matches animations.atlasKey)
    initialFrame: "pinkDressGirlMouse2.png",   // The picture to show when Cop2 first appears

    animations: pinkDressGirlMouseAnimationsData, // Assign the animation details we defined above

    //dialogues: pinkDressGirlMouseDialogues,   // Assign the dialogue we defined above
    isSuspect: true, 
    culpritDetails: theCrime,
    movementType: 'idle',
    speed: 0,                   // He's idle, so no speed
    sensoryRange: 250,
    simpleReactions: {
        "clueGlue": "Don't sniff that on the job, Detective!",
        "coke": "Evidence, detective. Don't get any ideas."
    },
    speakingSoundKey: "girl_speaking_sound",
    // defaultScale: 1,
    // description: "The stern but fair police chief.",
    // initialMentalState: NPCMentalState.Neutral,
    // faction: "police",
    portrait: {
        textureKey: 'portrait_pinkdress'
    }
};
