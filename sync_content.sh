#!/bin/bash

PAGES=0
HTTP=0

for arg in "${@}"; do
  if [ "$arg" == "--pages" ]; then
    PAGES=1
  elif [ "$arg" == "--http" ]; then
    HTTP=1
  fi
done

if [ $PAGES -eq 0 ]; then
  rm -rf src/content/*/

  if [ ! -d "content" ]; then
    if [ $HTTP -eq 1 ]; then
      git clone https://github.com/pompeybug/website.git content
    else
      git clone git@github.com:pompeybug/content.git content
    fi
  else
    git -C content pull -q
  fi
fi

cp -r content/* src/content
rm -rf src/content/.github
