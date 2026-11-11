#!/bin/sh
# usage: press.sh <hand> <x> <y> <z>   pinch-ray select at a world point, then park the hand
q(){ grep -m1 '"ok"\|message' | tr -d ' \n'; }
f(){ printf '%.3f' "$(echo "$1" | bc -l)"; }
side=0.3; [ "$1" = "hand-left" ] && side=-0.3
npx iwsdk xr set-transform --input-json "{\"device\":\"$1\",\"position\":{\"x\":$(f "$2 + 0.05"),\"y\":$(f "$3 + 0.22"),\"z\":$(f "$4 + 0.18")}}" 2>&1 | q
npx iwsdk xr look-at --input-json "{\"device\":\"$1\",\"target\":{\"x\":$2,\"y\":$3,\"z\":$4}}" 2>&1 | q
npx iwsdk xr select --input-json "{\"device\":\"$1\",\"duration\":0.2}" 2>&1 | q
npx iwsdk xr set-transform --input-json "{\"device\":\"$1\",\"position\":{\"x\":$(f "-0.95 + $side"),\"y\":0.65,\"z\":1.9}}" 2>&1 | q
echo
