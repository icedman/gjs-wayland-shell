import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import { Extension } from '../lib/extensionInterface.js';

import {
  connectToSocket,
  disconnectSocket,
  sendMessage,
  receiveMessage,
  BYTES_NUM,
} from '../lib/ipc.js';

const ShellInterface = GObject.registerClass(
  {
    Signals: {
      'windows-update': {},
      'window-opened': {}, // param_types: [ GObject.TYPE_STRING ]},
      'window-focused': {}, // param_types: [ GObject.TYPE_STRING ]},
      'window-closed': {}, // param_types: [ GObject.TYPE_STRING ]},
    },
  },
  class ShellInterface extends Extension {
    enable() {
      super.enable();
      this.windows = [];
      this.focusIndex = 0;
      this.verbose = false;

      this.queueGetWindows();
    }

    disable() {
      super.disable();
    }

    onWindowsUpdated(evt) {
      this._log('onWindowsUpdated');
      this._log(evt);
      this.emit('windows-update');
    }

    _log(msg) {
      if (!this.verbose) return;
      console.log(msg);
    }

    _appendNewWindow(window) {
      let newWindow = false;
      let oldWindow = this.windows.find((w) => {
        return w.id == window['id'];
      });
      if (!oldWindow) {
        newWindow = window;
      }
      if (newWindow) {
        if (!newWindow['app_id']) {
          // if data is bare... fetch all windows
          this.queueGetWindows();
          return;
        } else {
          this.windows = [...this.windows, newWindow];
          this.normalizeWindows();
        }
        this.emit('windows-update');
        return true;
      }
      return false;
    }

    onWindowFocused(evt) {
      this._log('onWindowFocused');
      this._log(evt);

      if (this._appendNewWindow(evt['window'])) {
        return;
      }
      this.emit('window-focused');
    }

    onWindowOpened(evt) {
      this._log('onWindowOpened');
      this._log(evt);

      if (this._appendNewWindow(evt['window'])) {
        // return;
      }

      // update
      this.windows = this.windows.filter((w) => {
        return w.id != evt['window']['id'];
      });

      this.windows = [...this.windows, this.normalizeWindow(evt['window'])];
      this.emit('windows-update');
      this.emit('window-opened');
    }

    onWindowClosed(evt) {
      this._log('onWindowClosed');
      this._log(evt);

      this.windows = this.windows.filter((w) => {
        return w.id != evt['window']['id'];
      });

      this.emit('windows-update');
      this.emit('window-closed');
    }

    queueGetWindows() {
      this._queueGetWindowSeq = Main.loTimer?.debounce(
        Main.loTimer,
        () => {
          try {
            this.getWindows();
          } catch (err) {
            // oops!?
            console.log(err);
          }
        },
        1500,
        this._queueGetWindowSeq,
      );
    }

    normalizeWindow(w) {
      /*
      {
        id: XXX,          // unique identifier,
        app_id: 'kitty',  // without .desktop suffix,
        title: 'title',       // optional
        class: 'windowClass', // optional
      }
      */
      return w;
    }

    normalizeWindows(target = null) {
      // fragmentation at its best (this will become unmanagable! .. find a better way)
      if (!target) {
        target = this.windows;
      }
      target.forEach((w) => {
        this.normalizeWindow(w);
      });
    }

    connect() {
      return null;
    }

    disconnect(connection) {
      connection.close(null);
    }

    async broadcast(msg) {
      msg.forEach((m) => {
        let eventType = m.event;
        switch (eventType) {
          case 'window-opened':
            this.onWindowOpened(m);
            break;
          case 'window-closed':
            this.onWindowClosed(m);
            break;
          case 'window-focused':
            this.onWindowFocused(m);
            break;
          case 'windows-update':
            this.onWindowsUpdated(m);
            break;
          default:
            // console.log('unhandled ' + eventType);
            break;
        }
      });
    }

    async listen(connection, msg) {
      if (msg) {
        await sendMessage(connection, msg);
        let response = await receiveMessage(connection);
        // console.log(response);
      }

      let inputStream = connection.get_input_stream();
      if (!inputStream) {
        logError(new Error('Failed to get input stream.'));
        return false;
      }

      const _parseMessage = this.parseMessage.bind(this);
      const _broadcast = this.broadcast.bind(this);
      const awaitIncoming = () => {
        try {
          inputStream.read_bytes_async(
            BYTES_NUM,
            GLib.PRIORITY_DEFAULT,
            null,
            (source, result) => {
              // console.log('incoming...');

              let bytes = source.read_bytes_finish(result);
              let response = String.fromCharCode.apply(null, bytes.get_data());

              try {
                let lines = response.split(/\r?\n/);
                lines.forEach((line) => {
                  line = line.trim();
                  if (line == '') return;
                  _broadcast(_parseMessage(line));
                });
              } catch (err) {
                console.log(response);
                console.log(err);
              }

              awaitIncoming();
            },
          );
        } catch (error) {
          logError(error, 'Error starting read_async');
        }
      };

      awaitIncoming();
      return true;
    }

    parseMessage(msg) {
      return msg;
    }

    async getWindows() {}
    async focusWindow(id) {}

    async focusOrSpawn(className, cmd, arg = '', modifiers = {}) {
      let openedWindow = null;
      try {
        let openedWindows = (this.windows ?? []).filter((w) => {
          return w['app_id'] + '.desktop' == className;
        });
        if (openedWindows && openedWindows.length) {
          this.focusIndex = this.focusIndex % openedWindows.length;
          openedWindow = openedWindows[this.focusIndex++];
        }
      } catch (err) {
        console.log(err);
        return Promise.reject(err);
      }

      if (!openedWindow) {
        // || modifiers[Gdk.KEY_Control_L]) {
        this.spawn(cmd, arg);
        return Promise.resolve(0);
      } else {
        this.focusWindow(openedWindow);
        return Promise.resolve(1);
      }
    }

    async spawn(cmd, arg = '') {
      cmd = cmd.replace('%U', arg);
      cmd = cmd.replace('%u', arg);
      try {
        // Get the full environment from the current process
        const environment = GLib.get_environ().filter((e) => {
          // except this... LD_PRELOAD
          return !e.includes('libgtk4-layer-shell');
        });

        // console.log(environment);
        const [_, args] = GLib.shell_parse_argv(`${cmd}`);

        // Spawn a process inheriting the full environment
        const [success, pid] = GLib.spawn_async_with_pipes(
          null, // Working directory (null = inherit current)
          args, // Command to execute
          environment, // Pass inherited environment
          GLib.SpawnFlags.SEARCH_PATH, // Use PATH to locate the executable
          null, // Child setup function (not needed here)
        );

        if (success) {
          print(`Spawned process with PID: ${pid}`);
        } else {
          print('Failed to spawn process.');
        }
      } catch (e) {
        logError(e, 'Error spawning process');
      }
    }

    currentWindows(filter = null) {
      let windows = this.windows;
      if (filter) {
        let keys = Object.keys(filter);
        windows = windows.filter((w) => {
          for (let i; keys.length; i++) {
            if (w[k] != filter[k]) return false;
          }
          return true;
        });
      }
      windows = windows.map((w) => ({
        id: w.id,
        app_id: w.app_id,
        title: w.title,
      }));

      return windows;
    }
  },
);

export { ShellInterface };
