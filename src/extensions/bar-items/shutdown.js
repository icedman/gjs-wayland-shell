import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";

export function createShutdownIcon(config) {
  let shutdown = Main.panel.create_panelitem(config);
  let menu = shutdown.menu;
  menu.setItems([
    {
      name: "Suspend",
      exec: "systemctl suspend",
    },
    // {
    //   name: "Logout",
    //   exec: "loginctl terminate-session $(< /proc/self/sessionid)",
    // },
    {
      name: "Restart",
      exec: "shutdown -r now",
    },
    {
      name: "Shutdown",
      exec: "shutdown -h now",
    },
  ]);
  menu.has_arrow = true;

  // widget.parent.remove(widget);
  // menu.child.append(widget);

  shutdown.on_click = (count, btn) => {
    if (btn == 3) {
      return;
    }
    menu.popup();
  };

  return shutdown;
}
