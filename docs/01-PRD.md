# 01 · Product Requirements Document (PRD)

**Product:** Second Opinion · **Version:** 1.0 (competition build) · **Owner:** Vinay · **Read first:** `00-decision-and-ideology.md`

## 1. Summary

Second Opinion is a seated, hands-only tabletop game for Meta Quest 3 / 3S and Meta VR Glasses. A small night ward sits on the player's real table (via passthrough plane detection), or on a virtual table if none is found. Fictional patients arrive. The player **commits** a Red / Amber / Green triage call by dragging a token to a tray. Only then does an AI advisor's call appear. The player can spend limited **verify tokens** to hear a second advisor, then keeps or changes the call. The truth is revealed. A debrief shows how well the player's trust matched each advisor's real reliability.

**Ideology:** calibrated oversight. Trust is a skill, so practise it.

## 2. Goals and non-goals

| Goals | Non-goals |
|---|---|
| G1. Win or place in the Gaming track and credibly contend for the special awards in `00` section 7 | Training clinicians or giving medical advice |
| G2. Entire experience completable **without a controller** | Real patient data, accounts, backend, analytics |
| G3. A stranger understands and enjoys the core loop within **5 minutes**, and finishes a shift within **8 minutes** | Multiplayer |
| G4. Works with **AI off**: deterministic core, optional live AI layer | Voice input (not reliable in the Quest browser) |
| G5. Accessible: eyes-only path, shape-coded, calm and one-hand modes | A wrapper around any third-party AI service |

## 3. Users

| User | Needs |
|---|---|
| **Judge** (primary) | Launch a link cold, get to the fun in under a minute, see hands, passthrough, FoV-awareness and polish. Judges are platform experts, not clinicians. |
| **Quest / VR Glasses owner** | A short, satisfying seated session with a reason to return tomorrow. |
| **Player who wants to understand AI better** | A safe place to practise trusting and doubting AI advice, and to see their own pattern. |
| **Player with limited mobility or hand use** | Eyes-only or one-hand play that does not feel like a downgrade. |

## 4. Core user stories

- **US1** As a new player, I am shown by a ghost hand how to commit a call, so I never read a wall of text.
- **US2** As a player, I commit my own call before seeing advice, so the game measures my judgement, not my copying.
- **US3** As a player, I can spend a limited number of verify tokens to hear another advisor, so I learn where scrutiny pays.
- **US4** As a player, I see the truth and a one-line reason after every patient, so I learn from outcomes immediately.
- **US5** As a player, I get a debrief that names my pattern (over-reliance, under-reliance, drift noticed or missed), so I can improve next shift.
- **US6** As a returning player, I get a daily shift and see my trust map improve, so I have a reason to come back.
- **US7** As a player who cannot use hands precisely, I can finish a shift with gaze-dwell or one hand.

## 5. Functional requirements

Priority: **M** must, **S** should, **C** could. IDs are stable. Agents must reference them in commits and tests.

### 5.1 Session and placement

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| FR-01 | M | Launch from a public HTTPS URL to a start screen within 10 s on typical Wi-Fi | Cold load in a fresh browser profile ≤ 10 s, no console errors |
| FR-02 | M | Enter an immersive AR (passthrough) session from the start screen via a user gesture | Session starts, passthrough visible, transparent canvas |
| FR-03 | M | Detect a horizontal plane (plane detection) and let the player confirm the ward position with a pinch | Ward appears on the highlighted plane |
| FR-04 | M | If no plane is found within **5 s** or permission is declined, place a **virtual table** and continue | Fallback reachable without any error state |
| FR-05 | M | Anchor the ward so it stays fixed; provide re-centre action | Ward does not drift when the player moves slightly |
| FR-06 | S | Desktop browser (no headset) shows a mouse/keyboard emulation so judges can still see the game | Playable with pointer on desktop (best effort) |

### 5.2 Onboarding

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| FR-10 | M | Ghost-hand tutorial teaches commit, advice reveal, keep or change, in ≤ 2 min 10 s, max one short line of text at a time | Fresh player completes the first patient unaided in playtest |
| FR-11 | M | Tutorial is skippable after first completion (stored locally) | Skip persists, storage failure does not break the game |

