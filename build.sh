#!/usr/bin/env bash
# Quick script to run local builds
source .env
hugo --environment local -D
npx torchlight
python3 -m http.server --directory public 1313

