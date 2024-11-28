import { Power } from "../modules/power.js";
import { Network } from "../modules/network.js";
import { Volume, Mic } from "../modules/volume.js";
import { Trash } from "../modules/trash.js";
// import Shell from "../shell.js";
import ShellService from "../shell.js";
import GLib from "gi://GLib";

function run() {
  // let p = new Power();
  // p.subscribe(null, 'power-update', (state) => { console.log(state); });
  // p.init();

  let s = ShellService();
  s.init();
  // s.subscribe(null, "window*", (state) => {
  //   console.log(state);
  // });
  s.listen();
  s.getWindows();
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
