import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Dock from "./dock.js";
import Panel from "./panel.js";
import { Power } from "./modules/power.js";
import { Network } from "./modules/network.js";
import { Volume, Mic } from "./modules/volume.js";
import ShellService from "./shell.js";

// Initialize Gtk before you start calling anything from the import
Gtk.init();

let loop = GLib.MainLoop.new(null, false);

let provider = new Gtk.CssProvider();
try {
  provider.load_from_path("./style.css");
} catch (e) {
  logError(e, "Failed to add application style");
}
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  provider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
);

globalThis.Main = {
  app: {
    quit: () => {
      loop.quit();
    },
  },

  // ui
  dock: new Dock(),
  panel: new Panel(),

  // modules
  shell: new ShellService(),
  power: new Power(),
  network: new Network(),
  volume: new Volume(),
  mic: new Mic(),

  modules: [],
};

Main.modules = [
  ...Main.modules,
  Main.shell,
  Main.power,
  Main.network,
  Main.volume,
  Main.mic,
];
Main.modules.forEach(async (m) => {
  m.init();
});
Main.dock.init();
Main.panel.init();

loop.run();
