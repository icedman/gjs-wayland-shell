import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

export const PopupMenu = GObject.registerClass(
  class PopupMenu extends Gtk.Popover {
    _init(params) {
      let items = params.items ?? [];
      delete params?.items;

      super._init({
        name: 'Menu',
        has_arrow: false,
        position: 2,
        ...params,
      });

      let box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
      });

      items.forEach((item) => {
        let button = new Gtk.Box({
          name: 'MenuItem',
          orientation: Gtk.Orientation.HORIZONTAL,
          hexpand: true,
        });

        let evt = new Gtk.GestureClick();
        // evt.set_button(3);
        evt.connect('pressed', (actor, count) => {
          if (item.action == 'open') {
            Main.dock.focus_or_open(item.id, item.exec);
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

      this.set_child(box);
    }
  },
);
