import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { PopupMenu } from './lib/popupMenu.js';
import { Extension } from './lib/extensionInterface.js';
import { getAppInfo, getAppInfoFromFile } from './lib/appInfo.js';

export const IconGroups = {
  HEAD: 10,
  FAVORITE_APPS: 100,
  RUNNING_APPS: 200,
  VOLUMES: 300,
  PLACES: 400,
  TAIL: 1000,
};

const dockLocation = ['bottom', 'left', 'right', 'top'];
const dockEdge = [
  LayerShell.Edge.BOTTOM,
  LayerShell.Edge.LEFT,
  LayerShell.Edge.RIGHT,
  LayerShell.Edge.TOP,
];
const dockEdges = [
  [LayerShell.Edge.BOTTOM, LayerShell.Edge.LEFT, LayerShell.Edge.RIGHT],
  [LayerShell.Edge.LEFT, LayerShell.Edge.BOTTOM, LayerShell.Edge.TOP],
  [LayerShell.Edge.RIGHT, LayerShell.Edge.BOTTOM, LayerShell.Edge.TOP],
  [LayerShell.Edge.TOP, LayerShell.Edge.LEFT, LayerShell.Edge.RIGHT],
];
const dockOrientation = [
  Gtk.Orientation.HORIZONTAL,
  Gtk.Orientation.VERTICAL,
  Gtk.Orientation.VERTICAL,
  Gtk.Orientation.HORIZONTAL,
];

export const DockItem = GObject.registerClass(
  class DockItem extends Gtk.Box {
    _init(params) {
      let appInfo = getAppInfo(params.app);
      let iconSize = 48;
      super._init({
        name: 'DockItem',
        hexpand: true,
        vexpand: true,
      });

      this.id = appInfo.id;
      this.appInfo = appInfo;

      this.btn = new Gtk.Button({
        icon_name: appInfo.icon_name ?? 'application-x-executable',
        // tooltip_text: appInfo.title,
      });
      this.btn.add_css_class('button');

      // right click
      if (appInfo.menu?.length > 0) {
        let menu = new PopupMenu({
          items: appInfo.menu,
        });

        let evt = new Gtk.GestureClick();
        evt.set_button(3); // right click
        evt.connect('pressed', (actor, count) => {
          menu.popup();
        });
        this.btn.add_controller(evt);
        this.append(menu);
      }

      this.btn.connect('clicked', (actor) => {
        console.log(appInfo);
        try {
          Main.shell.focusOrOpen(appInfo.id, appInfo.exec);
        } catch (err) {
          console.log(err);
        }
      });
      this.btn.child.set_pixel_size(iconSize);
      this.append(this.btn);
    }

    set_icon(icon) {
      if (icon && icon.startsWith('/')) {
        this.btn.child.set_from_file(icon);
      } else {
        this.btn.child.set_from_icon_name(icon);
      }
    }
  },
);

