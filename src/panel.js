import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { Extension } from './lib/extensionInterface.js';

import { DockPanel } from './lib/dock.js';
import { DockItem, DockAppItem, PanelItem } from './lib/dockItem.js';
import { getIconInfo } from './lib/iconInfo.js';

const Panel = GObject.registerClass(
  class Panel extends Extension {
    _init(params) {
      this.name = params?.name ?? 'Panel';
      delete params?.name;

      super._init({
        ...params,
      });
    }

    enable() {
      this.load_settings();

      this.window = new DockPanel({
        title: this.name,
        name: this.name,
        hexpand: true,
        vexpand: true,
        default_width: 20,
        default_height: 20,
      });

      this.container = this.window.container;
      this.lead = this.window.lead;
      this.trail = this.window.trail;
      this.center = this.window.center;

      // this.container.set_homogeneous(true);

      this.window.present();
      this.window.update_layout();

      super.enable();
    }

    disable() {
      this.window.destroy();
      this.window = null;
      super.disable();
    }

    create_panel(params) {
      let p = new Panel(params);
      return p;
    }

    create_panelitem() {
      return new PanelItem();
    }
  },
);

export default Panel;
