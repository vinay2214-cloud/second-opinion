#!/bin/sh
# Footage run: Module 3, seed ward-a, played well so the debrief shows a clear pattern.
# Shots follow docs/09 section 5. Run from the project root with the dev server up.
SP=$(dirname "$0"); F=submission/footage
KEEP="-0.76 0.76 1.648"; ORATOR="-0.815 0.80 1.40"
carry(){ sh $SP/carry2.sh $1 $2 "$3" >/dev/null; }
keep(){ sh $SP/press.sh $1 $KEEP >/dev/null; }
sh $SP/seat.sh >/dev/null; /bin/sleep 1
sh $SP/shot.sh $F/02-table-and-modules.png
sh $SP/press.sh hand-right -0.875 0.76 1.68 >/dev/null          # Module 3
node $SP/waitlog.mjs "arrive 0" 20 || exit 1
sh $SP/press.sh hand-left -0.985 0.766 1.681 >/dev/null         # open the vitals
/bin/sleep 0.6; sh $SP/shot.sh $F/03-read-the-card.png
# P0: hook. Commit Amber; Dash says Red (disagrees).
sh $SP/seq.sh '{"device":"hand-right","steps":[{"target":"Token 0","approach":{"distance":0.06},"pinch":{"value":1,"at":"arrival"}},{"target":"Tray AMBER","depart":{"distance":0.06},"approach":{"distance":0.05}}]}' >/dev/null
/bin/sleep 0.4; sh $SP/shot.sh $F/01a-hook-token-in-hand.png
sh $SP/seq.sh '{"device":"hand-right","steps":[{"pinch":0,"duration":0.15},{"anchor":"grasp","position":{"relativeTo":"head","x":0.3,"y":-0.5,"z":-0.05},"duration":0.5}]}' >/dev/null
/bin/sleep 1.2; sh $SP/shot.sh $F/01b-hook-advisor-disagrees.png
sh $SP/press.sh hand-right $ORATOR >/dev/null; /bin/sleep 0.6
sh $SP/shot.sh $F/05-second-opinion-orator-and-cost.png
keep hand-right; /bin/sleep 0.8; sh $SP/shot.sh $F/04-reveal-and-score.png; echo "p0"
# P1 agree
node $SP/waitlog.mjs "arrive 1" 60; carry hand-left 1 "Tray AMBER"; /bin/sleep 1.2; keep hand-left; echo "p1"
# P2 Ledger wrong, hold
node $SP/waitlog.mjs "arrive 2" 60; carry hand-right 2 "Tray RED"; /bin/sleep 1.2; keep hand-right; echo "p2"
# P3 Orator, very sure, and right: switch
node $SP/waitlog.mjs "arrive 3" 60; carry hand-left 3 "Tray AMBER"; /bin/sleep 1.4
sh $SP/shot.sh $F/06-orator-very-sure.png
carry hand-left 3 "Tray GREEN"; /bin/sleep 0.8; sh $SP/shot.sh $F/07-switched-and-right.png; echo "p3"
# P4, P5 surge
node $SP/waitlog.mjs "arrive 5" 80; /bin/sleep 0.6; sh $SP/shot.sh $F/08-surge-two-patients.png
carry hand-right 4 "Tray GREEN"; /bin/sleep 1.2; keep hand-right
carry hand-left 5 "Tray RED"; /bin/sleep 1.2; keep hand-left; echo "p4 p5"
node $SP/waitlog.mjs "arrive 6" 60; carry hand-right 6 "Tray RED"; /bin/sleep 1.2; keep hand-right; echo "p6"
node $SP/waitlog.mjs "arrive 7" 60; carry hand-left 7 "Tray RED"; /bin/sleep 1.2; keep hand-left; echo "p7"
# P8 drift cue
node $SP/waitlog.mjs "arrive 8" 60; /bin/sleep 0.8; sh $SP/shot.sh $F/09-drift-update-installed.png
carry hand-right 8 "Tray AMBER"; /bin/sleep 1.2; keep hand-right; echo "p8"
node $SP/waitlog.mjs "arrive 10" 80
carry hand-left 9 "Tray AMBER"; /bin/sleep 1.2; keep hand-left
carry hand-right 10 "Tray AMBER"; /bin/sleep 1.2; keep hand-right; echo "p9 p10"
node $SP/waitlog.mjs "arrive 11" 60; carry hand-left 11 "Tray GREEN"; /bin/sleep 1.2; keep hand-left; echo "p11"
node $SP/waitlog.mjs "arrive 12" 60; carry hand-right 12 "Tray GREEN"; /bin/sleep 1.2; keep hand-right; echo "p12"
node $SP/waitlog.mjs "arrive 13" 60; carry hand-left 13 "Tray AMBER"; /bin/sleep 1.2; keep hand-left; echo "p13"
node $SP/waitlog.mjs "shift] end" 30; /bin/sleep 1
sh $SP/shot.sh $F/10-debrief-calibration.png
keep hand-right; /bin/sleep 1; sh $SP/shot.sh $F/11-trust-map.png
npx iwsdk browser logs --input-json '{"count":200}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).data.result;const s=r.map(x=>x.message).lastIndexOf('[shift] start');const m=r.slice(s-1);const lv={};m.forEach(x=>lv[x.level]=(lv[x.level]||0)+1);console.log(JSON.stringify(lv));m.filter(x=>/resolved|shift\] end|debrief\] match|verify/.test(x.message)||x.level!=='info').forEach(x=>console.log(x.message.slice(0,150)))})"
