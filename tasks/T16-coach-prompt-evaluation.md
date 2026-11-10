# T16 · Coach prompt evaluation and golden fact sets

**Agent:** Gemini 4 Argon · **When:** D4 Fri 13 Nov to D5 Sat 14 Nov

**Goal:** Prove the coach prompt produces grounded, safe, short text across the cases the game can produce, and propose fixes if it does not.

## Inputs (read first)
- docs/12-ai-coach-spec.md
- data/coach-prompt.json
- core-spec/src/coach.js
- data/debrief-lines.json

## Allowed files (edit only these)
- proposals/coach-golden-facts.json
- proposals/coach-eval-report.md
- proposals/coach-prompt-proposal.md

## Steps
1. Write 30 facts objects in proposals/coach-golden-facts.json covering every headline (balanced, overReliance, underReliance, mixed, notEnough), drift noticed and missed, no drift, zero to two patterns, pressureDrop true and false, verifyYield null and numeric, and boundary values (index 0 and 100). Every object must pass validateCoachFacts.
2. For each object, send the system prompt from data/coach-prompt.json and the facts as the user message to the model you will deploy. Save each reply.
3. Run validateCoachText on every reply and report the pass rate and every failure reason.
4. Read at least 10 replies yourself and list any that scold, invent numbers, sound clinical, are off-topic, or are too long.
5. If the pass rate is below 95 percent or any spot-checked reply has a medical claim, write proposals/coach-prompt-proposal.md with a revised system prompt. Do not edit data/coach-prompt.json.

## Acceptance (must all pass)
- [ ] All 30 facts pass validateCoachFacts
- [ ] proposals/coach-eval-report.md has pass rate, failure reasons and the 10 spot checks
- [ ] Zero medical claims and zero invented numbers in the spot checks, or a proposal to fix them

## Do not
- Do not edit anything outside proposals/
- Do not weaken the validator to raise the pass rate
- Do not include real person data

## Report format
The eval report and the pass rate.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T16: Coach prompt evaluation and golden fact sets.
Goal: Prove the coach prompt produces grounded, safe, short text across the cases the game can produce, and propose fixes if it does not.
Inputs: docs/12-ai-coach-spec.md; data/coach-prompt.json; core-spec/src/coach.js; data/debrief-lines.json.
Allowed files: proposals/coach-golden-facts.json; proposals/coach-eval-report.md; proposals/coach-prompt-proposal.md.
Steps:
1. Write 30 facts objects in proposals/coach-golden-facts.json covering every headline (balanced, overReliance, underReliance, mixed, notEnough), drift noticed and missed, no drift, zero to two patterns, pressureDrop true and false, verifyYield null and numeric, and boundary values (index 0 and 100). Every object must pass validateCoachFacts.
2. For each object, send the system prompt from data/coach-prompt.json and the facts as the user message to the model you will deploy. Save each reply.
3. Run validateCoachText on every reply and report the pass rate and every failure reason.
4. Read at least 10 replies yourself and list any that scold, invent numbers, sound clinical, are off-topic, or are too long.
5. If the pass rate is below 95 percent or any spot-checked reply has a medical claim, write proposals/coach-prompt-proposal.md with a revised system prompt. Do not edit data/coach-prompt.json.
Acceptance: All 30 facts pass validateCoachFacts | proposals/coach-eval-report.md has pass rate, failure reasons and the 10 spot checks | Zero medical claims and zero invented numbers in the spot checks, or a proposal to fix them
Do not: Do not edit anything outside proposals/ | Do not weaken the validator to raise the pass rate | Do not include real person data
Report: The eval report and the pass rate.
```
