#!/bin/sh
# usage: seq.sh '<run-sequence json>'  -> prints select events and warnings compactly
npx iwsdk xr run-sequence --input-json "$1" --timeout 45000 2>&1 | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const r=JSON.parse(d);const x=r.data?.result||{};console.log(JSON.stringify({ok:r.ok,events:(x.selectEvents||x.events||[]).map(e=>e.type),warnings:x.warnings,err:r.error}).slice(0,500))}catch(e){console.log(d.slice(0,400))}})"
