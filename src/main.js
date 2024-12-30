import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { DockPanel } from './lib/dock.js';
import { DockItem, DockAppItem, PanelItem } from './lib/dockItem.js';

import App from './app.js';
import Dock from './dock.js';
import Panel from './panel.js';
import Search from './search.js';
import AppsGrid from './appsGrid.js';
import Popups from './popups.js';
import WindowManagerService from './windowManager.js';

import Power from './services/power.js';
import PowerProfiles from './services/powerProfiles.js';
import Brightness from './services/brightness.js';
import Monitors from './services/monitors.js';
import Inhibitor from './services/inhibitor.js';
import Login1 from './services/login1.js';
import Network from './services/network.js';
import Bluetooth from './services/bluetooth.js';
import Mounts from './services/mounts.js';
import { Volume, Mic } from './services/volume.js';
import Trash from './services/trash.js';
import Style from './services/style.js';
import DBus from './services/dbus.js';
import SystemApps from './services/systemApps.js';
import SystemStats from './services/systemStats.js';
import Timer from './lib/timer.js';
import Factory from './lib/factory.js';

import { Extension } from './lib/extensionInterface.js';

import './lib/environment.js';

// Initialize Gtk before you start calling anything from the import
Gtk.init();

globalThis.Main = {
  app: new App(),

  // timers
  timer: new Timer('loop timer'),
  loTimer: new Timer('lo-res  timer'),
  hiTimer: new Timer('hi-res timer'),

  // ui
  factory: new Factory(),
  dock: new Dock({ name: 'Dock' }),
  panel: new Panel({ name: 'Panel' }),
  search: new Search({ name: 'Search' }),
  appsGrid: new AppsGrid({ name: 'Apps-Grid' }),
  popups: new Popups({ name: 'Popups' }),

  // services
  shell: new WindowManagerService(),
  apps: new SystemApps(),
  monitors: new Monitors(),
  dbus: new DBus(),

  // indicators
  power: new Power(),
  powerProfiles: new PowerProfiles(),
  mounts: new Mounts(),
  brightness: new Brightness(),
  network: new Network(),
  bluetooth: new Bluetooth(),
  volume: new Volume(),
  mic: new Mic(),
  trash: new Trash(),
  inhibitor: new Inhibitor(),
  login1: new Login1(),

  // stats
  stats: new SystemStats(),

  style: new Style({
    initialStyles: [
      { name: 'app', path: './style.css' },
      // {
      //   name: 'user',
      //   path: `${GLib.getenv('HOME')}/.config/gws/style.css`,
      // },
    ],
  }),

  // extensions
  extensions: {},

  // settings
  settings: new Gio.Settings({ schema: 'com.github.icedman.gws' }),
  userSettings: {},

  // imports
  imports: {
    Extension,
    LayerShell,
    Dock: {
      DockItem,
      DockAppItem,
      PanelItem,
      DockPanel,
    },
  },
};

function demo() {
  {
    let d = new DockItem({ iconSize: 48 });
    d.set_label('hello');
    d.set_icon('user-trash');
    Main.dock.lead.append(d);
  }

  {
    let d = new DockAppItem({
      app: 'org.gnome.Calculator.desktop',
      iconSize: 48,
    });
    d.set_icon_size(48);
    Main.dock.lead.append(d);
  }
}

// Main.app.connect('ready', () => {
//   demo();
// });

Main.app.init();
Main.app.run([]);
