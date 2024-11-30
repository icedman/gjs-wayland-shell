import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";
import { PopupMenu } from "./lib/popupMenu.js";

function appInfoMenuModel(appInfo) {
  let desktopFilePath = GLib.build_filenamev([
    "/usr/share/applications",
    appInfo.get_id(),
  ]); // Adjust path as needed
  let content = GLib.file_get_contents(desktopFilePath)[1];
  let lines = String.fromCharCode.apply(null, content).split("\n");

  let items = [
    {
      id: appInfo.get_id(),
      action: "open",
      name: "Open Window",
      exec: appInfo
        .get_string("Exec")
        .replace("%U", "")
        .replace("%u", "")
        .trim(),
    },
  ];

  // console.log(lines);
  appInfo.list_actions().forEach((action) => {
    let name = appInfo.get_action_name(action);
    let nextExec = false;
    let exec = null;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.includes(`${action}]`)) {
        nextExec = true;
      }
      if (nextExec && line.startsWith("Exec")) {
        exec = line
          .replace("Exec=", "")
          .replace("%U", "")
          .replace("%u", "")
          .trim();
        break;
      }
    }

    items.push({ action, name, exec });
  });

  return items;
}

export const DockItem = GObject.registerClass(
  class DockItem extends Gtk.Box {
    _init(params) {
      let appInfo = params.app;

      if (appInfo && typeof appInfo === "string") {
        appInfo = Gio.DesktopAppInfo.new(params.app);
        if (appInfo) {
          let icon_name = appInfo.get_string("Icon");
          let title = appInfo.get_string("Name");
          let cmd = appInfo.get_string("Exec").replace("%U", "").trim();
          appInfo = {
            id: params.app,
            title,
            icon_name,
            cmd,
            menu: appInfoMenuModel(appInfo),
          };
        }
      }

      if (!appInfo && params.app == "trash") {
        appInfo = {
          id: params.app,
          icon_name: "user-trash",
          title: "Trash",
          cmd: `nautilus --select trash:///`,
          menu: [
            {
              action: "open",
              name: "Open Window",
              exec: "nautilus --select trash:///",
            },
            {
              action: "empty",
              name: "Empty Trash",
              exec: "sh - c rm -rf ~/.local/share/Trash/*",
            },
          ],
        };
        Main.trash.subscribe(this, "trash-update", (state) => {
          if (state.full) {
            this.btn.child.set_from_icon_name("user-trash-full");
          } else {
            this.btn.child.set_from_icon_name("user-trash");
          }
        });
      }

      super._init({
        name: "DockItem",
        hexpand: true,
        vexpand: true,
      });

      this.btn = new Gtk.Button({
        icon_name: appInfo.icon_name,
        // tooltip_text: appInfo.title,
      });

      // right click
      if (appInfo.menu?.length > 0) {
        let menu = new PopupMenu({
          items: appInfo.menu,
        });

        let evt = new Gtk.GestureClick();
        evt.set_button(3);
        evt.connect("pressed", (actor, count) => {
          menu.popup();
        });
        this.btn.add_controller(evt);
        this.append(menu);

        menu.set_parent(this);
      }

      this.btn.connect("clicked", (actor) => {
        try {
          Main.shell.focusOrOpen(appInfo.id, appInfo.cmd);
        } catch (err) {
          console.log(err);
        }
      });
      this.btn.child.set_pixel_size(48);
      this.append(this.btn);
    }
  },
);

export const Dock = GObject.registerClass(
  class Dock extends GObject.Object {
    _init(params) {
      this.favorite_apps = params?.apps ?? [];
      delete params?.apps;

      super._init({
        ...params,
      });
    }

    init() {
      this.enable();
    }

    enable() {
      this.load_settings();

      this.window = new Gtk.Window({
        title: "Dock",
        name: "Dock",
        hexpand: true,
        vexpand: true,
      });

      this.window.add_css_class("startup");

      LayerShell.init_for_window(this.window);
      LayerShell.set_anchor(this.window, LayerShell.Edge.BOTTOM, true);
      LayerShell.auto_exclusive_zone_enable(this.window);
      LayerShell.set_margin(this.window, LayerShell.Edge.BOTTOM, 4);
      LayerShell.set_layer(this.window, LayerShell.Layer.TOP);

      let container = new Gtk.Overlay({});
      this.container = container;
      this.box = new Gtk.Box({ name: "box", hexpand: true, vexpand: true });
      this.bg = new Gtk.Box({
        name: "background",
        hexpand: true,
        vexpand: true,
      });

      container.add_overlay(this.bg);
      container.add_overlay(this.box);
      container.set_halign(Gtk.Align.END);
      container.set_valign(Gtk.Align.END);

      this.update_icons();

      this.window.set_child(container);
      this.window.present();

      setTimeout(() => {
        this.window.remove_css_class("startup");
      }, 500);
    }

    disable() {
      Main.settings.diconnectObject(this);
      this.window.hide();

      this.container = null;
      this.box = null;
      this.bg = null;
      this.window = null;
    }

    load_settings() {
      Main.settings.connectObject(
        "changed::dark-mode",
        (settings, key) => {
          let value = settings.get_value("dark-mode");
          let type = value.get_type_string();
          console.log({ key, value, type, b: settings.get_string(key) });
        },
        this,
      );
    }

    async update_icons() {
      let bg = this.bg;
      let box = this.box;

      for (let i = 0; i < this.favorite_apps.length; i++) {
        let app = this.favorite_apps[i];
        let btn = new DockItem({
          app,
        });
        box.append(btn);
      }

      this.container.set_size_request(
        this.favorite_apps.length * (48 + 12),
        48 + 20,
      );
    }
  },
);

export default Dock;
