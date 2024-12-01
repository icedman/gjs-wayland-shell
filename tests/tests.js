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
import GLib from 'gi://GLib';
import '../src/lib/environment.js';

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

function run() {
  let p = new Power();
  p.connect('power-update', () => {
    console.log(p.state);
  });
  p.init();

  let n = new Network();
  n.connect('network-update', () => {
    console.log(n.state);
  });
  n.init();

  let v = new Volume();
  v.connect('volume-update', () => {
    console.log(v.state);
  });
  v.init();

  let m = new Mic();
  m.connect('mic-update', () => {
    console.log(m.state);
  });
  m.init();

  let t = new Trash();
  t.connect('trash-update', () => {
    console.log(t.state);
  });
  t.init();
}

run();

let loop = GLib.MainLoop.new(null, false);

// setTimeout(() => {
//   console.log("done\n\n");
//   loop.quit();
// }, 3500);

loop.run();
