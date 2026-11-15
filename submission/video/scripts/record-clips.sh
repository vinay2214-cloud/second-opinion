#!/bin/sh
# Records the eight storyboard clips from one Module 3 shift on seed ward-128, then the settings clip.
. submission/video/scripts/rec.sh
SP=submission/footage
KEEP="-0.76 0.76 1.648"; ORATOR="-0.815 0.80 1.40"; MENU="-0.69 0.765 1.64"
carry(){ sh submission/video/scripts/carryf.sh $1 $2 "$3" >/dev/null; }
keep(){ sh $SP/press.sh $1 $KEEP >/dev/null; }
look(){ npx iwsdk xr look-at --input-json "{\"device\":\"headset\",\"target\":{\"x\":$1,\"y\":$2,\"z\":$3}}" >/dev/null 2>&1; }
wait_for(){ node $SP/waitlog.mjs "$1" ${2:-80} || { echo "TIMEOUT $1"; exit 1; }; }
npx iwsdk xr exit >/dev/null 2>&1; npx iwsdk browser run submission/video/scripts/size1080.mjs >/dev/null 2>&1
sh $SP/seat.sh >/dev/null; /bin/sleep 1
# reset the three settings the first take left on
sh $SP/press.sh hand-right $MENU >/dev/null; /bin/sleep 1
for x in -1.1205 -1.0265 -0.9325; do sh $SP/press.sh hand-left $x 0.765 1.68 >/dev/null; /bin/sleep 0.8; done
sh $SP/press.sh hand-right $MENU >/dev/null; /bin/sleep 1
look -0.95 0.78 1.5
# 02 table and ward
rec_start 02-table-and-ward 40
/bin/sleep 1.5; look -1.6 1.1 1.0; /bin/sleep 2; look -0.3 1.1 1.0; /bin/sleep 2.2; look -0.95 0.78 1.5; /bin/sleep 3
rec_stop 02-table-and-ward
sh $SP/press.sh hand-right -0.875 0.76 1.68 >/dev/null          # Module 3
# 03 read the card, commit, advice, keep, reveal (P1: Dash agrees, answer Amber)
wait_for "arrive 0" 25
rec_start 03-read-commit-advice-keep-reveal 60
/bin/sleep 1; sh $SP/press.sh hand-left -0.985 0.766 1.681 >/dev/null; /bin/sleep 2.5
carry hand-right 0 "Tray AMBER"; /bin/sleep 2.5; keep hand-right; /bin/sleep 3
rec_stop 03-read-commit-advice-keep-reveal; echo p1
wait_for "arrive 1"; carry hand-left 1 "Tray GREEN"; /bin/sleep 1.2; keep hand-left; echo p2
# 04 Orator leads, very sure, says Amber; the player keeps Red; answer Red (P3)
wait_for "arrive 2"
rec_start 04-orator-confident-wrong-overruled 60
/bin/sleep 0.8; carry hand-right 2 "Tray RED"; /bin/sleep 3.5; keep hand-right; /bin/sleep 3
rec_stop 04-orator-confident-wrong-overruled; echo p3
# 05 second opinion (verify token) and the clock jump (P4)
wait_for "arrive 3"
rec_start 05-verify-token-clock-jump 60
/bin/sleep 0.8; carry hand-left 3 "Tray AMBER"; /bin/sleep 1.5; sh $SP/press.sh hand-right $ORATOR >/dev/null; /bin/sleep 3; keep hand-left; /bin/sleep 2
rec_stop 05-verify-token-clock-jump; echo p4
# 01 hook: token placed, advisor disagrees (P6 in the first surge: Sage says Amber, player Green)
wait_for "arrive 5"
carry hand-right 4 "Tray GREEN"; /bin/sleep 1.2; keep hand-right
rec_start 01-token-placed-advisor-disagrees 40
/bin/sleep 0.8; carry hand-left 5 "Tray GREEN"; /bin/sleep 3
rec_stop 01-token-placed-advisor-disagrees
keep hand-left; echo "p5 p6"
wait_for "arrive 6"; carry hand-right 6 "Tray AMBER"; /bin/sleep 1.2; keep hand-right; echo p7
wait_for "arrive 7"; carry hand-left 7 "Tray RED"; /bin/sleep 1.2; keep hand-left; echo p8
# 06 update installed: Dash says Amber on breathing, player keeps Red, answer Red (P9)
wait_for "arrive 8"
rec_start 06-update-installed-drifted-advisor-wrong 60
/bin/sleep 1.5; carry hand-right 8 "Tray RED"; /bin/sleep 3.5; keep hand-right; /bin/sleep 3
rec_stop 06-update-installed-drifted-advisor-wrong; echo p9
wait_for "arrive 10"
carry hand-left 9 "Tray AMBER"; /bin/sleep 1.2; keep hand-left
carry hand-right 10 "Tray RED"; /bin/sleep 1.2; keep hand-right; echo "p10 p11"
wait_for "arrive 11"; carry hand-left 11 "Tray AMBER"; /bin/sleep 1.2; keep hand-left; echo p12
wait_for "arrive 12"; carry hand-right 12 "Tray AMBER"; /bin/sleep 1.2; keep hand-right; echo p13
wait_for "arrive 13"; carry hand-left 13 "Tray GREEN"; /bin/sleep 1.2; keep hand-left; echo p14
# 07 debrief: index, rates, then the trust map
wait_for "shift] end" 40
rec_start 07-debrief-index-rates-trust-map 40
/bin/sleep 4.5; keep hand-right; /bin/sleep 5
rec_stop 07-debrief-index-rates-trust-map
keep hand-right; /bin/sleep 1
# 08 shape-coded trays, high contrast, big text, calm mode, then a Module 1 patient in those settings
rec_start 08-trays-contrast-bigtext-calm 104
/bin/sleep 1.5; sh $SP/press.sh hand-right $MENU >/dev/null; /bin/sleep 1.5
sh $SP/press.sh hand-left -1.1205 0.765 1.68 >/dev/null; /bin/sleep 1.5
sh $SP/press.sh hand-left -0.9325 0.765 1.68 >/dev/null; /bin/sleep 1.5
sh $SP/press.sh hand-left -1.0265 0.765 1.68 >/dev/null; /bin/sleep 2
sh $SP/press.sh hand-right $MENU >/dev/null; /bin/sleep 1.5
sh $SP/press.sh hand-right -1.095 0.76 1.68 >/dev/null          # Module 1
wait_for "arrive 0" 70; /bin/sleep 1
carry hand-right 0 "Tray AMBER"; /bin/sleep 3.5
rec_stop 08-trays-contrast-bigtext-calm
# leave the profile as found: settings off again
sh $SP/press.sh hand-right $MENU >/dev/null; /bin/sleep 1
for x in -1.1205 -1.0265 -0.9325; do sh $SP/press.sh hand-left $x 0.765 1.68 >/dev/null; /bin/sleep 0.8; done
sh $SP/press.sh hand-right $MENU >/dev/null
echo DONE
