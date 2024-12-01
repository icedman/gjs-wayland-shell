# gnome based shell over wayland

# requirements
1. wayland window manager/compositor
	* niri (recommended)
	* sway
	* hyprland
2. sudo dnf install gtk4-layer-shell-devel
3. sudo dnf gnome-shell

# installation

```git clone https://github.com/icedman/gjs-wayland-shell```

# run

Run from terminal or from niri, sway, hyprland
```sh
$ gws
```

# customize

```sh
$ gws-prefs
```

Add custom css at ```~/.config/gws/style.css```

```css

#Dock { /* the dock */ }
#Bar { /* the topbar */ }

#Dock #container,
#Bar #container { /* set the background color and borders */ }

/* customize parts of the dock or bar */
#Dock #container #lead,
#Dock #container #center,
#Dock #container #trail {
}

```

# why is gnome-shell required?
* This shell re-uses some of gnome-shell's dbus interfaces
* gnome-shell need not be running

