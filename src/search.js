import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { Extension } from './lib/extensionInterface.js';
import { getAppInfo, getAppInfoFromFile } from './lib/appInfo.js';

const Search = GObject.registerClass(
  class Search extends Extension {
    _init(params) {
      this.name = params?.name ?? 'Search';
      delete params?.name;
      super._init({
        ...(params ?? {}),
      });
    }

    enable() {
      this.load_settings();

      this.window = new Gtk.Window({
        title: this.name,
        name: this.name,
        hexpand: true,
        vexpand: true,
        default_width: 200,
        default_height: 200,
      });

      LayerShell.init_for_window(this.window);
      LayerShell.set_layer(this.window, LayerShell.Layer.OVERLAY);

      if (Main?.dbus) {
        Main.dbus.connectObject('request-search', this.show.bind(this), this);
      }

      super.enable();
    }

    disable() {
      if (Main?.dbus) {
        Main.dbus.disconnectObject(this);
      }
      this.window.destroy();
      this.window = null;
      super.disable();
    }

    load_settings() {}

    show() {
      LayerShell.set_layer(this.window, LayerShell.Layer.OVERLAY);
      this.window.present();
      this.window.show();
    }

    hide() {
      this.window.hide();
    }
  },
);

export default Search;
