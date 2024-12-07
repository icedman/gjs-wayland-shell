import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Dock from './dock.js';
import Panel from './panel.js';
import Search from './search.js';
import ShellService from './shell.js';

import Power from './services/power.js';
import Brightness from './services/brightness.js';
import Network from './services/network.js';
import Mounts from './services/mounts.js';
import { Volume, Mic } from './services/volume.js';
import Trash from './services/trash.js';
import Style from './services/style.js';
import DBus from './services/dbus.js';
import SystemApps from './services/systemApps.js';
import Timer from './lib/timer.js';

import './lib/environment.js';

const settingsShell = new Gio.Settings({ schema_id: 'org.gnome.shell' });
let favoriteApps = settingsShell.get_value('favorite-apps').deepUnpack();

let apps = [
  'kitty.desktop',
  'org.gnome.Nautilus.desktop',
  'google-chrome.desktop',
  'org.mozilla.firefox.desktop',
  'org.gnome.Calendar.desktop',
  'org.gnome.clocks.desktop',
  'org.gnome.Software.desktop',
  'org.gnome.TextEditor.desktop',
];

// Initialize Gtk before you start calling anything from the import
Gtk.init();

globalThis.Main = {
  app: {
    quit: () => {
      loop.quit();
    },
  },

  // timers
  timer: new Timer('loop timer'),
  loTimer: new Timer('lo-res  timer'),
  hiTimer: new Timer('hi-res timer'),

  // ui
  dock: new Dock({ name: 'Dock', apps }),
  panel: new Panel({ name: 'Panel' }),
  search: new Search({ name: 'Search' }),

  // services
  shell: new ShellService(),
  apps: new SystemApps(),
  dbus: new DBus(),
  power: new Power(),
  mounts: new Mounts(),
  brightness: new Brightness(),
  network: new Network(),
  volume: new Volume(),
  mic: new Mic(),
  trash: new Trash(),
  style: new Style({ initialStyles: [{ name: 'app', path: './style.css' }] }),

  // extensions
  extensions: {},

  // settings
  settings: new Gio.Settings({ schema: 'com.github.icedman.gws' }),
};

// init timers
// three available timers
// for persistent runs
Main.timer.initialize(3500);
// for animation runs
// resolution (15) will be modified by animation-fps
Main.hiTimer.initialize(15);
// for deferred or debounced runs
Main.loTimer.initialize(750);

// init the extension
[
  Main.shell,
  Main.dbus,
  Main.power,
  Main.network,
  Main.mounts,
  Main.volume,
  Main.mic,
  Main.trash,
  Main.brightness,
  Main.panel,
  Main.dock,
  Main.apps,
  Main.search,
].forEach(async (m) => {
  try {
    m.enable();
  } catch (err) {
    console.log(m);
    console.log(err);
  }
});

Main.shell.listen();

// load and init extensions
async function loadModule(moduleName) {
  try {
    const module = await import(moduleName);
    console.log(`Successfully loaded ${moduleName}`);
    return module;
  } catch (error) {
    console.error(`Error loading module ${moduleName}:`, error);
  }
}

function loadExtensions(directoryPath) {
  try {
    // Create a Gio.File object for the directory
    let directory = Gio.File.new_for_path(directoryPath);

    // Enumerate the files
    let enumerator = directory.enumerate_children(
      'standard::name,standard::type',
      Gio.FileQueryInfoFlags.NONE,
      null,
    );

    // Iterate through the files
    let info;
    while ((info = enumerator.next_file(null)) !== null) {
      let fileName = info.get_name();
      let fileType = info.get_file_type();
      if (fileType === Gio.FileType.DIRECTORY) {
        let extensionPath = GLib.build_filenamev([directoryPath, fileName]);
        let extensionFilePath = GLib.build_filenamev([
          extensionPath,
          'extension.js',
        ]);

        let extensionCssFilePath = GLib.build_filenamev([
          extensionPath,
          'style.css',
        ]);

        console.log('====================');
        console.log(extensionFilePath);
        console.log('====================');

        (async () => {
          let Extension = await loadModule(extensionFilePath);
          if (Extension) {
            let extension = new Extension.default();
            Main.extensions[fileName] = extension;
            extension.path = extensionPath;
            try {
              extension.enable();
              cssSources.push({ name: fileName, path: extensionCssFilePath });
            } catch (err) {
              console.log(err);
            }
          }
        })();
      }
    }
  } catch (error) {
    print(`Error enumerating files: ${error.message}`);
  }
}

let cssSources = [];
loadExtensions('./extensions');
cssSources.push({
  name: 'user',
  path: `${GLib.getenv('HOME')}/.config/gws/style.css`,
});
cssSources.forEach((style) => {
  Main.style.loadCssFile(style.name, style.path);
});

let loop = GLib.MainLoop.new(null, false);
loop.run();
