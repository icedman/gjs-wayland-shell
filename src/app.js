'use strict';

import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

const SETTINGS_PATH = `${GLib.getenv('HOME')}/.config/gws/settings.json`;

// load and init extensions
async function loadModule(moduleName) {
  try {
    const module = await import(moduleName);
    console.log(`loaded ${moduleName}`);
    return module;
  } catch (error) {
    console.error(`Error loading module ${moduleName}:`, error);
  }
}

const App = GObject.registerClass(
  {
    Signals: {
      'modules-loaded': {},
      ready: {},
    },
  },
  class App extends Gtk.Application {
    _init(params) {
      super._init(params);

      this.connect('activate', () => {
        this.appWindow = new Gtk.ApplicationWindow({
          application: this,
          title: 'Preferences',
          default_width: 400,
          default_height: 300,
        });
      });

      let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
      iconTheme.add_search_path(`./ui/icons`);
    }

    async init(main) {
      this.initTimers();
      this.loadCustomSettings();

      const file = Gio.File.new_for_path(SETTINGS_PATH);
      // Create a file monitor for the file
      this.monitor = file.monitor(Gio.FileMonitorFlags.CHANGES_ONLY, null);

      // Connect the callback to monitor the file for changes
      this.monitor.connectObject(
        'changed',
        (monitor, file, otherFile, eventType) => {
          if (eventType != Gio.FileMonitorEvent.CHANGED) return;
          this.loadCustomSettings(true);
        },
        this,
      );

      this.cssSources = [];
      this.modules = [
        Main.shell,
        Main.dbus,
        Main.power,
        Main.powerProfiles,
        Main.network,
        Main.mounts,
        Main.volume,
        Main.mic,
        Main.trash,
        Main.brightness,
        Main.panel,
        Main.inhibitor,
        Main.login1,
        Main.dock,
        Main.apps,
        Main.search,
      ];

      let _loadExtensions = [
        ...this.loadExtensions('./extensions'),
        ...this.loadExtensions('./user-extensions'),
      ];

      // boot up
      Promise.all(_loadExtensions)
        .then((res) => {
          this.loadStyleSheets();
          this.emit('modules-loaded');
          this.enableModules();
          this.emit('ready');
        })
        .catch((err) => {
          console.log(err);
        });
    }

    shutdown() {}

    initTimers() {
      // init timers
      // three available timers
      // for persistent runs
      Main.timer.initialize(3500);
      // for animation runs
      // resolution (15) will be modified by animation-fps
      Main.hiTimer.initialize(15);
      // for deferred or debounced runs
      Main.loTimer.initialize(750);
    }

    loadCustomSettings(emit_update = false) {
      let prevSettings = Main.userSettings ?? {};
      try {
        let fn = Gio.File.new_for_path(SETTINGS_PATH);
        if (fn.query_exists(null)) {
          const [success, contents] = fn.load_contents(null);
          const decoder = new TextDecoder();
          let contentsString = decoder.decode(contents);
          let json = JSON.parse(contentsString);
          Main.userSettings = json;

          if (emit_update) {
            Object.keys(Main.userSettings).forEach((k) => {
              if (
                JSON.stringify(Main.userSettings[k] ?? '') !=
                JSON.stringify(prevSettings[k] ?? '')
              ) {
                Main.settings.emit(`changed::${k}`, null);
              }
            });
            Object.keys(prevSettings).forEach((k) => {
              if (!Main.userSettings[k]) {
                Main.settings.emit(`changed::${k}`, null);
              }
            });
          }
        }
      } catch (err) {
        console.log(err);
      }
    }

    loadExtensions(directoryPath) {
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

            // console.log('====================');
            // console.log(extensionFilePath);

            let p = new Promise((resolve, reject) => {
              (async () => {
                let Extension = await loadModule(extensionFilePath);
                if (Extension) {
                  let extension = new Extension.default();
                  Main.extensions[fileName] = extension;
                  extension.path = extensionPath;
                  try {
                    this.modules.push(extension);
                    this.cssSources.push({
                      name: fileName,
                      path: extensionCssFilePath,
                    });
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

    async enableModules() {
      let promises = [];
      this.modules.forEach(async (m) => {
        try {
          promises.push(m.enable());
        } catch (err) {
          console.log(m);
          console.log(err);
        }
      });
      Main.shell.listen();
      return promises;
    }

    loadStyleSheets() {
      this.cssSources.forEach((style) => {
        Main.style.loadCssFile(style.name, style.path);
      });
    }
  },
);

export default App;