### 5.3 Core loop (per patient)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| FR-20 | M | A patient token arrives with a vitals card showing: age band, complaint, pulse, BP, oxygen, temperature | Card readable at 40 to 60 cm, text ≥ 1.2 cm tall |
| FR-21 | M | The player reads by **poke** (or gaze-dwell) to expand the card | Poke expands within 150 ms |
| FR-22 | M | The player **commits** by grabbing the token and releasing it over a tray (Red / Amber / Green). The call locks on release | State machine enters COMMITTED, token snaps to tray |
| FR-23 | M | Advice is **hidden until commit**. After about 0.6 s the lead advisor's call and line appear | No advice visible in any pre-commit state (test) |
| FR-24 | M | **Verify:** poke another advisor to hear them. Costs **1 token** and **3 s** of shift clock. Disabled at 0 tokens | Token HUD updates, 3 s deducted |
| FR-25 | M | The player keeps the call or drags the token to a different tray | Final call recorded |
| FR-26 | M | **Resolve:** truth tray glows, `whyLine` shown, outcome score applied | Matches `core-spec` scoring |
| FR-27 | M | If the patient window ends with no commit, auto-Amber with penalty and log a missed window | Matches `core-spec` scoring |
| FR-28 | M | Each patient logs: commit, advice, final, truth, reliance class, msToCommit, verify use | Log entry schema matches `core-spec` |

### 5.4 Shift

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| FR-30 | M | A shift has **14 patients**, 4 Green / 6 Amber / 4 Red, two **surges**, hard cap 8:00 | Matches `buildShift` output |
| FR-31 | M | **Verify budget:** 4 tokens per shift (module 3), unspent tokens add +1 each | HUD shows tokens, score includes bonus |
| FR-32 | M | **Drift:** one advisor's reliability on one category drops at patient 9 of 14. A small **"update installed"** cue appears on that advisor. The debrief reports whether the player noticed | Drift present in every module-3 shift |
| FR-33 | M | Advisors: **Dash, Sage, Ledger, Orator** (module 3). Hidden reliability never displayed in-game | No reliability number in UI or logs shown to the player |
| FR-34 | M | Pause and resume from a wrist-attached menu | Clock stops while paused |
| FR-35 | S | **Daily seed:** same shift for every player on a given local date | `dailySeed` matches `core-spec` |
| FR-36 | S | **Modules:** Module 1 (1 advisor, 6 patients), Module 2 (2 advisors, verify, 10 patients), Module 3 (full) | Progression gated by finishing the previous module |
| FR-37 | C | Echo advisor unlock | Mirrors the player's commit |

### 5.5 Debrief and progression

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| FR-40 | M | Debrief shows: Calibration index (0 to 100 or "not enough data"), over-reliance and under-reliance rates, 1 to 3 plain-language findings, one next step | Output equals `buildDebrief` for the same log |
| FR-41 | S | **Trust map:** per advisor and category, how often the player followed advice vs how often it was right | Matches `trustMap` |
| FR-42 | S | Local history, streak and personal best, stored safely | Survives reload, survives storage failure |
| FR-43 | S | Short outcome toast per patient (score delta) | Visible, non-blocking |

### 5.6 Accessibility and comfort

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| FR-50 | M | **Shape-coded trays:** Red = triangle, Amber = diamond, Green = circle, plus colour | Distinguishable in greyscale |
| FR-51 | M | **High-contrast mode** | Toggle works at any time |
| FR-52 | M | **Calm mode:** slower clock, fewer simultaneous patients | Changes `shift-config` multipliers |
| FR-53 | M | **One-hand mode:** every action reachable with one hand | Full shift completes with one hand |
| FR-54 | S | **Gaze-dwell mode:** look at a target and dwell to select, default 1.2 s, configurable 0.8 to 2.0 s | Full shift completes eyes-only |
| FR-55 | M | Every audio cue has a visual equivalent | Mute test passes |
| FR-56 | M | Essential UI inside the central field of view (about 70° by 66°) and within 60 cm reach | FoV mask review passes |

### 5.7 AI layer (optional, never required)

| ID | Pri | Requirement | Acceptance |
|---|---|---|---|
| FR-60 | S | **Calibration Coach "ask why":** optional LLM narration of the debrief facts through a serverless proxy, only after the player presses a button | 3 s timeout, falls back to template lines. See `12-ai-coach-spec.md` |
| FR-61 | M | The game is **fully playable with no network** and with AI disabled | Airplane-mode playthrough |
| FR-62 | M | No AI call inside the per-frame loop | Code review check |
| FR-63 | M | Coach text is shown only if it passes `validateCoachText` (grounded numbers, no medical terms, length limits). Otherwise the template text shows | `core-spec/test/coach.test.js` and client tests pass |
| FR-64 | M | The proxy accepts only facts that pass `validateCoachFacts`, keeps the API key server-side, rate-limits, and has a kill switch and a spend cap | Proxy tests pass, key not in repo or bundle |

