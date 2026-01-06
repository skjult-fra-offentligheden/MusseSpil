import { CaseSceneConfig } from './CaseTypes';

export const MurderMysteryCase: CaseSceneConfig = {
    id: 'murder_mystery',
    // NPCs relevant to this scene/case
    suspects: ['cop2', 'orangeShirtMouse', 'rockerMouse'],

    // 1. Event Rules: What happens when you interact with items?
    eventRules: [
        { 
            whenItem: 'knifeBlood', 
            setFlags: ['foundMurderWeapon'],
            // Optional: require a witness to see you holding it
            // requireWitness: 'cop2' 
        },
        {
            whenItem: 'DeadBody',
            setFlags: ['bodyInspected']
        }
    ],

    // 2. Crimes: The accusation options that appear in the Journal
    crimes: [
        {
            id: 'murder_first_degree',
            label: 'First Degree Murder',
            suspectId: 'rockerMouse', // Let's assume Rocker Mouse did it for this example
            unlockWhen: {
                kind: 'all', of: [
                    { kind: 'flag', id: 'foundMurderWeapon', value: true },
                    { kind: 'flag', id: 'bodyInspected', value: true },
                    // You might add a flag that is set via dialogue, e.g., 'motiveKnown'
                ]
            }
        }
    ],

    // 3. Fail States: Ways to lose immediately (optional)
    failStates: []
};