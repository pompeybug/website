#!/bin/bash

rm -rf content_temp
rm -rf src/content/*
git clone git@github.com:pompeybug/content.git content_temp
mv content_temp/* src/content
rm -rf content_temp