import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';

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
import { Extension } from './lib/extensionInterface.js';

import './lib/environment.js';

// Initialize Gtk before you start calling anything from the import
Gtk.init();

const App = GObject.registerClass(
  {
    Signals: {
      ready: {},
    },
  },
  class App extends Extension {
    quit() {
      loop.quit();
    }
  },
);

globalThis.Main = {
  app: new App(),

  // timers
  timer: new Timer('loop timer'),
  loTimer: new Timer('lo-res  timer'),
  hiTimer: new Timer('hi-res timer'),

  // ui
  dock: new Dock({ name: 'Dock' }),
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
  userSettings: {},

  // imports
  imports: {
    Extension,
  },
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
    console.log(moduleName);
    const module = await import(moduleName);
    console.log(`loaded ${moduleName}`);
    return module;
  } catch (error) {
    console.error(`Error loading module ${moduleName}:`, error);
  }
}

function loadExtensions(directoryPath) {
  let promises = [];
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

        let p = new Promise((resolve, reject) => {
          (async () => {
            let Extension = await loadModule(extensionFilePath);
            if (Extension) {
              let extension = new Extension.default();
              Main.extensions[fileName] = extension;
              extension.path = extensionPath;
              try {
                extension.enable();
                cssSources.push({ name: fileName, path: extensionCssFilePath });
                resolve(extension);
              } catch (err) {
                reject(err);
                console.log(err);
              }
            }
            return Extension;
          })();
        });
        promises.push(p);
      }
    }
  } catch (error) {
    print(`Error enumerating files: ${error.message}`);
  }

  return promises;
}

function loadCustomSettings() {
  try {
    let file_path = `${GLib.getenv('HOME')}/.config/gws/settings.json`;
    let fn = Gio.File.new_for_path(file_path);
    if (fn.query_exists(null)) {
      const [success, contents] = fn.load_contents(null);
      const decoder = new TextDecoder();
      let contentsString = decoder.decode(contents);
      let json = JSON.parse(contentsString);
      Main.userSettings = json;
      console.log(Main.userSettings);
    }
  } catch (err) {
    console.log(err);
  }
}

loadCustomSettings();

let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
iconTheme.add_search_path(`./ui/icons`);

let cssSources = [];
let promisedExtensions = [
  ...loadExtensions('./extensions'),
  ...loadExtensions('./user-extensions'),
];
Promise.all().then((res) => {
  cssSources.push({
    name: 'user',
    path: `${GLib.getenv('HOME')}/.config/gws/style.css`,
  });
  cssSources.forEach((style) => {
    Main.style.loadCssFile(style.name, style.path);
  });
  Main.app.emit('ready');
});

let loop = GLib.MainLoop.new(null, false);
loop.run();
