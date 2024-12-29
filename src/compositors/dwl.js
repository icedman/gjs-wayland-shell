import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { WindowManagerInterface } from './wmInterface.js';

const DwlInterface = `
    <node>
      <interface name='com.dwl.DBus.Interface'>
        <method name='FocusWindow'>
          <arg type='s' name='window' direction='in'/>
          <arg type='s' name='window' direction='out'/>"
        </method>
        <method name='GetWindows'>
          <arg type='s' name='windows' direction='out'/>
        </method>
        <property name='Message' type='s' access='readwrite'/>
        <property name='Count' type='i' access='read'/>
        <signal name='WindowFocused'>
          <arg type='s' name='window' direction='out'/>
        </signal>
        <signal name='WindowOpened'>
          <arg type='s' name='window' direction='out'/>
        </signal>
        <signal name='WindowClosed'>
          <arg type='s' name='window' direction='out'/>
        </signal>
      </interface>
    </node>`;

const BUS_NAME = 'com.dwl.DBus';
const OBJECT_PATH = '/com/dwl/DBus';
// const INTERFACE_NAME = 'com.dwl.DBus.Interface';

const DwlShell = GObject.registerClass(
  class DwlShell extends WindowManagerInterface {
    _init() {
      super._init();
      this.name = 'DWL';
      this.proxy = null;
    }

    async _createProxy() {
      let p = new Promise((resolve, reject) => {
        const DwlProxy = Gio.DBusProxy.makeProxyWrapper(DwlInterface);
        this.proxy = new DwlProxy(
          Gio.DBus.session,
          BUS_NAME,
          OBJECT_PATH,
          (proxy, error) => {
            if (error) console.error(error.message);
            else {
              this.proxy.connect('g-properties-changed', () => {});
              this.proxy.connectSignal('WindowFocused', (proxy, t, window) => {
                // console.log('focus')
                let w = this.normalizeWindow(JSON.parse(window));
                this.broadcast([
                  {
                    event: 'window-focused',
                    window: w,
                  },
                ]);
                console.log(w);
              });
              this.proxy.connectSignal('WindowClosed', (proxy, t, window) => {
                // console.log('closed')
                let w = this.normalizeWindow(JSON.parse(window));
                this.broadcast([
                  {
                    event: 'window-closed',
                    window: w,
                  },
                ]);
                console.log(w);
              });
              this.proxy.connectSignal('WindowOpened', (proxy, t, window) => {
                // console.log('opened')
                let w = this.normalizeWindow(JSON.parse(window));
                this.broadcast([
                  {
                    event: 'window-opened',
                    window: w,
                  },
                ]);
                console.log(w);
              });
            }
          },
        );
      });

      return this.proxy != null && this.proxy.Message;
    }

    connect() {
      if (this.proxy) {
        return true;
      }
      if (this._createProxy()) {
        console.log(`connected to ${this.name}`);
      } else {
        console.log(`${this.name} unavailable`);
      }
      return this.proxy != null;
    }

    disconnect() {
      this.proxy = null;
    }

    parseMessage(msg) {
      return [];
    }

    async listen() {
      let connection = this.connect();
      if (!connection) {
        return;
      }

      // already listening at _createProxy
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
      return super.normalizeWindow(w);
    }

    async getWindows() {
      let connection = this.connect();
      if (!connection) {
        return;
      }

      this.proxy.call(
        'GetWindows',
        null, // (u) is the type for uint32
        Gio.DBusCallFlags.NONE,
        -1, // Timeout (-1 for default)
        null, // No cancellable
        (proxy, result) => {
          try {
            // Call completed successfully, you can handle any return value if necessary
            let response = proxy.call_finish(result).deep_unpack()[0];
            let obj = JSON.parse(response);
            this.windows = obj;
            this.normalizeWindows();
            obj = {
              event: 'windows-update',
              windows: this.windows,
              raw: obj,
            };
            this.onWindowsUpdated(obj);
          } catch (e) {
            console.error('GetWindows:', e.message);
          }
        },
      );

      return Promise.resolve(true);
    }

    async focusWindow(window) {
      try {
        if (!window || !window['id']) return;

        console.log(window);
        this.proxy.call(
          'FocusWindow',
          new GLib.Variant('(s)', [window['id']]),
          Gio.DBusCallFlags.NONE,
          -1, // Timeout (-1 for default)
          null, // No cancellable
          (proxy, result) => {
            try {
              // Call completed successfully, you can handle any return value if necessary
              let response = proxy.call_finish(result);
              console.log(response.deep_unpack());
            } catch (e) {
              console.error('FocusWindow:', e.message);
            }
          },
        );
      } catch(err) {
        console.log(err);
      }
      return Promise.resolve(true);
    }

    async spawn(cmd, arg = '') {
      return super.spawn(cmd, arg);
    }

    async exit() {
      return Promise.resolve(true);
    }
  },
);

export default DwlShell;
