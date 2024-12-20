import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import '../src/lib/environment.js';

Gtk.init();

let provider = new Gtk.CssProvider();
provider.load_from_path('style.css');
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  provider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
);

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
  // if (n.get_name()) {
  //   n.add_css_class(n.get_name().toLowerCase());
  // }
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

// win.set_decorated(false);
builder.add_from_file('./ui/window.ui');
builder.add_from_file('./ui/general.ui');
builder.add_from_file('./ui/dock.ui');
builder.add_from_file('./ui/panel.ui');
builder.add_from_file('./ui/search.ui');

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
    console.log(k);
    let widget = builder.get_object(k);
    if (!widget) {
      console.log('----no widget');
      return;
    }

    // show_preference_group(widget);

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

let win = builder.get_object('main_window');

win.add_css_class(
  settingsGtk.gtk_application_prefer_dark_theme ? 'dark' : 'light',
);

let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
let UIFolderPath = `./ui`;
iconTheme.add_search_path(`${UIFolderPath}/icons`);

win.connect('close-request', onCloseRequest);

let sidebar = builder.get_object('side_bar');
sidebar.add_css_class('background');
let header = builder.get_object('header_bar');
header.parent.add_css_class('header_bar');
let content = builder.get_object('content');
content.add_css_class('view');

class Panel {
  constructor(params) {
    this.icon = params.icon;
    this.title = params.title;
  }

  get_all_items(parent) {
    let res = [];
    let n = parent.get_first_child();
    while (n) {
      res.push(n);
      n = n.get_next_sibling();
    }
    return res;
  }

  build() {
    let builder = new Gtk.Builder();
    builder.add_from_file('./ui/panel-row.ui');
    let row = builder.get_object('panel-row');
    let name = builder.get_object('panel-name');
    let image = builder.get_object('panel-image');
    let box = builder.get_object('panel-box');
    let description = builder.get_object('panel-description');
    name.set_label(this.title);
    image.set_from_icon_name(this.icon);
    box.add_css_class('panel-box');
    row.add_css_class('panel-row');
    row.connect('clicked', () => {
      this.open();
    });

    this.row = row;
    return row;
  }

  open() {
    let items = this.get_all_items(this.row.parent);
    items.forEach((i) => {
      i.remove_css_class('active');
    });
    this.row.add_css_class('active');

    if (this.content) {
      content.set_child(null);
      content.set_child(this.content);
    }
  }
}

class GeneralPanel extends Panel {
  constructor() {
    super({
      title: 'General',
      icon: 'general-symbolic',
    });

    this.content = builder.get_object('general');
  }
}

class DockPanel extends Panel {
  constructor() {
    super({
      title: 'Dash',
      icon: 'dash-symbolic',
    });

    this.content = builder.get_object('dock');
  }
}

class BarPanel extends Panel {
  constructor() {
    super({
      title: 'Panel',
      icon: 'bottom-panel-symbolic',
    });
    this.content = builder.get_object('panel');
  }
}

class SearchPanel extends Panel {
  constructor() {
    super({
      title: 'Search',
      icon: 'pageview-symbolic',
    });
    this.content = builder.get_object('search');
  }
}

class DockItemsPanel extends Panel {
  constructor() {
    super({
      title: 'Dash Items',
      icon: 'extension-symbolic',
    });
    this.content = builder.get_object('dock-items');
  }
}

class ExtensionPanel extends Panel {
  constructor() {
    super({
      title: 'Extension',
      icon: 'extension-symbolic',
    });
  }
}

// populate
let items = builder.get_object('panel-items');
// let panelItems = [new GeneralPanel(), new DockPanel(), new BarPanel(), new ExtensionPanel()]
let panelItems = [
  new DockPanel(),
  // new DockItemsPanel(),
  new BarPanel(),
  new SearchPanel(),
];
panelItems.forEach((item) => {
  items.append(item.build());
});
panelItems[0].open();

// dump(win, 0);

// Control will end here and wait for an event to occur
// (like a key press or mouse event)
// The main loop will run until loop.quit is called.

// let app = new Gtk.Application({
//   application_id: null, // Change this to your app ID
//   flags: Gio.ApplicationFlags.FLAGS_NONE,
// });

// app.connect('activate', () => {
//   let appWindow = new Gtk.ApplicationWindow({
//     application: app,
//     title: 'Preferences',
//     default_width: 400,
//     default_height: 300,
//   });
//   // appWindow.present();
//   win.present();
// });

// app.run([]);

win.present();
function onCloseRequest() {
  log('close-request emitted');
  // app.quit();
  loop.quit();
}

// If you are not using GtkApplication which has its own mainloop
// you must create it yourself, see gtk-application.js example
let loop = GLib.MainLoop.new(null, false);
loop.run();

log('The main loop has completed.');
