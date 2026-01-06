import { CaseSceneConfig } from './CaseTypes';

export const IntroductionCityMurderCase: CaseSceneConfig = {
    id: 'introduction_city_murder',
    // Define the NPCs relevant to this new scene
    suspects: ['cop2', 'rockerMouse', 'orangeShirtMouse'], 

    eventRules: [
        // Example: If you inspect the body in the new scene
        { 
            whenItem: 'DeadBody', 
            setFlags: ['bodyInspected_city'] 
        }
    ],

    crimes: [
        {
            id: 'murder_city_main',
            label: 'City Murder',
            suspectId: 'rockerMouse', 
            unlockWhen: {
                kind: 'all', of: [
                    { kind: 'flag', id: 'bodyInspected_city', value: true },
                    // Add more conditions here as you build the case
                ]
            }
        }
    ],

    failStates: []
};