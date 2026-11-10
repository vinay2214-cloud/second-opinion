# T17 · Wire the Ask-the-coach button into the debrief

**Agent:** Claude Code · **When:** D6 Sun 15 Nov (only if Gate 2 is green)

**Goal:** A single optional button on the debrief that shows coach text within 3 s or the template fallback, and never changes how the game works.

## Inputs (read first)
- docs/12-ai-coach-spec.md (sections 2, 3, 9)
- src/coach/coachClient.ts
- src/ui (debrief panel)
- docs/04-interaction-and-accessibility-spec.md

## Allowed files (edit only these)
- src/ui/**
- src/game/**
- src/access/**

## Steps
1. Below the template debrief add an Ask the coach button (poke, ray, or dwell) with the notice text from data/coach-prompt.json (consentNotice).
2. On press, call buildCoachFacts from the runtime summary and askCoach. Show a thinking ring. Never send a request without a press.
3. Show the result in a card labelled Coach (AI). On fallback show the template text with the offlineNotice line. No error screens.
4. Allow one request per shift and cache the result for that shift.
5. Make the button work in one-hand mode, gaze-dwell mode and high contrast. Keep the text inside the central field of view.

## Acceptance (must all pass)
- [ ] Airplane-mode shift: debrief shows, the button shows the fallback, no console errors
- [ ] Proxy kill switch on: the button shows the fallback
- [ ] Network log shows no coach request before the button press
- [ ] Full shift with the button never pressed is identical to before

## Do not
- No coach call in any per-frame update
- Do not block the debrief while waiting
- Do not show any text that did not pass chooseCoachText

## Report format
Screenshots of success, fallback and the consent notice, and the network log summary.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T17: Wire the Ask-the-coach button into the debrief.
Goal: A single optional button on the debrief that shows coach text within 3 s or the template fallback, and never changes how the game works.
Inputs: docs/12-ai-coach-spec.md (sections 2, 3, 9); src/coach/coachClient.ts; src/ui (debrief panel); docs/04-interaction-and-accessibility-spec.md.
Allowed files: src/ui/**; src/game/**; src/access/**.
Steps:
1. Below the template debrief add an Ask the coach button (poke, ray, or dwell) with the notice text from data/coach-prompt.json (consentNotice).
2. On press, call buildCoachFacts from the runtime summary and askCoach. Show a thinking ring. Never send a request without a press.
3. Show the result in a card labelled Coach (AI). On fallback show the template text with the offlineNotice line. No error screens.
4. Allow one request per shift and cache the result for that shift.
5. Make the button work in one-hand mode, gaze-dwell mode and high contrast. Keep the text inside the central field of view.
Acceptance: Airplane-mode shift: debrief shows, the button shows the fallback, no console errors | Proxy kill switch on: the button shows the fallback | Network log shows no coach request before the button press | Full shift with the button never pressed is identical to before
Do not: No coach call in any per-frame update | Do not block the debrief while waiting | Do not show any text that did not pass chooseCoachText
Report: Screenshots of success, fallback and the consent notice, and the network log summary.
```
