import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

const MOUNT_PREFIX = 'gws-mount-';

const Mounts = GObject.registerClass(
  {
    Signals: {
      'mounts-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Mounts extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      super.enable();
      this.state = {
        mounts: {},
        mount_ids: [],
      };

      this._volumeMonitor = Gio.VolumeMonitor.get();
      this._volumeMonitor.connectObject(
        'mount-added',
        this._onMountAdded.bind(this),
        'mount-removed',
        this._onMountRemoved.bind(this),
        this,
      );
      this.checkMounts();
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
      if (basename.startsWith('/')) {
        // why does this happen?? issue #125
        return;
      }
      let label = mount.get_name();
      let appname = this._appName(basename);
      let fullpath = mount.get_default_location().get_path();
      let icon = mount.get_icon().names[0] || 'drive-harddisk-solidstate';
      let mount_exec = 'echo "not implemented"';
      let unmount_exec = `umount ${fullpath}`;
      let mount_id = `/tmp/${appname}.desktop`;
      let fn = Gio.File.new_for_path(mount_id);

      if (!fn.query_exists(null)) {
        // let execOpen = 'xdg-open';
        let execOpen = 'nautilus --select';
        let content = `[Desktop Entry]\nVersion=1.0\nTerminal=false\nType=Application\nName=${label}\nExec=${execOpen} ${fullpath}\nIcon=${icon}\nStartupWMClass=${appname}\nActions=unmount;\n\n[Desktop Action mount]\nName=Mount\nExec=${mount_exec}\n\n[Desktop Action unmount]\nName=Unmount\nExec=${unmount_exec}\n`;
        const [, etag] = fn.replace_contents(
          content,
          null,
          false,
          Gio.FileCreateFlags.REPLACE_DESTINATION,
          null,
        );
      }

      this.state.mounts[mount_id] = mount;
    }

    _onMountAdded(monitor, mount) {
      console.log('add');
      console.log(mount);
      this.last_mounted = mount;
      let basename = mount.get_default_location().get_basename();
      this._setupMountIcon(mount);
      return true;
    }

    _onMountRemoved(monitor, mount) {
      console.log('remove');
      console.log(mount);
      let basename = mount.get_default_location().get_basename();
      let appname = this._appName(basename);
      let mount_id = `/tmp/${appname}.desktop`;
      delete this.state.mounts[mount_id];
    }

    checkMounts() {
      let mounts = this._volumeMonitor.get_mounts();
      let mount_ids = mounts.map((mount) => {
        let basename = mount.get_default_location().get_basename();
        let appname = this._appName(basename);
        return appname + '.desktop';
      });

      this.state = {
        mounts,
        mount_ids,
      };

      this.sync();
    }

    sync() {
      this.emit('mounts-update', this);
    }
  },
);

export default Mounts;
