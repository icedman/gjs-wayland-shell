import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { Extension } from './lib/extensionInterface.js';

import { DockPanel } from './dock.js';

const PanelItem = GObject.registerClass(
  class PanelItem extends Gtk.Box {
    _init(params) {
      this.sort_order = params?.sort_order ?? 0;
      delete params?.sort_order;

      super._init({
        name: 'PanelItem',
        ...(params ?? {}),
      });

      this.icon = new Gtk.Image();
      this.icon.add_css_class('icon');
      this.icon.set_visible(false);
      this.append(this.icon);
      this.label = new Gtk.Label();
      this.label.add_css_class('label');
      this.label.set_visible(false);
      this.append(this.label);
    }

    set_label(label) {
      this.label.set_label(label);
      this.label.set_visible(label);
    }

    set_icon(icon) {
      this.icon.set_visible(icon);
      if (icon && icon.startsWith('/')) {
        this.icon.set_from_file(icon);
      } else {
        this.icon.set_from_icon_name(icon);
      }
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
        name: 'Bar',
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

      this.window.add_css_class('startup');
      this.window.present();
      this.window.update_layout();

      Main.hiTimer.runOnce(() => {
        this.window.remove_css_class('startup');
      }, 0);

      super.enable();
    }

    disable() {
      this.window.destroy();
      this.window = null;
      super.disable();
    }
  },
);

Panel.prototype.PanelItem = PanelItem;

export default Panel;
