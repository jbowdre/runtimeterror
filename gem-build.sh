#!/usr/bin/env bash
# Quick script to serve gemini locally
hugo --environment local -D
agate --content public --hostname localhost