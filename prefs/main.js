import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import Adw from "gi://Adw";

Gtk.init();

const settings = new Gio.Settings({ schema: "com.github.icedman.gws" });
const settingsGtk = Gtk.Settings.get_default();
settingsGtk.gtk_application_prefer_dark_theme = true;

function find(n, name) {
  if (n.get_name() == name) {
    return n;
  }
  let c = n.get_first_child();
  while (c) {
    let cn = find(c, name);
    if (cn) {
      return cn;
    }
    c = c.get_next_sibling();
  }
  return null;
}

function dump(n, l) {
  let s = "";
  for (let i = 0; i < l; i++) {
    s += " ";
  }
  if (n.get_name()) n.add_css_class(n.get_name().toLowerCase());
  print(
    `${s}${n.get_name()} ${n.get_css_classes()} [${n.title || n.label || n.icon_name || ""}]`,
  );
  let c = n.get_first_child();
  while (c) {
    dump(c, l + 1);
    c = c.get_next_sibling();
  }
}

let builder = new Gtk.Builder();
const AdwPreferencesPage = Adw.PreferencesPage;

// If you are not using GtkApplication which has its own mainloop
// you must create it yourself, see gtk-application.js example
let loop = GLib.MainLoop.new(null, false);

// Construct a window
// let win = new Gtk.Window({
let win = new Adw.PreferencesWindow({
  name: "Preferences",
  title: "Preferences",
  default_width: 600,
  default_height: 650,
});

win.add_css_class(
  settingsGtk.gtk_application_prefer_dark_theme ? "dark" : "light",
);

let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
let UIFolderPath = `./ui`;
iconTheme.add_search_path(`${UIFolderPath}/icons`);

// This is a callback function
function onCloseRequest() {
  log("close-request emitted");
  loop.quit();
}

win.connect("close-request", onCloseRequest);

// win.set_decorated(false);
builder.add_from_file("./ui/general.ui");
builder.add_from_file("./ui/appearance.ui");
builder.add_from_file("./ui/tweaks.ui");
builder.add_from_file("./ui/others.ui");
builder.add_from_file("./ui/menu.ui");

win.add(builder.get_object("general"));
win.add(builder.get_object("appearance"));
win.add(builder.get_object("tweaks"));
win.add(builder.get_object("others"));

let headerbar = find(win, "AdwHeaderBar");
if (headerbar) {
  headerbar.pack_start(builder.get_object("info_menu"));
}

dump(win, 0);

let provider = new Gtk.CssProvider();
provider.load_from_path("style.css");
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  provider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
);

// Show the window
win.present();
win.set_child(null);

// Control will end here and wait for an event to occur
// (like a key press or mouse event)
// The main loop will run until loop.quit is called.
loop.run();

log("The main loop has completed.");
