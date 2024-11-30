import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import NM from "gi://NM";

Gio._promisify(Gio.DBusConnection.prototype, "call");
Gio._promisify(NM.Client, "new_async");
Gio._promisify(NM.Client.prototype, "check_connectivity_async");
Gio._promisify(NM.DeviceWifi.prototype, "request_scan_async");

const NM80211Mode = NM["80211Mode"];

function signalToIcon(value) {
  if (value < 20) return "none";
  else if (value < 40) return "weak";
  else if (value < 50) return "ok";
  else if (value < 80) return "good";
  else return "excellent";
}

const Network = GObject.registerClass(
  class Network extends GObject.Object {
    _init(params) {
      this.subscribers = [];
      super._init(params);
    }

    subscribe(sub, event, func) {
      this.subscribers.push({ subscriber: sub, event: event, callback: func });
    }

    async init() {
      this.state = {};
      this._client = await NM.Client.new_async(null);

      this._client?.connect("device-added", () => {
        console.log("device-added");
        this.sync();
      });
      this._client?.connect("device-removed", () => {
        console.log("device-removed");
        this.sync();
      });

      this.sync();

      setInterval(() => {
        this.sync();
      }, 1000 * 15);
    }

    sync() {
      this.state = {
        enabled: this._client?.wireless_enabled,
        connectivity: this._client?.connectivity,
        icon: this._client?.wireless_enabled
          ? "network-wireless-connected-symbolic"
          : "network-wireless-disabled-symbolic",
      };

      this.subscribers.forEach((sub) => {
        if (sub.event == "network-update") {
          sub.callback.bind(sub.subscriber)(this.state);
        }
      });
    }
  },
);

export { Network };
