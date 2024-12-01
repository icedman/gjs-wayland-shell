import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import '../src/lib/environment.js';

Gtk.init();

const settings = new Gio.Settings({ schema: 'com.github.icedman.gws' });
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
  let s = '';
  for (let i = 0; i < l; i++) {
    s += ' ';
  }
  if (n.get_name()) n.add_css_class(n.get_name().toLowerCase());
  print(
    `${s}${n.get_name()} ${n.get_css_classes()} [${n.title || n.label || n.icon_name || ''}]`,
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
  name: 'Preferences',
  title: 'Preferences',
  default_width: 600,
  default_height: 650,
});

win.add_css_class(
  settingsGtk.gtk_application_prefer_dark_theme ? 'dark' : 'light',
);

let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
let UIFolderPath = `./ui`;
iconTheme.add_search_path(`${UIFolderPath}/icons`);

// This is a callback function
function onCloseRequest() {
  log('close-request emitted');
  loop.quit();
}

win.connect('close-request', onCloseRequest);

// win.set_decorated(false);
builder.add_from_file('./ui/general.ui');
builder.add_from_file('./ui/appearance.ui');
builder.add_from_file('./ui/tweaks.ui');
builder.add_from_file('./ui/others.ui');
builder.add_from_file('./ui/menu.ui');

win.add(builder.get_object('general'));
win.add(builder.get_object('appearance'));
// win.add(builder.get_object('tweaks'));
// win.add(builder.get_object('others'));

let headerbar = find(win, 'AdwHeaderBar');
if (headerbar) {
  headerbar.pack_start(builder.get_object('info_menu'));
}

// setup menu actions
const actionGroup = new Gio.SimpleActionGroup();
win.insert_action_group('prefs', actionGroup);

// a list of actions with their associated link
const actions = [
  {
    name: 'open-bug-report',
    link: 'https://github.com/icedman/gjs-wayland-shell/issues',
  },
  {
    name: 'open-readme',
    link: 'https://github.com/icedman/gjs-wayland-shell',
  },
  {
    name: 'open-buy-coffee',
    link: 'https://www.buymeacoffee.com/icedman',
  },
  {
    name: 'open-license',
    link: 'https://github.com/icedman/gjs-wayland-shell/blob/master/LICENSE',
  },
];

actions.forEach((action) => {
  let act = new Gio.SimpleAction({ name: action.name });
  act.connect('activate', (_) => {
    Gtk.show_uri(win, action.link, Gdk.CURRENT_TIME);
  });
  actionGroup.add_action(act);
});

// required for now ... to setup classNames
dump(win, 0);

let provider = new Gtk.CssProvider();
provider.load_from_path('style.css');
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  provider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
);

function show_preference_group(widget) {
  widget.set_visible(true);
  if (widget.get_name() == 'AdwPreferencesGroup') {
    return;
  }
  if (widget.get_parent()) {
    show_preference_group(widget.get_parent());
  }
}

// load settings
{
  let keys = settings.list_keys();
  keys.forEach((k) => {
    let widget = builder.get_object(k);
    if (!widget) {
      return;
    }

    console.log(k);

    show_preference_group(widget);

    let value = settings.getSetting(k);
    let widgetType = widget.get_name();
    switch (widgetType) {
      case 'GtkDropDown':
        widget.set_selected(value);
        widget.connect('notify::selected-item', (w) => {
          let index = w.get_selected();
          settings.set_int(k, index);
        });
        break;
      case 'GtkScale':
        widget.set_value(value);
        widget.connect('value-changed', (w) => {
          let value = w.get_value();
          settings.set_double(k, value);
        });
        break;
      case 'GtkSwitch':
        widget.set_active(value);
        widget.connect('state-set', (w) => {
          let value = w.get_active();
          settings.set_boolean(k, value);
        });
        break;
      case 'GtkColorButton':
        widget.set_rgba(
          new Gdk.RGBA({
            red: value[0],
            green: value[1],
            blue: value[2],
            alpha: value[3],
          }),
        );
        widget.connect('color-set', (w) => {
          let rgba = w.get_rgba();
          let value = new GLib.Variant('(dddd)', [
            rgba.red,
            rgba.green,
            rgba.blue,
            rgba.alpha,
          ]);
          settings.set_value(k, value);
        });
        break;
      default:
        console.log(widgetType);
        break;
    }
  });
}

// Show the window
win.present();

// Control will end here and wait for an event to occur
// (like a key press or mouse event)
// The main loop will run until loop.quit is called.
loop.run();

log('The main loop has completed.');
