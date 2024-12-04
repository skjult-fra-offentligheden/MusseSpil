# Samler tankerne om logic og sådan

Overordnet set vil jeg lave et lille verden med en masse at interagere med og derefter samle spor og sammensætte dem til en sammenhængende historie

### Personer
* Detektiv mus
* Betjente
* Politichef (ikke inkl)
* Advokat?
* Kriminelle
* Beboere
  * Gammel dame mus
  * tyk mus
  * Gammel mand mus
  * Lille pige mus (ikke lavet)
  * NPC mus x 2
  * Fancy Mouse
  * 2 x pigemus
  * Mor mus (ikke lavet)
  * Reskinnet tilfældige mus

* Specielle mus
  * Wizard Mouse
  * soccerer Mouse
  * Cyborg Mouse
  * Spøgelsemus
  * Trash Can Mouse (ikke inkl)
  * Doctor Mouse (ikke inkl)

  total i spillet er der 16 mus inkl player
---

## Teknologi inklussion

Først er at jeg har brugt TypeScript ... fordi det er mere som C# end ren JavaScript.  
Har valgt at inkludere en udvidelse til React (som jeg bruger som framework fordi jeg læste, det var godt at lære til jobs). Udvidelsen er Phaser, som er brugt til web-game udvidelse. Den har indbyggede formler som tweens og sprite animation og indbygget tilemap (nok det sidste).

Alle figurer er lavet i Piskel, fordi det er nemt og online, og jeg kan finde ud af det.
(20/11) - har piskel offline også nu

Tilemaps er lavet i Tilemaps.

- Til et standard overlay på map er pixel størrelse 48x48.
- I story mode er overlay 256x256. -- Update går væk fra storymode til ren accusation

---

## Gameflow

Ideén er at du spawner ind i verdenen. Du bliver konfronteret med et mysterie eller mord som skal løses.

Til at starte med skal der komme en op forklare dig hvad der sker og hvorfor du er der.
Derefter bliver du sat fri i verdenen med 5-20 NPC's som alle var i området da tingene sker, og en masse skøre ting skal ske.
Man skal snakke, samle ting, give ting til NPC's så man langsomt samler spor.

Mussene skal også gerne reagere på hvad Spilleren gør. Sådan hvis spilleren er ond bliver de mere onde og hvis spilleren er god bliver de mere gode.
De bør også gerne huske hvad spilleren har sagt til dem.

Så der skal være et lille inventory system som holder styr på hvilke ting som er samlet op. 
Et cluesystem hvor man kan se hvilke spor som er samlet op, og hvilke NPC's den er forbundet til.

og et Accusation system, hvor du vælger hvem som er morderen. Hvis du vælger forkert taber du, hvis du vælger rigtigt vinder du.

Jeg skal have implementeret et "aktionManager" , hvor jeg med callbacks fra dialogen eller andre steder kan trigger bestemte handlinger fra mussene


---

## App.tsx and main.tsx

For at starte spillet. Det første er, at vi integrerer med Phaser, derefter at gøre noget. Det første jeg gør er at indlæse `index.html` og derefter fra det script at indlæse `main.tsx`.

Fra `main.tsx` indlæser jeg `App.tsx`.  
- **29/10** Der er en del boilerplate-kode, som nok kan fjernes.  
- **29/10** Kan ikke fjernes så meget. Den står for at loade den nuværende scene og at bekræfte om sprites kan bevæge sig.

---

## EventBus.ts

Bruges til at forbinde events mellem Phaser og React.

Det er egentlig bare:

```typescript
export const EventBus (React) = new Events.EventEmitter() (Phaser);
```

---
## PhaserGame.tsx

