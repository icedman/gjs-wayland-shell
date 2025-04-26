import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import UPower from "gi://UPowerGlib";
import { Extension } from "../lib/extensionInterface.js";

const BUS_NAME = "net.hadess.PowerProfiles";
const OBJECT_PATH = "/net/hadess/PowerProfiles";

function C_(section, name) {
  return name;
}

const PROFILE_PARAMS = {
  performance: {
    name: C_("Power profile", "Performance"),
    iconName: "power-profile-performance-symbolic",
  },

  balanced: {
    name: C_("Power profile", "Balanced"),
    iconName: "power-profile-balanced-symbolic",
  },

  "power-saver": {
    name: C_("Power profile", "Power Saver"),
    iconName: "power-profile-power-saver-symbolic",
  },
};

const PowerProfilesInterface = `<node>
  <!--
      net.hadess.PowerProfiles:
      @short_description: Power Profiles daemon

      The power-profiles-daemon API is meant to be used by parts of the OS or
      desktop environment to switch system power profiles based on user choice,
      or user intent.

      OS components would typically use the "Profiles" property to construct
      their UI (2 or 3 profiles available), and monitor the "ActiveProfile"
      and the "PerformanceInhibited" properties to update that UI. The UI
      would try to set the "ActiveProfile" property if the user selected
      a different one.

      Note that the reason why the project exists and how it is different from
      existing projects is explained <ulink href=" https://gitlab.freedesktop.org/hadess/power-profiles-daemon/-/blob/master/README.md">
      in the project's README file</ulink>.

      The object path will be "/net/hadess/PowerProfiles".
  -->
  <interface name="net.hadess.PowerProfiles">
    <!--
        ActiveProfile:

        The type of the currently active profile. It might change automatically
        if the "performance" profile was selected but it got inhibited, in which
        case the "PerformanceInhibited" property will reflect the reason.
    -->
    <property name="ActiveProfile" type="s" access="readwrite"/>

    <!--
        PerformanceInhibited:

        This will be set if the performance power profile is unavailable, with
        the value being used to identify the reason for unavailability. As new
        reasons can be added, it is recommended that front-ends show a generic
        reason if they do not recognise the value. Possible values are:
        - "lap-detected" (the computer is sitting on the user's lap)
        - "high-operating-temperature" (the computer is close to overheating)
        - "" (the empty string, if not inhibited)
    -->
    <property name="PerformanceInhibited" type="s" access="read"/>

    <!--
        Profiles:

        An array of key-pair values representing each profile. The key named
        "Driver" (s) identifies the power-profiles-daemon backend code used to
        implement the profile.

        The key named "Profile" (s) will be one of:
        - "power-saver" (battery saving profile)
        - "balanced" (the default  profile)
        - "performance" (a profile that does not care about noise or battery consumption)

        Only one of each type of profile will be listed, with the daemon choosing the
        more appropriate "driver" for each profile type.
    -->
    <property name="Profiles" type="aa{sv}" access="read"/>

    <!--
        Actions:

        An array of strings listing each one of the "actions" implemented in
        the running daemon. This is used by API users to figure out whether
        particular functionality is available in a version of the daemon.
    -->
    <property name="Actions" type="as" access="read"/>

  </interface>
</node>
  `;

const PowerProfiles = GObject.registerClass(
  {
    Signals: {
      "power-profiles-update": { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class PowerProfiles extends Extension {
    _init(params) {
      super._init(params);
      this.state = {};
    }

    async enable() {
      super.enable();
      this.state = {};

      const PowerProfilesProxy = Gio.DBusProxy.makeProxyWrapper(
        PowerProfilesInterface,
      );

      this.proxy = new PowerProfilesProxy(
        Gio.DBus.system,
        BUS_NAME,
        OBJECT_PATH,
        (proxy, error) => {
          if (error) console.error(error.message);
          else
            this.proxy.connect("g-properties-changed", () => {
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
      let active = _proxy.ActiveProfile;
      this.state = {
        profile: active,
        icon: PROFILE_PARAMS[active]?.iconName ?? "",
        name: PROFILE_PARAMS[active]?.name ?? "",
      };

      this.emit("power-profiles-update", this);
    }
  },
);

export default PowerProfiles;
