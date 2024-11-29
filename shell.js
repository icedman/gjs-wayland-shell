import GLib from "gi://GLib";
import Gio from "gi://Gio";

import {
  connectToSocket,
  connectToNiriSocket,
  connectToHyprSocket,
  connectToSwaySocket,
  disconnectSocket,
  sendMessage,
  receiveMessage,
  sendI3Message,
  receiveI3Message,
} from "./modules/ipc.js";

/**
 * Logs errors.
 * @param {Error} error - The error to log.
 */
function logError(error) {
  log(`Error: ${error.message}`);
}

class ShellInterface {
  init() {
    this.windows = [];
    this.subscribers = [];

    this.subscribe(this, "window-focused", (evts) => {
      let newWindow = false;
      evts.forEach((evt) => {
        let oldWindow = !this.windows.find((w) => {
          return w.id == evt["window"]["id"];
        });
        if (!oldWindow) {
          newWindow = true;
        }
      });
      if (newWindow) {
        this.getWindows().then((res) => {
          console.log("new windows");
        });
      }
    });
    this.subscribe(this, "window-opened", (evts) => {
      evts.forEach((evt) => {
        this.windows = this.windows.filter((w) => {
          return w.id != evt["window"]["id"];
        });
        this.windows = [...this.windows, evt["window"]];
      });
    });
    this.subscribe(this, "window-closed", (evts) => {
      evts.forEach((evt) => {
        this.windows = this.windows.filter((w) => {
          return w.id != evt["window"]["id"];
        });
      });
    });
  }

  subscribe(sub, event, func) {
    this.subscribers.push({ subscriber: sub, event: event, callback: func });
  }

  normalizeWindows() {
    this.windows.forEach((w) => {
      if (!w["id"] && w["address"]) {
        w["id"] = w["address"];
      }
      if (!w["class"] && w["app_id"]) {
        w["class"] = w["app_id"];
      }
    });
  }

  connect() {
    return null;
  }

  disconnect(connection) {
    connection.close(null);
  }

  async broadcast(msg) {
    msg.forEach((m) => {
      let eventType = m.event;
      this.subscribers.forEach((sub) => {
        if (
          (sub.event.endsWith("*") && sub.event.startsWith(eventType)) ||
          sub.event == eventType
        ) {
          sub.callback(msg);
        }
      });
    });
  }

  async listen(connection, msg) {
    if (msg) {
      await sendMessage(connection, msg);
      let response = await receiveMessage(connection);
      console.log(response);
    }

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
          BYTES_NUM,
          GLib.PRIORITY_DEFAULT,
          null,
          (source, result) => {
            console.log("incoming..");

            let bytes = source.read_bytes_finish(result);
            let response = String.fromCharCode.apply(null, bytes.get_data());

            try {
              let lines = response.split(/\r?\n/);
              lines.forEach((line) => {
                line = line.trim();
                if (line == "") return;
                _broadcast(_parseMessage(line));
              });
            } catch (err) {
              console.log(response);
              console.log(err);
            }

            awaitIncoming();
          },
        );
      } catch (error) {
        logError(error, "Error starting read_async");
      }
    };

    awaitIncoming();
    return true;
  }

  parseMessage(msg) {
    return msg;
  }
  getWindows() {}
  focusWindow(id) {}

  spawn(cmd) {
    try {
      // Get the full environment from the current process
      const environment = GLib.get_environ().filter((e) => {
        // except this... LD_PRELOAD
        return !e.includes("libgtk4-layer-shell");
      });

      // console.log(environment);
      const [_, args] = GLib.shell_parse_argv(`${cmd}`);

      // Spawn a process inheriting the full environment
      const [success, pid] = GLib.spawn_async_with_pipes(
        null, // Working directory (null = inherit current)
        args, // Command to execute
        environment, // Pass inherited environment
        GLib.SpawnFlags.SEARCH_PATH, // Use PATH to locate the executable
        null, // Child setup function (not needed here)
      );

      if (success) {
        print(`Spawned process with PID: ${pid}`);
      } else {
        print("Failed to spawn process.");
      }
    } catch (e) {
      logError(e, "Error spawning process");
    }
  }
}

class NiriShell extends ShellInterface {
  init() {
    super.init();
    this.name = "NIRI";
  }

  connect() {
    return connectToNiriSocket();
  }

