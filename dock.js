import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";

function appInfoMenuModel(appInfo) {
  let desktopFilePath = GLib.build_filenamev([
    "/usr/share/applications",
    appInfo.get_id(),
  ]); // Adjust path as needed
  let content = GLib.file_get_contents(desktopFilePath)[1];
  let lines = String.fromCharCode.apply(null, content).split("\n");

  let items = [
    {
      action: "open",
      name: "Open Window",
      exec: appInfo.get_string("Exec").replace("%U", "").trim(),
    },
  ];

  // console.log(lines);
  appInfo.list_actions().forEach((action) => {
    let name = appInfo.get_action_name(action);
    console.log(`${action}]`);
    let nextExec = true;
    let exec = null;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.includes(`${action}]`)) {
        nextExec = true;
      }
      if (nextExec && line.startsWith("Exec")) {
        exec = line.replace("Exec=", "").replace("%U", "").trim();
        break;
      }
    }

    items.push({ action, name, exec });
  });

  // items.push()

  if (items.length == 1) return [];

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
            title,
            icon_name,
            cmd,
            menu: appInfoMenuModel(appInfo),
          };
        }
      }

      if (!appInfo && params.app == "trash") {
        appInfo = {
          icon_name: "user-trash",
          title: "Trash",
          cmd: `nautilus --select trash:///`,
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
      });

      this.btn = new Gtk.Button({
        icon_name: appInfo.icon_name,
        // tooltip_text: appInfo.title,
      });

      // right click
      if (appInfo.menu?.length > 0) {
        let actionGroup = new Gio.SimpleActionGroup();

        let model = new Gio.Menu();
        appInfo.menu.forEach((item) => {
          model.append(item.name, item.action);

          let act = new Gio.SimpleAction({ name: item.action });
          act.connect("activate", (_) => {
            console.log(item.action);
          });

          actionGroup.add_action(act);
        });

        let menu = Gtk.PopoverMenu.new_from_model(model);
        menu.insert_action_group("menu", actionGroup);

        // menu.add_chil
        menu.name = "Menu";
        menu.has_arrow = false;
        menu.position = 2;

        menu.connect("activate-default", (item) => {
          console.log(item);
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
          Main.shell.spawn(appInfo.cmd);
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
  class Dock extends Gtk.Window {
    _init(params) {
      this.apps = params?.apps ?? [];
      delete params?.apps;

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

      for (let i = 0; i < this.apps.length; i++) {
        let app = this.apps[i];
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
