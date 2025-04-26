import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import { WindowManagerInterface } from "./wmInterface.js";

import {
  connectToSocket,
  connectToSwaySocket,
  disconnectSocket,
  sendMessage,
  receiveMessage,
  sendI3Message,
  receiveI3Message,
  IPC_HEADER_SIZE,
  BYTES_NUM,
} from "../lib/ipc.js";

const SwayShell = GObject.registerClass(
  class SwayShell extends WindowManagerInterface {
    _init() {
      super._init();
      this.name = "SWAY";
    }

    isAvailable() {
      try {
        let [success, output] = GLib.spawn_sync(
          null, // Working directory
          ["pgrep", "-x", "sway"], // Command to check process
          null, // Environment
          GLib.SpawnFlags.SEARCH_PATH,
          null, // Child setup
        );
        return success && output.length > 0;
      } catch (e) {
        return false;
      }
    }

    connect() {
      return connectToSwaySocket();
    }

    parseMessage(msg) {
      try {
        let obj = JSON.parse(msg);
        if (obj["container"]) {
          obj["window"] = obj["container"];
          obj["container"] = {};
          this.normalizeWindows([obj["window"]]);
        }
        if (obj["change"] == "new") {
          return [
            {
              event: "window-opened",
              window: obj["window"],
              raw: obj,
            },
          ];
        }
        if (obj["change"] == "focus") {
          return [
            {
              event: "window-focused",
              window: obj["window"],
              raw: obj,
            },
          ];
        }
        if (obj["change"] == "close") {
          return [
            {
              event: "window-closed",
              window: obj["window"],
              raw: obj,
            },
          ];
        }
        return [{ event: "unknown", window: {}, raw: obj }];
      } catch (err) {
        console.log(err);
      }
      return [{ event: "unknown" }];
    }

    async listen() {
      let connection = this.connect();
      if (!connection) {
        return;
      }

      // await sendI3Message(connection, 2, "['window', 'workspace']");
      await sendI3Message(connection, 2, "['window']");

      let inputStream = connection.get_input_stream();
      if (!inputStream) {
        logError(new Error("Failed to get input stream."));
        return false;
      }

      const _parseMessage = this.parseMessage.bind(this);
      const _broadcast = this.broadcast.bind(this);
      const awaitIncoming = () => {
        try {
          inputStream.read_bytes_async(
            IPC_HEADER_SIZE, // header bytes
            GLib.PRIORITY_DEFAULT,
            null,
            (source, result) => {
              // console.log('incoming..');

              let inputBytes = source.read_bytes_finish(result);
              let headerBytes = new Uint8Array(inputBytes.get_data());

              let payloadLength =
                headerBytes[6] |
                (headerBytes[7] << 8) |
                (headerBytes[8] << 16) |
                (headerBytes[9] << 24);
              let type =
                headerBytes[10] |
                (headerBytes[11] << 8) |
                (headerBytes[12] << 16) |
                (headerBytes[13] << 24);

              inputBytes = inputStream.read_bytes(payloadLength, null);
              let byteArray = new Uint8Array(inputBytes.get_data());
              // let response = String.fromCharCode.apply(null, byteArray);

              let decoder = new TextDecoder("utf-8"); // Use appropriate encoding if necessary
              let response = decoder.decode(byteArray);

              _broadcast(_parseMessage(response));

              awaitIncoming();
            },
          );
        } catch (error) {
          logError(error, "Error starting read_async");
        }
      };

      awaitIncoming();
    }

    _nodeToWindows(node, bucket) {
      if (node["app_id"]) {
        let w = {
          ...this.normalizeWindow(node),
        };
        bucket.push(w);
      }
      if (node["nodes"]) {
        node["nodes"].forEach((n) => {
          this._nodeToWindows(n, bucket);
        });
      }
    }

    normalizeWindow(w) {
      /*
      {
        id: XXX,          // unique identifier,
        app_id: 'kitty',  // without .desktop suffix,
        title: 'title',   // 'name' in sway
        class: 'windowClass', // optional
      }
      */
      // sway
      if (!w["title"] && w["name"]) {
        w["title"] = w["name"];
      }
      return super.normalizeWindow(w);
    }

    async getWindows() {
      let connection = this.connect();
      if (!connection) {
        return;
      }

      let message = "";
      await sendI3Message(connection, 4, ""); // 4. get_tree
      let response = await receiveI3Message(connection);
      this.disconnect(connection);

      let obj = JSON.parse(response);
      let windows = [];
      this._nodeToWindows(obj, windows);
      this.windows = windows;
      this.normalizeWindows();
      obj = {
        event: "windows-update",
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

      // let message = `[app_id="${window['app_id']}"] focus`;
      let message = `[pid="${window["pid"]}"] focus`;

      await sendI3Message(connection, 0, message);
      let response = await receiveI3Message(connection);
      this.disconnect(connection);

      let obj = JSON.parse(response);
      return Promise.resolve(obj);
    }

    async closeWindow(window) {
      let connection = this.connect();
      if (!connection) {
        return;
      }

      let message = `[pid="${window["pid"]}"] kill`;

      await sendI3Message(connection, 0, message);
      let response = await receiveI3Message(connection);
      this.disconnect(connection);

      let obj = JSON.parse(response);
      return Promise.resolve(obj);
    }

    async spawn(cmd, arg = "") {
      cmd = cmd.replace("%U", arg);
      cmd = cmd.replace("%u", arg);

      let connection = this.connect();
      if (!connection) {
        return;
      }

      let message = `exec ${cmd}`;
      await sendI3Message(connection, 0, message);
      let response = await receiveI3Message(connection);
      this.disconnect(connection);

      let obj = JSON.parse(response);
      return Promise.resolve(obj);
    }

    async exit() {
      let connection = this.connect();
      if (!connection) {
        return;
      }

      let message = `exit`;
      await sendI3Message(connection, 0, message);
      return Promise.resolve(true);
    }
  },
);

export default SwayShell;
