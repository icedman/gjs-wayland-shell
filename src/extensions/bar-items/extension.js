import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../../lib/extensionInterface.js';

function getOSName() {
  const prettyName = GLib.get_os_info('PRETTY_NAME');
  if (prettyName) return prettyName;

  const name = GLib.get_os_info('NAME');
  const version = GLib.get_os_info('VERSION');
  if (name) return version ? `${name} ${version}` : name;

  return 'Linux';
}

function getShorterOSName() {
  return getOSName().split('(')[0].trim();
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Get month (0-11), add 1 and pad with leading zero
  const day = String(date.getDate()).padStart(2, '0'); // Get day and pad with leading zero
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

const BarItemsExtension = GObject.registerClass(
  class BarItemsExtension extends Extension {
    enable() {
      super.enable();
      this.attachPanelItems();
      this.attachDockItems();

      Main.panel.connect('notify::enabled', () => {
        if (Main.panel.enabled) {
          this.attachPanelItems();
        } else {
          this.panelItems = null;
        }
      });
      Main.dock.connect('notify::enabled', () => {
        if (Main.dock.enabled) {
          this.attachDockItems();
        } else {
          this.dockItems = null;
        }
      });
    }

    attachPanelItems() {
      if (!Main.panel.enabled || this.panelItems) return;

      this.panelItems = [];

      {
        let logo = new Main.panel.PanelItem();
        logo.add_css_class('logo');
        logo.set_label(getOSName());
        Main.panel.lead.append(logo);
        this.panelItems.push(logo);
      }

      // {
      //   let item = new Main.panel.PanelItem();
      //   item.set_label('Hello');
      //   Main.panel.trail.append(item);
      //   this.panelItems.push(item);

      //   let evt = new Gtk.GestureClick();
      //   evt.set_button(3); // right click
      //   evt.connect('pressed', (actor, count) => {
      //     console.log('Hello');
      //   });
      //   item.add_controller(evt);
      // }

      {
        let clock = new Main.panel.PanelItem();
        clock.add_css_class('clock');
        clock.set_label('Clock');
        Main.panel.center.append(clock);
        this.panelItems.push(clock);

        const updateClock = () => {
          let dt = formatDate(new Date());
          clock.set_label(dt);
        };
        this.clockTimer = Main.timer.runLoop(
          updateClock,
          1000 * 1,
          'clockTimer',
        );
        updateClock();
      }

      {
        let network = new Main.panel.PanelItem();
        network.add_css_class('network');
        network.set_label('network');
        Main.panel.trail.append(network);
        this.panelItems.push(network);

        Main.network.connectObject(
          'network-update',
          () => {
            let state = Main.network.state;
            network.set_label(``);
            network.set_icon(state.icon);
          },
          this,
        );
        Main.network.sync();
      }

      {
        let power = new Main.panel.PanelItem();
        power.add_css_class('power');
        power.set_label('power');
        Main.panel.trail.append(power);
        this.panelItems.push(power);

        Main.power.connectObject(
          'power-update',
          () => {
            let state = Main.power.state;
            // power.set_label(`${state.fillLevel}%`);
            power.set_label(``);
            power.set_icon(state.icon);
          },
          this,
        );
        Main.power.sync();
      }

      {
        let volume = new Main.panel.PanelItem();
        volume.add_css_class('volume');
        volume.set_label('volume');
        Main.panel.trail.append(volume);
        this.panelItems.push(volume);

        Main.volume.connectObject(
          'volume-update',
          () => {
            let state = Main.volume.state;
            volume.set_label(``);
            volume.set_icon(state.icon);
          },
          this,
        );
        Main.volume.sync();
      }

      {
        let mic = new Main.panel.PanelItem();
        mic.add_css_class('mic');
        mic.set_label('mic');
        Main.panel.trail.append(mic);
        this.panelItems.push(mic);

        Main.mic.connectObject(
          'mic-update',
          () => {
            let state = Main.mic.state;
            mic.set_label(``);
            mic.set_icon(state.icon);
          },
          this,
        );
        Main.mic.sync();
      }
    }

    detachPanelItems() {
      if (!this.panelItems) return;

      (this.panelItems || []).forEach((item) => {
        item.parent?.remove(item);
      });
      this.panelItems = null;
    }

    attachDockItems() {
      if (!Main.dock.enabled || this.dockItems) return;

      this.dockItems = [];

      {
        let appInfo = {
          id: 'trash',
          icon_name: 'user-trash',
          title: 'Trash',
          cmd: `nautilus --select trash:///`,
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
        let trash = new Main.dock.DockItem({ app: appInfo });
        // trash.set_icon('/usr/share/fedora-logos/fedora_logo_darkbackground.svg');
        Main.dock.center.append(trash);
        this.dockItems.push(trash);

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
      }
    }

    detachDockItems() {
      (this.dockItems || []).forEach((item) => {
        item.parent?.remove(item);
      });
      this.dockItems = null;
    }

    disable() {
      super.disable();
      this.detachPanelItems();
      this.detachDockItems();
      Main.power.disconnectObject(this);
      Main.volume.disconnectObject(this);
      Main.mic.disconnectObject(this);
      if (this.clockTimer) {
        Main.timer.cancel(this.clockTimer);
        this.clockTimer = null;
      }
    }
  },
);

export default BarItemsExtension;
