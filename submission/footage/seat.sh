#!/bin/sh
# Reload the app, seat the emulated player at the desk, enter XR with hands, confirm placement by pinch.
q(){ grep -m1 '"ok"\|message' | tr -d ' \n'; }
for i in 1 2 3 4 5 6 7 8 9 10; do npx iwsdk dev status 2>&1 | grep -q '"browserCommandReady": true' && break; /bin/sleep 4; done
npx iwsdk xr exit >/dev/null 2>&1
npx iwsdk browser reload 2>&1 | q; /bin/sleep 6
npx iwsdk xr enter 2>&1 | q
npx iwsdk xr set-transform --input-json '{"device":"headset","position":{"x":-0.95,"y":1.15,"z":1.95}}' 2>&1 | q
npx iwsdk xr set-input-mode --input-json '{"mode":"hand"}' 2>&1 | q
npx iwsdk xr look-at --input-json '{"device":"headset","target":{"x":-0.95,"y":0.74,"z":1.5}}' 2>&1 | q
/bin/sleep 2
npx iwsdk xr set-transform --input-json '{"device":"hand-right","position":{"x":-0.75,"y":1.0,"z":1.8}}' 2>&1 | q
npx iwsdk xr look-at --input-json '{"device":"hand-right","target":{"x":-0.95,"y":0.742,"z":1.55}}' 2>&1 | q
[ -n "$NOCONFIRM" ] || npx iwsdk xr select --input-json '{"device":"hand-right","duration":0.2}' 2>&1 | q
/bin/sleep 1; echo