export const DockPanel = GObject.registerClass(
  class DockPanel extends Gtk.Window {
    _init(params) {
      super._init({
        name: params.name,
        title: params.name,
        hexpand: true,
        vexpand: true,
        default_width: 20,
        default_height: 20,
        ...params,
      });

      this.style = Main.style;

      LayerShell.init_for_window(this);
      LayerShell.set_anchor(this, LayerShell.Edge.BOTTOM, true);
      LayerShell.set_margin(this, LayerShell.Edge.BOTTOM, 4);
      LayerShell.auto_exclusive_zone_enable(this);
      LayerShell.set_layer(this, LayerShell.Layer.TOP);

      this.container = new Gtk.Box({
        name: 'container',
        hexpand: true,
        vexpand: true,
      });
      this.center = new Gtk.Box({
        name: 'center',
        hexpand: false,
        vexpand: false,
      });
      this.lead = new Gtk.Box({ name: 'lead', hexpand: false, vexpand: false });
      this.trail = new Gtk.Box({
        name: 'trail',
        hexpand: false,
        vexpand: false,
      });
      this.center.orientation = Gtk.Orientation.HORIZONTAL;
      this.lead.orientation = Gtk.Orientation.HORIZONTAL;
      this.trail.orientation = Gtk.Orientation.HORIZONTAL;
      this.lead.halign = Gtk.Align.START;
      this.center.halign = Gtk.Align.CENTER;
      this.trail.halign = Gtk.Align.END;

      this.container.append(this.lead);
      this.container.append(
        new Gtk.Box({ name: 'spacer', hexpand: true, vexpand: true }),
      );
      this.container.append(this.center);
      this.container.append(
        new Gtk.Box({ name: 'spacer', hexpand: true, vexpand: true }),
      );
      this.container.append(this.trail);

      this.set_child(this.container);

      let prefix = this.name.toLowerCase();
      this.stylePrefix = prefix;

      this.settings = Main.settings;
      this.settingsMap = {
        [`${prefix}-location`]: this.update_layout.bind(this),
        [`${prefix}-edge-distance`]: this.update_layout.bind(this),
        [`${prefix}-padding`]: this.update_style.bind(this),
        [`${prefix}-icon-shadow`]: this.update_style.bind(this),
        [`${prefix}-icon-size`]: this.update_icon_size.bind(this),
        [`${prefix}-icon-scale`]: this.update_icon_size.bind(this),
        [`${prefix}-border-radius`]: this.update_style.bind(this),
        [`${prefix}-border-color`]: this.update_style.bind(this),
        [`${prefix}-border-thickness`]: this.update_style.bind(this),
        [`${prefix}-background-color`]: this.update_style.bind(this),
        [`${prefix}-panel-mode`]: this.update_style.bind(this),
        // [`${prefix}-icon-spacing`]: this.update_style.bind(this),
      };

      this.load_settings();
      this.update_layout();
      this.update_style();
    }

    load_settings() {
      Object.keys(this.settingsMap).forEach((k) => {
        let _key = k
          .replace(`${this.name.toLowerCase()}-`, '')
          .replaceAll('-', '_')
          .toUpperCase();
        this[_key] = this.settings.getSetting(k);
        this.settings.connectObject(
          `changed::${k}`,
          () => {
            this[_key] = this.settings.getSetting(k);
            this.settingsMap[k]();
          },
          this,
        );
      });
    }

    destroy() {
      this.hide();
      this.style = null;
      Main.settings.disconnectObject(this);
      super.destroy();
    }

    async update_layout() {
      if (dockOrientation[this.LOCATION] === undefined) {
        this.LOCATION = 0;
      }
      this.center.orientation = dockOrientation[this.LOCATION];
      this.lead.orientation = dockOrientation[this.LOCATION];
      this.trail.orientation = dockOrientation[this.LOCATION];
      this.container.orientation = dockOrientation[this.LOCATION];

      // clear
      for (let i = 0; i < 4; i++) {
        LayerShell.set_anchor(this, dockEdge[i], false);
        LayerShell.set_margin(this, dockEdge[i], 0);
      }

      for (let i = 0; i < 3; i++) {
        LayerShell.set_anchor(this, dockEdges[this.LOCATION][i], true);
      }
      LayerShell.set_margin(
        this,
        dockEdge[this.LOCATION],
        this.EDGE_DISTANCE * 10,
      );

      this.queue_resize();
    }

    async update_style() {
      let rads = [0, 8, 16, 20, 24, 28, 32, 36, 40, 42];

      let styles = [];
      let panelMode = this.PANEL_MODE;

      let border = this.BORDER_THICKNESS;
      let borderRadius = rads[Math.floor(this.BORDER_RADIUS)];
      let borderColor = this.style.rgba(this.BORDER_COLOR);
      let foregroundColor = this.style.rgba(this.FOREGROUND_COLOR);
      let backgroundColor = this.style.rgba(this.BACKGROUND_COLOR);
      let windowName = this.name;

      {
        let ss = [];
        if (foregroundColor[3] > 0) {
          ss.push(`color: rgba(${foregroundColor.join(',')});`);
        }
        styles.push(`#${windowName} * { ${ss.join(' ')}}`);
      }

      if (panelMode) {
        {
          let ss = [];
          let pad = Math.floor(this.PADDING * 10);
          ss.push(`padding: ${pad}px;`);
          ss.push(`border: ${border}px solid rgba(${borderColor.join(',')});`);
          if (backgroundColor[3] > 0) {
            ss.push(`background: rgba(${backgroundColor.join(',')});`);
          }
          styles.push(`#${windowName} #container { ${ss.join(' ')}}`);
        }
      } else {
        {
          let ss = [];
          let pad = Math.floor(this.PADDING * 10);
          ss.push(`padding: ${pad}px;`);
          ss.push(`border: ${border}px solid rgba(${borderColor.join(',')});`);
          if (backgroundColor[3] > 0) {
            ss.push(`background: rgba(${backgroundColor.join(',')});`);
          }
          styles.push(`#${windowName} #center { ${ss.join(' ')}}`);
        }

        {
          let ss = [];
          ss.push(`border-radius: ${borderRadius}px;`);
          styles.push(`#${windowName} #center { ${ss.join(' ')}}`);
          styles.push(`#${windowName} #container { ${ss.join(' ')}}`);
        }
      }

      {
        let ss = [];
        ss.push(`border-radius: ${Math.floor(borderRadius * 0.6)}px;`);
        styles.push(`#DockItem .button { ${ss.join(' ')}}`);
      }

      if (this.ICON_SHADOW) {
        styles.push(
          `#${windowName} button { -gtk-icon-shadow: rgba(0, 0, 0, 0.6) 0 6px 6px; }`,
        );
      }

      try {
        // console.log(styles);
        this.style.buildCss(`${this.stylePrefix}-style`, styles);
      } catch (err) {
        console.log(err);
      }

      this.queue_resize();
    }

    _get_icons(target, group = null) {
      let res = [];
      let n = target.get_first_child();
      while (n) {
        res.push(n);
        n = n.get_next_sibling();
      }
      if (group) {
        res = res.filter((icon) => icon.group == group);
      }
      return res;
    }

    get_icons(group = null) {
      return [
        ...this._get_icons(this.center, group),
        ...this._get_icons(this.lead, group),
        ...this._get_icons(this.trail, group),
      ];
    }

    async update_icon_size() {
      const baseIconSizes = [16, 22, 24, 32, 48, 64];
      let iconSize =
        (baseIconSizes[this.ICON_SIZE] ?? 48) *
        (1 + 2 * (this.ICON_SCALE ?? 0));
      let currentIcons = this.get_icons();
      currentIcons.forEach((c) => {
        // docks have buttons
        c.btn?.child?.set_pixel_size(iconSize);
        // panels have icons
        c.icon?.set_pixel_size(iconSize);
      });

      this.queue_resize();
    }
  },
);

