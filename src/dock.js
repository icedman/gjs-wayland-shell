import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gsk from 'gi://Gsk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { PopupMenu } from './lib/popupMenu.js';
import { Dot } from './lib/dot.js';
import { Extension } from './lib/extensionInterface.js';
import { getAppInfo, getAppInfoFromFile } from './lib/appInfo.js';
import { pointInRectangle, distanceToRectangle } from './lib/collisions.js';
import { pointerInWindow, getModifierStates } from './lib/devices.js';

const baseScale = 1.55;
const scaleDownContainer = 0.75;
const oneOverScaleDownContainer = 1.1 / scaleDownContainer;
// const animatedLocations = [0, 1, 2, 3];
const animatedLocations = [0, 3];

export const IconGroups = {
  HEAD: 10,
  FAVORITE_APPS: 100,
  SEPARATOR: 199,
  SPECIAL_ICONS: 200,
  RUNNING_APPS: 300,
  VOLUMES: 400,
  PLACES: 500,
  TAIL: 1000,
};

const appIndicatorStyles = [
  '',
  'dots',
  'dot',
  'dashes',
  'dash',
  'squares',
  'square',
  'segmented',
  'solid',
  'triangles',
  'triangle',
  'diamonds',
  'diamond',
  'binary',
];

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
      this.add_css_class('dock-item');

      this.id = appInfo.id;
      this.appInfo = appInfo;

      this.btn = new Gtk.Button({
        icon_name: appInfo.icon_name ?? 'application-x-executable',
        // tooltip_text: appInfo.title,
      });
      this.btn.add_css_class('button');

      const motionController = new Gtk.EventControllerMotion();
      motionController.connect('motion', (controller, x, y) => {
        this.on_enter();
      });
      this.add_controller(motionController);

      // right click
      if (appInfo.menu?.length > 0) {
        let menu = new PopupMenu({
          app: appInfo,
        });

        let evt = new Gtk.GestureClick();
        evt.set_button(3); // right click
        evt.connect('pressed', (actor, count) => {
          menu.updateWindowItems(
            Main.shell.windows.filter(
              (w) => w.app_id == appInfo.id.replace('.desktop', ''),
            ),
          );
          menu.popup();
        });
        this.btn.add_controller(evt);
        this.menu = menu;
        this.append(menu);
      }

      this.btn.connect('clicked', async (actor) => {
        let modifiers = getModifierStates(this.parent.parent.parent);

        // move this to a general handler
        Main.shell
          .focusOrSpawn(appInfo.id, appInfo.exec, '' /* args */, modifiers)
          .then((res) => {
            if (res == 0) {
              this.add_css_class('bounce-icon');
              Main.loTimer.runOnce(() => {
                this.remove_css_class('bounce-icon');
              }, 3000);
            }
          })
          .catch((err) => {
            console.log(err);
          });
      });
      this.btn.child.set_pixel_size(iconSize);
      // this.append(this.btn);

      this.overlay = new Gtk.Fixed({ hexpand: true, vexpand: true });

      this.indicator = new Dot(48);
      this.indicator.set_state({
        style: 'binary',
        color: '#fff',
        count: 0,
      });
      this.indicator.set_sensitive(false);
      this.overlay.put(this.btn, 0, 0);
      this.overlay.put(this.indicator, 4, 0);

      this.append(this.overlay);
    }

    set_icon(icon) {
      if (icon && icon.startsWith('/')) {
        this.btn.child.set_from_file(icon);
      } else {
        this.btn.child.set_from_icon_name(icon);
      }
    }

    set_icon_size(size) {
      this.btn.child?.set_pixel_size(size);
      this.indicator?.set_size_request(size, size);
    }

    update_indicator(config = {}) {
      if (!this.appInfo || !this.indicator) return;
      let windows = Main.shell.windows.filter(
        (w) => w.app_id == this.appInfo.id.replace('.desktop', ''),
      );
      this.indicator.set_state({
        ...config,
        count: windows.length,
      });
    }

    on_enter() {}

    on_leave() {}
  },
);

