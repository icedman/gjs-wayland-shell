import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { WindowManagerInterface } from './wmInterface.js';

import {
  connectToSocket,
  connectToHyprSocket,
  disconnectSocket,
  sendMessage,
  receiveMessage,
} from '../lib/ipc.js';

const HyprShell = GObject.registerClass(
  class HyprShell extends WindowManagerInterface {
    _init() {
      super._init();
      this.name = 'HYPR';
    }

    connect() {
      return connectToHyprSocket();
    }

    async listen() {
      let connection = connectToHyprSocket(2);
      if (!connection) {
        return;
      }
      super.listen(connection, null);
    }

    parseMessage(msg) {
      let eventMap = {
        activewindowv2: 'window-focused',
        openwindow: 'window-opened',
        closewindow: 'window-closed',
      };

      let res = [];
      let lines = msg.trim().split('\n');
      lines.forEach((l) => {
        let line = l.replace('>>', ',').split(',');
        let event = eventMap[line[0]];
        if (event) {
          res.push({
            event: event,
            window: {
              id: line[1],
            },
            raw: l,
          });
        } else {
          res.push({
            event: 'unhandled',
            window: {},
            raw: l,
          });
        }
      });

      return res;
    }

    normalizeWindow(w) {
      /*
      {
        id: XXX,          // unique identifier,
        app_id: 'kitty',  // without .desktop suffix,
        title: 'title',       // optional
        class: 'windowClass', // optional
      }
      */
      // hyperland
      if (w['address']) {
        w['id'] = w['address'].replace('0x', '');
      }
      if (!w['app_id'] && w['class']) {
        w['app_id'] = w['class'];
      }
      return super.normalizeWindow(w);
    }

    async getWindows() {
      let connection = this.connect();
      if (!connection) {
        return;
      }
      let message = '[j]/clients';
      await sendMessage(connection, message);
      let response = await receiveMessage(connection);
      this.disconnect(connection);

      let obj = JSON.parse(response);
      this.windows = obj;
      this.normalizeWindows();
      obj = {
        event: 'windows-update',
        windows: this.windows,
        raw: obj,
      };
      this.onWindowsUpdated(obj);
      return Promise.resolve(obj);
    }

    async focusWindow(window) {
      let connection = this.connect();
      if (!connection) {
        return;
      }
      let message = `[j]/dispatch focuswindow address:${window['address']}`;
      await sendMessage(connection, message);
      let response = await receiveMessage(connection);
      this.disconnect(connection);

      let obj = {
        event: response == 'ok' ? 'success' : 'fail',
      };
      return Promise.resolve(obj);
    }

    async spawn(cmd, arg = '') {
      cmd = cmd.replace('%U', arg);
      cmd = cmd.replace('%u', arg);

      let connection = this.connect();
      if (!connection) {
        return;
      }
      let message = `[j]/dispatch exec ${cmd}`;
      let response = await sendMessage(connection, message);
      this.disconnect(connection);

      let obj = {
        event: response == 'ok' ? 'success' : 'fail',
      };
      return Promise.resolve(obj);
    }
  },
);

export default HyprShell;
