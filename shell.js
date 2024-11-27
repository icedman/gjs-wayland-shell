import GLib from "gi://GLib";
import Gio from "gi://Gio";

const BYTES_NUM = 4096;

/**
 * Connect to the Niri Wayland socket.
 * @returns {Gio.SocketConnection | null} A connection to the socket, or null on failure.
 */
function connectToNiriSocket() {
  let socketPath = GLib.getenv("NIRI_SOCKET");
  if (!socketPath) {
    return null;
  }

  try {
    // Check if the socket file exists
    if (!GLib.file_test(socketPath, GLib.FileTest.EXISTS)) {
      logError(new Error(`Niri socket not found at ${socketPath}`));
      return null;
    }

    // Create a socket address for the Unix socket
    let socketAddress = Gio.UnixSocketAddress.new(socketPath);

    // Create a socket client
    let client = new Gio.SocketClient();

    // Connect to the socket synchronously
    let connection = client.connect(socketAddress, null);

    log(`Connected to Niri socket at ${socketPath}`);
    return connection;
  } catch (e) {
    logError(new Error(`Failed to connect to Niri socket: ${e.message}`));
    return null;
  }
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

class ShellService {
  constructor(params) {
    this.subscribers = [];
  }

  subscribe(sub, event, func) {
    this.subscribers.push({ subscriber: sub, event: event, callback: func });
  }

  init() {
    this.subscribers = [];
    setTimeout(() => {
      this.listen();
    }, 1000);
  }

  async broadcast(obj) {
    let eventType = Object.keys(obj)[0];
    // console.log(eventType);
    this.subscribers.forEach((sub) => {
      // console.log(sub);
      if (
        (sub.event.endsWith("*") && sub.event.startsWith(eventType)) ||
        sub.event == eventType
      ) {
        sub.callback(obj);
      }
    });
  }

  async listen() {
    let connection = connectToNiriSocket();
  }

  async _listen() {
    let connection = connectToNiriSocket();
    if (connection) {
      log("Wayland connection to Niri established successfully!");
    } else {
      logError(new Error("Failed to establish a Wayland connection to Niri."));
      return false;
    }

    let response = await sendMessage(connection, '"EventStream"\n');
    console.log(response);

    let inputStream = connection.get_input_stream();
    if (!inputStream) {
      logError(new Error("Failed to get input stream."));
      return false;
    }

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
                let obj = JSON.parse(line);
                _broadcast(obj);
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

  async get_windows() {
    // Attempt to connect to the Niri Wayland socket
    let connection = connectToNiriSocket();
    if (connection) {
      log("Wayland connection to Niri established successfully!");
    } else {
      log("Failed to establish a Wayland connection to Niri.");
      return false;
    }

    let message = '"Windows"\n';
    let response = await sendMessage(connection, message);
    connection.close(null);
    return Promise.resolve(response); // todo!
  }

  async spawn(cmd) {
    // GLib.spawn_command_line_async(cmd.replace("%U", ""));
    // Attempt to connect to the Niri Wayland socket
    let connection = connectToNiriSocket();
    if (connection) {
      log("Wayland connection to Niri established successfully!");
    } else {
      log("Failed to establish a Wayland connection to Niri.");
      return false;
    }

    let message =
      JSON.stringify({ Action: { Spawn: { command: cmd.split(" ") } } }) + "\n";
    let response = await sendMessage(connection, message);
    connection.close(null);
    return Promise.resolve(response); // todo!
  }
}

export default ShellService;
