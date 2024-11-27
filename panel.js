import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";

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
      this.icon.set_from_icon_name(icon);
      this.icon.set_visible(icon);
    }
  },
);

export const Panel = GObject.registerClass(
  class Panel extends Gtk.Window {
    _init(params) {
      let width = Gdk.Display.get_default()
        .get_monitors()
        .get_item(0)
        .get_geometry().width;

      super._init({
        title: "Panel",
        name: "Panel",
        default_width: width,
        default_height: 20,
        ...params,
      });

      this.add_css_class("startup");

      LayerShell.init_for_window(this);
      LayerShell.set_anchor(this, LayerShell.Edge.TOP, true);
      LayerShell.auto_exclusive_zone_enable(this);
      LayerShell.set_margin(this, LayerShell.Edge.TOP, 0);
      LayerShell.set_layer(this, LayerShell.Layer.TOP);
    }

    init() {
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

      let clock = new PanelItem({
        name: "Clock",
      });
      clock.set_label("Clock");
      center.append(clock);

      let power = new PanelItem({
        name: "Power",
      });
      power.set_label("power");
      right.append(power);

      let network = new PanelItem({
        name: "network",
      });
      network.set_label("network");
      right.append(network);

      let volume = new PanelItem({
        name: "Volume",
      });
      volume.set_label("volume");
      right.append(volume);

      this.clock = clock;

      this.left = left;
      this.center = center;
      this.right = right;
      this.box = box;
      this.bg = bg;

      this.set_child(container);
      this.present();

      setTimeout(this.update_bg.bind(this), 500);
      setInterval(this.update.bind(this), 1000 * 60);

      Main.power.subscribe(this, "power-update", (state) => {
        // power.set_label(`${state.fillLevel}%`);
        power.set_label(``);
        power.set_icon(state.icon);
      });
      Main.power.sync();

      Main.network.subscribe(this, "network-update", (state) => {
        // network.set_label(`${state.connectivity} ${state.enabled}`);
        network.set_label(``);
        network.set_icon(state.icon);
      });
      Main.network.sync();

      Main.volume.subscribe(this, "volume-update", (state) => {
        // volume.set_label(`${state.connectivity} ${state.enabled}`);
        volume.set_label(``);
        volume.set_icon(state.icon);
      });
      Main.volume.sync();

      this.update();
    }

    update_bg() {
      let w = this.get_allocated_width();
      let h = this.get_allocated_height();
      this.bg.set_size_request(w, h);
      this.box.set_size_request(w, h);

      this.remove_css_class("startup");
    }

    update() {
      let dt = formatDate(new Date());
      this.clock.set_label(dt);
    }
  },
);

export default Panel;
