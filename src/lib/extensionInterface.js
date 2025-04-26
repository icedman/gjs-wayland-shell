import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";

const Extension = GObject.registerClass(
  {
    Properties: {
      enabled: GObject.ParamSpec.boolean(
        "enabled",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
    },
    Signals: {
      update: { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Extension extends GObject.Object {
    _init(params) {
      super._init(params);
    }

    async enable() {
      this.enabled = true;
    }

    disable() {
      this.enabled = false;
    }
  },
);

export { Extension };
