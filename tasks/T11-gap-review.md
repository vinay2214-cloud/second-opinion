# T11 · Gap review of the whole kit

**Agent:** Gemini 4 Argon · **When:** D0 Mon 9 Nov

**Goal:** Find holes before they cost time: requirements without tasks, tasks without requirements, contradictions, unsafe assumptions.

## Inputs (read first)
- docs/*.md
- tasks/*.md
- data/*.json

## Allowed files (edit only these)
- proposals/gap-review.md

## Steps
1. Cross-check every FR, NFR and RC in docs/01-PRD.md against docs/07-build-plan.md and tasks/*.md. List any without an owner.
2. List contradictions between documents (numbers, names, dates).
3. List unsafe assumptions about IWSDK, WebXR, or the competition rules and mark each [VERIFY].
4. Give a three-sentence critique of the idea as a hackathon judge, then as a developer.

## Acceptance (must all pass)
- [ ] proposals/gap-review.md has four sections: uncovered requirements, contradictions, assumptions to verify, critique

## Do not
- Do not edit any other file
- Do not invent facts about the rules

## Report format
The file itself.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T11: Gap review of the whole kit.
Goal: Find holes before they cost time: requirements without tasks, tasks without requirements, contradictions, unsafe assumptions.
Inputs: docs/*.md; tasks/*.md; data/*.json.
Allowed files: proposals/gap-review.md.
Steps:
1. Cross-check every FR, NFR and RC in docs/01-PRD.md against docs/07-build-plan.md and tasks/*.md. List any without an owner.
2. List contradictions between documents (numbers, names, dates).
3. List unsafe assumptions about IWSDK, WebXR, or the competition rules and mark each [VERIFY].
4. Give a three-sentence critique of the idea as a hackathon judge, then as a developer.
Acceptance: proposals/gap-review.md has four sections: uncovered requirements, contradictions, assumptions to verify, critique
Do not: Do not edit any other file | Do not invent facts about the rules
Report: The file itself.
```
