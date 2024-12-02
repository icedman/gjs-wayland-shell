import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { Power } from '../src/lib/power.js';
import { Network } from '../src/lib/network.js';
import { Volume, Mic } from '../src/lib/volume.js';
import { Trash } from '../src/lib/trash.js';
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
} from '../src/lib/ipc.js';
import ShellService from '../src/shell.js';
import '../src/lib/environment.js';
import { Extension as Console } from '../src/extensions/console/extension.js';

function test_shell() {
  let s = ShellService();
  s.init();
  s.subscribe(null, 'window*', (event) => {
    console.log(event);
    console.log(s.windows.length);
  });
  s.listen();
  s.getWindows()
    .then((res) => {
      console.log(res);
    })
    .catch((err) => {
      console.log('oops');
      console.log(err);
    });
  s.spawn('kitty');
}

function test_bar_items() {
  let p = new Power();
  p.connect('power-update', (obj) => {
    console.log(obj.state);
  });
  p.init();

  let n = new Network();
  n.connect('network-update', (obj) => {
    console.log(obj.state);
  });
  n.init();

  let v = new Volume();
  v.connect('volume-update', (obj) => {
    console.log(obj.state);
  });
  v.init();

  let m = new Mic();
  m.connect('mic-update', (obj) => {
    console.log(obj.state);
  });
  m.init();

  let t = new Trash();
  t.connect('trash-update', (obj) => {
    console.log(obj.state);
  });
  t.init();
}

async function run() {
  let t = new Network();
  t.init();

  try {
    let c = new Console();
    globalThis.network = t;
    c.enable();
  } catch (err) {
    console.log(err);
  }
}

Gtk.init();
run();

let loop = GLib.MainLoop.new(null, false);
loop.run();
