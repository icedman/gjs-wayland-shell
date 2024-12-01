import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Dock from './dock.js';
import Panel from './panel.js';
import { Power } from './lib/power.js';
import { Network } from './lib/network.js';
import { Volume, Mic } from './lib/volume.js';
import { Trash } from './lib/trash.js';
import ShellService from './shell.js';
import './lib/environment.js';

// const settingsShell = new Gio.Settings({ schema_id: 'org.gnome.shell' });
// let apps = settingsShell.get_value('favorite-apps').deepUnpack();

let apps = [
  {
    icon_name: 'view-app-grid-symbolic',
    title: 'Fuzzel',
    cmd: `fuzzel`,
  },
  'kitty.desktop',
  'org.gnome.Nautilus.desktop',
  'google-chrome.desktop',
  'org.mozilla.firefox.desktop',
  'org.gnome.Calendar.desktop',
  'org.gnome.clocks.desktop',
  'org.gnome.Software.desktop',
  'org.gnome.TextEditor.desktop',
  'trash',
];

// Initialize Gtk before you start calling anything from the import
Gtk.init();

let loop = GLib.MainLoop.new(null, false);

const cssSources = [
  './style.css',
  `${GLib.getenv('HOME')}/.config/gws/style.css`,
];
cssSources.forEach((path) => {
  let provider = new Gtk.CssProvider();
  try {
    provider.load_from_path(path);
  } catch (e) {
    logError(e, 'Failed to add application style');
  }
  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );
});

globalThis.Main = {
  app: {
    quit: () => {
      loop.quit();
    },
  },

  // extensions
  dock: new Dock({ name: 'Dock', apps }),
  panel: new Panel({ name: 'Panel' }),
  shell: new ShellService(),
  power: new Power(),
  network: new Network(),
  volume: new Volume(),
  mic: new Mic(),
  trash: new Trash(),

  // settings
  settings: new Gio.Settings({ schema: 'com.github.icedman.gws' }),
};

// init the extension
[
  Main.shell,
  Main.power,
  Main.network,
  Main.volume,
  Main.mic,
  Main.trash,
  Main.panel,
  Main.dock,
].forEach(async (m) => {
  try {
    m.init();
  } catch (err) {
    console.log(m);
    console.log(err);
  }
});

Main.shell.listen();
// setTimeout(() => {
//   Main.shell.getWindows().then((res) => {
//     console.log(Main.shell.windows);
//   });
// }, 3500);

loop.run();
