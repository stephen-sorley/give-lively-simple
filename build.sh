#!/usr/bin/env bash
./node_modules/.bin/tsdown gl-simple-runtime.ts gl-simple-builder.ts --dts false --minify --target es2023 --platform browser && mv dist/gl-simple-runtime{.js,.min.js} && mv dist/gl-simple-builder{.js,.min.js}
./node_modules/.bin/lightningcss --error-recovery --browserslist --bundle --minify gl-simple.css -o dist/gl-simple.min.css
cp dist/*.min.* demo/