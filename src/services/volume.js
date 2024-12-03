import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gvc from 'gi://Gvc';
import { Extension } from '../lib/extensionInterface.js';

// Each Gvc.MixerControl is a connection to PulseAudio,
// so it's better to make it a singleton
let _mixerControl;

/**
 * @returns {Gvc.MixerControl} - the mixer control singleton
 */
export function getMixerControl() {
  if (_mixerControl) return _mixerControl;

  _mixerControl = new Gvc.MixerControl({ name: 'GNOME Shell Volume Control' });
  _mixerControl.open();
  return _mixerControl;
}

const Volume = GObject.registerClass(
  {
    Signals: {
      'volume-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Volume extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      super.enable();
      this.state = {};

      this._icons = [
        'audio-volume-muted-symbolic',
        'audio-volume-low-symbolic',
        'audio-volume-medium-symbolic',
        'audio-volume-high-symbolic',
        'audio-volume-overamplified-symbolic',
      ];

      this._control = getMixerControl();
      this._control.connect('state-changed', () => {
        this.sync();
      });
      this._control.connect('default-sink-changed', () => {
        this.sync();
      });
      this._control.connect('active-output-update', () => {
        this.sync();
      });

      this.sync();
    }

    disable() {
      super.disable();
    }

    get_icon() {
      if (!this._stream) return null;

      let volume = this._stream.volume;
      let n;
      if (this._stream.is_muted || volume <= 0) {
        n = 0;
      } else {
        n = Math.ceil((3 * volume) / this._control.get_vol_max_norm());
        n = Math.clamp(n, 1, this._icons.length - 1);
      }
      return this._icons[n];
    }

    sync() {
      let stream = this._control?.get_default_sink();
      if (!stream) return;
      if (stream != this._stream) {
        stream.connect('notify::is-muted', () => {
          this.sync();
        });
        stream.connect('notify::volume', () => {
          this.sync();
        });
        this._stream = stream;
      }

      this.state = {
        ready: this._control?.get_state() === Gvc.MixerControlState.READY,
        icon: this.get_icon(),
      };

      this.emit('volume-update', this);
    }
  },
);

const Mic = GObject.registerClass(
  {
    Signals: {
      'mic-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Mic extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      this.state = {};

      this._icons = [
        'microphone-sensitivity-muted-symbolic',
        'microphone-sensitivity-low-symbolic',
        'microphone-sensitivity-medium-symbolInputic',
        'microphone-sensitivity-high-symbolic',
      ];

      this._control = getMixerControl();
      this._control.connect('state-changed', () => {
        this.sync();
      });
      this._control.connect('default-source-changed', () => {
        this.sync();
      });
      this._control.connect('active-input-update', () => {
        this.sync();
      });

      this.sync();
    }

    disable() {}

    get_icon() {
      if (!this._stream) return null;

      let volume = this._stream.volume;
      let n;
      if (this._stream.is_muted || volume <= 0) {
        n = 0;
      } else {
        n = Math.ceil((3 * volume) / this._control.get_vol_max_norm());
        n = Math.clamp(n, 1, this._icons.length - 1);
      }
      return this._icons[n];
    }

    sync() {
      let stream = this._control?.get_default_source();
      if (!stream) return;
      if (stream != this._stream) {
        stream.connect('notify::is-muted', () => {
          this.sync();
        });
        stream.connect('notify::volume', () => {
          this.sync();
        });
        this._stream = stream;
      }

      this.state = {
        ready: this._control?.get_state() === Gvc.MixerControlState.READY,
        icon: this.get_icon(),
      };

      this.emit('mic-update', this);
    }
  },
);

export { Volume, Mic };
