import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { getAppInfo, getAppInfoFromFile } from './appInfo.js';

export const PopupMenu = GObject.registerClass(
  class PopupMenu extends Gtk.Popover {
    _init(params = {}) {
      let appInfo = getAppInfo(params.app);
      let items = params.items ?? appInfo?.menu ?? [];
      delete params.app;
      delete params.items;

      super._init({
        name: 'Menu',
        has_arrow: false,
        position: 2,
        ...params,
      });

      let box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
      });
      this.box = box;
      this.set_child(box);
      this.setItems(items);
    }

    setItems(items) {
      let box = this.box;

      let children = [];
      let n = box.get_first_child();
      while (n) {
        children.push(n);
        n = n.get_next_sibling();
      }
      children.forEach((c) => {
        box.remove(c);
      });

      items.forEach((item) => {
        let button = new Gtk.Box({
          name: 'MenuItem',
          orientation: Gtk.Orientation.HORIZONTAL,
          hexpand: true,
        });

        // make this configurable
        let evt = new Gtk.GestureClick();
        // evt.set_button(3);
        evt.connect('pressed', async (actor, count) => {
          if (item.script) {
            item.script();
            this.popdown();
            return;
          }

          if (item.action == 'focus' && item.window) {
            Main.shell.focusWindow(item.window);
            this.popdown();
            return;
          }
          if (item.action == 'open') {
            Main.shell.focusOrSpawn(item.id, item.exec);
            this.popdown();
            return;
          }
          Main.shell.spawn(item.exec);
          this.popdown();
        });
        button.add_controller(evt);

        // button.icon = new Gtk.Image();
        // button.icon.add_css_class("icon");
        // button.icon.set_visible(false);
        // button.append(button.icon);

        button.label = new Gtk.Label();
        button.label.add_css_class('label');
        button.label.hexpand = true;
        button.label.halign = Gtk.Align.START;
        // button.label.set_visible(false);
        button.append(button.label);

        button.label.set_label(item.name);

        box.append(button);
      });
    }
  },
);
