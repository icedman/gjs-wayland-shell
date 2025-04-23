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

function loadGsdPower() {
  if (isGsdPowerRunning()) return true;
  let pp = [
    '/usr/libexec/gsd-power',
    '/usr/lib64/gsd-power',
    '/usr/lib/gsd-power',
  ];
  for (let i = 0; i < pp.length; i++) {
    let exec = pp[i];
    let fn = Gio.File.new_for_path(exec);
    if (!fn.query_exists(null)) continue;
    try {
      GLib.spawn_command_line_async(exec);
      print('gsd-power started successfully.');
      break;
    } catch (e) {
      // logError(e, 'Failed to start gsd-power');
    }
  }
  return false;
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
      this.isGsdPowerRunning = isGsdPowerRunning;
      this.loadGsdPower = loadGsdPower;
    }

    async enable() {
      super.enable();
      this.state = {
        icon: 'display-brightness-symbolic',
        icon_index: 0
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

      this.retry = 0;
    }

    disable() {
      super.disable();
      this._proxy = null;
      if (this.gsdSeq) {
        Main.loTimer.cancel(this.gsdSeq);
        this.gsdSeq = null;
      }
    }

    sync() {
      if (!this.enabled) return;
      console.log('syncing...');
      const brightness = this._proxy.Brightness;
      const visible = Number.isInteger(brightness) && brightness >= 0;

      this.state = {
        brightness,
        visible,
        icon: 'display-brightness-symbolic',
      };

      this.emit('brightness-update', this);
    }
  },
);

export default Brightness;
