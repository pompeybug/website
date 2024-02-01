#!/bin/bash

if [ "$1" != '--pages' ];
then
  rm -rf content_temp
  rm -rf src/content/*/
  git clone git@github.com:pompeybug/content.git content_temp
fi
mv content_temp/* src/content
rm -rf content_temp