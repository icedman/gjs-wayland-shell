import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';

function getIconInfo(iconName) {
  let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
  let size = 48; // Icon size in pixels
  let scale = 1; // Scale factor (e.g., 1 for standard resolution, 2 for HiDPI)
  let direction = Gtk.TextDirection.LTR; // Left-to-right or right-to-left
  let state = Gtk.IconLookupFlags.FORCE_SVG; // Example: force SVG or other flags
  let flags;

  // Look up the icon
  let iconInfo = iconTheme.lookup_icon(
    iconName,
    null,
    size,
    scale,
    direction,
    flags,
  );

  if (iconInfo) {
    // Get the file path of the icon
    let iconPath = iconInfo.get_file().get_path();
    print(`Icon path: ${iconPath} ${iconInfo.is_symbolic}`);
  } else {
    print('Icon not found in the current theme.');
  }

  return iconInfo;
}

export { getIconInfo };
