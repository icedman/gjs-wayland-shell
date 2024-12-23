import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

const BUS_NAME = 'org.freedesktop.login1';
const OBJECT_PATH = '/org/freedesktop/login1';
const ACTIVE_ICON = 'caffeine-on';
const INACTIVE_ICON = 'caffeine-off';

const Login1Interface = `
<node>
  <interface name="org.freedesktop.login1.Manager">
    <method name="Suspend">
      <arg type="b" direction="in"/>
    </method>
    <method name="CanSuspend">
      <arg type="s" direction="out"/>
    </method>
    <method name="Inhibit">
      <arg type="s" direction="in"/>
      <arg type="s" direction="in"/>
      <arg type="s" direction="in"/>
      <arg type="s" direction="in"/>
      <arg type="h" direction="out"/>
    </method>
    <method name="GetSession">
      <arg type="s" direction="in"/>
      <arg type="o" direction="out"/>
    </method>
    <method name="ListSessions">
      <arg name="sessions" type="a(susso)" direction="out"/>
    </method>
    <method name="CanRebootToBootLoaderMenu">
      <arg type="s" direction="out"/>
    </method>
    <method name="SetRebootToBootLoaderMenu">
      <arg type="t" direction="in"/>
    </method>
    <signal name="PrepareForSleep">
      <arg type="b" direction="out"/>
    </signal>
  </interface>
</node>
  `;

const Login1 = GObject.registerClass(
  {
    Signals: {
      'login1-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Login1 extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      super.enable();

      const Login1Proxy = Gio.DBusProxy.makeProxyWrapper(Login1Interface);
      try {
        this._proxy = new Login1Proxy(
          Gio.DBus.system,
          BUS_NAME,
          OBJECT_PATH,
          (proxy, error) => {
            if (error) console.error(error.message);
            else this._proxy.connect('g-properties-changed', () => this.sync());
            this.sync();
          },
        );

        this._proxy.connectSignal('PrepareForSleep', () => {
          console.log('PrepareForSleep');
          // Main.inhibitor.uninhibit();
        });
      } catch (err) {
        console.log(err);
      }
    }

    disable() {
      super.disable();
    }

    sync() {
      this.emit('login1-update', this);
    }
  },
);

export default Login1;
