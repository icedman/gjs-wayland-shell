import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

const BUS_NAME = 'org.gnome.SettingsDaemon.Power';
const OBJECT_PATH = '/org/gnome/SettingsDaemon/Power';

const BrightnessInterface = `
  <node>
    <interface name="org.gnome.SettingsDaemon.Power.Screen">
      <property name="Brightness" type="i" access="readwrite"/>
    </interface>
  </node>
  `;

function isGsdPowerRunning() {
  try {
    let [success, output] = GLib.spawn_sync(
      null, // Working directory
      ['pgrep', '-x', 'gsd-power'], // Command to check process
      null, // Environment
      GLib.SpawnFlags.SEARCH_PATH,
      null, // Child setup
    );
    return success && output.length > 0;
  } catch (e) {
    logError(e, 'Error checking gsd-power status');
    return false;
  }
}

const Brightness = GObject.registerClass(
  {
    Signals: {
      'brightness-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Brightness extends Extension {
    _init(params) {
      super._init(params);

      // Spawn gsd-power if not running
      if (!isGsdPowerRunning()) {
        try {
          GLib.spawn_command_line_async('/usr/libexec/gsd-power');
          print('gsd-power started successfully.');
        } catch (e) {
          logError(e, 'Failed to start gsd-power');
        }
      } else {
        print('gsd-power is already running.');
      }
    }

    async enable() {
      super.enable();
      this.state = {
        icon: 'brightness-display-symbolic',
      };

      const BrightnessProxy =
        Gio.DBusProxy.makeProxyWrapper(BrightnessInterface);
      this._proxy = new BrightnessProxy(
        Gio.DBus.session,
        BUS_NAME,
        OBJECT_PATH,
        (proxy, error) => {
          if (error) console.error(error.message);
          else this._proxy.connect('g-properties-changed', () => this.sync());
          this.sync();
        },
      );
    }

    disable() {
      super.disable();
    }

    sync() {
      const brightness = this._proxy.Brightness;
      const visible = Number.isInteger(brightness) && brightness >= 0;

      this.state = {
        brightness,
        visible,
        icon: 'brightness-display-symbolic',
      };

      this.emit('brightness-update', this);
    }
  },
);

export default Brightness;
