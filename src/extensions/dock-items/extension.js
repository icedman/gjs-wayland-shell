import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import { Extension } from "../../lib/extensionInterface.js";
import { PopupMenu } from "../../lib/popupMenu.js";
import { IconGroups } from "../../lib/dock.js";
import { getAppInfo, getAppInfoFromFile } from "../../lib/appInfo.js";

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
      Main.factory.registerProvider("apps", this.createAppsItem.bind(this));
      Main.factory.registerProvider("trash", this.createTrashItem.bind(this));
      Main.factory.registerProvider(
        "favorite_apps",
        this.createFavoritesItem.bind(this),
      );
      Main.factory.registerProvider(
        "running_apps",
        this.createRunningApps.bind(this),
      );
      Main.factory.registerProvider(
        "mounted_volumes",
        this.createMountedVolumes.bind(this),
      );
    }

    createAppsItem(config) {
      let appInfo = {
        id: "apps",
        icon_name: "view-app-grid-symbolic",
        title: "Apps",
        script: () => {
          Main.appsGrid.toggle();
        },
      };
      let apps = Main.dock.create_dockitem_from_appinfo(appInfo);
      apps.group = IconGroups.HEAD;
      return apps;
    }

    createTrashItem(config) {
      let appInfo = {
        id: "trash",
        icon_name: "user-trash",
        title: "Trash",
        exec: `nautilus --select trash:///`,
        menu: [
          {
            action: "open",
            name: "Open Window",
            exec: "nautilus --select trash:///",
          },
          {
            action: "empty",
            name: "Empty Trash",
            exec: `gio trash --empty`,
          },
        ],
      };
      let trash = Main.dock.create_dockitem_from_appinfo(appInfo);
      trash.group = IconGroups.TAIL + 1;
      Main.trash.connectObject(
        "trash-update",
        () => {
          let state = Main.trash.state;
          if (state.full) {
            trash.set_icon("user-trash-full");
          } else {
            trash.set_icon("user-trash");
          }
        },
        trash,
      );
      trash.connect("destroy", () => {
        Main.trash.disconnectObject(trash);
      });
      Main.trash.sync();
      return trash;
    }

    createSeparator(config) {
      let item = new Gtk.Separator({ name: "separator" });
      item.group = IconGroups.SEPARATOR;
      item.add_css_class("separator");
      return item;
    }

    createFavoritesItem(config) {
      let item = new Gtk.Box({ visible: false }); // placeholder
      item.set_size_request(1, 1);
      item.favorite_apps = Main.userSettings["favorite-apps"];

      if (!item.favorite_apps) {
        const settingsShell = new Gio.Settings({
          schema_id: "org.gnome.shell",
        });
        item.favorite_apps = settingsShell
          .get_value("favorite-apps")
          .deepUnpack();
      }

      function update_favorite_apps() {
        let container = item.parent;
        let dock = item.root;
        if (!dock) return;

        let currentIcons = dock.get_icons(IconGroups.FAVORITE_APPS, container);
        let currentIconIds = currentIcons.map((icon) => icon.id);

        item.icons = [];

        for (let i = 0; i < item.favorite_apps.length; i++) {
          let app = item.favorite_apps[i];
          let appInfo = getAppInfo(app);
          if (currentIconIds.includes(appInfo.id)) {
            continue;
          }
          let btn = Main.dock.create_dockitem_from_appinfo(app);
          if (btn) {
            btn.id = appInfo.id;
            btn.owner = item;
            item.icons.push(btn);
            // console.log(`added ${btn.id}`);
            container.append(btn);
            btn.group = IconGroups.FAVORITE_APPS;
          }
        }

        dock.update_icon_size();
        dock.sort_icons();
      }

      item.connect("show", () => {
        update_favorite_apps();
      });

      item.connect("destroy", () => {
        let container = item.parent;
        let dock = item.root;
        let currentIcons = dock.get_icons(IconGroups.FAVORITE_APPS, container);
        currentIcons.forEach((dockItem) => {
          dockItem.parent?.remove(dockItem);
        });
      });
      return item;
    }

    createRunningApps(config) {
      let item = new Gtk.Box({ visible: false }); // placeholder
      item.id = config.id;

      function update_running_apps() {
        let container = item.parent;
        let dock = item.root;
        if (!dock) return;

        let currentIcons = dock.get_icons(IconGroups.RUNNING_APPS, container);
        let favoriteIcons = dock.get_icons(IconGroups.FAVORITE_APPS, container);
        let currentIconIds = currentIcons.map((icon) => icon.id);
        let favoriteIconsIds = favoriteIcons.map((icon) => icon.id);
        let newIconIds = [];

        let windows = Main.shell.windows ?? [];
        let appIds = [];
        item.icons = [];

        windows.forEach((w) => {
          if (!w.app_id) return;

          let appId = w.app_id + ".desktop";
          appIds.push(appId);

          if (
            currentIconIds.includes(appId) ||
            favoriteIconsIds.includes(appId) ||
            newIconIds.includes(appId)
          ) {
            return;
          }

          let btn = Main.dock.create_dockitem_from_appinfo(appId);
          if (btn) {
            btn.id = appId;
            btn.owner = item;
            item.icons.push(btn);
            newIconIds.push(appId);
            // console.log(`added ${btn.id}`);
            container.append(btn);
            btn.group = IconGroups.RUNNING_APPS;
          }
        });

        // remove closed apps
        currentIcons.forEach((c) => {
          if (!appIds.includes(c.id)) {
            c.parent?.remove(c);
          }
        });

        dock.update_icon_size();
        dock.sort_icons();
      }

      Main.shell.connectObject(
        "windows-update",
        () => {
          update_running_apps();
        },
        // 'window-opened', this.update_running_apps.bind(this),
        // 'window-closed', this.update_running_apps.bind(this),
        item,
      );

      item.connect("show", () => {
        update_running_apps();
      });

      item.connect("destroy", () => {
        let container = item.parent;
        let dock = item.root;
        let currentIcons = dock.get_icons(IconGroups.RUNNING_APPS, container);
        currentIcons.forEach((dockItem) => {
          dockItem.parent?.remove(dockItem);
        });
        Main.shell.disconnectObject(item);
      });

      return item;
    }

    createMountedVolumes(config) {
      let item = new Gtk.Box({ visible: false }); // placeholder

      function update_mounted_volumes() {
        let container = item.parent;
        let dock = item.root;
        if (!dock) return;

        let currentIcons = dock.get_icons(IconGroups.VOLUMES, container);
        let currentIconIds = currentIcons.map((icon) => icon.id);

        let mount_ids = Main.mounts.state?.mount_ids ?? [];
        let appIds = [];
        item.icons = [];

        mount_ids.forEach((m) => {
          let appInfo = getAppInfo(m);
          let appId = appInfo.id;

          if (currentIconIds.includes(appId)) {
            return;
          }

          appIds.push(appId);
          let btn = Main.dock.create_dockitem_from_appinfo(appId);
          if (btn) {
            btn.id = appId;
            btn.owner = item;
            item.icons.push(btn);
            // console.log(`added ${btn.id}`);
            container.append(btn);
            btn.group = IconGroups.VOLUMES;
          }
        });

        // remove closed apps
        currentIcons.forEach((c) => {
          if (!appIds.includes(c.id)) {
            // console.log(`removed ${c.id}`);
            c.parent?.remove(c);
          }
        });

        dock.update_icon_size();
        dock.sort_icons();
      }
      update_mounted_volumes();

      Main.mounts.connectObject(
        "mounts-update",
        () => {
          update_mounted_volumes();
        },
        item,
      );
      Main.mounts.sync();

      item.connect("show", () => {
        update_mounted_volumes();
      });

      item.connect("destroy", () => {
        let container = item.parent;
        let dock = item.root;
        let currentIcons = dock.get_icons(IconGroups.VOLUMES, container);
        currentIcons.forEach((dockItem) => {
          dockItem.parent?.remove(dockItem);
        });
        Main.mounts.disconnectObject(item);
      });

      return item;
    }

    disable() {
      super.disable();
    }
  },
);

export default DockItemsExtension;
