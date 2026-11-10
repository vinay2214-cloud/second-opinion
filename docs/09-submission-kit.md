# 09 · Submission kit

**Truth source:** the actual Devpost form and the Official Rules. This kit is a draft of what to paste. Where the form differs, the form wins.
**Deadline:** Wed 18 Nov 12:00 PM PT = Thu 19 Nov 01:30 AM IST. **Submit by 18:00 IST on Wed 18 Nov.**

## 1. Form fields and drafts

| Field | Draft | Limit and status |
|---|---|---|
| Project name | **Second Opinion** | [VERIFY] not already taken on the Meta Horizon Store or Devpost. Fallbacks: *Calibrate*, *Trust Ward* |
| Tagline | Pick one below | ≤ 140 characters (checked) |
| Track | **Gaming** | fixed |
| Division | **New Experience** | fixed. Started on or after 24 Sep 2026, fresh repo |
| Description | Section 3 | Suggested ≤ 500 words (checked at the bottom) |
| Hand interactions (optional) | Section 4 | Fill it in, it supports the hands-first criterion |
| Target launch date | **Your choice (Q4)** | Pick a date you can keep. [VERIFY] what the rules say about it |
| Team | **Solo entrant** (answered 9 Nov) | No Team Representative. One entry per entrant |
| Playable build link | Public GitHub Pages URL | Must work logged out and stay live through judging |
| Video link | Public YouTube or Vimeo, under 3 min | Check it plays logged out |
| Repo link | Public GitHub repo (if asked) | Check the form |

### Tagline options (all ≤ 140 characters)

1. `Commit your call, then see if the AI agrees. A seated, hands-only tabletop game about when to trust an AI advisor.`
2. `Run a night ward on your table. Make your call first, then weigh four AI advisors. Learn who to trust, and when.`
3. `Trust is a skill. Practise it: a hands-only mixed reality game about when to follow AI advice and when to overrule it.`

Recommended: **option 1**. It states the mechanic in the first clause.

## 2. Honesty rules for the text

- Say only what ships. Every feature sentence in the description is tagged `[IF SHIPPED]` below. Delete the sentence if the feature did not ship.
- No claims that the game "reduces automation bias" or "trains clinicians". Say it **lets you practise** and **shows you your own pattern**.
- No medical claims. State: fictional game logic, not medical advice.
- The rules allow footage "as viewed on a Meta Quest device or via XR Simulator or another equivalent emulator". Say which one you used in the video description. Real gameplay only, no mock-ups, and do not lean on AI-generated video to carry the pitch (the rules discourage it).

## 3. Description (draft, about 480 words with every tag kept)

**Second Opinion is a seated, hands-only mixed reality game about a skill we all need and rarely practise: knowing when to trust an AI.**

Your table becomes a quiet night ward. Patient tokens arrive one at a time with a small vitals card. You pick up a token and place it on a Red, Amber or Green tray. That is your call, and it is locked before any advice appears. Then an AI advisor speaks. Keep your call, or change it. The truth is revealed, and you see why.

**Four advisors, four personalities.** Dash is fast and strong on common cases, but weaker with children. Sage is cautious and rarely misses danger, but over-calls. Ledger is brilliant on cardiac cases and blind elsewhere. Orator is eloquent and sounds certain, but is barely better than a coin flip. Nobody tells you any of this. You learn it by playing.

**Scrutiny is a budget.** Each shift gives you a few second-opinion tokens. Each one costs time on the clock. Spend them where they pay off, and unspent tokens score.

**Trust drifts.** Mid-shift, one advisor quietly changes and gets worse at one kind of case. A small "update installed" badge appears, easy to miss, like real release notes. Do you notice?

**An honest mirror.** Each shift ends with a Calibration index showing how well your switching and holding tracked reality, your over-reliance and under-reliance rates, a plain-language finding, one next step and a trust map. It names the behaviour, not you.

**Built for hands.** Poke to read cards and ask advisors. Pinch-grab a token and release it over a tray to commit. Everything sits within about 60 cm, seated, with no controllers. The ward anchors to your real table using plane detection, with a virtual table fallback if none is found. [CONFIRM AFTER BUILD]

**Accessible by design.** Trays are shape-coded as well as colour-coded. Modes include high contrast, calm mode with a slower clock, and one-hand play. [IF SHIPPED] A gaze-dwell mode lets you play a full shift with your eyes only. Every sound has a visual twin.

**Short sessions, a reason to return.** A shift takes about seven minutes, with pause and resume. [IF SHIPPED] A daily seeded shift gives everyone the same patients.

**How it is built.** Immersive Web SDK 1.0 and WebXR, hosted as a static page, so it opens from a link. A deterministic, tested core drives scenarios, advisor behaviour and scoring, so every device gets the same shift and it is fully playable offline. Patient answers come from a transparent scoring rubric in code, never from a language model. [IF SHIPPED] An optional AI coach, which sends only summary numbers when you tap it, can narrate your debrief, with a built-in fallback.

