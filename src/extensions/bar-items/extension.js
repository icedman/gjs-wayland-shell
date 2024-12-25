import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../../lib/extensionInterface.js';
import { PopupMenu } from '../../lib/popupMenu.js';
import { IconGroups } from '../../lib/dock.js';

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

function formatDate(date, fmt = '%Y/%m/%d %H:%M') {
  const components = {
    '%Y': date.getFullYear(), // Full year
    '%y': String(date.getFullYear()).slice(-2), // Last two digits of year
    '%m': String(date.getMonth() + 1).padStart(2, '0'), // Month (01-12)
    '%d': String(date.getDate()).padStart(2, '0'), // Day of the month (01-31)
    '%H': String(date.getHours()).padStart(2, '0'), // Hour (00-23)
    '%I': String(date.getHours() % 12 || 12).padStart(2, '0'), // Hour (01-12)
    '%M': String(date.getMinutes()).padStart(2, '0'), // Minutes (00-59)
    '%S': String(date.getSeconds()).padStart(2, '0'), // Seconds (00-59)
    '%p': date.getHours() < 12 ? 'AM' : 'PM', // AM/PM
  };
  return fmt.replace(/%[YymdHIMSip]/g, (match) => components[match] || match);
}

function formatTimeToString(seconds, fmt = '%H:%M') {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const components = {
    '%H': `${hours}`.padStart(2, '0'),
    '%M': `${minutes}`.padStart(2, '0'),
    '%S': `${remainingSeconds}`.padStart(2, '0'),
  };
  return fmt.replace(/%[HMS]/g, (match) => components[match] || match);
}

function formatPowerToString(state, fmt = '%H:%M', config) {
  const components = {
    '%P': state.fillLevel,
  };

  // "formatAlt": "%level %remaining",
  // "formatToEmpty": "%R battery remaining",
  // "formatToFull": "%R left charging time"

  if (state.timeToEmpty) {
    fmt = formatTimeToString(state.timeToEmpty, fmt);
  }
  if (state.timeToFull) {
    fmt = formatTimeToString(state.timeToFull, fmt);
  }
  return fmt.replace(/%[P]/g, (match) => components[match] || match);
}

