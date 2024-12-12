import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../../lib/extensionInterface.js';
import { PopupMenu } from '../../lib/popupMenu.js';
import { IconGroups } from '../../dock.js';

function getOSIcon() {
  let icons = [
    'archlinux',
    'fedora',
    'linuxmint',
    'ubuntu',
    'debian',
    'kalilinux',
    'manjaro',
    'zorin',
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

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Get month (0-11), add 1 and pad with leading zero
  const day = String(date.getDate()).padStart(2, '0'); // Get day and pad with leading zero
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatTimeToString(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours}h ${minutes}m`;
}

const BarItemsExtension = GObject.registerClass(
  class BarItemsExtension extends Extension {
    enable() {
      super.enable();

      this.name = 'baritems';

      let prefix = this.name.toLowerCase();
      this.settings = Main.settings;
      this.settingsMap = {
        [`${prefix}-lead-items`]: this.retachPanelItems.bind(this),
        [`${prefix}-center-items`]: this.retachPanelItems.bind(this),
        [`${prefix}-trail-items`]: this.retachPanelItems.bind(this),
      };
      this.load_settings();

      this.attachPanelItems();
      Main.panel.connect('notify::enabled', () => {
        if (Main.panel.enabled) {
          this.attachPanelItems();
        } else {
          this.panelItems = null;
        }
      });
    }

    createLogo() {
      let logo = new Main.panel.PanelItem();
      logo.add_css_class('logo');
      // logo.set_label(getOSName());
      // logo.set_label(getShorterOSName());
      logo.set_icon(getOSIcon());
      return logo;
    }

    createHello() {
      let item = new Main.panel.PanelItem();
      item.set_label('Hello');
      return item;
    }

    createClock() {
      // this supports only one clock!
      let clock = new Main.panel.PanelItem();
      clock.add_css_class('clock');
      clock.set_label('Clock');

      const updateClock = () => {
        let dt = formatDate(new Date());
        clock.set_label(dt);
      };
      this.clockTimer = Main.timer.runLoop(updateClock, 1000 * 1, 'clockTimer');
      updateClock();
      return clock;
    }

    createNetworkIndicator() {
      let network = new Main.panel.PanelItem();
      network.add_css_class('network');
      network.set_label('network');

      Main.network.connectObject(
        'network-update',
        () => {
          let state = Main.network.state;
          network.set_label(``);
          network.set_icon(state.icon);
          // network.visible = state.visible;
        },
        this,
      );
      Main.network.sync();

      let menu = new PopupMenu({
        has_arrow: true,
      });

      let w = new Gtk.Label();
      menu.child.append(w);
      network.append(menu);

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        let state = Main.network.state;
        let source = Main.network.indicator._primaryIndicatorBinding.source;
        if (source) {
          w.set_label(`${source.title} ${state.id ?? source.subtitle}`);
          menu.popup();
          return;
        }
      });
      network.add_controller(evt);

      {
        let evt = new Gtk.GestureClick();
        evt.set_button(3); // right click
        evt.connect('pressed', (actor, count) => {
          let state = Main.network.state;
          if (state.address) {
            w.set_label(state.address);
            menu.popup();
            return;
          }
        });
        network.add_controller(evt);
      }
      return network;
    }

    createPowerIndicator() {
      let power = new Main.panel.PanelItem();
      power.add_css_class('power');
      power.set_label('power');

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

      let menu = new PopupMenu({
        has_arrow: true,
      });

      let w = new Gtk.Label();
      menu.child.append(w);
      power.append(menu);

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        if (Main.power.state?.fillLevel) {
          let timeTo = '';
          if (Main.power.state.timeToFull) {
            timeTo = `${formatTimeToString(Main.power.state.timeToFull)} to full`;
          } else if (Main.power.state.timeToEmpty) {
            timeTo = `${formatTimeToString(Main.power.state.timeToEmpty)} to empty`;
          }
          w.set_label(
            `${Main.power.state.fillLevel}% ${Main.power.state.chargingState} ${timeTo}`,
          );
        }
        menu.popup();
      });
      power.add_controller(evt);
      return power;
    }

    createVolumeIndicator() {
      let volume = new Main.panel.PanelItem();
      volume.add_css_class('volume');
      volume.set_label('volume');

      let menu = new PopupMenu({
        has_arrow: true,
      });

      let builder = new Gtk.Builder();
      builder.add_from_file(`${this.path}/ui/volume.ui`);

      let widget = builder.get_object('volume-widget');
      let w = builder.get_object('volume');
      let l = builder.get_object('volume-label');
      let t = builder.get_object('volume-toggle');
      l.set_size_request(40, -1);
      widget.parent.remove(widget);
      menu.child.append(widget);
      volume.append(menu);

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        menu.popup();
      });
      volume.add_controller(evt);

      let updateVolume = () => {
        this._debounceVolume = Main.loTimer.debounce(
          Main.loTimer,
          () => {
            let value = w.get_value();
            Main.volume._stream.volume = Main.volume.state.max_volume * value;
          },
          5,
          this._debounceVolume,
        );
      };

      w.connect('value-changed', (w) => {
        updateVolume();
      });
      t.connect('clicked', (t) => {
        let stream = Main.volume._stream;
        let control = Main.volume._control;
        if (!stream || !control) return;
        const { isMuted } = stream;
        if (isMuted && stream.volume === 0) {
          stream.volume = 0.4 * control.get_vol_max_norm();
          stream.push_volume();
        }
        stream.change_is_muted(!isMuted);
      });

      Main.volume.connectObject(
        'volume-update',
        () => {
          let state = Main.volume.state;
          volume.set_label(``);
          volume.set_icon(state.icon);
          t.set_icon_name(state.icon);
          w.set_value(state.level / 100);
          l.set_label(`${Math.floor(state.level)}%`);
          if (state.is_muted) {
            l.set_label(`0%`);
          }
          w.set_sensitive(!state.is_muted);
          // console.log(state);
        },
        this,
      );
      Main.volume.sync();
      return volume;
    }

    createMicIndicator() {
      let mic = new Main.panel.PanelItem();
      mic.add_css_class('mic');
      mic.set_label('mic');

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

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        Main.mic._stream['is-muted'] = !Main.mic._stream['is-muted'];
      });
      mic.add_controller(evt);
      return mic;
    }

    createInhibitorIndicator() {
      let inhibitor = new Main.panel.PanelItem();
      inhibitor.add_css_class('inhibitor');
      inhibitor.set_label('inhibitor');

      Main.inhibitor.connectObject(
        'inhibitor-update',
        () => {
          let state = Main.inhibitor.state;
          inhibitor.set_label(``);
          inhibitor.set_icon(state.icon);
        },
        this,
      );
      Main.inhibitor.sync();

      let evt = new Gtk.GestureClick();
      evt.connect('pressed', (actor, count) => {
        Main.inhibitor.toggle();
      });
      inhibitor.add_controller(evt);
      return inhibitor;
    }

    attachPanelItems() {
      if (!Main.panel.enabled || this.panelItems) return;

      this.panelItems = [];

      const itemsMap = {
        logo: this.createLogo.bind(this),
        hello: this.createHello.bind(this),
        clock: this.createClock.bind(this),
        network: this.createNetworkIndicator.bind(this),
        power: this.createPowerIndicator.bind(this),
        volume: this.createVolumeIndicator.bind(this),
        mic: this.createMicIndicator.bind(this),
        inhibitor: this.createInhibitorIndicator.bind(this),
      };

      const areaMap = {
        lead: 'LEAD_ITEMS',
        center: 'CENTER_ITEMS',
        trail: 'TRAIL_ITEMS',
      };

      try {
        Object.keys(areaMap).forEach((k) => {
          let source = this[areaMap[k]] ?? [];
          source.forEach((item, idx) => {
            let create = itemsMap[item];
            if (create) {
              let item = create();
              item.sort_order = idx;
              if (item) {
                Main.panel[k].append(item);
                this.panelItems.push(item);
              }
            }
          });
        });
      } catch (err) {
        console.log(err);
      }

      Main.panel.window.sort_icons();
    }

    detachPanelItems() {
      if (!this.panelItems) return;

      (this.panelItems || []).forEach((item) => {
        item.parent?.remove(item);
      });
      this.panelItems = null;
    }

    retachPanelItems() {
      this.detachPanelItems();
      this.attachPanelItems();
    }

    disable() {
      super.disable();
      this.detachPanelItems();
      Main.power.disconnectObject(this);
      Main.volume.disconnectObject(this);
      Main.mic.disconnectObject(this);
      Main.settings.disconnectObject(this);

      // cleanup timers
      if (this.clockTimer) {
        Main.timer.cancel(this.clockTimer);
        this.clockTimer = null;
      }
      if (this._debounceVolume) {
        Main.loTimer.cancel(this._debounceVolume);
        this._debounceVolume = null;
      }
    }
  },
);

export default BarItemsExtension;
