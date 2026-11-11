#!/bin/sh
# Second footage run: Module 3, seed ward-128, for the two moments seed ward-a cannot show:
#   patient 3: Orator leads, "very sure", says Amber; the answer is Red.
#   patient 9: Dash carries the "update installed" tag, says Amber on a breathing case; the answer is Red.
#              (Dash was right on the breathing case at patient 1, before the update.)
# The player commits the right answer every time and keeps it. The run stops after patient 9.
# Run from the project root with the dev server up and the seed set (see README.md).
SP=$(dirname "$0"); F=submission/footage
KEEP="-0.76 0.76 1.648"
carry(){ sh $SP/carry2.sh $1 $2 "$3" >/dev/null; }
keep(){ sh $SP/press.sh $1 $KEEP >/dev/null; }
sh $SP/seat.sh >/dev/null; /bin/sleep 1
sh $SP/press.sh hand-right -0.875 0.76 1.68 >/dev/null          # Module 3
node $SP/waitlog.mjs "arrive 0" 20 || exit 1
# P1 breathing, Amber. Dash leads and is right (before the update).
carry hand-right 0 "Tray AMBER"; /bin/sleep 1.4; sh $SP/shot.sh $F/15a-before-update-dash-right.png
keep hand-right; echo "p1"
node $SP/waitlog.mjs "arrive 1" 60; carry hand-left 1 "Tray GREEN"; /bin/sleep 1.2; keep hand-left; echo "p2"
# P3 injury, Red. Orator leads, very sure, says Amber.
node $SP/waitlog.mjs "arrive 2" 60; carry hand-right 2 "Tray RED"; /bin/sleep 1.4
sh $SP/shot.sh $F/14a-orator-leads-very-sure-says-amber.png
keep hand-right; /bin/sleep 0.8; sh $SP/shot.sh $F/14b-orator-was-wrong-answer-red.png; echo "p3"
node $SP/waitlog.mjs "arrive 3" 60; carry hand-left 3 "Tray AMBER"; /bin/sleep 1.2; keep hand-left; echo "p4"
# P5, P6 surge
node $SP/waitlog.mjs "arrive 5" 80
carry hand-right 4 "Tray GREEN"; /bin/sleep 1.2; keep hand-right
carry hand-left 5 "Tray GREEN"; /bin/sleep 1.2; keep hand-left; echo "p5 p6"
node $SP/waitlog.mjs "arrive 6" 60; carry hand-right 6 "Tray AMBER"; /bin/sleep 1.2; keep hand-right; echo "p7"
node $SP/waitlog.mjs "arrive 7" 60; carry hand-left 7 "Tray RED"; /bin/sleep 1.2; keep hand-left; echo "p8"
# P9 breathing, Red. Dash has the "update installed" tag and says Amber.
node $SP/waitlog.mjs "arrive 8" 60; /bin/sleep 0.8
carry hand-right 8 "Tray RED"; /bin/sleep 1.4; sh $SP/shot.sh $F/15b-after-update-dash-says-amber.png
keep hand-right; /bin/sleep 0.8; sh $SP/shot.sh $F/15c-dash-was-wrong-answer-red.png; echo "p9"
npx iwsdk browser logs --input-json '{"count":200}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).data.result;const s=r.map(x=>x.message).lastIndexOf('[shift] start');const m=r.slice(s-1);const lv={};m.forEach(x=>lv[x.level]=(lv[x.level]||0)+1);console.log(JSON.stringify(lv));m.filter(x=>/shift\] start seed|commit|resolved|drift cue/.test(x.message)||x.level!=='info').forEach(x=>console.log(x.message.slice(0,170)))})"
