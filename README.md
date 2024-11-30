# gnome based shell over wayland

# requirements
1. niri window manager (for now)
2. sudo dnf install gtk4-layer-shell-devel
3. sudo dnf gnome-shell

# why is gnome-shell required
1. this shell re-uses some of gnome-shell's dbus interfaces
2. gnome-shell need not be running
