# 00 · Final decision and ideology

**Status:** LOCKED for build · **Date:** 9 Nov 2026 · **Owner:** Vinay
**Competition:** Meta VR Start Developer Competition 2026 · **Deadline:** 18 Nov 2026 12:00 PM PT = **19 Nov 01:30 AM IST** · **Plan to submit:** 18 Nov by 18:00 IST

## 1. The decision

| Item | Decision |
|---|---|
| Ideology | **Calibrated oversight: trust is a skill, so practise it.** |
| Game | **Second Opinion**, a seated, hands-only tabletop game |
| Track / division | **Gaming** / **New Experience** |
| Stack | Immersive Web SDK (IWSDK) 1.0, WebXR, hosted on GitHub Pages |
| Version | The "middle" version: commit-first core + **verify budget** + **mid-shift drift** + **eloquent-wrong advisor**. Confidence peg is a stretch (see section 6). |
| One-line hook | *Commit your call. Then see if the AI agrees. Learn who to trust.* |

### The ideology in four lines

1. **Commit first.** Form your own judgement before any advice appears.
2. **Know your advisors.** Each is strong in some situations and weak in others, and you learn which by playing.
3. **Scrutiny is a budget.** You cannot double-check everything, so spend verification where it pays.
4. **Trust drifts.** Systems change silently, so re-check what you think you know.

> Past ideologies told people *what to believe* about machines (augmentation, "human in the loop", AI literacy). The pattern in the evidence is that each moved from telling to **practising with feedback**. This game is that practice, made physical.

## 2. Why this over the alternatives

