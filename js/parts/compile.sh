#!/bin/bash

JS_HOME="/home/robert/workspace/edbalance/js"
APPJS=$JS_HOME/app.js
PARTS=$JS_HOME/parts

rm $APPJS
cat $PARTS/*.js >> $APPJS
