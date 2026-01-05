import { NPCConfig, NPCMovementType, NPCAnimationConfig as NPCAnimationData, NPCAnimationDefinition, NPCAnimationSet } from '../npcTemplate'; // Adjust path
// Assuming DialogueNode is also imported or defined in npcTemplate for simplicity

const cop2AnimationsData: NPCAnimationSet = { // <<< USE THE CORRECT TYPE: NPCAnimationConfig
    atlasKey: "cop2", // This is the 'cop2' spritesheet you load in ToturialScene.preload
    definitions: [
        // Definition for Cop2's idle animation
        { keyName: "cop2_anim_idle", frameNames: ["cop2sprite.png", "cop2sprite1.png"], frameRate: 3, repeat: -1 },
        // Definition for Cop2's walk left animation
        { keyName: "cop2_anim_walk_left", frameNames: ["cop2sprite2.png", "cop2sprite3.png"], frameRate: 8, repeat: -1 },
        // Definition for Cop2's walk right animation
        { keyName: "cop2_anim_walk_right", frameNames: ["cop2sprite1.png", "cop2sprite2.png"], frameRate: 8, repeat: -1 }
    ],
    // These keys MUST match a keyName from the definitions array above
    // And these property names (idleKey, walkLeftKey) MUST match your NPCAnimationConfig interface
    idleKey: "cop2_anim_idle",
    walkLeftKey: "cop2_anim_walk_left",
    walkRightKey: "cop2_anim_walk_right"
};


export const cop2Config: NPCConfig = {
    npcId: "cop2",
    displayName: "Chief Whiskers",
    textureKey: "cop2",         // The spritesheet to use (matches animations.atlasKey)
    initialFrame: "cop2sprite.png",   // The picture to show when Cop2 first appears

    animations: cop2AnimationsData, // Assign the animation details we defined above
    isSuspect: true, // This NPC is a suspect in the case
    culpritDetails: {
        crimeCommitted: 'Assault',
        keyEvidence: [],
        motive: 'Lost his temper'
    },
    speakingSoundKey: "male_speaking_sound",    
    movementType: 'idle',
    speed: 0,                   // He's idle, so no speed
    sensoryRange: 250,
    simpleReactions: {
        "clueGlue": "Don't sniff that on the job, Detective!",
        "coke": "Evidence, detective. Don't get any ideas."
    },

    portrait: {
        textureKey: 'portrait_cop2' // The key for the preloaded portrait image
    }
    // ... add other necessary properties like defaultScale, description etc.
    // defaultScale: 1,
    // description: "The stern but fair police chief.",
    // initialMentalState: NPCMentalState.Neutral,
    // faction: "police",
};
