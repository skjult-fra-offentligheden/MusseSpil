## logic 

should follow this structure:
NPC name{
  "id": "dialogue ID",
  "speaker": "Player / NPC",
  "text": " Dialogue to be displayed",
  "nextDialogueId": "Follow up dialogue ( can be null ) ",
  "effectKey": "Overall faction repurcussion: decreaseCopReputation",
  "once": true/False,
  "condition": "if theres a reputation req:  ifHighReputation"
}