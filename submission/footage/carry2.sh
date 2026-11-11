#!/bin/sh
# usage: carry2.sh <hand-left|hand-right> <token index> "<Tray NAME>"
SP=$(dirname "$0")
side=0.3; [ "$1" = "hand-left" ] && side=-0.3
"$SP/seq.sh" "{\"device\":\"$1\",\"steps\":[{\"target\":\"Token $2\",\"approach\":{\"distance\":0.06},\"pinch\":{\"value\":1,\"at\":\"arrival\"}},{\"target\":\"$3\",\"depart\":{\"distance\":0.06},\"approach\":{\"distance\":0.05}},{\"pinch\":0,\"duration\":0.15},{\"position\":{\"relativeTo\":\"head\",\"x\":$side,\"y\":-0.5,\"z\":-0.05},\"duration\":0.5}]}"
