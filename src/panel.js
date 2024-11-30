import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";

function getOSName() {
  const prettyName = GLib.get_os_info("PRETTY_NAME");
  if (prettyName) return prettyName;

  const name = GLib.get_os_info("NAME");
  const version = GLib.get_os_info("VERSION");
  if (name) return version ? `${name} ${version}` : name;

  return "Linux";
}

function getShorterOSName() {
  return getOSName().split("(")[0].trim();
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Get month (0-11), add 1 and pad with leading zero
  const day = String(date.getDate()).padStart(2, "0"); // Get day and pad with leading zero
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export const PanelItem = GObject.registerClass(
  class PanelItem extends Gtk.Box {
    _init(params) {
      super._init({
        name: "PanelItem",
        ...params,
      });

      this.add_css_class("panel-item");
      this.icon = new Gtk.Image();
      this.icon.add_css_class("icon");
      this.icon.set_visible(false);
      this.append(this.icon);
      this.label = new Gtk.Label();
      this.label.add_css_class("label");
      this.label.set_visible(false);
      this.append(this.label);
    }

    set_label(label) {
      this.label.set_label(label);
      this.label.set_visible(label);
    }

    set_icon(icon) {
      this.icon.set_visible(icon);
      if (icon && icon.startsWith("/")) {
        this.icon.set_from_file(icon);
      } else {
        this.icon.set_from_icon_name(icon);
      }
    }
  },
);

export const Panel = GObject.registerClass(
  class Panel extends GObject.Object {
    _init(params) {
      super._init({
        ...params,
      });
    }

    init() {
      this.enable();
    }

    enable() {
      let width = Gdk.Display.get_default()
        .get_monitors()
        .get_item(0)
        .get_geometry().width;

      this.window = new Gtk.Window({
        title: "Panel",
        name: "Panel",
        default_width: width,
        default_height: 20,
      });

      this.window.add_css_class("startup");

      LayerShell.init_for_window(this.window);
      LayerShell.set_anchor(this.window, LayerShell.Edge.TOP, true);
      LayerShell.auto_exclusive_zone_enable(this.window);
      LayerShell.set_margin(this.window, LayerShell.Edge.TOP, 0);
      LayerShell.set_layer(this.window, LayerShell.Layer.TOP);

      let container = new Gtk.Fixed();
      let box = new Gtk.Box({ name: "box" });
      let bg = new Gtk.Box({ name: "background" });
      container.put(bg, 0, 0);
      container.put(box, 0, 0);

      let left = new Gtk.Box({ name: "left" });
      let right = new Gtk.Box({ name: "right" });
      let center = new Gtk.Box({ name: "center" });
      left.hexpand = true;
      left.halign = Gtk.Align.START;
      center.hexpand = true;
      center.halign = Gtk.Align.CENTER;
      right.hexpand = true;
      right.halign = Gtk.Align.END;
      box.append(left);
      box.append(center);
      box.append(right);

      let logo = new PanelItem({
        name: "Logo",
      });
      logo.set_label(getOSName());
      // logo.set_icon('/usr/share/fedora-logos/fedora_logo_darkbackground.svg');
      left.append(logo);

      let clock = new PanelItem({
        name: "Clock",
      });
      clock.set_label("Clock");
      center.append(clock);

      let power = new PanelItem({
        name: "Power",
      });
      power.set_label("power");

      let network = new PanelItem({
        name: "network",
      });
      network.set_label("network");

      let volume = new PanelItem({
        name: "Volume",
      });
      volume.set_label("volume");

      let mic = new PanelItem({
        name: "mic",
      });
      mic.set_label("mic");

      this.clock = clock;

      this.left = left;
      this.center = center;
      this.right = right;
      this.box = box;
      this.bg = bg;

      this.window.set_child(container);
      this.window.present();
      setTimeout(() => {
        this.window.remove_css_class("startup");
      }, 500);

      setTimeout(this.update_bg.bind(this), 500);
      setInterval(this.update.bind(this), 1000 * 60);

      this.subscriptions = [];
      Main.power.subscribe(this, "power-update", (state) => {
        // power.set_label(`${state.fillLevel}%`);
        power.set_label(``);
        power.set_icon(state.icon);
      });
      Main.power.sync();
      this.subscriptions.push(Main.power);

      Main.network.subscribe(this, "network-update", (state) => {
        // network.set_label(`${state.connectivity} ${state.enabled}`);
        network.set_label(``);
        network.set_icon(state.icon);
      });
      Main.network.sync();
      this.subscriptions.push(Main.network);

      Main.volume.subscribe(this, "volume-update", (state) => {
        // volume.set_label(`${state.connectivity} ${state.enabled}`);
        volume.set_label(``);
        volume.set_icon(state.icon);
      });
      Main.volume.sync();
      this.subscriptions.push(Main.volume);

      Main.mic.subscribe(this, "mic-update", (state) => {
        // mic.set_label(`${state.connectivity} ${state.enabled}`);
        mic.set_label(``);
        mic.set_icon(state.icon);
      });
      Main.mic.sync();
      this.subscriptions.push(Main.mic);

      [volume, mic, network, power].forEach((widget) => {
        right.append(widget);
      });

      this.update();
    }

    disable() {
      // Main.settings.diconnectObject(this);
      this.window.hide();

      this.container = null;
      this.box = null;
      this.bg = null;
      this.window = null;
    }

    update_bg() {
      let w = this.window.get_allocated_width();
      let h = this.window.get_allocated_height();
      this.bg.set_size_request(w, h);
      this.box.set_size_request(w, h);

      this.window.remove_css_class("startup");
    }

    update() {
      let dt = formatDate(new Date());
      this.clock.set_label(dt);
    }
  },
);

export default Panel;
