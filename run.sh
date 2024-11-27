#!/bin/sh

cd ~/Developer/gnome/gjs-wayland-shell
export GI_TYPELIB_PATH=/usr/lib64/gnome-shell
export LD_LIBRARY_PATH=/usr/lib64/gnome-shell
export LD_PRELOAD=/usr/lib64/libgtk4-layer-shell.so
gjs -m ./index.js