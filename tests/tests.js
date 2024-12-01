import { Power } from '../lib/power.js';
import { Network } from '../lib/network.js';
import { Volume, Mic } from '../lib/volume.js';
import { Trash } from '../lib/trash.js';
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
} from '../lib/ipc.js';
import ShellService from '../shell.js';
import GLib from 'gi://GLib';

function run() {
  // {
  //   let conn = connectToSwaySocket();
  //   sendI3Message(conn, 0, "exec kitty").then((res) => {
  //     console.log(res);
  //     receiveI3Message(conn).then((res) => {
  //       console.log(res);
  //       disconnectSocket(conn);
  //     });
  //   })
  // }

  // {
  //   let conn = connectToSwaySocket();
  //   sendI3Message(conn, 4, "").then((res) => {
  //     console.log(res);
  //     receiveI3Message(conn).then((res) => {
  //       console.log(res);
  //       disconnectSocket(conn);
  //     });
  //   });
  // }

  // let p = new Power();
  // p.subscribe(null, 'power-update', (state) => { console.log(state); });
  // p.init();

  let s = ShellService();
  s.init();
  s.subscribe(null, 'window*', (event) => {
    // console.log(event);
    console.log(s.windows.length);
  });
  s.listen();
  s.getWindows()
    .then((res) => {
      // console.log(res);
    })
    .catch((err) => {
      // console.log('oops');
      // console.log(err);
    });
  // s.getWindows()
  //   .then((res) => {
  //     console.log(res);
  //   })
  //   .catch((err) => {
  //     console.log("oops");
  //     console.log(err);
  //   });
  // s.spawn("kitty");

  // let n = new Network();
  // n.subscribe(null, 'network-update', (state) => { console.log(state); });
  // n.init();

  // let v = new Volume();
  // v.subscribe(null, "volume-update", (state) => {
  //   console.log(state);
  // });
  // v.init();

  // let m = new Mic();
  // m.subscribe(null, "mic-update", (state) => {
  //   console.log(state);
  // });
  // m.init();

  // let t = new Trash();
  // t.subscribe(null, "trash-update", (state) => {
  //   console.log(state);
  // });
  // t.init();
}

run();

let loop = GLib.MainLoop.new(null, false);

// setTimeout(() => {
//   console.log("done\n\n");
//   loop.quit();
// }, 3500);

loop.run();
