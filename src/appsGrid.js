import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";
import { Extension } from "./lib/extensionInterface.js";
import { getAppInfo } from "./lib/appInfo.js";

const SEARCH_ONKEY_DELAY = 750;

// Create a button widget to represent each item in the grid
function createButtonWidget(item) {
  const button = new Gtk.Button();

  const vbox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 5,
  });

  const icon = new Gtk.Image({
    icon_name: item.icon_name,
    pixel_size: 48,
  });

  const label = new Gtk.Label({ label: item.label });

  vbox.append(icon);
  vbox.append(label);

  button._icon = icon;
  button._label = label;
  button.set_child(vbox);
  return button;
}

// Define a simple model for the GridView
const ListItemModel = GObject.registerClass(
  {},
  class ListItemModel extends GObject.Object {
    static [GObject.properties] = {
      label: GObject.ParamSpec.string(
        "label",
        "Label",
        "Button Label",
        GObject.ParamFlags.READWRITE,
        "",
      ),
      icon_name: GObject.ParamSpec.string(
        "icon_name",
        "Icon Name",
        "Icon Name",
        GObject.ParamFlags.READWRITE,
        "",
      ),
      app_id: GObject.ParamSpec.string(
        "app_id",
        "App Id",
        "App Id",
        GObject.ParamFlags.READWRITE,
        "",
      ),
    };

    _init(label, icon_name, app_id) {
      super._init();
      this.label = label;
      this.icon_name = icon_name;
      this.app_id = app_id;
    }
  },
);

function getTermsForSearchString(searchString) {
  searchString = searchString.replace(/^\s+/g, "").replace(/\s+$/g, "");
  if (searchString === "") return [];
  return searchString.split(/\s+/);
}