## 6. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Frame rate | ≥ 60 fps on Quest hardware (rules), aim for the device default refresh |
| NFR-02 | Cold start | ≤ 10 s typical, total transferred assets ≤ 15 MB |
| NFR-03 | Draw calls | Low hundreds, instance tokens, no real-time shadows |
| NFR-04 | Stability | No console errors in a full shift. Every failure recovers to the table or start screen |
| NFR-05 | Seated | Every interaction within a 2 ft (about 60 cm) radius, no roomscale |
| NFR-06 | Session | Complete moment in ≤ 10 minutes, shift about 7 minutes, pause and resume |
| NFR-07 | Determinism | Same seed gives same shift, same advice, on every device |
| NFR-08 | Privacy | Nothing leaves the device in the base game. No analytics |
| NFR-09 | Storage | Wrap all `localStorage` use in try/catch with an in-memory fallback |
| NFR-10 | Content | Fictional, abstract patients. No real people, brands or logos. English only |

## 7. Competition rule compliance (must all be true at submission)

| ID | Rule | How we meet it |
|---|---|---|
| RC-01 | Fully usable with hands, end to end | Hand input for every action, gaze and rays are alternatives |
| RC-02 | Seated, 2 ft radius | NFR-05 |
| RC-03 | Satisfying in 10 minutes, fast cold start, clean pause and resume | NFR-02, NFR-06, FR-34 |
| RC-04 | Original, not a wrapper | Deterministic core, AI optional (FR-61) |
| RC-05 | New Experience: started on or after 24 Sep 2026 | Fresh repo, no imported code from earlier projects |
| RC-06 | Policy compliance, suitable for a public forum | Mild theme, no gore, abstract deterioration |
| RC-07 | Playable build link, public YouTube/Vimeo video under 3 min, complete form | See `09-submission-kit.md` |
| RC-08 | No changes after the deadline, link stays live through judging | Freeze deploys after submitting |
| RC-09 | No identifiable people, brands, logos | NFR-10 |
| RC-10 | Free and available until winners are announced | Static hosting, no paid dependency that can lapse |

## 8. Success metrics

| Metric | Target | How measured |
|---|---|---|
| First-five-minutes test | 4 of 5 fresh players commit a call unaided by minute 2 | Playtest script in `08-qa-test-plan.md` |
| "Aha" | 3 of 5 fresh players can say which advisor they should trust more, after one shift | Post-play question |
| Completion | Full shift in 6 to 8 minutes | Timer |
| Stability | 0 console errors, 0 crashes across 5 full shifts | Console log and MCP tools |
| Balance gate | Calibrated policy beats both naive policies | `node tools/simulate-balance.js` |
| Submission | Everything filed 6 hours before the deadline | Checklist |

## 9. Dependencies and assumptions

- Start program membership and Developer Access (check now).
- IWSDK 1.0 on Node ≥ 20.19. Features used: grabbing, poke and ray interactions, plane detection, anchors, spatial audio, UI.
- No headset (confirmed 9 Nov). The rules say a headset is not required and allow emulator footage. Testing is emulator-first plus one or more **remote testers** with a Quest 3 or 3S (see `08-qa-test-plan.md` section 3.4).
- Hosting: GitHub Pages with the correct Vite `base` path (see `03-technical-spec.md`).

## 10. Release criteria (all must pass)

1. All **M** requirements implemented and passing their acceptance tests.
2. `npm test` and `node tools/validate-cases.js` pass. Balance gate passes.
3. Fresh-profile build opens, plays a full shift with hands only, no console errors.
4. Video, description, tagline and form complete and verified.
5. Deployment frozen after submission.

## 11. Open questions

| # | Question | Owner | Due |
|---|---|---|---|
| Q1 | Headset available? **No (9 Nov).** Emulator plus remote testers | Vinay | answered |
| Q2 | Solo entry or team? **Solo (9 Nov)** | Vinay | answered |
| Q3 | Live AI coach or fully offline? **Keep the coach (9 Nov)**, with the safety design in `12-ai-coach-spec.md` | Vinay | answered |
| Q4 | Target launch date to state on the form | Vinay | 17 Nov |
