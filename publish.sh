#!/bin/bash

git checkout live
git merge main
npm run build
echo 'pcf.boakes.org' > _site/CNAME
git push
git checkout main