export const DockPanel = GObject.registerClass(
  class DockPanel extends Gtk.Window {
    _init(params) {
      this.customSettings = params.customSettings ?? {};
      delete params.customSettings;

      super._init({
        name: params.name,
        title: params.name,
        hexpand: true,
        vexpand: true,
        default_width: 20,
        default_height: 20,
        ...params,
      });
      this.add_css_class('startup');

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
      this.center.add_css_class('icons-container');
      this.lead = new Gtk.Box({ name: 'lead', hexpand: false, vexpand: false });
      this.trail = new Gtk.Box({
        name: 'trail',
        hexpand: false,
        vexpand: false,
      });
      this.overlay = new Gtk.Fixed({ hexpand: true, vexpand: true });
      this.center.orientation = Gtk.Orientation.HORIZONTAL;
      this.lead.orientation = Gtk.Orientation.HORIZONTAL;
      this.trail.orientation = Gtk.Orientation.HORIZONTAL;
      this.lead.halign = Gtk.Align.START;
      this.center.halign = Gtk.Align.CENTER;
      this.trail.halign = Gtk.Align.END;
      this.leadSpacer = new Gtk.Box({
        name: 'spacer',
        hexpand: true,
        vexpand: true,
      });
      this.trailSpacer = new Gtk.Box({
        name: 'spacer',
        hexpand: true,
        vexpand: true,
      });
      this.container.append(this.lead);
      this.container.append(this.leadSpacer);

      this.container.append(this.center);
      // this.container.append(this.overlay);
      // this.overlay.put(this.center, 0, 0);

      this.container.append(this.trailSpacer);
      this.container.append(this.trail);

      this.set_child(this.container);

      let prefix = this.name.toLowerCase();
      this.stylePrefix = prefix;

      let _updateAnimation = this.update_animation.bind(this);
      let _updateStyle = this.update_style.bind(this);
      let _updateLayout = this.update_layout.bind(this);

      this.settingsPrefix = prefix;
      this.settings = Main.settings;
      this.settingsMap = {
        [`${prefix}-show`]: _updateLayout,
        [`${prefix}-edge-distance`]: _updateLayout,

        // settings affecting animation or affected by animation
        [`${prefix}-location`]: _updateAnimation,
        [`${prefix}-enable-animation`]: _updateAnimation,
        [`${prefix}-enable-autohide`]: _updateAnimation,

        [`${prefix}-padding`]: _updateStyle,
        [`${prefix}-icon-shadow`]: _updateStyle,
        [`${prefix}-icon-size`]: _updateAnimation,
        [`${prefix}-icon-scale`]: _updateAnimation,
        [`${prefix}-border-radius`]: _updateStyle,
        [`${prefix}-border-color`]: _updateStyle,
        [`${prefix}-border-thickness`]: _updateStyle,
        [`${prefix}-background-color`]: _updateStyle,
        [`${prefix}-panel-mode`]: _updateStyle,
        // [`${prefix}-icon-spacing`]: this.update_style.bind(this),
        [`${prefix}-running-indicator`]: this.update_indicators.bind(this),
      };

      this.load_settings();
      this.update_layout();
      this.update_style();

      LayerShell.set_keyboard_mode(
        this,
        LayerShell.KeyboardMode.ON_DEMAND,
      );

      const motionController = new Gtk.EventControllerMotion();
      motionController.connect('motion', (controller, x, y) => {
        this._leaveLater();
        const rect = this.center.get_allocation();
        if (pointInRectangle({ x, y }, rect)) {
          // within
        } else {
          // this._leave();
        }
      });
      this.center.add_controller(motionController);

      // let event = new Gtk.EventControllerKey();
      // event.connect('key-pressed', (w, key, keycode) => {
      //   Main.modifiers[keycode] = true;
      //   Main.modifiers[key] = true;
      // });
      // event.connect('key-released', (w, key, keycode) => {
      //   Main.modifiers[keycode] = false;
      //   Main.modifiers[key] = false;
      // });
      // this.add_controller(event);

      Main.shell.connectObject(
        'windows-update',
        () => {
          this.update_indicators();
        },
        this,
      );
    }

    destroy() {
      this.hide();
      this.style = null;
      Main.settings.disconnectObject(this);
      Main.shell.disconnectObject(this);
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

      this.container.remove_css_class('autohide');
      if (this.ENABLE_AUTOHIDE) {
        this.container.add_css_class('autohide');
        LayerShell.set_exclusive_zone(this, this.get_icon_size() / 8);
      } else if (
        this.ENABLE_ANIMATION &&
        animatedLocations.includes(this.LOCATION)
      ) {
        LayerShell.set_exclusive_zone(this, this.get_icon_size());
      } else {
        LayerShell.auto_exclusive_zone_enable(this);
      }

      if (this.prevLocation != this.LOCATION) {
        this.center.set_size_request(20, 20);
        this.container.set_size_request(20, 20);
        this.set_size_request(20, 20);
        this.prevLocation = this.LOCATION;
      }

      this.queue_resize();
      this.set_visible(this.SHOW);

      this.remove_css_class('startup');
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

      // color
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
          // ss.push(`border: 2px solid red;`);
          if (backgroundColor[3] > 0) {
            ss.push(`background: rgba(${backgroundColor.join(',')});`);
          }
          styles.push(`#${windowName} .icons-container { ${ss.join(' ')}}`);
        }

        {
          let ss = [];
          ss.push(`border-radius: ${borderRadius}px;`);
          styles.push(`#${windowName} .icons-container { ${ss.join(' ')}}`);
          styles.push(`#${windowName} #container { ${ss.join(' ')}}`);
          // if (this.lead.get_first_child()) {
          //   styles.push(`#${windowName} #lead { ${ss.join(' ')}}`);
          // }
          // if (this.trail.get_first_child()) {
          //   styles.push(`#${windowName} #trail { ${ss.join(' ')}}`);
          // }
        }
      }

      // border radius
      {
        let ss = [];
        ss.push(`border-radius: ${Math.floor(borderRadius * 0.6)}px;`);
        styles.push(`#DockItem .button { ${ss.join(' ')}}`);
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

      let iconSize = this.get_icon_size();

      // animation
      if (this.ENABLE_ANIMATION && animatedLocations.includes(this.LOCATION)) {
        let transitionStyle = `0.15s ease-in-out`;

        let translateFunc = 'translateY';
        let marginLeft = 'margin-left';
        let marginRight = 'margin-right';
        let baseY = iconSize * 0.12;
        const baseMargin = iconSize * 0.3;

        // if top or right
        if ([1, 3].includes(this.LOCATION)) {
          baseY *= -1;
        }
        // if vertical
        if (dockOrientation[this.LOCATION] == Gtk.Orientation.VERTICAL) {
          translateFunc = 'translateX';
          marginLeft = 'margin-top';
          marginRight = 'margin-bottom';
        }

        this.center.add_css_class('animated-container');
        let transforms = [
          { scale: baseScale, y: -baseY, margin: baseMargin },
          { scale: baseScale * 0.9, y: -baseY * 0.9, margin: baseMargin * 0.9 },
          {
            scale: baseScale * 0.725,
            y: -baseY * 0.7,
            margin: baseMargin * 0.7,
          },
        ];
        styles.push(
          `#${windowName} #container .animated-container { transform: scale(${scaleDownContainer}) ${translateFunc}(${baseY}px); }`,
        );
        styles.push(
          `#${windowName} #container .animated-container .dock-item button { background: transparent; }`,
        );
        styles.push(
          `#${windowName} #container .animated-container .dock-item { transition: margin ${transitionStyle}, transform ${transitionStyle}; }`,
        );
        styles.push(
          `#${windowName} #container .animated-container .button-hover { transform: scale(${transforms[0].scale}) ${translateFunc}(${transforms[0].y}px); }`,
        );
        styles.push(
          `#${windowName} #container .animated-container .button-hover { ${marginLeft}: ${transforms[0].margin}px; ${marginRight}: ${transforms[0].margin}px; }`,
        );
        styles.push(
          `#${windowName} #container .animated-container .button-adjacent-1 { transform: scale(${transforms[1].scale}) ${translateFunc}(${transforms[1].y}px); }`,
        );
        styles.push(
          `#${windowName} #container .animated-container .button-adjacent-1 { ${marginLeft}: ${transforms[1].margin}px; ${marginRight}: ${transforms[1].margin}px; }`,
        );
        styles.push(
          `#${windowName} #container .animated-container .button-adjacent-2 { transform: scale(${transforms[2].scale}) ${translateFunc}(${transforms[2].y}px); }`,
        );
        styles.push(
          `#${windowName} #container .animated-container .button-adjacent-2 { ${marginLeft}: ${transforms[2].margin}px; ${marginRight}: ${transforms[2].margin}px; }`,
        );
      } else {
        this.center.remove_css_class('animated-container');
      }

      // autohide
      if (this.ENABLE_AUTOHIDE) {
        // let transitionStyle = `0.25s cubic-bezier(0.25, 1.5, 0.5, 1)`;
        let hideDistance = iconSize * 1.2;
        let offset = `translateY(${hideDistance}px);`;
        if (dockLocation[this.LOCATION] == 'top') {
          offset = `translateY(-${hideDistance}px);`;
        }
        if (dockOrientation[this.LOCATION] == Gtk.Orientation.VERTICAL) {
          offset = `translateX(${hideDistance}px);`;
          if (dockLocation[this.LOCATION] == 'left') {
            offset = `translateX(-${hideDistance}px);`;
          }
        }

        let ss = [];
        ss.push(`transition: transform ${transitionStyle};`);
        ss.push(`transform: ${offset};`);
        styles.push(`#{windowName} #container.autohide { ${ss.join(' ')}}`);
        styles.push(
          `#{windowName}:hover #container.autohide { transform: none }}`,
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

    _get_icons(group = null, target = null) {
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

    get_icons(group = null, target = null) {
      if (target) {
        return this._get_icons(group, target);
      }
      return [
        ...this._get_icons(group, this.center),
        ...this._get_icons(group, this.lead),
        ...this._get_icons(group, this.trail),
      ];
    }

    async sort_icons() {
      this.update_icon_size();
      let currentIcons = this.get_icons();
      currentIcons.sort((a, b) => {
        let ap = a.group ?? a.sort_order ?? 0;
        let bp = b.group ?? b.sort_order ?? 0;
        if (ap == bp) return 0;
        if (ap < bp) return -1;
        return 1;
      });

      currentIcons.forEach((c) => {
        c._parent = c.parent;
        c.parent?.remove(c);
      });

      currentIcons.forEach((c) => {
        c._parent?.append(c);
        delete c._parent;
      });

      currentIcons.forEach((c) => {
        if (
          this.ENABLE_ANIMATION &&
          animatedLocations.includes(this.LOCATION)
        ) {
          c.on_enter = () => {
            this._hover(c);
          };
        } else {
          c.on_enter = () => {};
        }
      });
    }

    _hover(item) {
      let icons = this.get_icons(null, this.center);
      for (let i = 0; i < icons.length; i++) {
        if (icons[i] == item && icons[i].has_css_class('button-hover')) {
          return; // no need to re-hover
        }
      }
      this._leave();
      for (let i = 0; i < icons.length; i++) {
        if (icons[i].group == IconGroups.SEPARATOR) continue;

        if (icons[i] == item) {
          if (!icons[i].has_css_class('button-hover')) {
            icons[i].add_css_class('button-hover');
          }
        }
        if (icons[i - 1] == item) {
          icons[i].add_css_class('button-adjacent-1');
        }
        if (icons[i - 2] == item) {
          icons[i].add_css_class('button-adjacent-2');
        }
        if (icons[i + 1] == item) {
          icons[i].add_css_class('button-adjacent-1');
        }
        if (icons[i + 2] == item) {
          icons[i].add_css_class('button-adjacent-2');
        }
      }
    }

    _leaveLater() {
      this._debounceLeave = Main.loTimer.debounce(
        Main.hiTimer,
        () => {
          this._leaveIfOutsizeWindow();
        },
        500,
        this._debounceLeave,
      );
    }

    _leaveIfOutsizeWindow() {
      const pointer = pointerInWindow(this);
      if (!pointer[0]) {
        this._leave();
      } else {
        // try again laters
        this._leaveLater();
      }
    }

    _leave() {
      let icons = this.get_icons(null, this.center);
      for (let i = 0; i < icons.length; i++) {
        icons[i].remove_css_class('button-hover');
        icons[i].remove_css_class('button-adjacent-1');
        icons[i].remove_css_class('button-adjacent-2');
      }
    }

    get_icon_size() {
      const baseIconSizes = [16, 22, 24, 32, 48, 64];
      const animationAdjustment =
        this.ENABLE_ANIMATION && animatedLocations.includes(this.LOCATION)
          ? oneOverScaleDownContainer
          : 1;
      let iconSize =
        (baseIconSizes[this.ICON_SIZE] ?? 48) *
        animationAdjustment *
        (1 + 2 * (this.ICON_SCALE ?? 0));
      // console.log(`iconSize: ${this.ENABLE_ANIMATION} ${iconSize} ${animationAdjustment}`);
      return iconSize;
    }

    async update_icon_size() {
      let iconSize = this.get_icon_size();
      let currentIcons = this.get_icons();
      currentIcons.forEach((c) => {
        if (c.set_icon_size) {
          c.set_icon_size(iconSize);
        }
        // {
        // docks have buttons
        // c.btn?.child?.set_pixel_size(iconSize);
        // panels have icons
        // c.icon?.set_pixel_size(iconSize);
        // }
      });

      this.queue_resize();
    }

    update_animation() {
      this.update_icon_size();
      this.update_layout();
      this.update_style();
      this.sort_icons();
    }

    update_indicators() {
      if (this.RUNNING_INDICATOR > 0) {
        this.add_css_class('with-indicators');
      } else {
        this.remove_css_class('with-indicators');
      }
      let items = this.get_icons();
      items.forEach((item) => {
        if (item.indicator) {
          item.update_indicator({
            style: appIndicatorStyles[this.RUNNING_INDICATOR],
          });
        }
      });
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
      // monkey patched at enviroment
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

      super.enable();
    }

    disable() {
      this.window.destroy();
      this.window = null;
      super.disable();
    }

    create_dock(params) {
      let d = new Dock(params);
      return d;
    }

    create_dockitem_from_appinfo(app) {
      let appInfo = getAppInfo(app);
      if (!appInfo) return;
      let btn = new DockItem({
        app: appInfo,
      });
      return btn;
    }
  },
);

Dock.prototype.DockItem = DockItem;
Dock.prototype.DockPanel = DockPanel;

export default Dock;
