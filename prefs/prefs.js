import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import Adw from "gi://Adw";

// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2008 litl, LLC

// Initialize Gtk before you start calling anything from the import
Gtk.init();

const settings = Gtk.Settings.get_default();
settings.gtk_application_prefer_dark_theme = true;

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
	if (n.get_name())
	  n.add_css_class(n.get_name().toLowerCase());
  print(`${s}${n.get_name()} ${n.get_css_classes()}`);
  let c = n.get_first_child();
  while (c) {
    dump(c, l + 1);
    c = c.get_next_sibling();
  }
}

let builder = new Gtk.Builder();
const AdwPreferencesPage = Adw.PreferencesPage;

builder.add_from_file("./ui/general.ui");
builder.add_from_file("./ui/others.ui");
builder.add_from_file("./ui/menu.ui");

// If you are not using GtkApplication which has its own mainloop
// you must create it yourself, see gtk-application.js example
let loop = GLib.MainLoop.new(null, false);

// Construct a window
// let win = new Gtk.Window({
let win = new Adw.PreferencesWindow({
  name: "windowA",
  title: "A default title",
  default_width: 300,
  default_height: 250,
});

let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
let UIFolderPath = `./ui`;
iconTheme.add_search_path(`${UIFolderPath}/icons`);

// Object properties can also be set or changed after construction, unless they
// are marked construct-only.
win.title = "Hello World!";

// This is a callback function
function onCloseRequest() {
  log("close-request emitted");
  loop.quit();
}

// When the window is given the "close-request" signal (this is given by the
// window manager, usually by the "close" option, or on the titlebar), we ask
// it to call the onCloseRequest() function as defined above.
win.connect("close-request", onCloseRequest);

// Create a button to close the window
let button = new Gtk.Button({
  name: "buttonA",
  label: "Close the Window",
  // An example of how constants are mapped:
  //     'Gtk' and 'Align' are taken from the GtkAlign enum,
  //     'CENTER' from the constant GTK_ALIGN_CENTER
  valign: Gtk.Align.CENTER,
  halign: Gtk.Align.CENTER,
});

// button.set_name('buttonA');

// Connect to the 'clicked' signal, using another way to call an arrow function
// button.connect('clicked', () => win.close());

// Add the button to the window
// win.set_child(button);
// win.set_decorated(false);

win.add(builder.get_object("general"));
win.add(builder.get_object("others"));

let headerbar = find(win, 'AdwHeaderBar');
if (headerbar) {
	headerbar.pack_start(builder.get_object('info_menu'));
}


dump(win, 0);


let provider = new Gtk.CssProvider();
provider.load_from_path("prefs.css");
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  provider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
);

// Show the window
win.present();

// Control will end here and wait for an event to occur
// (like a key press or mouse event)
// The main loop will run until loop.quit is called.
loop.run();

log("The main loop has completed.");
