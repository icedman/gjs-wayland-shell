import GLib from "gi://GLib";
import Gio from "gi://Gio";

const BYTES_NUM = 4096;

/**
 * Logs errors.
 * @param {Error} error - The error to log.
 */
function logError(error) {
  log(`Error: ${error.message}`);
}

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

function disconnectSocket(connection) {
  connection.close(null);
}

function connectToHyprSocket(num = "") {
  let XDG_RUNTIME_DIR = GLib.getenv("XDG_RUNTIME_DIR");
  let HYPRLAND_INSTANCE_SIGNATURE = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
  if (!XDG_RUNTIME_DIR || !HYPRLAND_INSTANCE_SIGNATURE) {
    log(`HYPRLAND unavailabe`);
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
    log(`NIRI unavailabe`);
    return null;
  }

  return connectToSocket(socketPath, "NIRI");
}

/**
 * Connect to the Sway Wayland socket.
 * @returns {Gio.SocketConnection | null} A connection to the socket, or null on failure.
 */
function connectToSwaySocket() {
  let socketPath = GLib.getenv("SWAYSOCK");
  if (!socketPath) {
    log(`SWAY unavailabe`);
    return null;
  }

  return connectToSocket(socketPath, "SWAY");
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

    let bytes = new GLib.Bytes(message);
    outputStream.write_all(bytes.get_data(), null);
    outputStream.flush(null);
    log(`Message sent: ${message}`);
    return true;
  } catch (err) {
    console.log(err);
  }
  return false;
}

async function receiveMessage(connection, count = BYTES_NUM) {
  let inputStream = connection.get_input_stream();
  if (!inputStream) {
    logError(new Error("Failed to get input stream."));
    return false;
  }

  let inputBytes = inputStream.read_bytes(count, null);
  let byteArray = new Uint8Array(inputBytes.get_data());
  let response = String.fromCharCode.apply(null, byteArray);
  return response;
}

const ipcMagic = ["i", "3", "-", "i", "p", "c"].map((char) =>
  char.charCodeAt(0),
);
const IPC_HEADER_SIZE = ipcMagic.length + 8; // Magic (6 bytes) + len (4 bytes) + type (4 bytes)

function buildIpcHeader(type, len) {
  // Create a Uint8Array for the header
  const header = new Uint8Array(IPC_HEADER_SIZE);

  // Copy the magic bytes into the header
  for (let i = 0; i < ipcMagic.length; i++) {
    header[i] = ipcMagic[i];
  }

  // Write the length (len) as a 32-bit unsigned integer (little-endian)
  header[ipcMagic.length] = len & 0xff;
  header[ipcMagic.length + 1] = (len >> 8) & 0xff;
  header[ipcMagic.length + 2] = (len >> 16) & 0xff;
  header[ipcMagic.length + 3] = (len >> 24) & 0xff;

  // Write the type as a 32-bit unsigned integer (little-endian)
  header[ipcMagic.length + 4] = type & 0xff;
  header[ipcMagic.length + 5] = (type >> 8) & 0xff;
  header[ipcMagic.length + 6] = (type >> 16) & 0xff;
  header[ipcMagic.length + 7] = (type >> 24) & 0xff;

  // Wrap the Uint8Array in a GLib.Bytes object
  return GLib.Bytes.new(header);
}

async function sendI3Message(connection, type, message) {
  let header = buildIpcHeader(type, message.length); //(new GLib.Bytes(message)).get_size());
  try {
    let outputStream = connection.get_output_stream();
    if (!outputStream) {
      logError(new Error("Failed to get output stream."));
      return false;
    }
    outputStream.write_all(header.get_data(), null);
    outputStream.flush(null);
  } catch (err) {
    console.log(err);
  }
  let res = await sendMessage(connection, message);
  return Promise.resolve(res);
}

async function receiveI3Message(connection, count = BYTES_NUM) {
  let inputStream = connection.get_input_stream();
  if (!inputStream) {
    logError(new Error("Failed to get input stream."));
    return false;
  }

  let inputBytes, headerBytes;
  try {
    inputBytes = inputStream.read_bytes(IPC_HEADER_SIZE, null);
    headerBytes = new Uint8Array(inputBytes.get_data());
  } catch (err) {
    console.log(err);
    return false;
  }

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
  let responseBytes = new Uint8Array(inputBytes.get_data());
  let response = String.fromCharCode.apply(null, responseBytes);
  return Promise.resolve(response);
}

export {
  connectToSocket,
  connectToNiriSocket,
  connectToHyprSocket,
  connectToSwaySocket,
  disconnectSocket,
  sendMessage,
  receiveMessage,
  sendI3Message,
  receiveI3Message,
  IPC_HEADER_SIZE,
  BYTES_NUM,
};
