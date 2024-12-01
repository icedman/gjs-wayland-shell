import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';

import { DockPanel } from './dock.js';

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

export const PanelItem = GObject.registerClass(
  class PanelItem extends Gtk.Box {
    _init(params) {
      super._init({
        name: 'PanelItem',
        ...params,
      });

      this.icon = new Gtk.Image();
      this.icon.add_css_class('icon');
      this.icon.set_visible(false);
      this.append(this.icon);
      this.label = new Gtk.Label();
      this.label.add_css_class('label');
      this.label.set_visible(false);
      this.append(this.label);
    }

    set_label(label) {
      this.label.set_label(label);
      this.label.set_visible(label);
    }

    set_icon(icon) {
      this.icon.set_visible(icon);
      if (icon && icon.startsWith('/')) {
        this.icon.set_from_file(icon);
      } else {
        this.icon.set_from_icon_name(icon);
      }
    }
  },
);

export const Panel = GObject.registerClass(
  class Panel extends GObject.Object {
    _init(params) {
      this.name = params.name ?? 'Panel';
      delete params?.name;

      super._init({
        ...params,
      });
    }

    init() {
      this.enable();
    }

    enable() {
      this.load_settings();

      this.window = new DockPanel({
        title: this.name,
        name: 'Bar',
        hexpand: true,
        vexpand: true,
        default_width: 20,
        default_height: 20,
      });

      this.container = this.window.container;
      this.lead = this.window.lead;
      this.trail = this.window.trail;
      this.center = this.window.center;

      this.container.set_homogeneous(true);

      this.window.add_css_class('startup');

      // apply settings before presenting
      this.update_icons();

      this.window.present();

      setTimeout(() => {
        this.window.remove_css_class('startup');
      }, 0);
    }

    disable() {
      this.window.free();
      this.window = null;
    }

    load_settings() {}

    update_icons() {
      let logo = new PanelItem();
      logo.add_css_class('logo');
      logo.set_label(getOSName());
      // logo.set_icon('/usr/share/fedora-logos/fedora_logo_darkbackground.svg');
      this.lead.append(logo);

      let clock = new PanelItem();
      clock.add_css_class('clock');
      clock.set_label('Clock');
      this.center.append(clock);

      let power = new PanelItem();
      power.add_css_class('power');
      power.set_label('power');

      let network = new PanelItem();
      network.add_css_class('network');
      network.set_label('network');

      let volume = new PanelItem();
      volume.add_css_class('volume');
      volume.set_label('volume');

      let mic = new PanelItem();
      mic.add_css_class('mic');
      mic.set_label('mic');

      this.clock = clock;

      this.subscriptions = [];
      Main.power.subscribe(this, 'power-update', (state) => {
        // power.set_label(`${state.fillLevel}%`);
        power.set_label(``);
        power.set_icon(state.icon);
      });
      Main.power.sync();
      this.subscriptions.push(Main.power);

      Main.network.subscribe(this, 'network-update', (state) => {
        // network.set_label(`${state.connectivity} ${state.enabled}`);
        network.set_label(``);
        network.set_icon(state.icon);
      });
      Main.network.sync();
      this.subscriptions.push(Main.network);

      Main.volume.subscribe(this, 'volume-update', (state) => {
        // volume.set_label(`${state.connectivity} ${state.enabled}`);
        volume.set_label(``);
        volume.set_icon(state.icon);
      });
      Main.volume.sync();
      this.subscriptions.push(Main.volume);

      Main.mic.subscribe(this, 'mic-update', (state) => {
        // mic.set_label(`${state.connectivity} ${state.enabled}`);
        mic.set_label(``);
        mic.set_icon(state.icon);
      });
      Main.mic.sync();
      this.subscriptions.push(Main.mic);

      [volume, mic, network, power].forEach((widget) => {
        this.trail.append(widget);
      });

      setInterval(this.update.bind(this), 1000 * 60);
      this.update();
    }

    update() {
      let dt = formatDate(new Date());
      this.clock.set_label(dt);
    }
  },
);

export default Panel;
