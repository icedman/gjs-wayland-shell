#!/bin/sh

cd "$(dirname "$0")"
export GI_TYPELIB_PATH=/usr/lib64/gnome-shell
export LD_LIBRARY_PATH=/usr/lib64/gnome-shell
export LD_PRELOAD=/usr/lib64/libgtk4-layer-shell.so
gjs -m ./index.js