<br/>
<p align="center">
  <h3 align="center">GJS Wayland Shell (GWS)</h3>

  <p align="center">
	A Gnome-based shell over wayland
    <br/>
    <br/>
  </p>
</p>

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/icedman)

![Screen Shot](https://raw.githubusercontent.com/icedman/gjs-wayland-shell/main/screenshots/screenshot-2024-12-11-01.png)

# Requirements
1. wayland window manager/compositor
	* niri (recommended)
	* sway
	* hyprland
2. gtk4-layer-shell-devel
	* sudo dnf install gtk4-layer-shell-devel
3. gnome-shell
	* sudo dnf gnome-shell

# Installation

```git clone https://github.com/icedman/gjs-wayland-shell```

# Run

Run from terminal or from niri, sway, hyprland autostart config

```sh
$ gws
```

# Search menu

Map the search app to your hotkey with your window manager. Or run the app from terminal.

```sh
$ gws-search
```

# Customize

Open the preferences app

```sh
$ gws-prefs
```

# Config directory

copy ```gws``` from in ```docs/sample-config``` to the ```~/.config``` directory
edit custom css at ```~/.config/gws/style.css```
edit custom settings at ```~/.config/gws/settings.json```

sample config:

```json
{
  "favorite_apps": [
    "kitty.desktop",
    "org.gnome.Nautilus.desktop",
    "google-chrome.desktop",
    "org.mozilla.firefox.desktop",
    "org.gnome.Calendar.desktop",
    "org.gnome.clocks.desktop",
    "org.gnome.Software.desktop",
    "org.gnome.TextEditor.desktop"
  ],
  "baritems-lead-items": ["logo"],
  "baritems-center-items": ["clock"],
  "baritems-trail-items": ["network", "power", "volume", "mic"]
}
```

# Extension/Rice

The sample extension show how to add custom dock. (Requires coding)

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
