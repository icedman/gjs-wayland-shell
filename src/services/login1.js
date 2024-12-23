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
      'inhibitor-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Login1 extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      super.enable();
      this.state = {
        active: false,
        icon: INACTIVE_ICON,
      };
      this._inhibitorFd = null;

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
      this.state = {
        active: this._inhibitorFd != null,
        cookie: this._inhibitorFd,
      };
      this.state.icon = this.state.active ? ACTIVE_ICON : INACTIVE_ICON;
      this.emit('login1-update', this);
      this.emit('inhibitor-update', this);
    }

    inhibit(
      what = 'idle',
      who = 'gws',
      why = 'user asked to prevent sleep',
      mode = 'block',
    ) {
      this._proxy.InhibitRemote(what, who, why, mode, (fd, error) => {
        if (error) {
          console.error('Error adding inhibitor:', error.message);
          return;
        }
        console.log('Inhibitor added with FD:', fd);
        this._inhibitorFd = fd; // Store the file descriptor
        this.state.active = true;
        this.state.icon = ACTIVE_ICON;
        this.emit('inhibitor-update', this);
      });
    }

    uninhibit() {
      if (this._inhibitorFd !== null) {
        try {
          // Close the file descriptor
          // const stream = new Gio.UnixInputStream({ fd: this._inhibitorFd, close_fd: true });
          // stream.close(null); // Close the stream and release the inhibitor
          GLib.close(this._inhibitorFd[0]);
          console.log('Inhibitor removed successfully.');
          this._inhibitorFd = null;
          this.state.active = false;
          this.state.icon = INACTIVE_ICON;
          this.emit('inhibitor-update', this);
        } catch (e) {
          console.error('Error removing inhibitor:', e.message);
        }
      } else {
        console.log('No active inhibitor to remove.');
      }
    }

    toggle() {
      if (this._inhibitorFd) {
        this.uninhibit();
      } else {
        this.inhibit();
      }
    }
  },
);

export default Login1;
