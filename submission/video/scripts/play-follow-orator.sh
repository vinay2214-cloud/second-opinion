#!/bin/sh
# ward-128, Module 3, no reload (fresh profile already in XR). Right answer everywhere except
# patient 3: commit Red, then follow Orator ("very sure", Amber) by moving the token. Answer Red.
SP=submission/footage; KEEP="-0.76 0.76 1.648"
carry(){ sh submission/video/scripts/carryf.sh $1 $2 "$3" >/dev/null; }
keep(){ sh $SP/press.sh $1 $KEEP >/dev/null; }
one(){ node $SP/waitlog.mjs "arrive $2" 80 || exit 1; carry $1 $2 "Tray $3"; /bin/sleep 1.3; keep $1; echo "p$(($2+1))"; }
npx iwsdk xr set-transform --input-json '{"device":"headset","position":{"x":-0.95,"y":1.15,"z":1.95}}' >/dev/null 2>&1
npx iwsdk xr look-at --input-json '{"device":"headset","target":{"x":-0.95,"y":0.74,"z":1.5}}' >/dev/null 2>&1
sh $SP/press.sh hand-right -0.875 0.76 1.68 >/dev/null
one hand-right 0 AMBER; one hand-left 1 GREEN
node $SP/waitlog.mjs "arrive 2" 80 || exit 1
carry hand-right 2 "Tray RED"; /bin/sleep 2.5
carry hand-right 2 "Tray AMBER"; /bin/sleep 1.5; echo "p3 followed Orator"
one hand-left 3 AMBER
node $SP/waitlog.mjs "arrive 5" 80
carry hand-right 4 "Tray GREEN"; /bin/sleep 1.2; keep hand-right
carry hand-left 5 "Tray GREEN"; /bin/sleep 1.2; keep hand-left; echo "p5 p6"
one hand-right 6 AMBER; one hand-left 7 RED; one hand-right 8 RED
node $SP/waitlog.mjs "arrive 10" 80
carry hand-left 9 "Tray AMBER"; /bin/sleep 1.2; keep hand-left
carry hand-right 10 "Tray RED"; /bin/sleep 1.2; keep hand-right; echo "p10 p11"
one hand-left 11 AMBER; one hand-right 12 AMBER; one hand-left 13 GREEN
node $SP/waitlog.mjs "shift] end" 40
npx iwsdk browser logs --input-json '{"count":200}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).data.result;const s=r.map(x=>x.message).lastIndexOf('[shift] start');const m=r.slice(s-1);const lv={};m.forEach(x=>lv[x.level]=(lv[x.level]||0)+1);console.log(JSON.stringify(lv));m.filter(x=>/commit 2|switch|resolve.*2|debrief\]|shift\] end/.test(x.message)||x.level!=='info').forEach(x=>console.log(x.message.slice(0,260)))})"
echo DONE
