import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";

export function createNetworkIndicator(config) {
  let network = Main.panel.create_panelitem(config);
  Main.network.connectObject(
    "network-update",
    () => {
      let state = Main.network.state;
      network.set_label(``);
      network.set_icon(state.icon);
      // network.visible = state.visible;
    },
    network,
  );
  Main.network.sync();

  let menu = network.menu;
  menu.has_arrow = true;

  let builder = new Gtk.Builder();
  builder.add_from_file(`${this.path}/ui/network.ui`);

  let widget = builder.get_object("network-widget");
  let i = builder.get_object("network-icon");
  let l = builder.get_object("network-label");
  l.set_size_request(40, -1);
  widget.parent?.remove(widget);
  menu.child.append(widget);
  network.menu = menu;
  // network.append(menu);

  network.on_click = (count, btn) => {
    let state = Main.network.state;
    let source = Main.network.indicator._primaryIndicatorBinding.source;
    if (btn == 3 && state.address) {
      i.set_label(state.address);
      menu.popup();
      return;
    }
    if (source) {
      i.set_label(`${source.title} ${state.id ?? source.subtitle}`);
      menu.popup();
      return;
    }
  };

  network.connect("destroy", () => {
    Main.network.disconnectObject(network);
  });

  return network;
}
