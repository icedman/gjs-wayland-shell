import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import Gsk from "gi://Gsk";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";
import { PopupMenu } from "./popupMenu.js";
import { Dot } from "./dot.js";
import { Extension } from "./extensionInterface.js";
import { getAppInfo, getAppInfoFromFile } from "./appInfo.js";
import { pointInRectangle, distanceToRectangle } from "./collisions.js";
import { pointerInWindow, getModifierStates } from "./devices.js";

export const Background = GObject.registerClass(
  class Background extends Gtk.Window {
    _init(params) {
      this.customSettings = params.customSettings ?? {};
      delete params.customSettings;

      super._init({
        name: params.name,
        title: params.name,
        hexpand: true,
        vexpand: true,
        default_width: 20,
        default_height: 20,
        ...params,
      });

      this.style = Main.style;
      this.decorated = false;

      LayerShell.init_for_window(this);
      LayerShell.set_layer(this, LayerShell.Layer.BACKGROUND);
      LayerShell.set_keyboard_mode(this, LayerShell.KeyboardMode.ON_DEMAND);
    }

    destroy() {
      super.destroy();
    }

    vfunc_size_allocate(width, height, z) {
      super.vfunc_size_allocate(width, height, z);
    }
  },
);

export default { Background };
