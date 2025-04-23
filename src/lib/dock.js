import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gsk from 'gi://Gsk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { PopupMenu } from './popupMenu.js';
import { Dot } from './dot.js';
import { Extension } from './extensionInterface.js';
import { getAppInfo, getAppInfoFromFile } from './appInfo.js';
import { pointInRectangle, distanceToRectangle } from './collisions.js';
import { pointerInWindow, getModifierStates } from './devices.js';

import { DockItem, DockAppItem } from './dockItem.js';

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
      this.decorated = false;

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
      this.container.append(this.trailSpacer);
      this.container.append(this.trail);
      this.container.set_homogeneous(false);

      this.set_child(this.container);

      let prefix = this.name.toLowerCase();
      this.stylePrefix = prefix;

      let _updateAnimation = this.update_animation.bind(this);
      let _updateStyle = this.update_style.bind(this);
      let _updateLayout = this.update_layout.bind(this);

      this._hide_size = {
        width: -1,
        height: -1,
      };

      this.settingsPrefix = prefix;
      this.settings = Main.settings;
      this.settingsMap = {
        [`${prefix}-show`]: _updateLayout,
        [`${prefix}-edge-distance`]: _updateLayout,
        [`${prefix}-preferred-monitor`]: _updateAnimation,

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
        [`${prefix}-items-lead`]: this.update_items.bind(this),
        [`${prefix}-items`]: this.update_items.bind(this),
        [`${prefix}-items-trail`]: this.update_items.bind(this),
      };

      if (this.name == 'Dock') {
        this.settingsMap = {
          ...this.settingsMap,
          [`${prefix}-show-separator`]: this.update_dock_items.bind(this),
          [`${prefix}-show-trash`]: this.update_dock_items.bind(this),
          [`${prefix}-show-mounted-volumes`]: this.update_dock_items.bind(this),
          [`${prefix}-show-apps`]: this.update_dock_items.bind(this),
          [`${prefix}-show-favorite-apps`]: this.update_dock_items.bind(this),
          [`${prefix}-show-running-apps`]: this.update_dock_items.bind(this),
        };
      }

      LayerShell.set_keyboard_mode(this, LayerShell.KeyboardMode.ON_DEMAND);

      {
        const motionController = new Gtk.EventControllerMotion();
        motionController.connect('motion', (controller, x, y) => {
          this._beginAnimation();
        });
        this.center.add_controller(motionController);
      }
      {
        const motionController = new Gtk.EventControllerMotion();
        motionController.connect('motion', (controller, x, y) => {
          this._unhide();
        });
        this.add_controller(motionController);
      }

      Main.shell.connectObject(
        'windows-update',
        () => {
          this.update_indicators();
        },
        this,
      );
      Main.shell.connectObject(
        'window-focused',
        () => {
          this.update_indicators();
        },
        this,
      );

      Main.factory.connectObject(
        'registry-update',
        () => {
          this.update_items();
        },
        this,
      );

      Main.monitors.connectObject(
        'monitors-update',
        () => {
          this.update_animation();
        },
        this,
      );

      this.load_settings();
      this.update();

      this.set_title(`gws::${this.name}`);
    }

    destroy() {
      this.hide();
      this.style = null;
      Main.settings.disconnectObject(this);
      Main.shell.disconnectObject(this);
      Main.factory.disconnectObject(this);
      Main.monitors.disconnectObject(this);
      super.destroy();
    }

    vfunc_size_allocate(width, height, z) {
      super.vfunc_size_allocate(width, height, z);

      // balance the sections lead, center, trail. 'centering' the center
      let lead = this.lead.get_allocation();
      let leadSpacer = this.leadSpacer.get_allocation();
      let center = this.center.get_allocation();
      let trailSpacer = this.trailSpacer.get_allocation();
      let trail = this.trail.get_allocation();

      let which = 'width';
      if (this.orientation == Gtk.Orientation.VERTICAL) {
        which = 'height';
        width = height;
      }
      let leadSpace = width / 2 - center[which] / 2 - lead[which];
      let trailSpace = width / 2 - center[which] / 2 - trail[which];
      if (leadSpace <= 0 || trailSpace <= 0) {
        leadSpace = -1;
        trailSpace = -1;
      }

      if (this.orientation == Gtk.Orientation.VERTICAL) {
        this.leadSpacer.set_size_request(-1, leadSpace * 0.94);
        this.trailSpacer.set_size_request(-1, trailSpace * 0.94);
      } else {
        this.leadSpacer.set_size_request(leadSpace * 0.94, -1);
        this.trailSpacer.set_size_request(trailSpace * 0.94, -1);
      }
    }

    _beginAnimation() {
      if (!this._animSeq) {
        this._animSeq = Main.hiTimer.runLoop(this.animate.bind(this), 500);
      }
    }

    _endAnimation() {
      if (this._animSeq) {
        Main.hiTimer.cancel(this._animSeq);
        this._animSeq = null;
      }
    }

    _unhide() {
      this.container.visible = true;
      this.set_size_request(-1, -1);
      this.queue_resize();
    }

    _hide() {
      this.container.visible = false;
      this.set_size_request(this._hide_size.width, this._hide_size.height);
    }

    _debounceHide() {
      this._debounceHideSeq = Main.loTimer.debounce(
        Main.loTimer,
        () => {
          try {
            if (this.ENABLE_AUTOHIDE) {
              this._hide();
            } else {
              this._unhide();
            }
          } catch (err) {
            // oops!?
            console.log(err);
          }
        },
        750,
        this._debounceHideSeq,
      );
    }

    animate() {
      const pointer = pointerInWindow(this);
      if (!pointer[0]) {
        this._endAnimation();
        this._leave();
      }
      this._debounceHide();
    }

    async update() {
      this.update_layout();
      this.update_style();
      this.update_indicators();
      this.update_items();
      this.update_dock_items();
    }

    async update_layout() {
      if (dockOrientation[this.LOCATION] === undefined) {
        this.LOCATION = 0;
      }
      this.orientation = dockOrientation[this.LOCATION];
      this.center.orientation = this.orientation;
      this.lead.orientation = this.orientation;
      this.trail.orientation = this.orientation;
      this.container.orientation = this.orientation;

      if (this.orientation == Gtk.Orientation.VERTICAL) {
        this._hide_size = { width: 4, height: -1 };
      } else {
        this._hide_size = { width: -1, height: 4 };
      }

      // monitor
      this.monitor = Main.monitors.getMonitor(this.PREFERRED_MONITOR);
      if (!this.monitor || !this.monitor.valid) {
        if (
          Main.monitors.state.count > 1 &&
          this.monitor &&
          !this.monitor.valid
        ) {
          if (this != Main.dock.window && this != Main.panel.window) {
            // hide!
            // return
          }
        }
        this.monitor = Main.monitors.getPrimaryMonitor();
      }
      if (this.monitor) {
        LayerShell.set_monitor(this, this.monitor);
      }

      // clear
      for (let i = 0; i < 4; i++) {
        LayerShell.set_anchor(this, dockEdge[i], false);
        LayerShell.set_margin(this, dockEdge[i], 0);
      }

      for (let i = 0; i < 3; i++) {
        LayerShell.set_anchor(this, dockEdges[this.LOCATION][i], true);
      }

      let edge = this.EDGE_DISTANCE * 10;
      if (this.ENABLE_AUTOHIDE) {
        edge = 0;
      }
      LayerShell.set_margin(this, dockEdge[this.LOCATION], edge);

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

      let padding = this.PADDING ?? 0;
      let border = this.BORDER_THICKNESS;
      let borderRadius = rads[Math.floor(this.BORDER_RADIUS)] ?? 0;
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
          let pad = Math.floor(padding * 10);
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
        styles.push(`#${windowName}Item .button { ${ss.join(' ')}}`);
      }

      // shadow
      if (this.ICON_SHADOW) {
        styles.push(
          `#${windowName} .button { -gtk-icon-shadow: rgba(0, 0, 0, 0.6) 0 6px 6px; }`,
        );
      }

      // buttons in general
      {
        styles.push(`#${windowName} .button { outline: none; }`);
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
        if (this.orientation == Gtk.Orientation.VERTICAL) {
          translateFunc = 'translateX';
          marginLeft = 'margin-top';
          n;
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
          `#${windowName} #container .animated-container .dock-item .button { background: transparent; }`,
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
      try {
        if (this.ENABLE_AUTOHIDE) {
          let transitionStyle = `0.25s ease-in-out`;
          let hideDistance = iconSize * 1.2;
          let offset = `translateY(${hideDistance}px)`;
          if (dockLocation[this.LOCATION] == 'top') {
            offset = `translateY(-${hideDistance}px)`;
          }
          if (this.orientation == Gtk.Orientation.VERTICAL) {
            offset = `translateX(${hideDistance}px)`;
            if (dockLocation[this.LOCATION] == 'left') {
              offset = `translateX(-${hideDistance}px)`;
            }
          }

          let ss = [];
          ss.push(`transition: transform ${transitionStyle};`);
          ss.push(`transform: ${offset};`);
          styles.push(`#${windowName} #container.autohide { ${ss.join(' ')}}`);
          styles.push(
            `#${windowName}:hover #container.autohide { transform: none; }`,
          );
        }
      } catch (err) {
        console.log(err);
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
          c.on_motion = () => {
            this._hover(c);
          };
        } else {
          c.on_motion = () => {};
        }
      });
    }

    _hover(item) {
      let icons = this.get_icons(null, this.center).filter(
        (icon) => icon.visible,
      );
      for (let i = 0; i < icons.length; i++) {
        if (icons[i] == item && icons[i].has_css_class('button-hover')) {
          return; // no need to re-hover
        }
      }
      this._leave();
      let leftMargin = 0;
      let rightMargin = 0;
      for (let i = 0; i < icons.length; i++) {
        if (icons[i].group == IconGroups.SEPARATOR) continue;
        let alloc = icons[i].get_allocation();
        if (!alloc.width) continue;
        if (icons[i] == item) {
          if (!icons[i].has_css_class('button-hover')) {
            icons[i].add_css_class('button-hover');
          }
        }
        if (icons[i - 1] == item) {
          icons[i].add_css_class('button-adjacent-1');
          rightMargin += 1;
        }
        if (icons[i - 2] == item) {
          icons[i].add_css_class('button-adjacent-2');
          rightMargin += 1;
        }
        if (icons[i + 1] == item) {
          icons[i].add_css_class('button-adjacent-1');
          leftMargin += 1;
        }
        if (icons[i + 2] == item) {
          icons[i].add_css_class('button-adjacent-2');
          leftMargin += 1;
        }
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
      });

      this.queue_resize();
    }

    update_animation() {
      this.update_layout();
      this.update_style();
      this.sort_icons();
      this.update_icon_size();
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

    update_items() {
      const areaMap = {
        lead: 'ITEMS_LEAD',
        center: 'ITEMS',
        trail: 'ITEMS_TRAIL',
      };

      try {
        Object.keys(areaMap).forEach((k) => {
          let items = this.get_icons(null, this[k]);
          let itemIds = items.map((i) => i.id);
          let attachedIds = [];

          let source = this[areaMap[k]] ?? [];
          source.forEach((item, idx) => {
            if (typeof item == 'string') {
              item = {
                id: item,
              };
            }

            attachedIds.push(item.id);
            if (itemIds.includes(item.id)) {
              return;
            }
            let newItem = Main.factory.create(item.widget ?? item.id, {
              css: `${this.name.toLowerCase()}-item`,
              ...item,
            });
            if (!newItem) return;

            let container = this[k];
            newItem.sort_order = idx;
            container.append(newItem);
            newItem.show();
          });

          // remove unconfigured items
          if (attachedIds.length) {
            items.forEach((icon) => {
              if (
                (!icon.owner && !attachedIds.includes(icon.id)) ||
                (icon.owner && !attachedIds.includes(icon.owner.id))
              ) {
                icon.emit('destroy');
                icon.parent?.remove(icon);
              }
            });
          }
        });
      } catch (err) {
        console.log(err);
      }

      this.update_icon_size();
      this.sort_icons();
    }

    _removeDockIcons(appId) {
      let icon = this.get_icons().find((icon) => icon.id == appId);
      if (icon) {
        icon.emit('destroy');
        icon.parent?.remove(icon);
      }
    }

    update_dock_items() {
      if (this.name != 'Dock') {
        return;
      }
      let items = [];
      if (this.SHOW_APPS) items.push('apps');
      else this._removeDockIcons('apps');
      if (this.SHOW_TRASH) items.push('trash');
      else this._removeDockIcons('trash');
      if (this.SHOW_SEPARATOR) items.push('separator');
      else this._removeDockIcons('separator');
      if (this.SHOW_FAVORITE_APPS) items.push('favorite_apps');
      else this._removeDockIcons('favorite_apps');
      if (this.SHOW_MOUNTED_VOLUMES) items.push('mounted_volumes');
      else this._removeDockIcons('mounted_volumes');
      if (this.SHOW_RUNNING_APPS) items.push('running_apps');
      else this._removeDockIcons('running_apps');
      this.ITEMS = items;
      this.update_items();
    }
  },
);

export default { DockPanel };
