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

import { Background } from "./lib/background.js";

const Wallpaper = GObject.registerClass(
  class Wallpaper extends Extension {
    _init(params) {
      this.name = params?.name ?? "Wallpaper";
      delete params?.name;
      super._init({
        ...(params ?? {}),
      });
    }

    enable() {
      this.window = new Background({
        name: this.name,
        hexpand: true,
        vexpand: true,
      });
      super.enable();

      this.window.present();

      let m = Main.monitors.getPrimaryMonitor();
      let g = m.get_geometry();
      this.window.set_size_request(g.width, g.height);
    }

    disable() {
      super.disable();
    }
  },
);

export default Wallpaper;
