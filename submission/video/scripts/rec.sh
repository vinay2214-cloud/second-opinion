#!/bin/sh
# rec_start <name> <maxSec> ; rec_stop  -- background screencast around a scripted moment
rec_start(){ echo "{\"name\":\"$1\",\"maxSec\":$2}" > .tmp/cast-args.json; rm -f .tmp/cast-started .tmp/cast-stop; (npx iwsdk browser run submission/video/scripts/cast.mjs --timeout 108000 > .tmp/cast-$1.out 2>&1 &); for i in $(seq 1 40); do [ -f .tmp/cast-started ] && break; /bin/sleep 0.25; done; /bin/sleep 0.3; }
rec_stop(){ touch .tmp/cast-stop; for i in $(seq 1 60); do [ -f .tmp/cast-started ] || break; /bin/sleep 0.25; done; /bin/sleep 1; grep -o '"frames": [0-9]*\|"seconds": [0-9.]*\|"size": "[0-9x]*"' .tmp/cast-$1.out 2>/dev/null | tr '\n' ' '; echo; }
