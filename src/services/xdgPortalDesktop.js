import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

const BUS_NAME = 'org.freedesktop.portal.Desktop';
const OBJECT_PATH = '/org/freedesktop/portal/desktop';
const INHIBIT_INTERFACE = 'org.freedesktop.portal.Inhibit';

const ACTIVE_ICON = 'caffeine-on';
const INACTIVE_ICON = 'caffeine-off';

const InhibitProxy = Gio.DBusProxy.makeProxyWrapper(`
<node>
  <interface name="${INHIBIT_INTERFACE}">
    <method name="Inhibit">
      <arg type="s" direction="in"/> <!-- What -->
      <arg type="s" direction="in"/> <!-- Who -->
      <arg type="s" direction="in"/> <!-- Reason -->
      <arg type="u" direction="in"/> <!-- Flags -->
    </method>
  </interface>
</node>
`);

const FLAGS = {
  LOGOUT: 1,
  USER_SWITCH: 2,
  SUSPEND: 4,
  IDLE: 8,
};

const InhibitExtension = GObject.registerClass(
  {
    Signals: {
      'inhibitor-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class InhibitExtension extends Extension {
    _init(params) {
      super._init(params);
      this._proxy = null;
      this._inhibited = false;
    }

    async enable() {
      super.enable();
      try {
        this._proxy = new InhibitProxy(
          Gio.DBus.session,
          BUS_NAME,
          OBJECT_PATH,
          (proxy, error) => {
            if (error) {
              console.error('Error creating proxy:', error.message);
            } else {
              console.log('Proxy for xdg-desktop-portal Inhibit created.');
            }
          },
        );
      } catch (err) {
        console.error('Failed to create Inhibit proxy:', err);
      }
    }

    disable() {
      super.disable();
      if (this._inhibited) {
        this.uninhibit();
      }
    }

    inhibit(
      what = 'idle',
      who = 'GJS Application',
      reason = 'Preventing sleep or idle',
      flags = FLAGS.IDLE,
    ) {
      if (this._proxy) {
        try {
          this._proxy.InhibitRemote(
            what,
            who,
            reason,
            flags,
            (result, error) => {
              if (error) {
                console.error('Failed to inhibit:', error.message);
                return;
              }
              console.log('Inhibit successful:', result);
              this._inhibited = true;
              this.emit('inhibitor-update', this);
            },
          );
        } catch (e) {
          console.error('Error calling Inhibit:', e.message);
        }
      } else {
        console.warn('Proxy not available for Inhibit.');
      }
    }

    uninhibit() {
      if (this._inhibited) {
        console.log(
          'Inhibitor cannot be manually removed with xdg-desktop-portal.',
        );
        this._inhibited = false;
        this.emit('inhibitor-update', this);
      } else {
        console.warn('No active inhibitor to remove.');
      }
    }

    toggle() {
      if (this._inhibited) {
        this.uninhibit();
      } else {
        this.inhibit();
      }
    }
  },
);

export default InhibitExtension;
