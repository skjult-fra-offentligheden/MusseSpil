// src/data/npcDialogues.ts

import { DialogueNode } from '../game/classes/dialogues';

export const npcDialogues: { [npcId: string]: DialogueNode[] } = {
    placeholderDialogue: [
        {
            id: 'greeting',
            text: 'I have no story, no life, nothing to tell you.',
            options: [
                {id: "Later", text: "i'll come back later"}
            ]
        }
        ],
    cop1: [
        {
            id: 'greeting',
            text: 'Copper Manlyman: Hi, Detective. Are you out here solving mysteries?',
            options: [
                { id: 'Not_yet', text: 'No, sadly no one needs me', nextDialogueId: "Not_yet"},
                { id: 'Looking_for_job', text: 'Heard about any murders here?', nextDialogueId: "Looking_for_job" },
            ],
        },
        {
            id: 'Not_yet',
            text: 'Copper Manlyman: Yeah, no one likes you',
            options: [
                { id: 'Looking_for_job', text: 'Heard about any murders here?', nextDialogueId: "Looking_for_job"}],
        },
        {
            id: 'Looking_for_job',
            text: 'Copper Manlyman: Some mouse just died, mind doing my job and finding out who did it?',
            options: [
                { id: 'need_help_yes', text: 'Yes.', nextDialogueId:'need_help_yes' },
                { id: 'need_help_no', text: 'No, do your job!', nextDialogueId:'need_help_no' },
            ],
        },
        {
            id: 'need_help_yes',
            text: 'Copper Manlyman: Just look at the corpse, maybe you get a clue',
            options: [
                { 
                    id: 'quest_yes', 
                    text: 'Tell me more.', 
                    nextDialogueId: 'quest_details',
                    callback: () => { console.log('Quest Started!');}
                },
                { id: 'quest_no', text: 'Maybe later.' },
            ],
        },
        {
            id: 'need_help_no',
            text: 'Copper Manlyman: Okay, i will just dump the body in the graveyard',
            options: [],
        },
        {
            id: 'quest_details',
            text: 'Copper Manlyman: Do my job',
            options: [],
        },
        {
            id: 'quest_no',
            text: 'Copper Manlyman: You dont care about the city',
            options: [],
        },
    ],
    cop2: [
        {
            id: 'greeting',
            text: 'Copper Holmes: Hey you!',
            options: [
                { id: 'ask_help', text: 'What?', nextDialogueId:"ask_help" },
                { id: 'no_thanks', text: 'HEY YOU!', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'ask_help',
            text: 'Copper Holmes: Solve the murder, bum',
            options: [
                { 
                    id: 'accept_help', 
                    text: 'On it', 
                    nextDialogueId: 'accept_help_response',
                },
                { id: 'decline_help', text: 'No! and I hope you are the next victim', nextDialogueId: "decline_help" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Copper Holmes: DO NOT YELL AT ME',
            options: [],
        },
        {
            id: 'accept_help_response',
            text: 'Copper Holmes: Thank you!',
            options: [],
        },
        {
            id: 'decline_help',
            text: 'Copper Holmes: ...',
            options: [],
        },
    ],
    copGirl: [
        {
            id: 'greeting',
            text: 'Copper Hermione: God it is awful what happened, to think the poor guy was stabbed... like 37 times or something',
            options: [
                { id: 'ask_help', text: 'What?', nextDialogueId:"ask_help" },
                { id: 'no_thanks', text: 'Thats a weird way to start a conversation', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'ask_help',
            text: 'Copper Hermione: It is not right this happened, please please help solve this murder',
            options: [
                { 
                    id: 'accept_help', 
                    text: 'Of course', 
                    nextDialogueId: 'accept_help_response',
                },
                { id: 'decline_help', text: 'Why, am i getting paid extra for this?', nextDialogueId: "decline_help" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Copper Hermione: ... sorry. ',
            options: [],
        },
        {
            id: 'accept_help_response',
            text: 'Copper Hermione: Thank you!',
            options: [],
        },
        {
            id: 'decline_help',
            text: 'Copper Hermione: God you´re not nice. It is your job already',
            options: [],
        },
    ],
    // Non cop npcs

    mouseRedDressGirl: [
        {
            id: 'greeting',
            text: 'Mouse red dress girl: Im so scared, someone died',
            options: [
                { id: 'play_stupid', text: 'why?', nextDialogueId:"play_stupid" },
                { id: 'no_thanks', text: 'Yeah, you should flee. I heard you are next', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'play_stupid',
            text: 'Mouse girl: SOMEONE DIED!!',
            options: [
                { 
                    id: 'play_stupid2', 
                    text: 'Who died?', 
                    nextDialogueId: 'play_stupid2',
                    callback: () => { console.log('Quest for the mouse girl started!'); }
                },
                { id: 'Weird', text: 'Was he your boyfriend, are you single now?', nextDialogueId: "Weird" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Mouse girl: Detective, respecfully, leave',
            options: [],
        },
        {
            id: 'play_stupid2',
            text: 'Mouse girl: My ex-boyfriend, Billy bob mouse!',
            options: [],
        },
        {
            id: 'Weird',
            text: 'Mouse girl: Detective, disrespecfully, leave',
            options: [],
        },
    ],

    mouseRocker: [
        {
            id: 'greeting',
            text: 'Rocker: I did not do it',
            options: [
                { id: 'play_stupid', text: 'did what?', nextDialogueId:"play_stupid" },
                { id: 'no_thanks', text: 'Yeah, you did it', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'play_stupid',
            text: 'Rocker: Kill the guy',
            options: [
                { 
                    id: 'play_stupid2', 
                    text: 'It was a guy?', 
                    nextDialogueId: 'play_stupid2',
                },
                { id: 'Weird', text: 'Was he your customer?', nextDialogueId: "Weird" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Rocker: Detective, disrespecfully, leave',
            options: [],
        },
        {
            id: 'play_stupid2',
            text: 'Rocker: You must be blind',
            options: [],
        },
        {
            id: 'Weird',
            text: 'Rocker: ... I am not talking to you anymore',
            options: [],
        },
    ],

    basicmouse: [
        {
            id: 'greeting',
            text: 'Basic Mouse: Hi',
            options: [
                { id: 'play_stupid', text: 'Did you kill the dead person?', nextDialogueId:"play_stupid" },
                { id: 'no_thanks', text: 'Hi', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'play_stupid',
            text: 'Basic Mouse: Someone died? Who',
            options: [
                { 
                    id: 'play_stupid2', 
                    text: 'I was hoping you would know it', 
                    nextDialogueId: 'play_stupid2',
                },
                { id: 'Weird', text: 'You know who Im talking about. Why are you lying?', nextDialogueId: "Weird" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Basic Mouse: Bye',
            options: [],
        },
        {
            id: 'play_stupid2',
            text: 'Basic Mouse: Yeah, no',
            options: [],
        },
        {
            id: 'Weird',
            text: 'Basic Mouse: I am not talking anymore until I get a lawyer',
            options: [],
        },
    ],

    grannymouse: [
        {
            id: 'greeting',
            text: 'Granny Mouse: Have you seen my old woman bag?',
            options: [
                { id: 'play_stupid', text: 'No, but I can help find it', nextDialogueId:"play_stupid" },
                { id: 'no_thanks', text: 'Yeah, but i wont tell you where', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'play_stupid',
            text: 'Granny Mouse: Good detective, I think I lost it in the bushes',
            options: [
                { 
                    id: 'play_stupid2', 
                    text: 'Okay, I will look there', 
                    nextDialogueId: 'play_stupid2',
                },
                { id: 'Weird', text: 'Can I keep it if i find it?', nextDialogueId: "Weird" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Granny Mouse: Detective, respecfully, you are not helping me',
            options: [],
        },
        {
            id: 'play_stupid2',
            text: 'Granny Mouse: Thanks. I really need it',
            options: [],
        },
        {
            id: 'Weird',
            text: 'Granny Mouse: Detective, disrespecfully, leave',
            options: [],
        },
    ],

    creator: [
        {
            id: 'greeting',
            text: 'Game Designer mouse: wtf am i supposed to do with this game?',
            options: [
                { id: 'play_stupid', text: 'Try harder', nextDialogueId:"play_stupid" },
                { id: 'no_thanks', text: 'Oh I will gladly give feedback', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'play_stupid',
            text: '... thanks.',
            options: [
                { 
                    id: 'play_stupid2', 
                    text: '...', 
                    nextDialogueId: 'play_stupid2',
                },
                { id: 'Weird', text: '...', nextDialogueId: "Weird" },
            ],
        },
        {
            id: 'no_thanks',
            text: '... I am waiting',
            options: [],
        },
        {
            id: 'play_stupid2',
            text: '...',
            options: [],
        },
        {
            id: 'Weird',
            text: '...',
            options: [],
        },
    ],
    bluemouse: [
        {
            id: 'greeting',
            text: 'Blue Mouse: I dont talk to coppers',
            options: [
                { id: 'play_stupid', text: 'I am a detective, not a copper', nextDialogueId:"play_stupid" },
                { id: 'no_thanks', text: 'Your breath smells weird anyways', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'play_stupid',
            text: 'Blue Mouse: ... Same thing.',
            options: [
                { 
                    id: 'play_stupid2', 
                    text: 'Nuh uh its not', 
                    nextDialogueId: 'play_stupid2',
                },
                { id: 'Weird', text: 'So what?', nextDialogueId: "Weird" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Blue Mouse: ... Leave',
            options: [],
        },
        {
            id: 'play_stupid2',
            text: 'Blue Mouse: It is so!',
            options: [
                {
                id: "play_Stupid3",
                text: "NUH UH IT IS NOT",
                nextDialogueId: "play_stupid"
            }
        ],
        },
        {
            id: 'Weird',
            text: 'Blue Mouse: ...',
            options: [],
        },
    ],
    wizard: [
        {
            id: 'greeting',
            text: 'Wizard Mouse: I am the greatest wizard ever',
            options: [
                { id: 'play_stupid', text: 'What does a wizard do?', nextDialogueId:"play_stupid" },
                { id: 'no_thanks', text: 'Ok, nerd!', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'play_stupid',
            text: 'Wizard Mouse: I can do magic!',
            options: [
                { 
                    id: 'play_stupid2', 
                    text: 'Prove it!', 
                    nextDialogueId: 'play_stupid2',
                },
                { id: 'Weird', text: 'Ok, Nerd', nextDialogueId: "Weird" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Wizard Mouse: Curse you, Detective',
            options: [],
        },
        {
            id: 'play_stupid2',
            text: 'Wizard Mouse: Come back later and I will make a giant fireball',
            options: [],
        },
        {
            id: 'Weird',
            text: 'Wizard Mouse: One day, you will regret those words.',
            options: [],
        },
    ],    albino: [
        {
            id: 'greeting',
            text: 'Albino Mouse: I hate being albino',
            options: [
                { id: 'play_stupid', text: 'Oh why?', nextDialogueId:"play_stupid" },
                { id: 'no_thanks', text: 'You are kind of a freak', nextDialogueId: "no_thanks" },
            ],
        },
        {
            id: 'play_stupid',
            text: 'Albino Mouse: Everyone treats me like i am different',
            options: [
                { 
                    id: 'play_stupid2', 
                    text: 'You are different, freak', 
                    nextDialogueId: 'play_stupid2',
                },
                { id: 'Weird', text: 'I think you are worth just as much as a normal mouse', nextDialogueId: "Weird" },
            ],
        },
        {
            id: 'no_thanks',
            text: 'Albino Mouse: Thanks, now i have something to cry about tonight',
            options: [],
        },
        {
            id: 'play_stupid2',
            text: 'Albino Mouse: Thanks, now i have something to cry about tonight',
            options: [],
        },
        {
            id: 'Weird',
            text: 'Albino Mouse: That is a weird thing to say',
            options: [],
        },
    ],
};
