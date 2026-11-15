#!/bin/sh
. submission/video/scripts/rec.sh
SP=submission/footage; MENU="-0.69 0.765 1.64"
look(){ npx iwsdk xr look-at --input-json "{\"device\":\"headset\",\"target\":{\"x\":$1,\"y\":$2,\"z\":$3}}" >/dev/null 2>&1; }
toggles(){ sh $SP/press.sh hand-right $MENU >/dev/null; /bin/sleep 1.3; for x in -1.1205 -0.9325 -1.0265; do sh $SP/press.sh hand-left $x 0.765 1.68 >/dev/null; /bin/sleep ${1:-0.8}; done; sh $SP/press.sh hand-right $MENU >/dev/null; /bin/sleep 1.2; }
sh $SP/seat.sh >/dev/null; /bin/sleep 1
node $SP/waitlog.mjs "placement] placed" 20 >/dev/null
# settings are on from the earlier take: switch them off first (not recorded)
toggles 0.8
npx iwsdk browser logs --input-json '{"count":40}' | grep -o 'settings\] [a-zA-Z]*=[a-z]*' | tail -3
look -0.95 0.78 1.5; /bin/sleep 0.5
rec_start 08-trays-contrast-bigtext-calm 70
/bin/sleep 2
toggles 1.6
look -0.95 0.78 1.5; /bin/sleep 2
sh $SP/press.sh hand-right -1.095 0.76 1.68 >/dev/null          # Module 1 (tutorial ghost hand runs first)
/bin/sleep 18
sh submission/video/scripts/carryf.sh hand-right 0 "Tray AMBER" >/dev/null; /bin/sleep 5
rec_stop 08-trays-contrast-bigtext-calm
npx iwsdk browser logs --input-json '{"count":80}' | grep -o '"message": "\[\(settings\|shift\|tutorial\)[^"]*' | tail -12
# leave the profile as found
toggles 0.8
npx iwsdk browser logs --input-json '{"count":30}' | grep -o 'settings\] [a-zA-Z]*=[a-z]*' | tail -3
