import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';
import { getAppInfo, getAppInfoFromFile } from '../lib/appInfo.js';

const POWER_OFF_ACTION_ID = 'power-off';
const RESTART_ACTION_ID = 'restart';
const LOCK_SCREEN_ACTION_ID = 'lock-screen';
const LOGOUT_ACTION_ID = 'logout';
const SUSPEND_ACTION_ID = 'suspend';

const SystemActions = GObject.registerClass(
  {
    Signals: {},
  },
  class SystemActions extends Extension {
    _init(params) {
      super._init(params);

      let actions = [
        {
          id: POWER_OFF_ACTION_ID,
          name: POWER_OFF_ACTION_ID,
          description: 'Shutdown',
          icon_name: 'system-shutdown-symbolic',
          exec: 'shutdown',
        },
        {
          id: RESTART_ACTION_ID,
          name: RESTART_ACTION_ID,
          description: 'Restart',
          icon_name: 'system-restart-symbolic',
          exec: 'reboot',
        },
        {
          id: SUSPEND_ACTION_ID,
          name: SUSPEND_ACTION_ID,
          description: 'Suspend',
          icon_name: 'system-suspend-symbolic',
          exec: 'systemctl suspend',
        },
        {
          id: LOCK_SCREEN_ACTION_ID,
          name: LOCK_SCREEN_ACTION_ID,
          description: 'Lock Screen',
          icon_name: 'system-lock-screen-symbolic',
          script: () => {},
        },
        {
          id: LOGOUT_ACTION_ID,
          name: LOGOUT_ACTION_ID,
          description: 'Logout',
          icon_name: 'system-log-out-symbolic',
          script: () => {},
        },
      ];

      this.actions = {};
      actions.forEach((a) => {
        a.id = a.id + '.desktop';
        this.actions[a.id] = getAppInfo(a);
      });
    }

    async enable() {
      super.enable();
    }

    disable() {
      super.disable();
    }
  },
);

export default SystemActions;
