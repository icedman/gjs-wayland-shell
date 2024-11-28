import GLib from "gi://GLib";
import Gio from "gi://Gio";

const BYTES_NUM = 4096;

function connectToSocket(socketPath, identifier) {
  try {
    // Check if the socket file exists
    if (!GLib.file_test(socketPath, GLib.FileTest.EXISTS)) {
      logError(new Error(`${identifier} socket not found at ${socketPath}`));
      return null;
    }

    // Create a socket address for the Unix socket
    let socketAddress = Gio.UnixSocketAddress.new(socketPath);

    // Create a socket client
    let client = new Gio.SocketClient();

    // Connect to the socket synchronously
    let connection = client.connect(socketAddress, null);

    log(`Connected to ${identifier} socket at ${socketPath}`);
    return connection;
  } catch (e) {
    logError(
      new Error(`Failed to connect to ${identifier} socket: ${e.message}`),
    );
    return null;
  }
}

function connectToHyprSocket(num = "") {
  let XDG_RUNTIME_DIR = GLib.getenv("XDG_RUNTIME_DIR");
  let HYPRLAND_INSTANCE_SIGNATURE = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
  if (!XDG_RUNTIME_DIR || !HYPRLAND_INSTANCE_SIGNATURE) {
    logError(new Error(`socketPath unknown`));
    return null;
  }
  let socketPath = `${XDG_RUNTIME_DIR}/hypr/${HYPRLAND_INSTANCE_SIGNATURE}/.socket${num}.sock`;

  return connectToSocket(socketPath, "HYPR");
}

/**
 * Connect to the Niri Wayland socket.
 * @returns {Gio.SocketConnection | null} A connection to the socket, or null on failure.
 */
function connectToNiriSocket() {
  let socketPath = GLib.getenv("NIRI_SOCKET");
  if (!socketPath) {
    logError(new Error(`socketPath unknown`));
    return null;
  }

  return connectToSocket(socketPath, "NIRI");
}

/**
 * Logs errors.
 * @param {Error} error - The error to log.
 */
function logError(error) {
  log(`Error: ${error.message}`);
}

/**
 * Send a binary message to the Niri Wayland socket.
 * @param {Gio.SocketConnection} connection - The connected socket.
 * @param {Uint8Array} message - The message to send.
 */

async function sendMessage(connection, message) {
  try {
    let outputStream = connection.get_output_stream();
    if (!outputStream) {
      logError(new Error("Failed to get output stream."));
      return false;
    }

    let inputStream = connection.get_input_stream();
    if (!inputStream) {
      logError(new Error("Failed to get input stream."));
      return false;
    }

    let bytes = new GLib.Bytes(message); // Convert the message to GLib.Bytes
    outputStream.write_all(bytes.get_data(), null);
    outputStream.flush(null);
    log(`Message sent: ${message}`);

    let response = String.fromCharCode.apply(
      null,
      inputStream.read_bytes(BYTES_NUM, null).get_data(),
    );
    log(`Message received: ${response}`);
    return response;
  } catch (e) {
    logError(new Error(`Failed to send message: ${e.message}`));
  }

  return false;
}

class ShellInterface {
  init() {
    this.windows = [];
    this.subscribers = [];
  }

  subscribe(sub, event, func) {
    this.subscribers.push({ subscriber: sub, event: event, callback: func });
  }

  connect() {
    return null;
  }

  disconnect(connection) {
    connection.close(null);
  }

  async broadcast(msg) {
    msg.forEach((m) => {
      let eventType = m.type;
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
    let response = await sendMessage(connection, msg);

    let inputStream = connection.get_input_stream();
    if (!inputStream) {
      logError(new Error("Failed to get input stream."));
      return false;
    }

    const _parseMessage = this.parseMessage.bind(this);
    const _broadcast = this.broadcast.bind(this);
    function awaitIncoming() {
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
    }

    awaitIncoming();
    return true;
  }

  parseMessage(msg) {
    return msg;
  }
  getWindows() {}
  focusWindow(id) {}
  spawn(cmd) {}
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

      // response from requests
      if (obj["Ok"]) {
        if (obj["Ok"]["Windows"]) {
          this.windows = obj["Ok"]["Windows"];
          res.push({
            event: "windows-update",
            windows: this.windows,
          });
          return;
        }
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
    let response = await sendMessage(connection, message);
    this.disconnect(connection);

    let obj = this.parseMessage(response);
    return Promise.resolve(obj);
  }

  async focusWindow(id) {
    let connection = this.connect();
    if (!connection) {
      return;
    }
    let message = JSON.stringify({ Action: { FocusWindow: { id } } }) + "\n";
    let response = await sendMessage(connection, message);
    this.disconnect(connection);

    let obj = this.parseMessage(response);
    return Promise.resolve(obj);
  }

  async spawn(cmd) {
    let connection = this.connect();
    if (!connection) {
      return;
    }
    let message =
      JSON.stringify({ Action: { Spawn: { command: cmd.split(" ") } } }) + "\n";
    let response = await sendMessage(connection, message);
    this.disconnect(connection);

    let obj = this.parseMessage(response);
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
}

function ShellService(wm) {
  let supportedWM = {
    niri: NiriShell,
    hyprland: HyprShell,
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

  return null;
}

export default ShellService;
export { NiriShell, HyprShell };
