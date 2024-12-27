import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import UPower from 'gi://UPowerGlib';
import { Extension } from '../lib/extensionInterface.js';

const BUS_NAME = 'org.freedesktop.UPower';
const OBJECT_PATH = '/org/freedesktop/UPower/devices/DisplayDevice';

const PowerDeviceInterface = `<node>
	  <interface name="org.freedesktop.UPower.Device">
	    <property name="Type" type="u" access="read"/>
	    <property name="State" type="u" access="read"/>
	    <property name="Percentage" type="d" access="read"/>
	    <property name="TimeToEmpty" type="x" access="read"/>
	    <property name="TimeToFull" type="x" access="read"/>
	    <property name="IsPresent" type="b" access="read"/>
	    <property name="IconName" type="s" access="read"/>
	  </interface>
	</node>
	`;

const Power = GObject.registerClass(
  {
    Signals: {
      'power-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class Power extends Extension {
    _init(params) {
      super._init(params);
      this.state = {};
    }

    async enable() {
      super.enable();
      this.state = {};

      const PowerManagerProxy =
        Gio.DBusProxy.makeProxyWrapper(PowerDeviceInterface);

      this.proxy = new PowerManagerProxy(
        Gio.DBus.system,
        BUS_NAME,
        OBJECT_PATH,
        (proxy, error) => {
          if (error) console.error(error.message);
          else
            this.proxy.connect('g-properties-changed', () => {
              this.sync();
            });
          this.sync();
        },
      );
    }

    disable() {
      super.disable();
    }

    sync() {
      let _proxy = this.proxy;
      let visible = _proxy.IsPresent;
      if (!visible) return;

      let chargingState =
        _proxy.State === UPower.DeviceState.CHARGING ? '-charging' : '';
      let fillLevel = 10 * Math.floor(_proxy.Percentage / 10);
      const charged =
        _proxy.State === UPower.DeviceState.FULLY_CHARGED ||
        (_proxy.State === UPower.DeviceState.CHARGING && fillLevel === 100);

      const icon = charged
        ? 'battery-level-100-charged-symbolic'
        : `battery-level-${fillLevel}${chargingState}-symbolic`;

      this.state = {
        chargingState,
        fillLevel,
        icon,
      };

      if (_proxy.State === UPower.DeviceState.FULLY_CHARGED) {
        //   //
      } else if (
        _proxy.State === UPower.DeviceState.CHARGING &&
        _proxy.TimeToFull > 0
      ) {
        this.state.timeToFull = _proxy.TimeToFull;
      } else if (_proxy.TimeToEmpty > 0) {
        this.state.timeToEmpty = _proxy.TimeToEmpty;
      }

      this.emit('power-update', this);
    }
  },
);

export default Power;
