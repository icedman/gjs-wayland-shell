import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import { Extension } from "../lib/extensionInterface.js";

const TRASH_UPDATE_INTERVAL = 1000 * 45; // every 45 seconds
const TRASH_URI = "trash:///";

const Trash = GObject.registerClass(
  {
    Signals: {
      "trash-update": { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Trash extends Extension {
    _init(params) {
      super._init(params);
      this.state = {};
    }

    async enable() {
      if (!Main.settings.get_boolean("service-trash")) {
        return;
      }

      super.enable();
      this.monitorTrash();
      this.sync();
    }

    disable() {
      super.disable();
    }

    monitorTrash() {
      this._trashDir = Gio.File.new_for_uri(TRASH_URI);
      this._trashMonitor = this._trashDir.monitor_directory(
        // Gio.FileMonitorFlags.WATCH_MOVES,
        0,
        null,
      );
      this._trashMonitor.connect(
        "changed",
        (fileMonitor, file, otherFile, eventType) => {
          // console.log(eventType);
          this.sync();
          clearInterval(this._scheduleId);
          this._scheduleId = setInterval(() => {
            this.sync();
          }, TRASH_UPDATE_INTERVAL);
        },
      );

      this._scheduleId = setInterval(() => {
        this.sync();
      }, TRASH_UPDATE_INTERVAL);
    }

    checkTrash() {
      if (!this._trashDir) {
        return false;
      }

      let prevFull = this.state.full ?? false;
      let iter = this._trashDir.enumerate_children(
        "standard::*",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );
      return iter.next_file(null) != null;
    }

    sync() {
      let prevFull = this.state.full ?? false;
      this.state = {
        full: this.checkTrash(),
      };
      this.emit("trash-update", this);
    }
  },
);

export default Trash;
