import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import Gsk from "gi://Gsk";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";
import { PopupMenu } from "./lib/popupMenu.js";
import { Dot } from "./lib/dot.js";
import { Extension } from "./lib/extensionInterface.js";
import { getAppInfo, getAppInfoFromFile } from "./lib/appInfo.js";
import { pointInRectangle, distanceToRectangle } from "./lib/collisions.js";
import { pointerInWindow, getModifierStates } from "./lib/devices.js";

import { DockPanel } from "./lib/dock.js";
import { DockItem, DockAppItem } from "./lib/dockItem.js";

const Dock = GObject.registerClass(
  class Dock extends Extension {
    _init(params) {
      this.name = params?.name ?? "Dock";
      delete params?.name;
      super._init({
        ...(params ?? {}),
      });
    }

    enable() {
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

      super.enable();
    }

    disable() {
      this.window._endAnimation();
      this.window.destroy();
      this.window = null;
      super.disable();
    }

    create_dock(params) {
      return new Dock(params);
    }

    create_dockitem_from_appinfo(app) {
      let appInfo = getAppInfo(app);
      if (!appInfo) return;
      let btn = new DockAppItem({
        app: appInfo,
      });
      return btn;
    }
  },
);

export default Dock;
