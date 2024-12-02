import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import Power from '../src/lib/power.js';
import Network from '../src/lib/network.js';
import Brightness from '../src/lib/brightness.js';
import { Volume, Mic } from '../src/lib/volume.js';
import Trash from '../src/lib/trash.js';
// import {
//   connectToSocket,
//   connectToNiriSocket,
//   connectToHyprSocket,
//   connectToSwaySocket,
//   disconnectSocket,
//   sendMessage,
//   receiveMessage,
//   sendI3Message,
//   receiveI3Message,
// } from '../src/lib/ipc.js';
import ShellService from '../src/shell.js';
import '../src/lib/environment.js';
import Console from '../src/extensions/console/extension.js';

globalThis.Main = {};

function test_shell() {
  let s = ShellService();
  s.enable();
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
  p.enable();

  let v = new Volume();
  v.connect('volume-update', (obj) => {
    console.log(obj.state);
  });
  v.enable();

  let m = new Mic();
  m.connect('mic-update', (obj) => {
    console.log(obj.state);
  });
  m.enable();

  let t = new Trash();
  t.connect('trash-update', (obj) => {
    console.log(obj.state);
  });
  t.enable();

  let b = new Brightness();
  b.connect('brightness-update', (obj) => {
    console.log(obj.state);
  });
  b.enable();
  Main.brightness = b;
}

async function test_network() {
  let n = new Network();
  n.enable();
  Main.network = n;
}

Gtk.init();

// test_shell();
// test_bar_items();
test_network();

try {
  let c = new Console();
  c.enable();
} catch (err) {
  console.log(err);
}

let loop = GLib.MainLoop.new(null, false);
loop.run();
