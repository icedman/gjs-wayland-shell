<br/>
<p align="center">
  <h3 align="center">GJS Wayland Shell (GWS)</h3>

  <p align="center">
	A Gnome-based shell over wayland - with macOS-like dash Animation
    <br/>
    <br/>
  </p>
</p>

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/icedman)

![Screen Shot](https://raw.githubusercontent.com/icedman/gjs-wayland-shell/main/screenshots/screenshot-2024-12-11-01.png)

# Requirements
1. wayland window manager/compositor
	* niri
	* sway
	* hyprland
  
  need patching for DBus access to windows list and events
  * labwc (https://github.com/icedman/labwc/tree/dbus-patch)
  * dwl (https://codeberg.org/icedman/dwl/src/branch/dbus-patch)

2. gtk4-layer-shell-devel
  Fedora:
	```sudo dnf install gtk4-layer-shell-devel```

  Arch:
  ```sudo dnf install gtk4-layer-shell```

3. gnome-shell
	```sudo dnf install gnome-shell```

4. udiskie (optiona) for volume mount monitor
  ```sudo dnf install udiskie```

# Installation

```git clone https://github.com/icedman/gjs-wayland-shell```

# Run

Run from terminal or from niri, sway, hyprland autostart config

```sh
$ gws
```

# Features

* Dash
* Top Panel
* Apps Grid
* Search Light
* animated icons
* running apps indicator
* dynamic trash icons
* mount icons

# Features in development
* autohide (partly done)

# Search Light

Map the search app to your hotkey with your window manager. Or run the app from terminal.

```sh
$ gws-search
```

# Apps Grid

Map the apps grid to your hotkey with your window manager. Or run the app from terminal.

```sh
$ gws-apps
```

Functions the same way as Gnome Shell's search, using DBus querying SearchProviders.

# Panel Items

* logo
* clock
* inhibitor
* network
* power
* volume
* mic
* brightness

# Dock Items

* favorite apps
* running apps
* trash
* separator
* volumes mounted

# Config directory

# Customize CSS

Copy ```gws``` from in ```docs/sample-config``` to the ```~/.config``` directory

Edit custom css at ```~/.config/gws/style.css```

sample css:

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

# Customize Settings

Settings are handled via gnome dconf. A preferences app is provided for safer edits.

```sh
$ gws-prefs
```

Alternatively, dconf settings may be overriden by edit a settings file at ```~/.config/gws/settings.json```

sample config:

```json
{
  "favorite-apps": [
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

The sample extension at the ```docs``` folder. (Requires coding - and studying the gws code)

# Why is gnome-shell required?

* This shell re-uses some of gnome-shell's dbus interfaces
* This shell re-uses a lot of gnome-shell's code
* gnome-shell need not be running

# Debugging

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

# More screen shots

![Screen Shot](https://raw.githubusercontent.com/icedman/gjs-wayland-shell/main/screenshots/screenshot-2024-12-26-01.png)