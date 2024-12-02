import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Dock from './dock.js';
import Panel from './panel.js';
import Power from './lib/power.js';
import Brightness from './lib/brightness.js';
import Network from './lib/network.js';
import { Volume, Mic } from './lib/volume.js';
import Trash from './lib/trash.js';
import Timer from './lib/timer.js';
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
];

// Initialize Gtk before you start calling anything from the import
Gtk.init();

function loadStyle(path) {
  let provider = new Gtk.CssProvider();
  try {
    provider.load_from_path(path);
  } catch (e) {
    // quietly fail
    // logError(e, 'Failed to add application style');
  }
  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );
}

const cssSources = [
  './style.css',
  `${GLib.getenv('HOME')}/.config/gws/style.css`,
];
cssSources.forEach((path) => {
  loadStyle(path);
});

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

  // services
  shell: new ShellService(),
  power: new Power(),
  brightness: new Brightness(),
  network: new Network(),
  volume: new Volume(),
  mic: new Mic(),
  trash: new Trash(),

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
  Main.power,
  Main.brightness,
  Main.network,
  Main.volume,
  Main.mic,
  Main.trash,
  Main.panel,
  Main.dock,
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
    console.log(directory);

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
        let extensionFilePath = GLib.build_filenamev([
          directoryPath,
          fileName,
          'extension.js',
        ]);

        let extensionCssFilePath = GLib.build_filenamev([
          directoryPath,
          fileName,
          'style.css',
        ]);

        (async () => {
          console.log(extensionFilePath);
          let Extension = await loadModule(extensionFilePath);
          if (Extension) {
            let extension = new Extension.default();
            Main.extensions[fileName] = extension;
            // check if enabled in settings?
            extension.enable();
            loadStyle(extensionCssFilePath);
          }
        })();
      }
    }
  } catch (error) {
    print(`Error enumerating files: ${error.message}`);
  }
}

loadExtensions('./extensions');

let loop = GLib.MainLoop.new(null, false);
loop.run();
