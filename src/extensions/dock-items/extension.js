import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../../lib/extensionInterface.js';
import { PopupMenu } from '../../lib/popupMenu.js';
import { IconGroups } from '../../dock.js';

const DockItemsExtension = GObject.registerClass(
  class DockItemsExtension extends Extension {
    enable() {
      super.enable();
      this.attachDockItems();

      Main.dock.connect('notify::enabled', () => {
        if (Main.dock.enabled) {
          this.attachDockItems();
        } else {
          this.dockItems = null;
        }
      });
    }

    createAppsItem() {
      let appInfo = {
        id: 'fuzzel',
        icon_name: 'view-app-grid-symbolic',
        title: 'Fuzzel',
        exec: `fuzzel`,
      };
      let apps = Main.dock.add_icon_from_app(appInfo);
      if (apps) {
        apps.group = IconGroups.HEAD;
      }
      return apps;
    }

    createTrashItem() {
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
      let trash = Main.dock.add_icon_from_app(appInfo);
      if (trash) {
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

    attachDockItems() {
      if (!Main.dock.enabled || this.dockItems) return;

      this.dockItems = [];

      {
        let item = this.createAppsItem();
        Main.dock.lead.append(item);
        this.dockItems.push(item);
      }

      {
        let item = this.createTrashItem();
        Main.dock.center.append(item);
        this.dockItems.push(item);
      }

      Main.dock.sort_icons();
    }

    detachDockItems() {
      (this.dockItems || []).forEach((item) => {
        item.parent?.remove(item);
      });
      this.dockItems = null;
    }

    disable() {
      super.disable();
      this.detachDockItems();
    }
  },
);

export default DockItemsExtension;
