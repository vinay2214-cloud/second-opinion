# Task cards

Each card is self-contained. Give an agent **one card at a time**, in its own worktree (see `docs/06-agent-playbook.md`).

| ID | Task | Agent | When |
|---|---|---|---|
| T00 | Start membership, developer account and Devpost (blocks submission) | You (Vinay) | D0 Mon 9 Nov, then daily until approved |
| T01 | Scaffold the IWSDK project and run spikes S1, S2, S7 | Claude Code | D0 Mon 9 Nov |
| T02 | Port the core to TypeScript with the same golden tests | GPT-6 Astra (Codex) | D0 to D1 |
| T03 | Ward scene, table placement and virtual-table fallback | Claude Code | D1 Tue 10 Nov |
| T04 | Token grab, release and tray snap | Claude Code | D1 Tue 10 Nov |
| T05 | Safe persistence and settings | GPT-6 Astra (Codex) | D1 Tue 10 Nov |
| T06 | Wire the runtime: vitals card, advice reveal, resolve (Module 1 end to end) | Claude Code | D2 Wed 11 Nov |
| T07 | Verify tokens, clock cost, HUD and debrief v1 | Claude Code | D3 Thu 12 Nov |
| T08 | Module 3: surges, drift, Orator, module flow | Claude Code | D4 Fri 13 Nov |
| T09 | Trust map, debrief checks and balance gate re-run | GPT-6 Astra (Codex) | D4 Fri 13 Nov |
| T10 | Audio brief and sound implementation | Gemini 4 Argon (brief), then Claude Code (implement) | D3 brief, D4 to D6 implement |
| T11 | Gap review of the whole kit | Gemini 4 Argon | D0 Mon 9 Nov |
| T12 | Accessibility modes and ghost-hand onboarding | Claude Code | D5 Sat 14 Nov |
| T13 | Submission assembly | Gemini 4 Argon (drafts), you (final) | D6 to D9 |
| T14 | Art, polish and performance pass | Claude Code | D6 Sun 15 Nov |
| T15 | AI coach client and serverless proxy | GPT-6 Astra (Codex) | D4 Fri 13 Nov |
| T16 | Coach prompt evaluation and golden fact sets | Gemini 4 Argon | D4 Fri 13 Nov to D5 Sat 14 Nov |
| T17 | Wire the Ask-the-coach button into the debrief | Claude Code | D6 Sun 15 Nov (only if Gate 2 is green) |

Common preamble used by every paste-ready prompt:

```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.
```
