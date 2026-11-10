# T13 · Submission assembly

**Agent:** Gemini 4 Argon (drafts), you (final) · **When:** D6 to D9

**Goal:** Everything the form needs, verified, with margin before the deadline.

## Inputs (read first)
- docs/09-submission-kit.md
- docs/07-build-plan.md
- the real build

## Allowed files (edit only these)
- submission/**
- docs/09-submission-kit.md

## Steps
1. Argon: update the description to match what actually shipped. Resolve every [IF SHIPPED] and [CONFIRM AFTER BUILD] tag. Re-run python3 tools/check-submission.py.
2. Argon: finalise the storyboard and voice-over against the real footage length.
3. You: record footage, edit, upload the video as public, test it logged out.
4. You: fill the form, screenshot every field, submit by 18:00 IST on Wed 18 Nov, screenshot the confirmation.

## Acceptance (must all pass)
- [ ] tools/check-submission.py exits 0
- [ ] Video under 3:00 and plays logged out
- [ ] Build link opens logged out in a fresh profile
- [ ] Confirmation screenshot saved

## Do not
- No claims that the build does not support
- No deploys after tagging submission-1

## Report format
The submission checklist, ticked.
