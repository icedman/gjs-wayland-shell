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
* This shell re-uses a lot of gnome-shell's code
* gnome-shell need not be running


# debugging

To show a console like gnome-shell's looking glass the browse console:

```sh DEBUG_CONSOLE=1 gws```

Query the Main object

```js
JSON.stringify(Object.keys(Main));
```

Query the Dock

```js
JSON.stringify(Main.dock, null, 4);
```

Query the Panel

```js
JSON.stringify(Main.panel, null, 4);
```
