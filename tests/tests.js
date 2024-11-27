import { Power } from "../modules/power.js";
import { Network } from "../modules/network.js";
import { Volume, Mic } from "../modules/volume.js";
import Shell from "../shell.js";
import GLib from "gi://GLib";

function run() {
  // let p = new Power();
  // p.subscribe(null, 'power-update', (state) => { console.log(state); });
  // p.init();

  // let s = new Shell();
  // s.init();
  // // s.spawn("kitty");

  // let n = new Network();
  // n.init();

  let v = new Volume();
  v.subscribe(null, "volume-update", (state) => {
    console.log(state);
  });
  v.init();

  let m = new Mic();
  m.subscribe(null, "mic-update", (state) => {
    console.log(state);
  });
  m.init();
}

run();

let loop = GLib.MainLoop.new(null, false);
loop.run();
