import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';

function formatTimeToString(seconds, fmt = '%H:%M') {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const components = {
    '%H': `${hours}`.padStart(2, '0'),
    '%M': `${minutes}`.padStart(2, '0'),
    '%S': `${remainingSeconds}`.padStart(2, '0')
  };
  return fmt.replace(/%[HMS]/g, match => components[match] || match);
}

function formatPowerToString(state, fmt = '%H:%M', config) {
  const components = {
    '%P': state.fillLevel
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
  return fmt.replace(/%[P]/g, match => components[match] || match);
}

export function createPowerIndicator(config) {
  let power = Main.panel.create_panelitem(config);
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
      profile: Main.powerProfiles.state ?? {}
    };
    if (state && state.profile && btn == 3) {
      i.set_label(state.profile.name ?? '???');
      menu.popup();
      return;
    }
    if (state && state.fillLevel) {
      let fmt = config.formatAlt ?? '';
      if (state.timeToFull) {
        fmt = config.formatAltToFull;
      }
      if (state.timeToEmpty) {
        fmt = config.formatAltToEmpty;
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
      profile: Main.powerProfiles.state ?? {}
    };

    let fmt = config.format ?? '';
    if (state.timeToFull) {
      fmt = config.formatAltToFull;
    }
    if (state.timeToEmpty) {
      fmt = config.formatAltToEmpty;
    }

    let text = formatPowerToString(state, fmt, config);
    if (text == '') {
      power.set_label(``);
    } else {
      power.set_label(text);
    }
    // power.set_icon(state.icon);
    if (config.icons) {
      power.set_icon(config.icons[state.icon_index] ?? state.icon);
    } else {
      power.set_icon(state.icon);
    }

    i.set_child(null);
  }

  Main.power.connectObject(
    'power-update',
    () => {
      update_power();
    },
    power
  );
  Main.powerProfiles.connectObject(
    'power-profiles-update',
    () => {
      update_power();
    },
    power
  );
  power.connect('destroy', () => {
    Main.power.disconnectObject(power);
    Main.powerProfiles.disconnectObject(power);
  });
  Main.power.sync();
  return power;
}

export function createBrightnessIndicator(config) {
  let brightness = Main.panel.create_panelitem(config);
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
      brightness._debounceBrightness
    );
  };

  w.connect('value-changed', w => {
    setBrightness();
  });

  Main.brightness.connectObject(
    'brightness-update',
    () => {
      let state = Main.brightness.state;
      brightness.set_label(``);
      brightness.set_icon(config.icon ?? state.icon);
      // brightness.icon.opacity = (state.brightness / 100);
      w.set_value(state.brightness / 100);
      l.set_label(`${Math.floor(state.brightness)}%`);
      brightness.visible = state.visible;
    },
    this
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
