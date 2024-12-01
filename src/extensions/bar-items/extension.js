import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

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

class BarItemsExtension {
  enable() {
    let items = [];

    {
      let logo = new Main.panel.PanelItem();
      logo.add_css_class('logo');
      logo.set_label(getOSName());
      Main.panel.lead.append(logo);
    }

    {
      let item = new Main.panel.PanelItem();
      item.set_label('Hello');
      Main.panel.trail.append(item);
    }

    {
      let clock = new Main.panel.PanelItem();
      clock.add_css_class('clock');
      clock.set_label('Clock');
      Main.panel.center.append(clock);

      const updateClock = () => {
        let dt = formatDate(new Date());
        clock.set_label(dt);
      };
      this.clockTimer = Main.timer.runLoop(updateClock, 1000 * 1, 'clockTimer');
      updateClock();
    }

    {
      let power = new Main.panel.PanelItem();
      power.add_css_class('power');
      power.set_label('power');
      Main.panel.trail.append(power);

      Main.power.subscribe(this, 'power-update', (state) => {
        // power.set_label(`${state.fillLevel}%`);
        power.set_label(``);
        power.set_icon(state.icon);
      });
      Main.power.sync();
    }

    {
      let volume = new Main.panel.PanelItem();
      volume.add_css_class('volume');
      volume.set_label('volume');
      Main.panel.trail.append(volume);

      Main.volume.subscribe(this, 'volume-update', (state) => {
        volume.set_label(``);
        volume.set_icon(state.icon);
      });
      Main.volume.sync();
    }

    {
      let mic = new Main.panel.PanelItem();
      mic.add_css_class('mic');
      mic.set_label('mic');
      Main.panel.trail.append(mic);

      Main.mic.subscribe(this, 'mic-update', (state) => {
        mic.set_label(``);
        mic.set_icon(state.icon);
      });
      Main.mic.sync();
    }

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
      Main.trash.subscribe(this, 'trash-update', (state) => {
        if (state.full) {
          trash.set_icon('user-trash-full');
        } else {
          trash.set_icon('user-trash');
        }
      });
      Main.trash.sync();
    }
  }

  disable() {
    Main.power.unsubscribe(this);
    Main.volume.unsubscribe(this);
    Main.mic.unsubscribe(this);
    if (this.clockTimer) {
      Main.timer.cancel(this.clockTimer);
      this.clockTimer = null;
    }
  }

  preferences() {}
}

const Extension = BarItemsExtension;
export { Extension };

// let network = new PanelItem();
// network.add_css_class('network');
// network.set_label('network');