  parseMessage(msg) {
    let res = [];

    let lines = msg.trim().split("\n");
    lines.forEach((l) => {
      let obj = JSON.parse(l);

      if (obj["WindowChanged"]) {
        this.windows = obj["WindowChanged"]["windows"];
        res.push({
          event: "windows-update",
          windows: this.windows,
        });
        return;
      }

      if (obj["WindowFocusChanged"]) {
        res.push({
          event: "window-focused",
          window: {
            id: obj["WindowFocusChanged"]["id"],
          },
        });
        return;
      }

      if (obj["WindowOpenedOrChanged"]) {
        res.push({
          event: "window-opened",
          window: obj["WindowOpenedOrChanged"]["window"],
        });
        return;
      }

      if (obj["WindowClosed"]) {
        res.push({
          event: "window-closed",
          window: {
            id: obj["WindowClosed"]["id"],
          },
        });
        return;
      }

      console.log("-------------");
      console.log(" unhandled ");
      console.log("-------------");
      console.log(obj);

      // return generic success event
      res.push({
        event: "success",
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
    if (obj["Ok"]) {
      this.windows = obj["Ok"]["Windows"];
      this.normalizeWindows();
      obj = {
        event: "windows-update",
        windows: this.windows,
      };
    }
    return Promise.resolve(obj);
  }

  async focusWindow(window) {
    let connection = this.connect();
    if (!connection) {
      return;
    }

    let message =
      JSON.stringify({ Action: { FocusWindow: { id: window["id"] } } }) + "\n";
    await sendMessage(connection, message);
    let response = await receiveMessage(connection);
    this.disconnect(connection);

    let obj = this.parseMessage(response);
    if (obj.length > 0) {
      obj = obj[0];
    }
    return Promise.resolve(obj);
  }

  async spawn(cmd) {
    let connection = this.connect();
    if (!connection) {
      return;
    }
    let message =
      JSON.stringify({ Action: { Spawn: { command: cmd.split(" ") } } }) + "\n";
    await sendMessage(connection, message);
    let response = await receiveMessage(connection);
    this.disconnect(connection);

    let obj = this.parseMessage(response);
    if (obj.length > 0) {
      obj = obj[0];
    }
    return Promise.resolve(obj);
  }
}

class HyprShell extends ShellInterface {
  init() {
    super.init();
    this.name = "HYPR";
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
      activewindowv2: "window-focused",
      openwindow: "window-opened",
      closewindow: "window-closed",
    };

    let res = [];
    let lines = msg.trim().split("\n");
    lines.forEach((l) => {
      let line = l.replace(">>", ",").split(",");
      let event = eventMap[line[0]];
      if (event) {
        res.push({
          event: event,
          window: {
            id: line[1],
          },
        });
      }
    });

    return res;
  }

  async getWindows() {
    let connection = this.connect();
    if (!connection) {
      return;
    }
    let message = "[j]/clients";
    await sendMessage(connection, message);
    let response = await receiveMessage(connection);
    this.disconnect(connection);

    let obj = JSON.parse(response);
    this.windows = obj;
    this.normalizeWindows();
    obj = {
      event: "windows-update",
      windows: obj,
    };
    return Promise.resolve(obj);
  }

  async focusWindow(window) {
    let connection = this.connect();
    if (!connection) {
      return;
    }
    let message = `[j]/dispatch focuswindow ${window["class"]}`;
    await sendMessage(connection, message);
    let response = await receiveMessage(connection);
    this.disconnect(connection);

    let obj = {
      event: response == "ok" ? "success" : "fail",
    };
    return Promise.resolve(obj);
  }

  async spawn(cmd) {
    let connection = this.connect();
    if (!connection) {
      return;
    }
    let message = `[j]/dispatch exec ${cmd}`;
    let response = await sendMessage(connection, message);
    this.disconnect(connection);

    let obj = {
      event: response == "ok" ? "success" : "fail",
    };
    return Promise.resolve(obj);
  }
}

function ShellService(wm) {
  let supportedWM = {
    niri: NiriShell,
    hyprland: HyprShell,
    sway: SwayShell,
  };

  let testShells = Object.keys(supportedWM);
  if (wm && supportedWM[wm]) {
    testShells = [supportedWM[wm]];
  }

  for (let i = 0; i < testShells.length; i++) {
    let shell = new supportedWM[testShells[i]]();
    let connection = shell.connect();
    if (connection) {
      return shell;
    }
  }

  return new ShellInterface();
}

class SwayShell extends ShellInterface {
  connect() {
    return connectToSwaySocket();
  }

  async listen() {
    let connection = this.connect();
    if (!connection) {
      return;
    }
    buildIpcHeader(2, 0);
    super.listen(connection, null);
  }

  async getWindows() {
    let connection = this.connect();
    if (!connection) {
      return;
    }

    let message = "";
    await sendI3Message(connection, 4, "");
    let response = await receiveI3Message(connection);
    this.disconnect(connection);

    // let obj = JSON.parse(response);
    // this.windows = obj;
    // this.normalizeWindows();
    // obj = {
    //   event: "windows-update",
    //   windows: obj,
    // };
    // return Promise.resolve(obj);

    return Promise.resolve(response);
  }

  async spawn(cmd) {
    let connection = this.connect();
    if (!connection) {
      return;
    }

    let message = `exec ${cmd}`;
    await sendI3Message(connection, 0, message);
    let response = await receiveI3Message(connection);
    console.log(response);
    this.disconnect(connection);

    // let obj = JSON.parse(response);
    // this.windows = obj;
    // this.normalizeWindows();
    // obj = {
    //   event: "windows-update",
    //   windows: obj,
    // };
    // return Promise.resolve(obj);

    return Promise.resolve(response);
  }
}

export default ShellService;
export { NiriShell, HyprShell, SwayShell };
