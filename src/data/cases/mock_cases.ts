export const tutorialCases = {
  cases: {
    maincase: {
      status_active: true,
      main_toturial_case: 'Cocaine case',
      case_title: 'CASE: WHOSE DRUGS ARE THESE',
      case_description_player_task: 'Your task: Find out who bought the cocaine',
      case_description_task:
        "Someone bought drugs.\nWe know about it because there was a fight about the price. The police apprahended these 4 mice, and took what they were carrying. \nThe police can't quite figure out who bought it.",
      culpritNpcId: 'pinkDressGirlMouse',
    },
    bluecheese_case: {
      status_active: false,
      main_toturial_case: 'Cheese case',
      case_title: 'CASE: WHOSE CHEESE IS THIS',
      case_description_player_task: 'Your task: Find out who owns this cheese',
      case_description_task:
        "This cheese is illegal.\nYou noticed the blue lines, these is delicious and also deeply illegal, because it's been chemically altered. Who owns this?! this is dangerous \nPolice officer whisker do seem to be not interested in solving this case",
      culpritNpcId: 'orangeShirtMouse',
    },
  
      officer_whiskers_case: {
      status_active: false,
      main_toturial_case: 'ASSAULT',
      case_title: 'CASE: Get revenge for assault',
      case_description_player_task: 'Your task: go into the accusation scene and accuse officer whiskers',
      case_description_task:
        "Officer Whiskers assaulted you, you have witnesses, accuse him and solve the case",
      culpritNpcId: 'cop2',
    },
  }
} as const;

export type TutorialCases = typeof tutorialCases;

// Helper: activate/deactivate a tutorial case at runtime
export function activateTutorialCase(caseId: keyof typeof tutorialCases.cases, active = true) {
  try {
    console.log('[Cases] activateTutorialCase:', caseId, '=>', active);
    (tutorialCases as any).cases[caseId].active = active;
    const snapshot = Object.entries((tutorialCases as any).cases).map(([k, v]: any) => `${k}:${v.active}`);
    console.log('[Cases] current active map:', snapshot.join(', '));
  } catch {
    // ignore if case id not found
  }
}