const AppsGrid = GObject.registerClass(
  {
    Signals: { "search-updated": {} },
  },
  class AppsGrid extends Extension {
    _init(params) {
      this.name = params?.name ?? "Apps-Grid";
      delete params?.name;
      super._init({
        ...(params ?? {}),
      });
    }

    enable() {
      this.default_width = 600;
      this.default_height = 400;

      this.window = new Gtk.Window({
        title: this.name,
        name: this.name,
        hexpand: true,
        vexpand: true,
        default_width: this.default_width,
        default_height: this.default_height,
        decorated: false,
      });

      this.window.add_css_class("has-results");

      let prefix = "apps-grid";
      this.stylePrefix = this.name.toLowerCase();

      this.settings = Main.settings;
      this.settingsMap = {
        // [`${prefix}-padding`]: this.update_style.bind(this),
        // [`${prefix}-icon-shadow`]: this.update_style.bind(this),
        [`${prefix}-preferred-monitor`]: () => {},
        [`${prefix}-icon-size`]: this.update_icon_size.bind(this),
        [`${prefix}-icon-scale`]: this.update_icon_size.bind(this),
        [`${prefix}-scale-width`]: this.update_layout.bind(this),
        [`${prefix}-scale-height`]: this.update_layout.bind(this),
        [`${prefix}-border-radius`]: this.update_style.bind(this),
        [`${prefix}-border-color`]: this.update_style.bind(this),
        [`${prefix}-border-thickness`]: this.update_style.bind(this),
        [`${prefix}-background-color`]: this.update_style.bind(this),
        [`${prefix}-text-color`]: this.update_style.bind(this),
        [`${prefix}-entry-text-color`]: this.update_style.bind(this),
        [`${prefix}-font-size`]: this.update_style.bind(this),
        [`${prefix}-entry-font-size`]: this.update_style.bind(this),
      };

      this.style = Main.style;

      let builder = new Gtk.Builder();
      builder.add_from_file(`./ui/apps.ui`);
      let widget = builder.get_object("apps-window");
      let entry = builder.get_object("entry");

      let searchIcon = Gio.ThemedIcon.new("system-search-symbolic");
      // Set the icon to the primary position
      entry.set_icon_from_gicon(Gtk.EntryIconPosition.PRIMARY, searchIcon);
      entry.set_placeholder_text("Type to search apps...");

      let clearIcon = Gio.ThemedIcon.new("edit-clear-symbolic");
      entry.set_icon_from_gicon(Gtk.EntryIconPosition.SECONDARY, clearIcon);
      entry.connect("icon-press", (widget, icon_position, event) => {
        if (icon_position === Gtk.EntryIconPosition.SECONDARY) {
          widget.set_text(""); // Clear the entry text
          this.clear();
        }
      });

      // this.resultsApps = builder.get_object('results-apps');
      // this.resultsApps.add_css_class('results-apps');
      this.resultsView = builder.get_object("results-view");
      this.resultsView.add_css_class("results-view");

      let factory = Gtk.SignalListItemFactory.new();
      factory.connect("bind", (factory, listItem) => {
        const item = listItem.get_item();
        if (item) {
          // Update the widget's content (e.g., label and icon)
          let button = listItem.get_child();
          if (!button) {
            button = createButtonWidget(item);
            button.connect("clicked", () => {
              this.activateItem(item); // Call activation handler
            });
            listItem.set_child(button);
          } else {
            button._icon.set_from_icon_name(item.icon_name);
            button._label.set_label(item.label);
          }

          if (button) {
            button._icon.set_pixel_size(this.get_icon_size());
          }
        }
      });

      this.resultsView.set_factory(factory);

      let searchOnKeyPress = () => {
        this._debounceSearchOnKeypress = Main.loTimer.debounce(
          Main.loTimer,
          () => {
            try {
              this.search(entry.get_text());
            } catch (err) {
              // oops!?
              console.log(err);
            }
          },
          SEARCH_ONKEY_DELAY,
          this._debounceSearchOnKeypress,
        );
      };

      entry.connect("activate", () => {
        if (this._debounceSearchOnKeypress) {
          Main.loTimer.cancel(this._debounceSearchOnKeypress);
          this._debounceSearchOnKeypress = null;
        }
        try {
          this.search(entry.get_text());
        } catch (err) {
          // oops!?
          console.log(err);
        }
      });
      entry.connect("changed", () => {
        searchOnKeyPress();
      });
      this.entry = entry;

      this.entryContainer = builder.get_object("entry-container");
      this.entryContainer.add_css_class("entry-container");

      let event = new Gtk.EventControllerKey();
      event.connect("key-pressed", (w, key, keycode) => {
        switch (key) {
          case Gdk.KEY_Escape: {
            this.hide();
            break;
          }
          default:
            // searchOnKeyPress();
            break;
        }
      });
      this.window.add_controller(event);

      this.container = widget;
      this.window.set_child(this.container);

      LayerShell.init_for_window(this.window);
      LayerShell.set_layer(this.window, LayerShell.Layer.TOP);
      LayerShell.set_keyboard_mode(
        this.window,
        LayerShell.KeyboardMode.EXCLUSIVE,
      );

      if (Main?.dbus) {
        Main.dbus.connectObject(
          "request-apps",
          () => {
            if (this.window.visible) {
              this.hide();
            } else {
              this.show();
            }
          },
          this,
        );
      }

      this.load_settings();
      this.update_layout();
      this.update_style();
      super.enable();
    }

    disable() {
      Main.settings.disconnectObject(this);
      if (Main?.dbus) {
        Main.dbus.disconnectObject(this);
      }
      if (this._debounceSearchOnKeypress) {
        Main.loTimer.cancel(this._debounceSearchOnKeypress);
        this._debounceSearchOnKeypress = null;
      }
      this.window.destroy();
      this.window = null;

      this.providers = null;
      this.cancellable = null;
      super.disable();
    }

    async search(terms) {
      this.terms = getTermsForSearchString(terms);
      if (!this.terms.length) {
        this.updateApps([]);
        return;
      }

      Main.apps
        .search(terms)
        .then((res) => {
          this.updateApps(res);
        })
        .catch((err) => {
          console.log(err);
        });
    }

    async update_layout() {
      let w = this.default_width * (1 + this.SCALE_WIDTH ?? 0);
      let h = this.default_height * (1 + this.SCALE_HEIGHT ?? 0);
      this.window.set_size_request(w, h);
    }

    async update_style() {
      let fontSizes = [18, 8, 12, 16, 18, 20, 22, 24, 36, 48];
      let rads = [0, 8, 16, 20, 24, 28, 32, 36, 40, 42];

      let styles = [];

      let border = this.BORDER_THICKNESS;
      let borderRadius = rads[Math.floor(this.BORDER_RADIUS)];
      let borderColor = this.style.rgba(this.BORDER_COLOR);
      let foregroundColor = this.style.rgba(this.TEXT_COLOR);
      let backgroundColor = this.style.rgba(this.BACKGROUND_COLOR);
      let entryColor = this.style.rgba(this.ENTRY_TEXT_COLOR);
      let fontSize = fontSizes[this.FONT_SIZE] ?? 22;
      let entryFontSize = fontSizes[this.ENTRY_FONT_SIZE] ?? 22;
      let windowName = this.name;

      // text in general
      {
        let ss = [];
        if (foregroundColor[3] > 0) {
          ss.push(`color: rgba(${foregroundColor.join(",")});`);
        }
        ss.push(`font-size: ${fontSize}pt;`);
        styles.push(`#${windowName} * { ${ss.join(" ")}}`);
      }

      // entry text
      {
        let ss = [];
        if (entryColor[3] > 0) {
          ss.push(`color: rgba(${entryColor.join(",")});`);
        }
        ss.push(`font-size: ${entryFontSize}pt;`);
        styles.push(`#${windowName} entry * { ${ss.join(" ")}}`);
      }

      // {
      //   let ss = [];
      //   let pad = Math.floor(this.PADDING * 10);
      //   ss.push(`padding: ${pad}px;`);
      //   styles.push(`#${windowName} #center { ${ss.join(' ')}}`);
      // }

      // border-radius
      {
        let ss = [`border-radius: ${borderRadius}px;`];
        styles.push(`#${windowName} { ${ss.join(" ")}}`);
        styles.push(`#${windowName} entry { ${ss.join(" ")}}`);
        styles.push(`#${windowName} .entry-container { ${ss.join(" ")}}`);
        ss = [`border-radius: ${Math.floor(borderRadius * 0.6)}px;`];
        styles.push(`#${windowName} .result-row:focus { ${ss.join(" ")}}`);
        styles.push(`#${windowName} button { ${ss.join(" ")}}`);
      }

      // border
      // background & border
      {
        let ss = [];
        ss.push(`border: ${border}px solid rgba(${borderColor.join(",")});`);
        if (backgroundColor[3] > 0) {
          ss.push(`background: rgba(${backgroundColor.join(",")});`);
        }
        styles.push(`#${windowName} .entry-container { ${ss.join(" ")}}`);
        styles.push(`#${windowName}.has-results{ ${ss.join(" ")}}`);
        styles.push(
          `#${windowName}.has-results .entry-container { background: transparent; border-color: transparent; }`,
        );
        // styles.push(
        //   `#${windowName}.has-results .blurred-background { background: rgba(150,150,150,0.2); border-color: transparent; }`,
        //   `#${windowName}.has-results .blurred-background { border: 20px solid red; filter: blur(20px); }`,
        // );
      }

      // if (this.ICON_SHADOW) {
      //   styles.push(
      //     `#${windowName} button { -gtk-icon-shadow: rgba(0, 0, 0, 0.6) 0 6px 6px; }`,
      //   );
      // }

      try {
        console.log(JSON.stringify(styles, null, 4));
        this.style.buildCss(`${this.stylePrefix}-style`, styles);
      } catch (err) {
        console.log(err);
      }

      // this.window.queue_resize();
    }

    updateApps(apps) {
      const items = new Gio.ListStore({ item_type: ListItemModel });

      if (!apps || !apps.length) {
        apps = Main.apps.apps.map((app) => {
          return getAppInfo(app.get_id());
        });
        apps.sort((a, b) => {
          return a.title > b.title ? 1 : -1;
        });
      }

      apps.forEach((appInfo) => {
        let title = appInfo.title;
        if (title.length > 12) {
          title = title.substr(0, 12) + "...";
        }
        items.append(
          new ListItemModel(
            title,
            appInfo.icon_name ?? "emblem-system",
            appInfo.id,
          ),
        );
      });

      this.items = items;

      const selectionModel = new Gtk.SingleSelection({ model: items });
      this.resultsView.set_model(selectionModel);
    }

    get_icon_size() {
      const baseIconSizes = [16, 22, 24, 32, 48, 64];
      let iconSize =
        (baseIconSizes[this.ICON_SIZE] ?? 48) *
        (1 + 2 * (this.ICON_SCALE ?? 0));
      return iconSize;
    }

    update_icon_size() {}

    clear() {
      this.updateApps([]);
    }

    activateItem(item) {
      let appInfo = getAppInfo(item.app_id);
      if (appInfo.exec) {
        Main.shell.spawn(appInfo.exec);
      }
      this.hide();
      // console.log(item.app_id);
    }

    show() {
      Main.search.hide();

      // monitor
      this.monitor = Main.monitors.getMonitor(this.PREFERRED_MONITOR);
      if (!this.monitor || !this.monitor.valid) {
        this.monitor = Main.monitors.getPrimaryMonitor();
      }
      LayerShell.set_monitor(this.window, this.monitor);

      this.updateApps([]);
      this.window.add_css_class("startup");
      // this.window.remove_css_class('has-results');
      this.window.present();
      this.entry.grab_focus();

      Main.hiTimer.runOnce(() => {
        this.window.remove_css_class("startup");
      }, 0);
    }

    hide() {
      this.window.add_css_class("startup");

      Main.hiTimer.runOnce(() => {
        this.clear();
        this.window.hide();
      }, 400);
    }

    toggle() {
      // this.updateApps();
      if (!this.window.visible) {
        this.show();
      } else {
        this.hide();
      }
    }
  },
);

export default AppsGrid;
