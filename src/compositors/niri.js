import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { ShellInterface } from './shellInterface.js';

import {
  connectToSocket,
  connectToNiriSocket,
  disconnectSocket,
  sendMessage,
  receiveMessage,
} from '../lib/ipc.js';

const NiriShell = GObject.registerClass(
  class NiriShell extends ShellInterface {
    init() {
      super.init();
      this.name = 'NIRI';
    }

    connect() {
      return connectToNiriSocket();
    }

    parseMessage(msg) {
      let res = [];

      let lines = msg.trim().split('\n');
      lines.forEach((l) => {
        let obj = null;
        try {
          obj = JSON.parse(l);
        } catch (err) {
          console.log(l);
          console.log(err);
          return;
        }

        if (obj['WindowsChanged']) {
          this.windows = obj['WindowChanged']['windows'];
          this.normalizeWindows();
          res.push({
            event: 'windows-update',
            windows: this.windows,
            raw: obj,
          });
          return;
        }

        if (obj['WindowFocusChanged']) {
          res.push({
            event: 'window-focused',
            window: {
              id: obj['WindowFocusChanged']['id'],
            },
            raw: obj,
          });
          return;
        }

        if (obj['WindowOpenedOrChanged']) {
          res.push({
            event: 'window-opened',
            window: obj['WindowOpenedOrChanged']['window'],
            raw: obj,
          });
          return;
        }

        if (obj['WindowClosed']) {
          res.push({
            event: 'window-closed',
            window: {
              id: obj['WindowClosed']['id'],
              raw: obj,
            },
          });
          return;
        }

        // console.log("-------------");
        // console.log(" unhandled ");
        // console.log("-------------");
        // console.log(obj);

        // return generic success event
        res.push({
          event: 'success',
        });
      });

      return res;
    }

    async listen() {
      let connection = this.connect();
      if (!connection) {
        return;
      }
      super.listen(connection, '"EventStream"\n');
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
      return w;
    }

    async getWindows() {
      let connection = this.connect();
      if (!connection) {
        return;
      }
      let message = '"Windows"\n';
      await sendMessage(connection, message);
      let response = await receiveMessage(connection);
      this.disconnect(connection);

      let obj = JSON.parse(response);
      if (obj['Ok']) {
        this.windows = obj['Ok']['Windows'];
        this.normalizeWindows();
        obj = {
          event: 'windows-update',
          windows: this.windows,
          raw: obj,
        };
        this.onWindowsUpdated(obj);
      }
      return Promise.resolve(obj);
    }

    async focusWindow(window) {
      if (!window || !window['id']) return;

      // console.log(window);

      let connection = this.connect();
      if (!connection) {
        return;
      }

      let message =
        JSON.stringify({ Action: { FocusWindow: { id: window['id'] } } }) +
        '\n';
      await sendMessage(connection, message);
      let response = await receiveMessage(connection);
      this.disconnect(connection);

      let obj = this.parseMessage(response);
      if (obj.length > 0) {
        obj = obj[0];
      }
      return Promise.resolve(obj);
    }

    async spawn(cmd, arg = '') {
      cmd = cmd.replace('%U', arg);
      cmd = cmd.replace('%u', arg);

      let connection = this.connect();
      if (!connection) {
        return;
      }
      let message =
        JSON.stringify({ Action: { Spawn: { command: cmd.split(' ') } } }) +
        '\n';
      await sendMessage(connection, message);
      let response = await receiveMessage(connection);
      this.disconnect(connection);

      let obj = this.parseMessage(response);
      if (obj.length > 0) {
        obj = obj[0];
      }
      return Promise.resolve(obj);
    }
  },
);

export default NiriShell;