**Why it matters.** Research on human and AI decision-making reports both over-trust and under-trust, and suggests practice with feedback helps people build accurate expectations. This is a small, playful place to practise.

All patients and cases are fictional and abstract. This is game logic, not medical advice.

## 4. Hand interactions text (optional field, draft)

Poke the vitals card to read it. Pinch-grab a patient token and release it over the Red, Amber or Green tray to commit your call. Poke an advisor to hear a second opinion. Poke Keep, or drag the token to another tray, to finalise. A table-edge menu pauses the game. Everything is within about 60 cm, seated, with no controllers. [IF SHIPPED] Gaze-dwell and one-hand modes replace pokes and grabs.

## 5. Video storyboard (target 2:15 to 2:30, hard limit under 3:00)

| Time | Shot | Voice-over |
|---|---|---|
| 0:00–0:10 | Hook: first-person grab of a token, release on a tray, an advisor speaks and **disagrees** | "Commit your call. Then see if the AI agrees." |
| 0:10–0:25 | The table with the ward, trays, four advisors | "This is your ward, on your table." |
| 0:25–0:55 | Play: read card, commit, advice, keep or change, reveal, score toast | "You decide first. Then you hear the advisor. Then you learn the truth." |
| 0:55–1:15 | Orator gives a long confident wrong answer, player spots it | "The loudest advisor is not always right." |
| 1:15–1:35 | Spend a verify token, clock jumps | "Checking costs time. Spend it wisely." |
| 1:35–1:55 | Drift: "update installed" badge, advisor wrong on a category, player notices | "And then one of them quietly changes." |
| 1:55–2:15 | Debrief: Calibration index, over and under rates, trust map | "At the end, an honest mirror. Not a score. A pattern." |
| 2:15–2:30 | Accessibility montage: one-hand, shape-coded trays, calm mode. Title card and URL | "Seated, hands only, built for everyone. Second Opinion." |

Rules for the video: lead with the best moment. Real gameplay only. Captions on. Mention that patients are fictional, in the description box. No copyrighted music. Upload as **public**, test the link logged out, check the length is under 3:00.

## 6. Voice-over script (about 175 words, a calm pace, leaves room for gameplay sound)

"Commit your call. Then see if the AI agrees. This is Second Opinion, a mixed reality game on your own table. A patient arrives. You read the card, and you decide: Red, Amber, or Green. Only then does an advisor speak. You can keep your call, or change it. Then you find out who was right. There are four advisors. Dash is fast. Sage is careful. Ledger is a specialist. And Orator? Orator is very sure of himself. You are never told who is reliable. You learn it. You can ask for a second opinion, but it costs a token and time. Spend it well. Halfway through, something changes. An advisor gets an update, and starts to slip. Will you notice? At the end, you get an honest mirror. Your Calibration index, how often you followed bad advice, and how often you ignored good advice. Not a score. A pattern. It is hands only, seated, within arm's reach, with shape-coded trays, a calm mode, and one-hand play. All patients are fictional. Trust is a skill. Practise it."

Trim to fit the final footage. If the voice-over is longer than the video, cut sentences, not speed.

## 7. Pre-submission checklist

**Build**

- [ ] `submission-1` tag pushed. Pages deploy finished. No further deploys.
- [ ] Build link opens logged out in a fresh profile and plays a full shift (QA 3.5).
- [ ] No console errors. No 404s.

**Rules (RC-01 to RC-10)**

- [ ] Fully usable with hands only.
- [ ] Seated, within a 2 ft radius.
- [ ] Satisfying in 10 minutes, fast cold start, clean pause and resume.
- [ ] Original, not a wrapper. AI optional, game works offline.
- [ ] New Experience: repo started on or after 24 Sep 2026, no imported old code.
- [ ] Suitable for a public forum, mild theme, no identifiable people, brands or logos.
- [ ] Free to access and available until winners are announced.
- [ ] No changes after the deadline.

**Assets**

- [ ] Video public, under 3:00, plays logged out.
- [ ] Tagline ≤ 140 characters.
- [ ] Description within the suggested limit, `[IF SHIPPED]` tags resolved, `[CONFIRM AFTER BUILD]` checked against the real build.
- [ ] Hand interactions text filled in.
- [ ] Target launch date chosen. Entry is solo. You are the one submitting. Start membership approved and Developer Access enabled **before** you press submit.
- [ ] `CREDITS.md` lists every external asset and licence.

**Final**

- [ ] Read every field twice. Screenshot each field. Submit by 18:00 IST. Screenshot the confirmation.

## 8. Word and character counts (checked by script on 9 Nov)

Run `python3 tools/check-submission.py` from the kit root after you edit the text. It counts the tagline characters and the description words with the `[IF SHIPPED]` and `[CONFIRM AFTER BUILD]` tags removed.
