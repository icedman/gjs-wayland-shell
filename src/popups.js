import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import LayerShell from "gi://Gtk4LayerShell";
import { Extension } from "./lib/extensionInterface.js";

const Popups = GObject.registerClass(
  class Popups extends Extension {
    _init(params) {
      this.name = params?.name ?? "popups";
      delete params?.name;

      super._init({
        ...params,
      });
    }

    enable() {
      this.style = Main.style;
      let _updateStyle = this.update_style.bind(this);

      let prefix = "popup";
      this.stylePrefix = prefix;
      this.settingsPrefix = prefix;
      this.settings = Main.settings;
      this.settingsMap = {
        [`${prefix}-padding`]: _updateStyle,
        [`${prefix}-border-radius`]: _updateStyle,
        [`${prefix}-border-color`]: _updateStyle,
        [`${prefix}-border-thickness`]: _updateStyle,
        [`${prefix}-foreground-color`]: _updateStyle,
        [`${prefix}-background-color`]: _updateStyle,
      };

      this.load_settings();
      this.update_style();

      super.enable();
    }

    async update_style() {
      let rads = [0, 8, 16, 20, 24, 28, 32, 36, 40, 42];

      let styles = [];

      let padding = this.PADDING ?? 0;
      let border = this.BORDER_THICKNESS ?? 0;
      let borderRadius = rads[Math.floor(this.BORDER_RADIUS)] ?? 0;
      let borderColor = this.style.rgba(this.BORDER_COLOR);
      let foregroundColor = this.style.rgba(this.FOREGROUND_COLOR);
      let backgroundColor = this.style.rgba(this.BACKGROUND_COLOR);
      let windowName = "Menu";

      // color
      {
        let ss = [];
        if (foregroundColor[3] > 0) {
          ss.push(`color: rgba(${foregroundColor.join(",")});`);
        }
        styles.push(`#${windowName} * { ${ss.join(" ")} }`);
      }

      {
        let ss = [];
        let pad = Math.floor(padding * 20);
        ss.push(`padding: ${pad}px;`);
        ss.push(`border: ${border}px solid rgba(${borderColor.join(",")});`);
        if (backgroundColor[3] > 0) {
          ss.push(`background: rgba(${backgroundColor.join(",")});`);
        }
        styles.push(`#${windowName} contents { ${ss.join(" ")} }`);
        styles.push(`#${windowName} arrow { ${ss.join(" ")} }`);
      }

      // border radius
      {
        let ss = [];
        ss.push(`border-radius: ${borderRadius}px;`);
        styles.push(`#${windowName} contents { ${ss.join(" ")} }`);
      }
      {
        let ss = [];
        ss.push(`border-radius: ${Math.floor(borderRadius * 0.6)}px;`);
        styles.push(`#${windowName} button { ${ss.join(" ")} }`);
      }

      // shadow
      if (this.ICON_SHADOW) {
        styles.push(
          `#${windowName} button { -gtk-icon-shadow: rgba(0, 0, 0, 0.6) 0 6px 6px; }`,
        );
      }

      // buttons in general
      {
        styles.push(`#${windowName} button { outline: none; }`);
      }

      try {
        console.log(styles);
        this.style.buildCss(`${this.stylePrefix}-style`, styles);
      } catch (err) {
        console.log(err);
      }
    }

    disable() {
      this.window.destroy();
      this.window = null;
      super.disable();
    }
  },
);

export default Popups;
