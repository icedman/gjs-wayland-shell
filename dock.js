import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";

// let settingsShell = new Gio.Settings({ schema_id: 'org.gnome.shell' });
// let apps = settingsShell.get_value('favorite-apps').deepUnpack();

let apps = [
  "kitty.desktop",
  "org.gnome.Nautilus.desktop",
  "google-chrome.desktop",
  "org.mozilla.firefox.desktop",
  "org.gnome.Calendar.desktop",
  "org.gnome.clocks.desktop",
  "org.gnome.Software.desktop",
  "org.gnome.TextEditor.desktop",
];

export const DockItem = GObject.registerClass(
  class DockItem extends Gtk.Box {
    _init(params) {
      let appInfo = Gio.DesktopAppInfo.new(params.app);
      let iconName = appInfo.get_string("Icon");
      let title = appInfo.get_string("Name");
      let cmd = appInfo.get_string("Exec").replace("%U", "").trim();

      super._init({
        name: "DockItem",
      });

      this.btn = new Gtk.Button({
        icon_name: iconName,
        tooltip_text: title,
      });
      this.btn.connect("clicked", (actor) => {
        try {
          Main.shell.spawn(cmd);
        } catch (err) {
          console.log(err);
        }
      });

      // this.btn.child.set_cursor(Gdk.Cursor.new_from_name('pointer', null));
      this.btn.child.set_pixel_size(48);
      this.append(this.btn);
    }
  },
);

export const Dock = GObject.registerClass(
  class Dock extends Gtk.Window {
    _init(params) {
      super._init({
        title: "Dock",
        name: "Dock",
        default_width: 200,
        default_height: 40,
        ...params,
      });

      this.add_css_class("startup");

      this.windows = [];

      LayerShell.init_for_window(this);
      LayerShell.set_anchor(this, LayerShell.Edge.BOTTOM, true);
      LayerShell.auto_exclusive_zone_enable(this);
      LayerShell.set_margin(this, LayerShell.Edge.BOTTOM, 4);
      LayerShell.set_layer(this, LayerShell.Layer.TOP);
    }

    init() {
      let container = new Gtk.Fixed();
      this.box = new Gtk.Box({ name: "box" });
      this.bg = new Gtk.Box({ name: "background" });

      container.put(this.bg, 0, 0);
      container.put(this.box, 0, 0);
      this.update_icons();

      this.set_child(container);
      this.present();

      Main.shell.subscribe(
        this,
        "WindowOpenedOrChanged",
        this.update_windows.bind(this),
      );
      Main.shell.subscribe(
        this,
        "WindowClosed",
        this.update_windows.bind(this),
      );
      setTimeout(this.update_windows.bind(this), 1000);
    }

    async update_icons() {
      let bg = this.bg;
      let box = this.box;

      for (let i = 0; i < apps.length; i++) {
        let app = apps[i];
        let btn = new DockItem({
          app,
        });
        box.append(btn);
      }

      setTimeout(this.update_bg.bind(this), 500);
    }

    async update_windows(obj) {
      if (this.windows.length == 0) {
        Main.shell.get_windows().then((res) => {
          try {
            let obj = JSON.parse(res);
            this.windows = obj.Ok?.Windows ?? [];
            console.log(this.windows);
          } catch (err) {
            console.log(res);
            console.log(err);
          }
        });
        return;
      }

      // add or update or delete
      console.log("----------");
      console.log(obj);
    }

    update_bg() {
      let w = this.box.get_allocated_width();
      let h = this.box.get_allocated_height();
      this.bg.set_size_request(w, h);

      this.remove_css_class("startup");
    }
  },
);

export default Dock;