const BarItemsExtension = GObject.registerClass(
  class BarItemsExtension extends Extension {
    _init(params) {
      super._init(params);
      this.itemsMap = {};
      this.externalItemsMap = {};
    }

    enable() {
      Main.factory.registerProvider('logo', this.createLogo.bind(this));
      Main.factory.registerProvider('clock', this.createClock.bind(this));
      Main.factory.registerProvider(
        'network',
        this.createNetworkIndicator.bind(this),
      );
      Main.factory.registerProvider(
        'power',
        this.createPowerIndicator.bind(this),
      );
      Main.factory.registerProvider(
        'volume',
        this.createVolumeIndicator.bind(this),
      );
      Main.factory.registerProvider('mic', this.createMicIndicator.bind(this));
      Main.factory.registerProvider(
        'brightness',
        this.createBrightnessIndicator.bind(this),
      );
      Main.factory.registerProvider(
        'inhibitor',
        this.createInhibitorIndicator.bind(this),
      );
      super.enable();
    }

    createLogo(config) {
      let logo = Main.panel.create_panelitem();
      logo.add_css_class('logo');
      if (config.showOSName) {
        logo.set_label(getOSName());
      }
      if (config.showShortOSName) {
        logo.set_label(getShorterOSName());
      }
      logo.set_icon(config.hideIcon ? '' : getOSIcon(config));
      return logo;
    }

    createClock(config) {
      // this supports only one clock!
      let clock = Main.panel.create_panelitem();
      clock.add_css_class('clock');
      clock.set_label('Clock');
      const updateClock = () => {
        let d = new Date();
        let dt = formatDate(new Date(), config.format);
        clock.set_label(dt);
      };
      clock.clockTimer = Main.timer.runLoop(
        updateClock,
        1000 * 5, // << todo!
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

    createNetworkIndicator(config) {
      let network = Main.panel.create_panelitem();
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

      let menu = network.menu;
      menu.has_arrow = true;

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
      // network.append(menu);

      network.on_click = (count, btn) => {
        let state = Main.network.state;
        let source = Main.network.indicator._primaryIndicatorBinding.source;
        if (btn == 3 && state.address) {
          i.set_label(state.address);
          menu.popup();
          return;
        }
        if (source) {
          i.set_label(`${source.title} ${state.id ?? source.subtitle}`);
          menu.popup();
          return;
        }
      };

      return network;
    }

    createPowerIndicator(config) {
      let power = Main.panel.create_panelitem();
      power.add_css_class('power');
      power.set_label('power');

      let menu = power.menu;
      menu.has_arrow = true;

      let builder = new Gtk.Builder();
      builder.add_from_file(`${this.path}/ui/power.ui`);

      let widget = builder.get_object('power-widget');
      let i = builder.get_object('power-icon');
      let l = builder.get_object('power-label');
      l.set_size_request(40, -1);
      widget.parent.remove(widget);
      menu.child.append(widget);

      power.on_click = (count, btn) => {
        let state = {
          ...(Main.power.state ?? {}),
          profile: Main.powerProfiles.state ?? {},
        };
        if (state && state.profile && btn == 3) {
          i.set_label(state.profile.name ?? '???');
          menu.popup();
          return;
        }
        if (state && state.fillLevel) {
          let fmt = config.formatAlt;
          if (state.timeToFull) {
            fmt = config.formatAltToFull;
          }
          if (state.timeToEmpty) {
            fmt = config.formatAltToEmpty;
          }
          if (!fmt) {
            fmt = config.format;
          }
          let text = formatPowerToString(state, fmt, config).trim();
          if (text == '') return;
          i.set_label(text);
          menu.popup();
        }
      };

      function update_power() {
        let state = {
          ...(Main.power.state ?? {}),
          profile: Main.powerProfiles.state ?? {},
        };
        let text = formatPowerToString(state, config.format, config);
        if (text == '') {
          power.set_label(``);
        } else {
          power.set_label(text);
        }
        power.set_icon(state.icon);
        i.set_child(null);
      }

      Main.power.connectObject(
        'power-update',
        () => {
          update_power();
        },
        power,
      );
      Main.powerProfiles.connectObject(
        'power-profiles-update',
        () => {
          update_power();
        },
        power,
      );
      power.connect('destroy', () => {
        Main.power.disconnectObject(power);
        Main.powerProfiles.disconnectObject(power);
      });
      Main.power.sync();
      return power;
    }

    createVolumeIndicator(config) {
      let volume = Main.panel.create_panelitem();
      volume.add_css_class('volume');
      volume.set_label('volume');

      let menu = volume.menu;
      menu.has_arrow = true;

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
      // volume.append(menu);

      volume.on_click = () => {
        menu.popup();
      };

      let setVolume = () => {
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
        setVolume();
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

    createMicIndicator(config) {
      let mic = Main.panel.create_panelitem();
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

      mic.on_click = () => {
        Main.mic._stream['is-muted'] = !Main.mic._stream['is-muted'];
      };
      return mic;
    }

    createBrightnessIndicator(config) {
      let brightness = Main.panel.create_panelitem();
      brightness.add_css_class('brightness');
      brightness.set_label('brightness');

      let menu = brightness.menu;
      menu.has_arrow = true;

      let builder = new Gtk.Builder();
      builder.add_from_file(`${this.path}/ui/brightness.ui`);

      let widget = builder.get_object('brightness-widget');
      let w = builder.get_object('brightness');
      let l = builder.get_object('brightness-label');
      // let t = builder.get_object('brightness-toggle');
      l.set_size_request(40, -1);
      widget.parent.remove(widget);
      menu.child.append(widget);
      // brightness.append(menu);

      brightness.on_click = () => {
        menu.popup();
      };

      let setBrightness = () => {
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
        setBrightness();
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

    createInhibitorIndicator(config) {
      let inhibitor = Main.panel.create_panelitem();
      inhibitor.add_css_class('inhibitor');
      inhibitor.set_label('inhibitor');

      let inhibitorSevice = Main.inhibitor;

      inhibitorSevice.connectObject(
        'inhibitor-update',
        () => {
          let state = inhibitorSevice.state;
          inhibitor.set_label(``);
          inhibitor.set_icon(state.icon);
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

    disable() {
      super.disable();
      Main.settings.disconnectObject(this);
      Main.factory.unregisterProvider(this);
    }
  },
);

export default BarItemsExtension;
