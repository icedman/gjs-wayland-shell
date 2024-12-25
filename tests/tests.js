import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import Power from '../src/services/power.js';
import Network from '../src/services/network.js';
import Brightness from '../src/services/brightness.js';
import Mounts from '../src/services/mounts.js';
import { Volume, Mic } from '../src/services/volume.js';
import Trash from '../src/services/trash.js';
import ShellService from '../src/shell.js';
import Search from '../src/search.js';
import '../src/lib/environment.js';
import Console from '../src/extensions/console/extension.js';

globalThis.Main = {};

function test_shell() {
  let s = ShellService();
  s.enable();
  s.connectObject('windows-update', () => {
    console.log('update...');
    console.log('--------------------------');
    console.log(s.currentWindows());
  });
  s.connectObject('window-focused', (w) => {
    console.log('focused...');
    console.log(w);
  });
  s.connectObject('window-opened', (w) => {
    console.log('opened...');
    console.log(w);
  });
  s.connectObject('window-closed', (w) => {
    console.log('closed...');
    console.log(w);
  });

  s.listen();
  s.getWindows()
    .then((res) => {
      // console.log(res);
    })
    .catch((err) => {
      console.log('oops');
      console.log(err);
    });
  // s.spawn('kitty');

  Main.shell = s;
}

function test_bar_items() {
  Main = {
    trash: new Trash(),
    power: new Power(),
    mounts: new Mounts(),
    brightness: new Brightness(),
    volume: new Volume(),
    mic: new Mic(),
  };
  Object.keys(Main).forEach((k) => {
    let service = Main[k];
    service.connect(`${k}-update`, (obj) => {
      console.log(obj.state);
    });
    service.enable();
  });
}

async function test_network() {
  let n = new Network();
  n.connect('network-update', (obj) => {
    console.log(obj.state);
  });
  n.enable();
  Main.network = n;
}

Gtk.init();

test_shell();
// test_bar_items();
// test_network();

try {
  let c = new Console();
  c.enable();
} catch (err) {
  console.log(err);
}

// try {
//   let s = new Search();
//   s.enable();
//   Main.search = s;
// } catch (err) {
//   console.log(err);
// }

let loop = GLib.MainLoop.new(null, false);
loop.run();