| Option | Track | Verdict |
|---|---|---|
| **A. Second Opinion** (chosen) | Gaming | Distinct mechanic, hands-native, seated, short sessions, your domain edge, evidence-backed, deterministic core so it works with AI off. |
| B. VR ED queue / ops dashboard (statements 1, 4, 6, 14, 19) | Productivity | Would be judged against polished productivity apps by platform experts, weak hands-first delight, hard to differentiate in 9 days. |
| C. Casual hand-tracked toy | Gaming | Matches last year's winner pattern but has no idea edge. It would compete purely on craft against 650+ entries. |
| D. Multilingual voice assistant (#23) | Productivity | Speech recognition is reportedly unsupported in the Quest browser, and the concept leans toward a thin wrapper. |
| E. Clinical decision support or imaging in VR (#10, #11) | Productivity | Regulated claims, needs data and models you cannot validate in 9 days, wrapper risk. |
| F. Elder-care companion (#21) | Entertainment | Heavy emotional and content design, weak hands-first story. |

How your 24 statements are used: **setting** from 1, 4, 6, 14, 19 (patient flow); **mechanic** from 10, 15, 17, 18 (fallible recommendations); **tone** from 20 (calm, specific debrief). The rest are deliberately skipped: backend-heavy, regulated, or not demonstrable with hands in 9 days.

## 3. Four-lens evaluation

Scores are **my judgement, not a prediction.** Last year had 650+ submissions, this year has 20 prizes, and the rules allow one prize per entry. Nobody can promise a win.

### Lens 1 · Jury (the four published criteria, 25% each)

| Criterion | What a judge looks for | Current standing | What moves it |
|---|---|---|---|
| Innovation and creativity | An idea they have not seen, felt in the hands | **4/5** | The commit-then-reveal moment must feel great in the first minute |
| Experience design | Seated, 2-ft radius, fast cold start, purposeful passthrough, FoV-aware, clean first five minutes | **4/5** | Ghost-hand onboarding, real table anchoring with a safe fallback |
| Technical implementation | 60 fps, hands (and gaze), passthrough, plane detection, anchors, robust launch | **3/5** | IWSDK has a lower visual ceiling. Compensate with clean feature use, zero console errors, instant load |
| Polish and presentation | Cohesive art and sound, honest footage, clear writing | **3/5** | Art and audio cannot be left for the last two days. Video leads with the best moment |

**Verdict:** competitive for the Gaming track, and plausible for Best First Five Minutes, Best Accessibility Forward, Best Agentic Interaction and Boldest Original Concept. To win outright, **Polish must reach 4/5.** That is the single largest lever, so the plan protects it (see `07-build-plan.md`).

### Lens 2 · Researcher (what we may claim)

| Question | Answer |
|---|---|
| Is the problem real? | Yes. Studies report both over-trust and under-trust of AI advice, including among trained clinicians. Time pressure raised the *severity* of automation bias in one study. |
| Does the design match the evidence? | Mostly. Recording the human's opinion first is a documented mitigation. Letting users observe a system's performance over time helps them build accurate mental models. Scored predictions with feedback are the mechanism behind forecasting-calibration gains. |
| Known counter-evidence | A systematic review found **no single reliable fix** for appropriate trust, and cognitive forcing reduced over-reliance but teams still did worse than the AI alone. Explanations sometimes **raised** acceptance of wrong advice. |
| How we respond | Score **both** errors (over- and under-reliance). Include an eloquent-but-wrong advisor to expose fluency-as-trust. Never claim real-world improvement. |
| What we can say | "A game to practise calibrating trust in AI advisors." |
| What we must not say | That it trains clinicians, improves outcomes, gives medical advice, or is the "first" game of its kind. |
| Study to cite | Prebunking games show a game can shift a real skill (about 15,000 players; fake-news reliability ratings fell about 21% on average; self-selected sample, moderate effect). Use only as precedent for the format. |

### Lens 3 · Developer (can it ship in 9 days)

| Area | Risk | Reason | Mitigation |
|---|---|---|---|
| Game core (scoring, advisors, shifts, debrief) | **Low** | Already built and tested as an executable spec (`core-spec/`, 24 passing tests) | Port to TypeScript, keep the tests |
| Token grab and release over a tray | **Medium** | The IWSDK grab docs do not describe release callbacks | Day-0 spike S2 with three fallbacks |
| Plane detection and table anchoring | **Medium** | Needs the user's space setup, populates after a delay | Virtual table fallback after 5 s |
| Gaze and dwell | **Medium** | Newest feature, docs say gaze drives the same Hovered/Pressed tags | Treat as optional, dwell timer on hover |
| UI panels (vitals card, debrief) | **Medium** | Learning UIKit/UIKitML | Spike S3, fallback to canvas-textured panels |
| Art and audio | **Medium** | Easy to under-budget | Low-poly procedural look, one cohesive palette, audio by Day 4 |
| Live AI coach | Medium | Network, cost, abuse, uptime | **Kept by decision (9 Nov).** Safety design in `12-ai-coach-spec.md`. Template fallback always works. Its UI wiring is the first thing cut if Gate 2 is red |

### Lens 4 · Participant (standing out among 650+)

- **Competition pattern.** Last year's described category winners were tactile, delightful toys and creation tools (pinch mini-golf, a fighting game, room-to-MR transformation, a music tool). Many entries will be polished hand-tracked toys.
- **Our edge.** An idea with a purpose, felt through a physical action, with a built-in reason to come back (daily shift, drift, unlocks).
- **Our weakness.** It can look "educational". **Mitigation:** the video's first 12 seconds show the *stamp-and-reveal* moment as a toy, and the idea arrives second.
- **Win condition.** Three moments must be flawless: (1) the commit stamp, (2) the advice reveal, (3) the debrief "aha". If a stranger says "oh, I trusted the wrong one" within five minutes, the idea has landed.

## 4. Scope lock

| Priority | Items |
|---|---|
| **MUST** | Hands-only end-to-end. Table placement with virtual fallback. Commit-first loop. 3 advisors + Orator. Verify tokens. 14-patient shift with surges. Drift event. Calibration debrief. Ghost-hand onboarding. Shape-coded trays, high contrast, calm and one-hand modes. Static HTTPS deploy, offline. |
| **SHOULD** | Gaze-dwell mode. Daily seed. Trust map. Local streak. Sound design pass. Modules 1 to 3 progression. **Live Calibration Coach "ask why"** (kept by decision, see `12-ai-coach-spec.md`). |
| **COULD** | Confidence peg. Echo advisor. |
| **WON'T** | Voice input. Multiplayer. Real patient data. Accounts or backend. Medical claims. Any controller dependency. |

## 5. Kill criteria (decide early, protect the deadline)

| Check | When | If it fails |
|---|---|---|
| Hands-only commit loop playable in the emulator | **Wed 11 Nov EOD** | Stop all features. Fix the loop. Cut to Module 1 and 2 only |
| Full start-to-debrief experience works | **Sat 14 Nov EOD** | Cut: coach button wiring, gaze-dwell, Echo, trust map polish, in that order |
| Feature freeze, no new features after | **Mon 16 Nov EOD** | Bug fixes and polish only |
| Fresh-profile build opens and plays | **Tue 17 Nov** | Treat as a blocker, nothing else matters until it works |

## 6. The confidence peg (stretch) and the rule for adding it

After the commit, the player can set **Hunch / Fairly sure / Certain**, enabling forecasting-style scoring of overconfidence. Add it **only if** Gate 2 (Sat 14 Nov) is green by midday **and** the first-five-minutes test still passes. It adds a gesture to every patient, so it must be introduced after the first shift, not in the first five minutes.

## 7. Awards map

| Award | Prize | Why this concept | Must be true |
|---|---|---|---|
| Best New Gaming Experience (+ runner-up) | $100,000 / $50,000 | Primary target | Complete, polished, hands-only loop |
| Best Agentic Interaction | $25,000 | Player supervises several AI advisors with limited attention | At least one live agent moment with fallback, or a clear explanation of the agent system |
| Best First Five Minutes | $25,000 | Ghost-hand teaching, no text wall | A fresh player completes the first patient unaided |
| Best Reason to Come Back | $25,000 | Daily seed, drift, unlocks, trust map | Visible progress after one session |
| Best Accessibility Forward | $25,000 | Eyes-only path, shape coding, calm and one-hand modes | A full shift completes in an eyes-only path |
| Boldest Original Concept | $25,000 | Trust-as-a-skill on your own table | The novelty check passes (search Store and Devpost) |
| Judge's Choice (2 winners) | $20,000 each | Discretionary | Polish and a clear story |

One prize per entry, so these are alternatives, not additions.

## 8. Facts to verify yourself (not proven)

- [VERIFY] Search the Meta Horizon Store and Devpost for similar games before claiming originality.
- **[BLOCKER]** Start membership and Developer Access are required by the Official Rules and must be in place when you submit. Apply today: `13-start-membership-and-access.md`.
- [VERIFY] Meta Developer Content Guidelines age band for a mild medical theme.
- [VERIFY] Whether the competition team prefers a specific Track label for this concept (the Sponsor may reassign).

## Sources

- Meta VR Start Developer Competition requirements and rules (provided by you).
- A Systematic Review on Fostering Appropriate Trust in Human-AI Interaction (arXiv 2311.06305).
- Lee and See, *Trust in automation: designing for appropriate reliance* (Human Factors, 2004).
- Roozenbeek and van der Linden, Bad News game study (Palgrave Communications), summarised by Neuroscience News.
- Good Judgment Project forecasting practices (AI Impacts summary).
- Meet the Meta Horizon Start Developer Competition Winners (Meta developer blog).
