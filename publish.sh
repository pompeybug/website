#!/bin/bash

git checkout live
git merge main
npm run build
echo 'pcf.boakes.org' > docs/CNAME
git add .
git commit -m "build"
git push
git checkout main
