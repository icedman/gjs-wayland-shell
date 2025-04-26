import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import Gsk from "gi://Gsk";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import { PopupMenu } from "./popupMenu.js";
import { Dot } from "./dot.js";
import { Extension } from "./extensionInterface.js";
import { getAppInfo, getAppInfoFromFile } from "./appInfo.js";
import { pointInRectangle, distanceToRectangle } from "./collisions.js";
import { pointerInWindow, getModifierStates } from "./devices.js";

export const DockItem = GObject.registerClass(
  class DockItem extends Gtk.Fixed {
    _init(params = {}) {
      let css = params.css ?? "dock-item";
      let iconSize = params.iconSize ?? null;
      let icon = params.icon ?? null;
      let label = params.label ?? null;
      delete params.css;
      delete params.iconSize;
      delete params.icon;
      delete params.label;

      super._init({
        name: "DockItem",
        hexpand: true,
        vexpand: true,
        ...params,
      });
      this.add_css_class(css);

      this.container = new Gtk.Box();
      this.container.add_css_class("button");

      this.menu = new PopupMenu();
      this.icon = new Gtk.Image();
      this.icon.add_css_class("icon");
      this.container.append(this.icon);
      this.label = new Gtk.Label();
      this.label.add_css_class("label");
      this.container.append(this.label);
      this.container.append(this.menu);
      this.put(this.container, 0, 0);

      this.set_icon(icon);
      this.set_label(label);
      this.set_icon_size(iconSize ?? 32);

      this.attach_events();
    }

    attach_events() {
      // click
      {
        let evt = new Gtk.GestureClick();
        evt.set_button(1); // left click
        evt.connect("released", (actor, count) => {
          let modifiers = getModifierStates(this.root);
          this.on_click(count, 0, modifiers);
        });
        this.container.add_controller(evt);
      }

      // right click
      {
        let evt = new Gtk.GestureClick();
        evt.set_button(3); // right click
        evt.connect("released", (actor, count) => {
          let modifiers = getModifierStates(this.root);
          this.on_click(count, 3, modifiers);
        });
        this.container.add_controller(evt);
      }

      // hover
      {
        let evt = new Gtk.EventControllerMotion();
        evt.connect("motion", (controller, x, y) => {
          this.on_motion(x, y);
        });
        this.container.add_controller(evt);
      }
    }

    set_label(label) {
      this.label.set_visible(label);
      this.label.set_label(label ?? "");
    }

    set_icon(icon) {
      this.icon.set_visible(icon);
      if (icon) {
        if (icon.startsWith("/") || icon.startsWith("file://")) {
          this.icon.set_from_file(icon);
        } else {
          this.icon.set_from_icon_name(icon);
          // getIconInfo(icon);
        }
      }
    }

    set_icon_size(size) {
      this.icon?.set_pixel_size(size);
      this.indicator?.set_size_request(size, size);
    }

    on_click(count, btn) {
      // console.log({ count, btn });
    }

    on_motion(x, y) {
      // console.log('motion');
    }
  },
);

export const DockAppItem = GObject.registerClass(
  class DockAppItem extends DockItem {
    _init(params = {}) {
      let appInfo = getAppInfo(params.app);
      delete params.app;
      super._init(params);

      this.id = appInfo?.id;
      this.appInfo = appInfo;

      this.indicator = new Dot(48);
      this.indicator.set_state({
        style: "binary",
        color: "#fff",
        count: 0,
      });
      this.indicator.set_sensitive(false);
      this.put(this.indicator, 2, 0);

      this.set_icon(appInfo?.icon_name ?? "application-x-executable");
    }

    on_click(count, btn, modifiers) {
      if (btn == 3) {
        return this.show_menu();
      }

      let appInfo = this.appInfo;
      if (!appInfo) {
        return;
      }
      if (appInfo.script) {
        appInfo.script();
        return;
      }

      // move this to a general handler
      Main.shell
        .focusOrSpawn(appInfo.id, appInfo.exec, "" /* args */, modifiers)
        .then((res) => {
          if (res == 0) {
            this.add_css_class("bounce-icon");
            Main.loTimer.runOnce(() => {
              this.remove_css_class("bounce-icon");
            }, 4000);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }

    show_menu() {
      let appInfo = this.appInfo;
      if (!appInfo) {
        return;
      }

      let windows = Main.shell.windows.filter(
        (w) => w.app_id == appInfo.id.replace(".desktop", ""),
      );

      let appId = null;
      let items = [
        ...(appInfo.menu ?? []),
        ...windows.map((w) => {
          let title = w.title;
          if (title.length >= 30) {
            title = title.substring(0, 28) + "...";
          }
          appId = w.app_id;
          return {
            name: title,
            action: "focus",
            window: w,
          };
        }),
      ];

      if (appId) {
        items = [
          {
            id: appId,
            action: "open",
            name: "Open Window",
            exec: appInfo.exec,
          },
          ...items,
          {
            name: "Quit",
            script: () => {
              Main.shell.quitApp(appId);
            },
          },
        ];
      }

      if (items.length > 0) {
        this.menu.setItems(items);
        this.menu.popup();
      }
    }

    update_indicator(config = {}) {
      if (!this.appInfo || !this.indicator) return;
      let windows = Main.shell.windows.filter(
        (w) => w.app_id == this.appInfo.id.replace(".desktop", ""),
      );
      this.indicator.set_state({
        ...config,
        count: windows.length,
      });
    }
  },
);

export const PanelItem = GObject.registerClass(
  class PanelItem extends DockItem {
    _init(params = {}) {
      super._init({
        ...params,
        css: "panel-item",
      });
    }
  },
);
