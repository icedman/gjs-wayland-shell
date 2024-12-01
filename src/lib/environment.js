import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as SignalTracker from './signalTracker.js';

Math.clamp = function (x, lower, upper) {
  return Math.min(Math.max(x, lower), upper);
};

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
    case '(dddd)': {
      try {
        let dddd = value.deepUnpack();
        return dddd;
      } catch (err) {
        console.log(err);
      }
    }
    default:
      console.log(valueType);
      break;
  }
  return null;
};
