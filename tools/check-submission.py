#!/usr/bin/env python3
"""Check submission text limits in docs/09-submission-kit.md.
Tagline: <= 140 characters. Description: suggested <= 500 words (tags removed)."""
import re, sys, pathlib

p = pathlib.Path(__file__).resolve().parent.parent / "docs" / "09-submission-kit.md"
t = p.read_text(encoding="utf-8")

ok = True
tag_block = t.split("### Tagline options", 1)[1].split("Recommended", 1)[0]
for i, m in enumerate(re.findall(r"`([^`]+)`", tag_block), 1):
    n = len(m)
    flag = "OK " if n <= 140 else "TOO LONG"
    ok &= n <= 140
    print(f"tagline {i}: {n:3d} chars  {flag}")

desc = t.split("## 3. Description", 1)[1].split("## 4.", 1)[0]
desc = desc.split("\n", 1)[1]
for tag in ("[IF SHIPPED]", "[CONFIRM AFTER BUILD]"):
    desc = desc.replace(tag, "")
desc = re.sub(r"\*\*", "", desc)
words = len(desc.split())
flag = "OK " if words <= 500 else "TOO LONG"
ok &= words <= 500
print(f"description: {words} words  {flag} (suggested limit 500)")

hand = t.split("## 4. Hand interactions text", 1)[1].split("## 5.", 1)[0]
hand = hand.split("\n", 1)[1].replace("[IF SHIPPED]", "")
print(f"hand interactions: {len(hand.split())} words")

vo = t.split("## 6. Voice-over script", 1)[1].split("Trim to fit", 1)[0]
q = re.findall(r'"(.+)"', vo, re.S)
vo_words = len(q[0].split()) if q else 0
print(f"voice-over: {vo_words} words (~{vo_words/150:.1f} min at 150 wpm; video must be < 3:00)")
sys.exit(0 if ok else 1)
