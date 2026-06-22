#!/usr/bin/env bash
./node_modules/.bin/tsdown give-lively-simple-runtime.ts --dts false --minify --target es2023 --platform browser && mv dist/give-lively-simple-runtime{.js,.min.js}
./node_modules/.bin/lightningcss --error-recovery --browserslist --bundle --minify give-lively-simple.css -o dist/give-lively-simple.min.css