1. den gør: Importer react componenter, Importer EventBus (forbind React og Phaser), Importer StartGame (main)


    2 interfaces (structs)
     @Export interface IRefPhaserGame { game, scene}
    og en skjult interface for den nuværende aktive scene sættes.
    funktion:@Export const Phasergame = <Begge interfaces> (function PhaserGame (current scene), ref) 
    
    1. const game = useRef<Phaser.game> 
    2. Brug layoutEffect.   - Hvis der intet spil er, start et spil
    3. Brug Effecter -Eventbus, tjek om scenen er klar.
    4. Returner html <div ID='Game-Container' >

    Så her laves HTML - elementet, som vises til brugeren.

--- 
### Main Menu
    
    Triggeres fra app.tsx
    
    Import GameObjects, Scene fra phaser (framework)
    Import Button (lavet selv :I )
    
    @Export class MainMenu extends Scene.
    -Tag Scene, og tilføj disse objecter.
    {
        Background: GameObjects.Image
        Logo: GameObjects.Image
        Title: GameObjects.text
        PlayButton: GameObjects image //kan fjernes 29/10
        LogoTween: Phaser.tween.tween //kan fjernes 29/10
        text: GameObject.text
    }
    @constructor (\"MainMenu\") (Giver scriptet et kaldenavn som kan kaldes fra andre scripts)
    
    create(): void {,
       Få Size af skærm
       Sæt logo (billede)
       Tiljøj tekst
       Tiljøj knapper som kan skifte scene
    }
    hjælpe funktioner
    
    1. ChangeScene() //fjernet 29/10
    
    2. Resize() - Omskaller til nuværende scene. (omskallere ikke teksten i Button eller andre importerede alt.)
    
    Knap change->scene

 ---

 ### Game
    
    Tankegangen bag den her er at det skal være en af flere scenarioer og scener hvor man kan gå rundt, snakke med personer og samle hints. Der bør inkodes unikke interactioner (nogle danser. Effekter, Etc. )
    
    Måske burde der også være en mode hvor kan kan bruge de ting man samler op?
    
    Tankegangen her er at gøre det så simpelt som muligt at bevæge sig og interagere med verdenen det er meget vigtigt at det kan tilgås at alle og alle kontrols fungerer. 
    
    Der skal også laves tablet / phone funktionalteter. 
    
    Det første man gør at at importere en masse masse ting. 
    
    og husk: const MAX_DIALOGUE_DISTANCE = 125; Super vigtig da man ikke bare skal interagere med alt på samme tid uanset hvor på kortet man er.
    
    @Export class Game extends Phaser.scene {
        public (ting som skal kunne tilgås fra andre scripts):
        1. Inventory manager
        2. GuideScene //den er importeret ind men behøver måske ikke være public.
        3. Cursors
    
        private (ting som skal beholdes i dette script):
        1. GameControlTexts //kan nok fjernes
        2. camera //Styrer zoom og den størrelse man ser verdenen fra
        3. Abovelayer. //styrer hvad man kan støde ind i af objecter (ikke npcs)
        4. DialogManager //styrer hvor i dialogtræet du er normal (ved det faktisk ikke):
         1. npcs // liste af alle npc's som skal tegnes
        2. Player //spilleren
        3. Interaction prompt //skal opdateres
        4. body.
        5. Objects // liste over \"døde\" objecter som kan interageres med.
        6. interactables //det samme som object
        7. clue manager //kan nok fjernes (kan ikke fjernes, 20/11)
        
    }
    
    constructor( \"Game\" ) // giv scriptet navnet game, skal senere ændres til noget som \"scene1\" 
    
    preload() {
        hent unikke ting til scenen her.
        grunden til det hentes her er for at minimere hvor meget der hentes når hjemmesiden åbnes.
    }
    
    create(){
        1. initier inventory og dialog
        2. tilføj test items til inventory // kan fjernes når inventory fungerer 100% (inventory funktionen bliver ændret igen 20/11)
        3. load tilemap og tileset ind.
            -Sæt lag 1, under spilleren.
            -Sæt lag 2, på samme niveau som spilleren.
            sæt lag 3, over spilleren.
        4. Sæt kamera op. 
            -Opsæt hvad kammeraet ser når den ikke ser kortet
            -Opsæt begrænsninger for kamera.
        5. Initier keyboard keys
            -Her skal den udvides så den kan tage touch-screen inputs.
        6. skab spiller og sæt collider op mellem spiller og lag 1 på tilemap.
        7. skab NPCs og tilføj dem til en liste
            -NPC'er skal have start position, dialog, bevægelses pattern og begrænsning på bevælgelse. Der skal også tilføjes en sprite til NPC.
        8. Tilføj npc collision mellem player og mellem lag 1
        9. Lav døde objekter, skal også tilføjes med alt det samme som NPC fordi teknisk er det næsten den samme klasse.
        10. sæt lag 2 over spiller, så den tegnes over spilleren.
        11. Sæt knapper op. 
        12. Sæt html element op med funktioner, dette tegnes ovenpå alt andet så det er statisk på skærmen. 
    
    }
    
    update(time, delta){
        1. Opdater spiller (bevægelse/frame).
        2. Opdater Npc (bevægelse/frame).
        3. Opdater dialog (hvis aktiv)
        4. Hvis spiller er under lag 2, gør det lag semi transparent. 
        5. Hvis dialog manager er aktiv, tjek distancer mellem objecter, npc og spiller. Hvis aktiv hvis dialog. Hvis ikke så luk dialogen (gem den)
        6. Udregn distancer mellem sprites. Hvis tæt nok på hvis lille boks hvor der står hvordan man kan interagere med det.
    }
    
    hjælpefuntioner () {
        1. showInventory, showGuide. Sæt knapper op.
        2. Change scene (ikke i brug, skal bruges når man løser mysteriet) (I brug nu 20/11)
        3. showInteractionPrompt (bliver kaldt i update)
        4. hideInteractionPrompt (bliver kaldt i update)
        5. onItemCollected (fjern objecter som bliver samlet op)
        6. addTestItems (smid ting direkte i inventory for test.) 
    
    }
---
    ## Inventory Scene
    
    Det her en den sværeste del af koden indtil videre.
    
    Den er delt i potentielt 4 dele. 
    
    Idéen med denne del er at kunne sammensætte en historie fra de ting man har fundet og de NPC man har snakket med. F.eks. Rocker NPC Mus kombineret med Pistol gør at han skyder pistolen. Hvis man trækker en anden mus ind på den anden side, vil den mus blive ramt. 
    
    Det hele burde sammensættes så det bliver en historie. F.eks. Mus et er jaloux over X, og derfor finder en Kniv og stikker mux Y ned. Derefter flygter musen, og prøver at gemme sig.
    
    Eller mus X skylder mus Y penge, og derfor bliver han stukekt ned. 
    
    Eller mus X stjæler mus Y's taske. osv osv osv osv osv osv.
    
    Kompleksiteten er at for hver mus X, og antal objekter skal der være n^x aktioner. så 4 objecter og 1 mus er det 4 handlinger. og for 4 objecter og 2 mus er det 16 mulige handlinger, osv. 
    
    -------------------------------------------------------
    Under story boardet burde der være 2-3 kategorier. 1 NPC. 2. Objekt. 3 sted. 
    
    Dette er et 2-delt problem. Første problem er at det er mange ting og derfor svært at få det hele til at passe. Andet problem er det er svært at animere det hele.
    
    Min Ide er at for hver scene / kort skal baggrundende sættes på forhånd, derefter kan man trække mus og ting ind. 
    
    ---------------------------------------------------------

    Update 20/11- 24.
    Storyboard ideén var god og fed, men det ekstra arbejde som skulle til for at lave alle sprites osv var simpelthen for meget.
    Er gået videre til et standard inventory system hvor du kan samle ting op og se dem senere for måske at få mere insigt.
    Der burde også laves et system hvor spilleren kan give ting til andre NPC- i forbindelse med quests

    Så input -> stuff [{id, clue, description, img, amount}]
    og output er nok bare en pop eller destroy fra listen.
---