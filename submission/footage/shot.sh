#!/bin/sh
# usage: shot.sh <file>  re-aim the headset at the ward, then screenshot
npx iwsdk xr look-at --input-json '{"device":"headset","target":{"x":-0.95,"y":0.78,"z":1.5}}' >/dev/null 2>&1
/bin/sleep 0.4
npx iwsdk browser screenshot --output-file "$1" >/dev/null 2>&1
