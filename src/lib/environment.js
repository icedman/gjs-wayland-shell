import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as SignalTracker from './signalTracker.js';

Math.clamp = function (x, lower, upper) {
  return Math.min(Math.max(x, lower), upper);
};

const Format = imports.format;

String.prototype.format = Format.format;

GObject.Object.prototype.connectObject = function (...args) {
  SignalTracker.connectObject(this, ...args);
};
GObject.Object.prototype.connect_object = function (...args) {
  SignalTracker.connectObject(this, ...args);
};
GObject.Object.prototype.disconnectObject = function (...args) {
  SignalTracker.disconnectObject(this, ...args);
};
GObject.Object.prototype.disconnect_object = function (...args) {
  SignalTracker.disconnectObject(this, ...args);
};

Gio.Settings.prototype.getSetting = function (k) {
  try {
    let settings = this;
    let value = settings.get_value(k);
    let valueType = value.get_type_string();
    switch (valueType) {
      case 's':
        return value.get_string();
        break;
      case 'i':
        return value.get_int32();
        break;
      case 'd':
        return value.get_double();
        break;
      case 'b':
        return value.get_boolean();
        break;
      case 'as':
        return value.deepUnpack();
        break;
      case '(dddd)':
        return value.deepUnpack();
      default:
        console.log(valueType);
        break;
    }
  } catch (err) {
    console.log(err);
  }
  return null;
};

GObject.Object.prototype.load_settings = function (
  settings,
  settingsMap,
  prefix,
) {
  settings = settings ?? this.settings;
  if (settings) {
    settings.disconnectObject(this);
  }
  settingsMap = settingsMap ?? this.settingsMap ?? {};
  prefix = prefix ?? this.settingsPrefix ?? this.name?.toLowerCase() ?? '';
  Object.keys(settingsMap).forEach((k) => {
    let _key = k;
    if (prefix != '') {
      _key = _key.replace(`${prefix}-`, '');
    }
    _key = _key.replaceAll('-', '_').toUpperCase();
    try {
      this[_key] = settings.getSetting(k);
    } catch (err) {
      return;
    }
    if (Main.userSettings && Main.userSettings[k]) {
      this[_key] = Main.userSettings[k];
    }
    if (this.customSettings && this.customSettings[k]) {
      this[_key] = this.customSettings[k];
    }
    try {
      settings.connectObject(
        `changed::${k}`,
        () => {
          this[_key] = settings.getSetting(k);
          if (Main.userSettings && Main.userSettings[k]) {
            this[_key] = Main.userSettings[k];
          }
          if (this.customSettings && this.customSettings[k]) {
            this[_key] = this.customSettings[k];
          }
          settingsMap[k]();
        },
        this,
      );
    } catch (err) {
      // key not in schema
    }
  });
};
