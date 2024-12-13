import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

const BUS_NAME = 'com.github.icedman.gws.controller';
const OBJECT_PATH = '/com/github/icedman/gws/controller';

const DBusServiceInterface = `
<node>
  <interface name="${BUS_NAME}">
    <method name="show_search"/>
    <method name="show_console"/>
    <method name="key_down">
      <arg name="application_name" type="s" direction="in"/>
    </method>
    <method name="key_up">
      <arg name="application_name" type="s" direction="in"/>
    </method>
  </interface>
</node>`;

const DBus = GObject.registerClass(
  {
    Signals: {
      'request-search': {},
      'request-console': {},
    },
  },
  class DBus extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      try {
        this.dbus = Gio.DBusExportedObject.wrapJSObject(
          DBusServiceInterface,
          this,
        );

        let flags = Gio.BusNameOwnerFlags.NONE; // ALLOW_REPLACEMENT;
        Gio.DBus.own_name(
          Gio.BusType.SESSION,
          BUS_NAME,
          flags,
          () => {
            this.dbus.export(Gio.DBus.session, OBJECT_PATH);
          },
          null,
          () => {
            this.dbus.unexport();
            this.dbus = null;
          },
        );
      } catch (err) {
        console.log(err);
      }
      super.enable();
    }

    disable() {
      if (this.dbus) {
        this.dbus.unexport();
        this.dbus = null;
      }
      super.disable();
    }

    show_search() {
      this.emit('request-search');
    }

    show_console() {
      this.emit('request-console');
    }

    key_down(key) {
      console.log(key);
    }

    key_up(key) {}
  },
);

export default DBus;

// gdbus call --session --dest=com.github.icedman.gws.controller \
//            --object-path=/com/github/icedman/gws/controller \
//            --method=com.github.icedman.gws.controller.show_search
