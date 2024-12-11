import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../../lib/extensionInterface.js';
import { PopupMenu } from '../../lib/popupMenu.js';
import { IconGroups } from '../../dock.js';

const settingsShell = new Gio.Settings({ schema_id: 'org.gnome.shell' });
// let favoriteApps = settingsShell.get_value('favorite-apps').deepUnpack();

let favorite_apps = [
  'kitty.desktop',
  'org.gnome.Nautilus.desktop',
  'google-chrome.desktop',
  'org.mozilla.firefox.desktop',
  'org.gnome.Calendar.desktop',
  'org.gnome.clocks.desktop',
  'org.gnome.Software.desktop',
  'org.gnome.TextEditor.desktop',
];

const DockItemsExtension = GObject.registerClass(
  class DockItemsExtension extends Extension {
    enable() {
      super.enable();

      this.name = 'dockitems';
      this.favorite_apps = favorite_apps;

      let prefix = this.name.toLowerCase();
      this.settings = Main.settings;
      this.settingsMap = {
        [`${prefix}-show-trash`]: this.retachDockItems.bind(this),
        [`${prefix}-show-mounted-volumes`]: this.retachDockItems.bind(this),
        [`${prefix}-show-apps`]: this.retachDockItems.bind(this),
        [`${prefix}-show-favorite-apps`]: this.retachDockItems.bind(this),
        [`${prefix}-show-running-apps`]: this.retachDockItems.bind(this),
      };
      this.load_settings();

      this.attachDockItems();

      Main.dock.connect('notify::enabled', () => {
        if (Main.dock.enabled) {
          this.attachDockItems();
        } else {
          this.dockItems = null;
        }
      });
    }

    createAppsItem(target) {
      target = target ?? Main.dock.center;

      let appInfo = {
        id: 'fuzzel',
        icon_name: 'view-app-grid-symbolic',
        title: 'Fuzzel',
        exec: `fuzzel`,
      };
      let apps = Main.dock.create_desktop_app_item(appInfo);
      if (apps) {
        Main.dock.add_dock_item(apps, target);
        apps.group = IconGroups.HEAD;
      }
      return apps;
    }

    createTrashItem(target = null) {
      target = target ?? Main.dock.center;

      let appInfo = {
        id: 'trash',
        icon_name: 'user-trash',
        title: 'Trash',
        exec: `nautilus --select trash:///`,
        menu: [
          {
            action: 'open',
            name: 'Open Window',
            exec: 'nautilus --select trash:///',
          },
          {
            action: 'empty',
            name: 'Empty Trash',
            exec: `gio trash --empty`,
          },
        ],
      };
      let trash = Main.dock.create_desktop_app_item(appInfo);
      if (trash) {
        Main.dock.add_dock_item(trash, target);
        trash.group = IconGroups.TAIL + 1;
      }

      Main.trash.connectObject(
        'trash-update',
        () => {
          let state = Main.trash.state;
          if (state.full) {
            trash.set_icon('user-trash-full');
          } else {
            trash.set_icon('user-trash');
          }
        },
        this,
      );
      Main.trash.sync();
      return trash;
    }

    createFavoritesItem(target = null) {
      target = target ?? Main.dock.center;

      let item = new Gtk.Box({ visible: false }); // placeholder
      item.items = [];
      // Main.dock.center.append(item);

      for (let i = 0; i < this.favorite_apps.length; i++) {
        let app = this.favorite_apps[i];
        let btn = Main.dock.create_desktop_app_item(app);
        if (btn) {
          Main.dock.add_dock_item(btn, target);
          item.items.push(btn);
          btn.group = IconGroups.FAVORITE_APPS;
        }
      }

      Main.dock.window.sort_icons();
      Main.dock.window.queue_resize();
      Main.dock.container.queue_resize();

      item.connect('destroy', () => {
        item.items.forEach((dockItem) => {
          dockItem.parent?.remove(dockItem);
        });
      });
      return item;
    }

    createRunningApps(target = null) {
      target = target ?? Main.dock.center;

      let item = new Gtk.Box({ visible: false }); // placeholder
      item.items = [];
      // Main.dock.center.append(item);

      function update_running_apps() {
        let windows = Main.shell.windows ?? [];
        let appIds = [];
        windows.forEach((w) => {
          let appId = w.app_id + '.desktop';
          appIds.push(appId);
          try {
            let icon = Main.dock.create_desktop_app_item(appId);
            if (icon) {
              Main.dock.add_dock_item(icon, target);
              item.items.push(icon);
              icon.group = IconGroups.RUNNING_APPS;
            }
          } catch (err) {
            console.log(err);
          }
        });

        // remove closed apps
        let remove = [];
        let current = Main.dock.window.get_icons(
          IconGroups.RUNNING_APPS,
          target,
        );
        current.forEach((c) => {
          if (!appIds.includes(c.id)) {
            remove.push(c);
          }
        });

        remove.forEach((c) => {
          c.parent?.remove(c);
        });

        Main.dock.window.sort_icons();
      }

      Main.shell.connectObject(
        'windows-update',
        () => {
          update_running_apps();
        },
        // 'window-opened', this.update_running_apps.bind(this),
        // 'window-closed', this.update_running_apps.bind(this),
        this,
      );
      update_running_apps();

      item.connect('destroy', () => {
        item.items.forEach((dockItem) => {
          dockItem.parent?.remove(dockItem);
        });
        Main.shell.disconnectObject(this);
      });

      return item;
    }

    createMountedVolumes(target) {
      target = target ?? Main.dock.center;

      let item = new Gtk.Box({ visible: false }); // placeholder
      item.items = [];
      // Main.dock.center.append(item);

      function update_mounted_volumes() {
        let mount_ids = Main.mounts.state?.mount_ids ?? [];
        let appIds = [];
        mount_ids.forEach((m) => {
          let appInfo = getAppInfo(m);
          let appId = appInfo.id;
          appIds.push(appId);
          try {
            let icon = Main.dock.create_desktop_app_item(appId);
            if (icon) {
              Main.dock.add_dock_item(icon, target);
              items.push(icon);
              icon.group = IconGroups.VOLUMES;
            }
          } catch (err) {
            console.log(err);
          }
        });

        // remove closed apps
        let remove = [];
        let current = Main.dock.window.get_icons(IconGroups.VOLUMES, target);
        current.forEach((c) => {
          if (!appIds.includes(c.id)) {
            remove.push(c);
          }
        });

        remove.forEach((c) => {
          c.parent?.remove(c);
        });

        Main.dock.window.sort_icons();
      }
      update_mounted_volumes();

      Main.mounts.connectObject(
        'mounts-update',
        () => {
          update_mounted_volumes();
        },
        this,
      );
      Main.mounts.sync();

      item.connect('destroy', () => {
        item.items.forEach((dockItem) => {
          dockItem.parent?.remove(dockItem);
        });
        Main.mounts.disconnectObject(this);
      });

      return item;
    }

    attachDockItems() {
      if (!Main.dock.enabled || this.dockItems) return;

      this.dockItems = [];

      if (this.SHOW_FAVORITE_APPS) {
        let items = this.createFavoritesItem();
        this.dockItems.push(items);
      }
      if (this.SHOW_RUNNING_APPS) {
        let items = this.createRunningApps();
        this.dockItems.push(items);
      }

      if (this.SHOW_APPS) {
        let item = this.createAppsItem();
        this.dockItems.push(item);
      }

      if (this.SHOW_TRASH) {
        let item = this.createTrashItem();
        this.dockItems.push(item);
      }

      Main.dock.window.sort_icons();
    }

    detachDockItems() {
      (this.dockItems || []).forEach((item) => {
        item.emit('destroy');
        item.parent?.remove(item);
      });
      this.dockItems = null;
    }

    retachDockItems() {
      this.detachDockItems();
      this.attachDockItems();
    }

    disable() {
      super.disable();
      this.detachDockItems();
      Main.settings.disconnectObject(this);
    }
  },
);

export default DockItemsExtension;

// Main.extensions['dock-items'].disable();
