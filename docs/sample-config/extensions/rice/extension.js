import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

const Extension = Main.imports.Extension;

const Rice = GObject.registerClass(
  {},
  class Rice extends Extension {
    enable() {
      super.enable();

      // override apps at ~/.config/gws/settings.json
      /*
      {
        "favorite_apps": [
          "kitty.desktop",
          "org.gnome.Nautilus.desktop",
          "google-chrome.desktop",
          "org.mozilla.firefox.desktop",
          "org.gnome.Calendar.desktop",
          "org.gnome.clocks.desktop",
          "org.gnome.Software.desktop",
          "org.gnome.TextEditor.desktop"
        ]
      }
      */
      // Main.extensions['dock-items'].favorite_apps = Main.customSettings?.favorite_apps ?? favorite_apps;
      // Main.extensions['dock-items'].reattachDockItems();
    }

    _enable() {
      super.enable();

      this.dock = new Main.imports.Dock.DockPanel({
        name: 'Dock',
        customSettings: {
          'dock-location': 1,
          'edge-distance': 0,
        },
      });
      {
        this.dockItem = new Main.imports.Dock.DockItem({
          app: 'kitty.desktop',
        });
        // this.dock.trail.append(this.dockItem);
        this.dock.center.append(this.dockItem);
        Main.extensions['dock-items'].createTrashItem(this.dock.center);
      }
      this.dock.present();

      {
        // let center = new Gtk.Box();
        // let dockItem = new Main.imports.Dock.DockItem({app:'kitty.desktop'});
        // center.append(dockItem);
        // let panelItem = new Main.imports.Dock.PanelItem();
        // panelItem.set_label('hellow');
        // center.append(panelItem);
        // Main.dock.lead.append(center);
      }

      // Main.dock.window.leadSpacer.visible = false;

      {
        this.dockItem = new Main.imports.Dock.DockItem({
          app: 'kitty.desktop',
        });
        Main.dock.trail.append(this.dockItem);
        Main.dock.trail.add_css_class('icons-container');
      }
      // for(let i=0;i<8;i++)
      {
        Main.extensions['dock-items'].createRunningApps(Main.dock.lead);
        this.dockItem = new Main.imports.Dock.DockItem({
          app: 'kitty.desktop',
        });
        Main.dock.lead.append(this.dockItem);
        Main.dock.lead.add_css_class('icons-container');
      }

      Main.dock.window.queue_resize();
    }
    disable() {
      super.disable();
    }
  },
);

export default Rice;
