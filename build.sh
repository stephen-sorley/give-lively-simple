#!/usr/bin/env bash
./node_modules/.bin/tsdown give-lively-simple-runtime.ts --minify
./node_modules/.bin/lightningcss --error-recovery --browserslist --bundle --minify give-lively-simple.css -o dist/give-lively-simple.min.css