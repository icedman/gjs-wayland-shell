import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import { Extension } from "../lib/extensionInterface.js";
import { getAppInfo } from "../lib/appInfo.js";

const MOUNT_PREFIX = "gws-mount-";

const Mounts = GObject.registerClass(
  {
    Signals: {
      "mounts-update": { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Mounts extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      if (!Main.settings.get_boolean("service-mounts")) {
        return;
      }

      super.enable();
      this.state = {
        mounts: {},
        mount_ids: [],
      };

      this._volumeMonitor = Gio.VolumeMonitor.get();
      this._volumeMonitor.connectObject(
        "mount-added",
        this._onMountAdded.bind(this),
        "mount-removed",
        this._onMountRemoved.bind(this),
        this,
      );

      if (Main?.timer) {
        Main.timer.runOnce(() => {
          this.checkMounts();
        }, 1000);
      }
    }

    disable() {
      super.disable();
      if (this._volumeMonitor) {
        this._volumeMonitor.disconnectObject(this);
        this._volumeMonitor = null;
      }
    }

    _appName(basename) {
      return `${MOUNT_PREFIX}${basename}`;
    }

    _setupMountIcon(mount) {
      let basename = mount.get_default_location().get_basename();
      if (basename.startsWith("/")) {
        // why does this happen?? issue #125
        return;
      }
      let label = mount.get_name();
      let appname = this._appName(basename);
      let fullpath = mount.get_default_location().get_path();
      let icon = mount.get_icon().names[0] || "drive-harddisk-solidstate";
      let mount_exec = 'echo "not implemented"';
      let unmount_exec = `umount ${fullpath}`;
      let mount_id = `${appname}.desktop`;

      let execOpen = "nautilus --select";
      // let execOpen = 'xdg-open';

      // this registers the mount.desktop
      getAppInfo({
        id: mount_id,
        exec: `${execOpen} ${fullpath}`,
        name: label,
        icon_name: icon,
        menu: [
          {
            action: "open",
            name: "Open Window",
            exec: `${execOpen} ${fullpath}`,
          },
          {
            action: "unmount",
            name: "Unmount",
            exec: unmount_exec,
          },
        ],
      });

      this.state.mounts[mount_id] = mount;
    }

    _onMountAdded(monitor, mount) {
      // console.log('add');
      // console.log(mount);
      // this.last_mounted = mount;
      // let basename = mount.get_default_location().get_basename();
      // this._setupMountIcon(mount);
      // // remove mount_ids << add mount_ids
      // this.emit('mounts-update', this);
      this.sync();
    }

    _onMountRemoved(monitor, mount) {
      // console.log('remove');
      // console.log(mount);
      // let basename = mount.get_default_location().get_basename();
      // let appname = this._appName(basename);
      // let mount_id = `${appname}.desktop`;
      // delete this.state.mounts[mount_id];
      // remove mount_ids
      // this.emit('mounts-update', this);
      this.sync();
    }

    checkMounts() {
      if (!this._volumeMonitor) return;
      let mounts = this._volumeMonitor.get_mounts();
      let mount_ids = mounts.map((mount) => {
        this._setupMountIcon(mount);
        let basename = mount.get_default_location().get_basename();
        let appname = this._appName(basename);
        return appname + ".desktop";
      });

      this.state = {
        mounts,
        mount_ids,
      };
    }

    sync() {
      this.checkMounts();
      this.emit("mounts-update", this);
    }
  },
);

export default Mounts;
