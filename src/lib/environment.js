import GObject from "gi://GObject";
import * as SignalTracker from "./signalTracker.js";

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
