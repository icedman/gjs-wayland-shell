import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../../lib/extensionInterface.js';
import { PopupMenu } from '../../lib/popupMenu.js';
import { IconGroups } from '../../lib/dock.js';
import { createClock } from './clock.js';
import { createVolumeIndicator, createMicIndicator } from './audio.js';
import { createCpuStats, createMemoryStats, createDiskStats } from './stats.js';
import { createPowerIndicator, createBrightnessIndicator } from './power.js';
import { createNetworkIndicator } from './network.js';

function getOSIcon(config = {}) {
  let icons = [
    'archlinux',
    'fedora',
    'linuxmint',
    'ubuntu',
    'debian',
    'kalilinux',
    'manjaro',
    'zorin',
    ...(config.icons ?? []),
  ];
  let os = getShorterOSName().toLowerCase();
  for (let i = 0; i < icons.length; i++) {
    let icon = icons[i];
    if (os.includes(icon)) {
      return icon;
    }
  }
  return 'archlinux';
}

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

const BarItemsExtension = GObject.registerClass(
  class BarItemsExtension extends Extension {
    _init(params) {
      super._init(params);
      this.itemsMap = {};
      this.externalItemsMap = {};
    }

    enable() {
      Main.factory.registerProvider(
        'icon-label',
        this.createIconLabel.bind(this),
      );
      Main.factory.registerProvider('logo', this.createOSLogo.bind(this));
      Main.factory.registerProvider('clock', createClock.bind(this));

      Main.factory.registerProvider(
        'inhibitor',
        this.createInhibitorIndicator.bind(this),
      );

      // network
      Main.factory.registerProvider(
        'network',
        createNetworkIndicator.bind(this),
      );
      Main.factory.registerProvider(
        'bluetooth',
        this.createBluetoothIndicator.bind(this),
      );

      // audio
      Main.factory.registerProvider('volume', createVolumeIndicator.bind(this));
      Main.factory.registerProvider('mic', createMicIndicator.bind(this));

      // power
      Main.factory.registerProvider('power', createPowerIndicator.bind(this));
      Main.factory.registerProvider(
        'brightness',
        createBrightnessIndicator.bind(this),
      );

      // stats
      Main.factory.registerProvider('cpu-stats', createCpuStats.bind(this));
      Main.factory.registerProvider(
        'memory-stats',
        createMemoryStats.bind(this),
      );
      Main.factory.registerProvider('disk-stats', createDiskStats.bind(this));
      super.enable();
    }

    createIconLabel(config) {
      let item = Main.panel.create_panelitem(config);
      if (config['class-name']) {
        item.add_css_class(config['class-name']);
      }
      item.set_icon(config.icon);
      item.set_label(config.label);
      return item;
    }

    createOSLogo(config) {
      let logo = Main.panel.create_panelitem(config);
      if (config.showOSName) {
        logo.set_label(getOSName());
      }
      if (config.showShortOSName) {
        logo.set_label(getShorterOSName());
      }
      logo.set_icon(config.hideIcon ? '' : getOSIcon(config));
      return logo;
    }

    createInhibitorIndicator(config) {
      let inhibitor = Main.panel.create_panelitem(config);
      let inhibitorSevice = Main.inhibitor;

      inhibitorSevice.connectObject(
        'inhibitor-update',
        () => {
          let state = inhibitorSevice.state;
          inhibitor.set_label(``);
          if (config.icons) {
            inhibitor.set_icon(config.icons[state.icon_index] ?? state.icon);
          } else {
            inhibitor.set_icon(state.icon);
          }
        },
        inhibitor,
      );
      inhibitorSevice.sync();

      inhibitor.on_click = () => {
        inhibitorSevice.toggle();
      };

      inhibitor.connect('destroy', () => {
        inhibitorSevice.uninhibit();
        inhibitorSevice.disconnectObject(inhibitor);
      });
      return inhibitor;
    }

    createBluetoothIndicator(config) {
      let bluetooth = Main.panel.create_panelitem(config);
      let bluetoothSevice = Main.bluetooth;
      // bluetoothSevice.indicator._indicator.connect('notify::visible', () => {
      //   let icon = bluetoothSevice.indicator._primaryIndicator['icon-name'];
      //   bluetooth.set_icon(icon ?? bluetoothSevice.indicator._indicator.icon_name);
      // });

      function updateBluetooth() {
        // find any connected
        let icon = bluetoothSevice.indicator._primaryIndicator['icon-name'];
        let devices =
          Main.bluetooth.indicator.quickSettingsItems[0]._getSortedDevices();
        bluetooth.set_icon(icon);
        bluetooth.set_label('');
        devices.forEach((dev) => {
          if (dev.connected) {
            bluetooth.set_label(dev.name ?? '');
          }
        });
      }

      bluetoothSevice.indicator._primaryIndicator.connectObject(
        'notify::icon-name',
        () => {
          updateBluetooth();
        },
        bluetooth
      );

      bluetoothSevice.indicator._primaryIndicator._client.connectObject(
        'devices-changed',
        () => {
          updateBluetooth();
        },
        bluetooth
      );

      bluetooth.on_click = () => {
        // show menu
      };

      bluetooth.connect('destroy', () => {
        Main.bluetooth.disconnectObject(bluetooth);
      });

      return bluetooth;
    }

    disable() {
      super.disable();
      bluetoothSevice.indicator._primaryIndicator.disconnectObject(bluetooth);
      bluetoothSevice.indicator._primaryIndicator._client.disconnectObject(bluetooth);
    }
  },
);

export default BarItemsExtension;
