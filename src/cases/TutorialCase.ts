// src/cases/TutorialCase.ts
import { CaseSceneConfig } from './CaseTypes';

export const TutorialCase: CaseSceneConfig = {
    id: 'tutorial',
    suspects: ['pinkDressGirlMouse', 'rockerMouse', 'orangeShirtMouse', 'cop2'],

    // Event rules: fire when items are used; some require a specific witness
    eventRules: [
        // Glue sniff → just barks via reaction map → no flags here

        // Cocaine sniff → everyone shocked (handled by reactions); flag for logic
        { whenItem: 'coke', setFlags: ['usedCoke'] },

        // Cheese taste → global flag; plus witness-gated rules
        { whenItem: 'blueCheese', setFlags: ['tastedCheese'] },

        // Eating cheese in front of Whiskers increments a counter (for violence unlock)
        { whenItem: 'blueCheese', addCounters: [{ id: 'whiskersCheeseCount', by: 1 }], requireWitness: 'cop2' },
        {
            whenItem: "blueCheese", requireWitness: "cop2", setFlags: ["illegalCheeseEatenTwiceInFrontOfWhiskers"], when: {
                kind: "all", of: [{ kind: 'flag', id: 'cheeseMarkedIllegal', value: true },
                    { kind: 'counterAtLeast', id: 'whiskersCheeseCount', count: 2 }] }, },

        // If cheese is marked illegal (done in Journal), tasting in front of Jerry unlocks cheese-crime flag
        // (Accusation UI uses this together with the 'cheeseMarkedIllegal' Journal flag)
        { whenItem: 'blueCheese', setFlags: ['unlockIllegalCheese'], requireWitness: 'orangeShirtMouse' },
    ],

    // Crimes unlock when the conditions are met
    crimes: [
        {
            id: 'cocainePossession',
            label: 'Drug possession',
            suspectId: 'pinkDressGirlMouse',
            unlockWhen: {
                kind: 'all', of: [
                    { kind: 'flag', id: 'usedCoke', value: true },
                    { kind: 'flag', id: 'phoneTextRead', value: true }, // set by Journal when the phone text is read
                ]
            }
        },
        {
            id: 'illegalCheese',
            label: 'Cheese contraband',
            suspectId: 'orangeShirtMouse',
            unlockWhen: {
                kind: 'all', of: [
                    { kind: 'flag', id: 'cheeseMarkedIllegal', value: true }, // set by Journal when cheese is marked illegal
                    { kind: 'flag', id: 'unlockIllegalCheese', value: true }, // gained by tasting in front of Jerry
                ]
            }
        },
        {
            id: 'violence',
            label: 'Assault',
            suspectId: 'cop2',
            unlockWhen: { kind: 'counterAtLeast', id: 'whiskersCheeseCount', count: 2 } // 3× in front of Whiskers
        }
    ],

    // Instant fail if both tasted cheese and sniffed cocaine
    failStates: [
        {
            id: 'fired',
            message: "🚫 You're fired for misconduct.",
            when: {
                kind: 'all', of: [
                    { kind: 'flag', id: 'cheeseDepleted', value: true },
                    { kind: 'flag', id: 'cokeDepleted', value: true },
                ]
            }
        }
    ]
};
