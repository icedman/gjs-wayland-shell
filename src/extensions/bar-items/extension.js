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
    _init(params) {
      super._init(params);
      this.itemsMap = {};
      this.externalItemsMap = {};
    }

    enable() {
      this.name = 'baritems';

      let prefix = 'panel';
      this.settingsPrefix = prefix;
      this.settings = Main.settings;
      this.settingsMap = {
        [`${prefix}-lead-items`]: () => {
          this.reattachPanelItems(Main.panel, this);
        },
        [`${prefix}-center-items`]: () => {
          this.reattachPanelItems(Main.panel, this);
        },
        [`${prefix}-trail-items`]: () => {
          this.reattachPanelItems(Main.panel, this);
        },
      };
      this.load_settings(this.setting, this.settingsMap, this.settingsPrefix);

      this.itemsMap = {
        logo: this.createLogo.bind(this),
        hello: this.createHello.bind(this),
        clock: this.createClock.bind(this),
        network: this.createNetworkIndicator.bind(this),
        power: this.createPowerIndicator.bind(this),
        volume: this.createVolumeIndicator.bind(this),
        mic: this.createMicIndicator.bind(this),
        brightness: this.createBrightnessIndicator.bind(this),
        inhibitor: this.createInhibitorIndicator.bind(this),
      };

      this.attachPanelItems(Main.panel, this);
      Main.panel.connect('notify::enabled', () => {
        if (Main.panel.enabled) {
          this.attachPanelItems(Main.panel, this);
        } else {
          Main.panel._panelItems = null;
        }
      });

      super.enable();
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
      clock.onUpdate = (w, s) => {};
      const updateClock = () => {
        let d = new Date();
        let dt = formatDate(new Date());
        clock.set_label(dt);
        clock.onUpdate(clock, { date: d });
      };
      clock.clockTimer = Main.timer.runLoop(
        updateClock,
        1000 * 1,
        'clockTimer',
      );
      updateClock();

      clock.connect('destroy', () => {
        if (clock.clockTimer) {
          Main.timer.cancel(clock.clockTimer);
          clock.clockTimer = null;
        }
      });
      return clock;
    }

    createNetworkIndicator() {
      let network = new Main.panel.PanelItem();
      network.add_css_class('network');
      network.set_label('network');
      network.onUpdate = (w, s) => {};
      Main.network.connectObject(
        'network-update',
        () => {
          let state = Main.network.state;
          network.set_label(``);
          network.set_icon(state.icon);
          // network.visible = state.visible;
          network.onUpdate(network, state);
        },
        this,
      );
      Main.network.sync();

      let menu = new PopupMenu({
        has_arrow: true,
      });

      // let w = new Gtk.Label();
      // menu.child.append(w);
      // network.append(menu);
      let builder = new Gtk.Builder();
      builder.add_from_file(`${this.path}/ui/network.ui`);

      let widget = builder.get_object('network-widget');
      let i = builder.get_object('network-icon');
      let l = builder.get_object('network-label');
      l.set_size_request(40, -1);
      widget.parent.remove(widget);
      menu.child.append(widget);
      network.menu = menu;
      network.append(menu);

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        let state = Main.network.state;
        let source = Main.network.indicator._primaryIndicatorBinding.source;
        if (source) {
          i.set_label(`${source.title} ${state.id ?? source.subtitle}`);
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
      power.onUpdate = (w, s) => {};

      let menu = new PopupMenu({
        has_arrow: true,
      });

      let builder = new Gtk.Builder();
      builder.add_from_file(`${this.path}/ui/power.ui`);

      let widget = builder.get_object('power-widget');
      let i = builder.get_object('power-icon');
      let l = builder.get_object('power-label');
      l.set_size_request(40, -1);
      widget.parent.remove(widget);
      menu.child.append(widget);
      power.append(menu);

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        let state = Main.power.state;
        if (state?.fillLevel) {
          let timeTo = '';
          if (state.timeToFull) {
            timeTo = `${formatTimeToString(state.timeToFull)} to full`;
          } else if (state.timeToEmpty) {
            timeTo = `${formatTimeToString(state.timeToEmpty)} to empty`;
          }
          i.set_label(`${state.fillLevel}% ${state.chargingState} ${timeTo}`);
        }
        menu.popup();
      });
      power.add_controller(evt);

      Main.power.connectObject(
        'power-update',
        () => {
          let state = Main.power.state;
          // power.set_label(`${state.fillLevel}%`);
          power.set_label(``);
          power.set_icon(state.icon);
          // i.child?.set_from_icon_name(state.icon);
          // i.child.visible = false;
          i.set_child(null);
          this.onUpdate(power, state);
        },
        power,
      );
      power.connect('destroy', () => {
        Main.power.disconnectObject(power);
      });
      Main.power.sync();
      return power;
    }

    createVolumeIndicator() {
      let volume = new Main.panel.PanelItem();
      volume.add_css_class('volume');
      volume.set_label('volume');
      volume.onUpdate = (w, s) => {};

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
      volume.menu = menu;
      volume.append(menu);

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        menu.popup();
      });
      volume.add_controller(evt);

      let updateVolume = () => {
        volume._debounceVolume = Main.loTimer.debounce(
          Main.loTimer,
          () => {
            let value = w.get_value();
            Main.volume._stream.volume = Main.volume.state.max_volume * value;
          },
          5,
          volume._debounceVolume,
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
          volume.onUpdate(volume, state);
        },
        this,
      );
      volume.connect('destroy', () => {
        if (volume._debounceVolume) {
          Main.loTimer.cancel(volume._debounceVolume);
          volume._debounceVolume = null;
        }
        Main.volume.disconnectObject(volume);
      });

      Main.volume.sync();
      return volume;
    }

    createMicIndicator() {
      let mic = new Main.panel.PanelItem();
      mic.add_css_class('mic');
      mic.set_label('mic');
      mic.onMicUpdate = (w, s) => {};

      Main.mic.connectObject(
        'mic-update',
        () => {
          let state = Main.mic.state;
          mic.set_label(``);
          mic.set_icon(state.icon);
          mic.onMicUpdate(mic, state);
        },
        this,
      );
      mic.connect('destroy', () => {
        Main.mic.disconnectObject(mic);
      });

      Main.mic.sync();

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        Main.mic._stream['is-muted'] = !Main.mic._stream['is-muted'];
      });
      mic.add_controller(evt);
      return mic;
    }

    createBrightnessIndicator() {
      let brightness = new Main.panel.PanelItem();
      brightness.add_css_class('brightness');
      brightness.set_label('brightness');
      brightness.onUpdate = (w, s) => {};

      let menu = new PopupMenu({
        has_arrow: true,
      });

      let builder = new Gtk.Builder();
      builder.add_from_file(`${this.path}/ui/brightness.ui`);

      let widget = builder.get_object('brightness-widget');
      let w = builder.get_object('brightness');
      let l = builder.get_object('brightness-label');
      // let t = builder.get_object('brightness-toggle');
      l.set_size_request(40, -1);
      widget.parent.remove(widget);
      menu.child.append(widget);
      brightness.append(menu);

      let evt = new Gtk.GestureClick();
      // evt.set_button(3); // right click
      evt.connect('pressed', (actor, count) => {
        menu.popup();
      });
      brightness.add_controller(evt);

      let updateBrightness = () => {
        brightness._debounceBrightness = Main.loTimer.debounce(
          Main.loTimer,
          () => {
            let value = w.get_value() * 100;
            if (value < 5) {
              value = 5;
            }
            if (value > 100) {
              value = 100;
            }
            Main.brightness._proxy.Brightness = value;
          },
          5,
          brightness._debounceBrightness,
        );
      };

      w.connect('value-changed', (w) => {
        updateBrightness();
      });

      Main.brightness.connectObject(
        'brightness-update',
        () => {
          let state = Main.brightness.state;
          brightness.set_label(``);
          brightness.set_icon(state.icon);
          // brightness.icon.opacity = (state.brightness / 100);
          w.set_value(state.brightness / 100);
          l.set_label(`${Math.floor(state.brightness)}%`);
          brightness.visible = state.visible;
          brightness.onUpdate(brightness, state);
        },
        this,
      );
      brightness.connect('destroy', () => {
        if (brightness._debounceBrightness) {
          Main.loTimer.cancel(brightness._debounceBrightness);
          brightness._debounceBrightness = null;
        }
        Main.brightness.disconnectObject(brightness);
      });
      Main.brightness.sync();
      // brightness.visible = false;
      return brightness;
    }

    createInhibitorIndicator() {
      let inhibitor = new Main.panel.PanelItem();
      inhibitor.add_css_class('inhibitor');
      inhibitor.set_label('inhibitor');
      inhibitor.onUpdate = (w, s) => {};

      Main.inhibitor.connectObject(
        'inhibitor-update',
        () => {
          let state = Main.inhibitor.state;
          inhibitor.set_label(``);
          inhibitor.set_icon(state.icon);
          inhibitor.onUpdate(inhibitor, state);
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

    attachPanelItems(targetPanel, itemsList) {
      if (!itemsList) {
        itemsList = targetPanel;
      }
      if (!targetPanel || !targetPanel.enabled || targetPanel._panelItems)
        return;

      targetPanel._panelItems = [];

      const areaMap = {
        lead: 'LEAD_ITEMS',
        center: 'CENTER_ITEMS',
        trail: 'TRAIL_ITEMS',
      };

      try {
        Object.keys(areaMap).forEach((k) => {
          let source = itemsList[areaMap[k]] ?? [];
          source.forEach((item, idx) => {
            let create = this.externalItemsMap[item] ?? this.itemsMap[item];
            if (create) {
              let item = create();
              if (item.sort_order == undefined) {
                item.sort_order = idx;
              }
              if (item) {
                targetPanel[k].append(item);
                targetPanel._panelItems.push(item);
              }
            }
          });
        });
      } catch (err) {
        console.log(err);
      }

      Main.panel.window.sort_icons();
    }

    detachPanelItems(targetPanel) {
      if (!targetPanel || !targetPanel._panelItems) return;

      (targetPanel._panelItems || []).forEach((item) => {
        item.parent?.remove(item);
        item.emit('destroy');
      });
      targetPanel._panelItems = null;
    }

    reattachPanelItems(target, itemsList) {
      this.detachPanelItems(target);
      this.attachPanelItems(target, itemsList);
    }

    registerPanelItem(name, createFunc) {
      this.externalItemsMap[name] = createFunc;
      if (this.enabled) {
        this.reattachPanelItems(Main.panel, this);
      }
    }

    disable() {
      super.disable();
      this.detachPanelItems(Main.panel);
      Main.settings.disconnectObject(this);
    }
  },
);

export default BarItemsExtension;
