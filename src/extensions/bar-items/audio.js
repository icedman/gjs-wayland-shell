import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';

export function createVolumeIndicator(config) {
  let volume = Main.panel.create_panelitem(config);

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

export function createMicIndicator(config) {
  let mic = Main.panel.create_panelitem(config);
  mic.onMicUpdate = (w, s) => {};

  Main.mic.connectObject(
    'mic-update',
    () => {
      let state = Main.mic.state;
      mic.set_label(``);
      if (config.icons) {
        mic.set_icon(config.icons[state.icon_index] ?? state.icon);
      } else {
        mic.set_icon(state.icon);
      }
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
