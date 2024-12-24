import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { Extension } from './lib/extensionInterface.js';

import { DockPanel } from './lib/dock.js';
import { DockItem, DockAppItem } from './lib/dockItem.js';
import { getIconInfo } from './lib/iconInfo.js';

const PanelItem = GObject.registerClass(
  class PanelItem extends DockItem {
    _init(params = {}) {
      super._init({
        ...params,
        css: 'panel-item',
      });
    }
  },
);

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

      this.container.set_homogeneous(true);

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
  },
);

Panel.prototype.PanelItem = PanelItem;

export default Panel;
