import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

const Monitors = GObject.registerClass(
  {
    Signals: {
      'monitors-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Monitors extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      super.enable();
      this.state = {
        count: 0,
      };

      this.monitors = Gdk.Display.get_default().get_monitors();
      this.monitors.connectObject('items-changed', this.sync.bind(this), this);
      this.sync();
    }

    disable() {
      super.disable();

      if (this.monitors) {
        this.monitors.disconnectObject(this);
        this.monitors = null;
      }
    }

    getMonitor(id) {
      if (!id) {
        return this.getPrimaryMonitor();
      }
      for (let i = 0; i < this.state.count; i++) {
        let m = this.monitors.get_item(i);
        if (m.connector == id) {
          return m;
        }
      }
      return null;
    }

    getPrimaryMonitor() {
      return this.monitors.get_item(0);
    }

    sync() {
      this.state = {
        count: this.monitors.get_n_items(),
      };
      this.emit('monitors-update', this);
    }
  },
);

export default Monitors;

// m = Gdk.Display.get_default().get_monitors()
// m.get_n_items()
// m.get_item(0)
// ls.set_monitor(Main.dock.window, m1)
