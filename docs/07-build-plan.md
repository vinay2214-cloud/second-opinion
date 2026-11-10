# 07 · Build plan (Mon 9 Nov to Wed 18 Nov 2026)

**Deadline:** Wed 18 Nov 12:00 PM PT = **Thu 19 Nov 01:30 AM IST**. **Plan to submit by 18:00 IST on Wed 18 Nov** (04:30 AM PT, about 7.5 hours of buffer).
**Assumption:** about 6 to 8 focused hours a day from you, while agents work in parallel. If you have fewer, cut earlier (section 4), do not stretch the end.

## 1. Timeline

| Day | Date | Goal | Agent work | Your work | Gate |
|---|---|---|---|---|---|
| **D0** | Mon 9 Nov | Project runs, deploy works | Claude: `T01` scaffold, spikes **S1 S2 S7**. Astra: `T02` port core to TS. Argon: `T11` gap review | **Apply for Start, create the developer account and organization, register on Devpost** (`13-start-membership-and-access.md`). Verify the title is not taken | S7 deploy works on a fresh profile |
| **D1** | Tue 10 Nov | Ward on the table, tokens move | Claude: `T03` ward scene, `T04` token grab and tray snap, spikes **S3 S4 S5 S6 S8**. Astra: finish port, `T05` persistence | Playtest the emulator, note what feels bad | Core port green (33 tests) |
| **D2** | Wed 11 Nov | **Loop playable** | Claude: `T06` runtime wiring, vitals card, advice reveal, resolve. Module 1 end to end | Play Module 1 twice | **Gate 1 (EOD): commit loop playable hands-only in the emulator.** Fail: stop features, fix the loop, cut to Modules 1 and 2 |
| **D3** | Thu 12 Nov | Verify, tokens, HUD, debrief v1 | Claude: `T07` verify and tokens, HUD. Astra: review. Argon: `T10` audio brief, copy | Playtest Module 2, check the debrief text reads well | Debrief shows index and one finding |
| **D4** | Fri 13 Nov | Module 3: surges, drift, Orator, trust map | Claude: `T08` module 3. Astra: `T09` trust map data and debrief checks, then `T15` coach client and proxy. Argon: `T16` coach prompt and golden facts | Play a full shift in the emulator and screen-record it. Ask around for a remote Quest tester (`08` section 3.4) | Full shift runs start to debrief |
| **D5** | Sat 14 Nov | **Full experience + accessibility** | Claude: `T12` accessibility modes and onboarding. Astra: review and tests | First-five-minutes test with **one fresh person**. Decide the confidence peg at **midday**. Deploy the coach proxy, set the spend cap, test the kill switch. First remote Quest test | **Gate 2 (EOD): full start-to-debrief works.** Content freeze. Fail: cut coach button wiring, gaze-dwell, Echo, trust map polish, in that order |
| **D6** | Sun 15 Nov | Art, sound, polish, perf | Claude: `T14` art, polish and performance pass (audio from `T10` lands here too), then `T17` coach button if Gate 2 was green. Argon: `T13` submission copy drafts | **Remote Quest retest, record emulator footage** | Remote tester reports smooth play, or you fix what they found |
| **D7** | Mon 16 Nov | **Feature freeze at EOD**, video | Claude: bug fixes. Argon: storyboard and VO script | Edit the video. Run the QA plan | **Freeze (EOD)** |
| **D8** | Tue 17 Nov | Fresh-profile test, submission draft | Claude: blocker fixes only | **Fresh-profile build test**, FoV check, upload video (public), fill form as draft | Fresh profile opens and plays. Blocker if not |
| **D9** | Wed 18 Nov | **Submit** | Nothing new. No deploys after tagging | Final read of every field, submit by **18:00 IST**, confirm the link works while logged out | Submitted. Screenshot the confirmation |
| Buffer | Wed night to Thu 01:30 IST | Only if something broke | Fix blocker, redeploy only if the form still allows it | | |

Why Gate 1 and Gate 2: the main risk is not a bad idea, it is arriving at the deadline with a half-playable game. Hard gates force the cut early.

## 2. Day 0 in detail (start now)

1. **Start membership and Developer Access** (45 min, do this first): follow `13-start-membership-and-access.md` steps A to D and save screenshots. You are a solo entrant, so no Team Representative is needed.
2. **Scaffold** (45 min): `T01`. Run the commands in `06-agent-playbook.md` section 3.
3. **Spikes S1, S2, S7** (about 3 h, can run in parallel with Astra's port): scaffold with MCP works, grab release signal found, deploy to GitHub Pages works from a fresh profile.
4. **Launch Astra** on `T02` and **Argon** on `T11` in their worktrees.
5. **End of day:** commit, tag `d0`, write 5 lines in `docs/10-risks-and-decisions.md` (what worked, what did not, what is unknown).

## 3. Definition of done by feature

| Feature | Done when |
|---|---|
| Placement | Plane found or virtual table within 5 s, ward anchored |
| Commit loop | Grab, release on tray, advice hidden until then, keep or change, resolve with truth and `whyLine` |
| Verify | Token spent, 3 s clock cost, disabled at 0 |
| Shift | 14 patients, surges at 6 and 11, drift at 9, hard cap 8:00 |
| Debrief | Same output as `buildDebrief` for the same log |
| Accessibility | One-hand, calm, high-contrast, shape-coded, sound-off all pass. Gaze-dwell if S5 passed |
| Performance | Smooth on device. No console errors in 5 shifts |
| Submission | Video, form, link, repo all verified |

## 4. Cut list (in this order, when time is short)

1. Coach button wiring `T17` (SHOULD, kept unless Gate 2 is red). The tested core and proxy can wait
2. Confidence peg (COULD)
3. Echo advisor (COULD)
4. Gaze-dwell mode (SHOULD, depends on S5)
5. Trust map polish (keep a plain text version)
6. Daily seed and streak (SHOULD)
7. Module 2 (keep Modules 1 and 3, bridge with a short intro)
8. Wrist menu (keep the table-edge menu)

**Never cut:** hands-only operation, virtual table fallback, commit-first, debrief, shape coding, fresh-profile test, deploy freeze, the video.

## 5. Submission-week rules

- After **Mon 16 Nov EOD**: no new features.
- After tagging `submission-1`: **no deploys** until judging is done (rules: no changes after the deadline, link must stay live).
- Keep the repo public or give the judges access if the form asks for it. Check the form.
- Take a screenshot of every form field before pressing submit.

## 6. If you fall behind

| Symptom | Action |
|---|---|
| Gate 1 failed on Wed | Stop adding. Ship Module 1 and 2 only, make them polished |
| Grab release signal not found (S2) | Use the fallback: own drag via pinch ray, or poll `Pressed` removal. If neither works by Wed noon, switch to a tray-tap interaction (poke a tray while holding a token selected) and note it |
| No headset (your case) | Emulator-only is allowed by the rules. Say so honestly, line up a remote Quest tester, spend the saved time on the video and the first-five-minutes test |
| Art not ready | Flat, clean, high-contrast low-poly beats half-finished detail. Do not start new art after Sun 15 Nov |
| Video not ready Tue | Record the screen from the emulator and use your voice-over. A clean honest video beats a flashy missing one |
