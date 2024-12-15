import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../../lib/extensionInterface.js';
import { PopupMenu } from '../../lib/popupMenu.js';
import { IconGroups } from '../../dock.js';
import { getAppInfo, getAppInfoFromFile } from '../../lib/appInfo.js';

function add_dock_item(dockItem, target = null) {
  target = target ?? Main.dock.center;
  let window = target.parent?.parent; // this has to be a DockPanel
  let currentIcons = window.get_icons(null, target);
  let existing = currentIcons.find(
    (icon) => icon.id == (dockItem.id ?? dockItem.name),
  );
  if (existing) {
    return null;
  }
  target.append(dockItem);
  return dockItem;
}

const DockItemsExtension = GObject.registerClass(
  class DockItemsExtension extends Extension {
    enable() {
      super.enable();

      this.name = 'dockitems';
      let target = Main.dock.window;
      target.favorite_apps = Main.userSettings['favorite-apps'];

      if (!target.favorite_apps) {
        const settingsShell = new Gio.Settings({
          schema_id: 'org.gnome.shell',
        });
        target.favorite_apps = settingsShell
          .get_value('favorite-apps')
          .deepUnpack();
      }

      let prefix = 'dock';
      this.settingsPrefix = prefix;
      this.settings = Main.settings;
      this.settingsMap = {
        [`${prefix}-show-separator`]: () => {
          this.reattachDockItems(Main.dock, this);
        },
        [`${prefix}-show-trash`]: () => {
          this.reattachDockItems(Main.dock, this);
        },
        [`${prefix}-show-mounted-volumes`]: () => {
          this.reattachDockItems(Main.dock, this);
        },
        [`${prefix}-show-apps`]: () => {
          this.reattachDockItems(Main.dock, this);
        },
        [`${prefix}-show-favorite-apps`]: () => {
          this.reattachDockItems(Main.dock, this);
        },
        [`${prefix}-show-running-apps`]: () => {
          this.reattachDockItems(Main.dock, this);
        },
      };
      this.load_settings();

      this.attachDockItems(Main.dock, this);

      Main.dock.connect('notify::enabled', () => {
        if (Main.dock.enabled) {
          this.attachDockItems(Main.dock, this);
        } else {
          Main.dock._dockItems = null;
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
      let apps = Main.dock.create_dockitem_from_appinfo(appInfo);
      if (apps) {
        add_dock_item(apps, target);
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
      let trash = Main.dock.create_dockitem_from_appinfo(appInfo);
      if (trash) {
        add_dock_item(trash, target);
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

    createSeparator(target = null) {
      target = target ?? Main.dock.center;
      let item = new Gtk.Separator({ name: 'separator' });
      add_dock_item(item, target);
      item.group = IconGroups.SEPARATOR;
      item.add_css_class('separator');
      return item;
    }

    createFavoritesItem(target = null) {
      target = target ?? Main.dock.center;
      let window = target.parent?.parent;

      let item = new Gtk.Box({ visible: false }); // placeholder
      item.items = [];
      target.append(item);

      for (let i = 0; i < window.favorite_apps.length; i++) {
        let app = window.favorite_apps[i];
        let btn = Main.dock.create_dockitem_from_appinfo(app);
        if (btn) {
          add_dock_item(btn, target);
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
      target.append(item);

      function update_running_apps() {
        let windows = Main.shell.windows ?? [];
        let appIds = [];
        windows.forEach((w) => {
          let appId = w.app_id + '.desktop';
          appIds.push(appId);
          try {
            let icon = Main.dock.create_dockitem_from_appinfo(appId);
            if (icon) {
              add_dock_item(icon, target);
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
      target.append(item);

      function update_mounted_volumes() {
        let mount_ids = Main.mounts.state?.mount_ids ?? [];
        let appIds = [];
        mount_ids.forEach((m) => {
          let appInfo = getAppInfo(m);
          let appId = appInfo.id;
          appIds.push(appId);
          try {
            let icon = Main.dock.create_dockitem_from_appinfo(appId);
            if (icon) {
              add_dock_item(icon, target);
              item.items.push(icon);
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

    attachDockItems(targetDock, config) {
      if (!targetDock.enabled || targetDock._dockItems) return;
      let window = targetDock.window;

      targetDock._dockItems = [];

      if (config.SHOW_FAVORITE_APPS) {
        let items = this.createFavoritesItem(targetDock.center);
        targetDock._dockItems.push(items);
      }
      if (config.SHOW_RUNNING_APPS) {
        let items = this.createRunningApps(targetDock.center);
        targetDock._dockItems.push(items);
      }
      if (config.SHOW_APPS) {
        let item = this.createAppsItem(targetDock.center);
        targetDock._dockItems.push(item);
      }
      if (config.SHOW_TRASH) {
        let item = this.createTrashItem(targetDock.center);
        targetDock._dockItems.push(item);
      }
      if (config.SHOW_MOUNTED_VOLUMES) {
        let item = this.createMountedVolumes(targetDock.center);
        targetDock._dockItems.push(item);
      }
      if (
        config.SHOW_SEPARATOR &&
        config.SHOW_APPS &&
        (config.SHOW_RUNNING_APPS || config.SHOW_TRASH)
      ) {
        let windows = Main.shell.windows ?? [];
        if (
          window.favorite_apps.length > 0 &&
          (windows.length > 0 || config.SHOW_TRASH)
        ) {
          let item = this.createSeparator(targetDock.center);
          targetDock._dockItems.push(item);
        }
      }
      targetDock.window.sort_icons();
    }

    detachDockItems(targetDock) {
      (targetDock._dockItems || []).forEach((item) => {
        item.parent?.remove(item);
        item.emit('destroy');
      });
      targetDock._dockItems = null;
    }

    reattachDockItems(targetDock, config) {
      this.detachDockItems(targetDock);
      this.attachDockItems(targetDock, config);
    }

    disable() {
      super.disable();
      this.detachDockItems(Main.dock);
      Main.settings.disconnectObject(this);
    }
  },
);

export default DockItemsExtension;

// Main.extensions['dock-items'].disable();