const Dock = GObject.registerClass(
  class Dock extends Extension {
    _init(params) {
      this.name = params?.name ?? 'Dock';
      delete params?.name;
      super._init({
        ...(params ?? {}),
      });
    }

    enable() {
      this.load_settings();

      this.window = new DockPanel({
        title: this.name,
        name: this.name,
        hexpand: true,
        vexpand: true,
        default_width: 20,
        default_height: 20,
      });

      this.container = this.window.container;
      this.lead = this.window.lead;
      this.trail = this.window.trail;
      this.center = this.window.center;

      this.window.add_css_class('startup');
      this.window.present();

      Main.hiTimer.runOnce(() => {
        this.window.remove_css_class('startup');
      }, 0);
      super.enable();
    }

    disable() {
      this.window.destroy();
      this.window = null;
      super.disable();
    }

    load_settings() {}

    get_icons(group = null) {
      let res = [];
      let n = this.center.get_first_child();
      while (n) {
        res.push(n);
        n = n.get_next_sibling();
      }
      if (group) {
        res = res.filter((icon) => icon.group == group);
      }
      return res;
    }

    create_desktop_app_item(app) {
      let appInfo = getAppInfo(app);
      if (!appInfo) return;
      let currentIcons = this.get_icons();
      let existing = currentIcons.find((icon) => icon.id == appInfo.id);
      if (existing) return null;
      let btn = new DockItem({
        app: appInfo,
      });
      return btn;
    }

    add_dock_item(dockItem) {
      let currentIcons = this.get_icons();
      let existing = currentIcons.find((icon) => icon.id == dockItem.id);
      if (existing) return null;
      let box = this.center;
      box.append(dockItem);
      return dockItem;
    }

    async sort_icons() {
      this.window.update_icon_size();
      let currentIcons = this.get_icons();
      currentIcons.sort((a, b) => {
        let ap = a.group ?? 0;
        let bp = b.group ?? 0;
        if (ap == bp) return 0;
        if (ap < bp) return -1;
        return 1;
      });

      // console.log(currentIcons.map((i) => i.id));

      currentIcons.forEach((c) => {
        this.center.remove(c);
      });

      currentIcons.forEach((c) => {
        this.center.append(c);
      });
    }
  },
);

Dock.prototype.DockItem = DockItem;
Dock.prototype.DockPanel = DockPanel;

export default Dock;
