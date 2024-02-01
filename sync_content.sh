#!/bin/bash

if [ "$1" != '--pages' ]; then
  rm -rf src/content/*/

  if [ ! -d "content" ]; then
    git clone git@github.com:pompeybug/content.git content
  else
    git -C content pull -q
  fi
fi

cp -r content/* src/content
