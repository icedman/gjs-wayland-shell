import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

const BUS_NAME = 'org.freedesktop.ScreenSaver';
const OBJECT_PATH = '/org/freedesktop/ScreenSaver';
const ACTIVE_ICON = 'caffeine-on';
const INACTIVE_ICON = 'caffeine-off';
// const ACTIVE_ICON = 'caffeine-cup-full';
// const INACTIVE_ICON = 'caffeine-cup-empty';

const GTK_APPLICATION_INHIBIT_IDLE = 8;

const InhibitorInterface = `
  <node>
  <interface name="org.freedesktop.ScreenSaver">
    <method name="Inhibit">
      <arg name="application_name" type="s" direction="in"/>
      <arg name="reason_for_inhibit" type="s" direction="in"/>
      <arg name="cookie" type="u" direction="out"/>
    </method>
    <method name="UnInhibit">
      <arg name="cookie" type="u" direction="in"/>
    </method>
  </interface>
  </node>
  `;

const Inhibitor = GObject.registerClass(
  {
    Signals: {
      'inhibitor-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Inhibitor extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      super.enable();
      this.state = {
        active: false,
        icon: INACTIVE_ICON,
      };
      this._cookie = null;

      // const InhibitorProxy = Gio.DBusProxy.makeProxyWrapper(InhibitorInterface);
      // this._proxy = new InhibitorProxy(
      //   Gio.DBus.session,
      //   BUS_NAME,
      //   OBJECT_PATH,
      //   (proxy, error) => {
      //     if (error) console.error(error.message);
      //     // console.log(
      //     else
      //       this._proxy.connect('g-properties-changed', () => this.sync()),
      //         // );
      //         this.sync();
      //   },
      // );
    }

    disable() {
      this.uninhibit();
      this._proxy = null;
      super.disable();
    }

    sync() {
      this.state = {
        active: this._cookie != null,
        cookie: this._cookie,
      };
      this.state.icon = this.state.active ? ACTIVE_ICON : INACTIVE_ICON;

      // todo ... check for other inhibitors

      this.emit('inhibitor-update', this);
    }

    // Inhibit the screensaver
    inhibit(window, reason = 'by user request') {
      if (this._cookie) return;
      if (!window) {
        if (Main.panel.window && Main.panel.window.visible) {
          window = Main.panel.window;
        }
        if (!window && Main.dock.window && Main.dock.window.visible) {
          window = Main.dock.window;
        }
      }
      this._cookie = Main.app.inhibit(
        window,
        GTK_APPLICATION_INHIBIT_IDLE,
        reason,
      );
      console.log('Inhibited with cookie:', this._cookie);

      // this._proxy.call(
      //   'Inhibit',
      //   new GLib.Variant('(ss)', [applicationName, reason]),
      //   Gio.DBusCallFlags.NONE,
      //   -1, // Timeout (-1 for default)
      //   null, // No cancellable
      //   (proxy, result) => {
      //     try {
      //       const response = proxy.call_finish(result);
      //       this._cookie = response.deep_unpack(); // This is the inhibition cookie (uint32)
      //       this.sync();
      //       console.log('Inhibited with cookie:', this._cookie);
      //     } catch (e) {
      //       console.error('Inhibit failed:', e.message);
      //     }
      //   },
      // );

      this.sync();
      return this._cookie;
    }

    uninhibit() {
      if (!this._cookie) return;
      Main.app.uninhibit(this._cookie);
      this._cookie = null;
      this.sync();

      // this._proxy.call(
      //   'UnInhibit',
      //   new GLib.Variant('(u)', [this._cookie]), // (u) is the type for uint32
      //   Gio.DBusCallFlags.NONE,
      //   -1, // Timeout (-1 for default)
      //   null, // No cancellable
      //   (proxy, result) => {
      //     try {
      //       // Call completed successfully, you can handle any return value if necessary
      //       proxy.call_finish(result);
      //       this._cookie = null;
      //       this.sync();
      //       console.log('Successfully uninhibited');
      //     } catch (e) {
      //       console.error('UnInhibit failed:', e.message);
      //     }
      //   },
      // );
    }

    toggle() {
      if (this._cookie) {
        this.uninhibit();
      } else {
        this.inhibit();
      }
    }
  },
);

export default Inhibitor;
