import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";

import * as Util from "../lib/misc.js";

export const _ = (t) => {
  return t;
};

export const PopupBaseMenuItem = GObject.registerClass(
  {
    Properties: {
      active: GObject.ParamSpec.boolean(
        "active",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
      sensitive: GObject.ParamSpec.boolean(
        "sensitive",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        true,
      ),
      // added
      activate: GObject.ParamSpec.boolean(
        "activate",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
      can_focus: GObject.ParamSpec.boolean(
        "can_focus",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
      style_class: GObject.ParamSpec.string(
        "style_class",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
    },
    Signals: {
      activate: {}, //  param_types: [Clutter.Event.$gtype] },
      destroy: {},
    },
  },
  class PopupBaseMenuItem extends GObject.Object {
    activate() {}
    add_child(child) {}
    show() {}
    hide() {}
    destroy() {}
  },
);

export const PopupMenuItem = GObject.registerClass(
  {
    Properties: {
      reactive: GObject.ParamSpec.boolean(
        "reactive",
        null,
        null,
        GObject.ParamFlags.READWRITE,
      ),
    },
  },
  class PopupMenuItem extends PopupBaseMenuItem {
    _init(text, params) {
      super._init(params);
      this.label = new Label();
    }
  },
);

export const PopupImageMenuItem = GObject.registerClass(
  class PopupImageMenuItem extends PopupBaseMenuItem {
    _init(text, icon, params) {
      super._init(params);

      this._icon = new Icon();
      // new St.Icon({
      //     style_class: 'popup-menu-icon',
      //     x_align: Clutter.ActorAlign.END,
      // });
      // this.add_child(this._icon);
      this.label = new Label();
      // new St.Label({
      //     text,
      //     y_expand: true,
      //     y_align: Clutter.ActorAlign.CENTER,
      // });
      // this.add_child(this.label);
      // this.label_actor = this.label;

      // this.set_child_above_sibling(this._ornamentIcon, this.label);

      this.setIcon(icon);
    }

    setIcon(icon) {
      // The 'icon' parameter can be either a Gio.Icon or a string.
      if (icon instanceof GObject.Object && GObject.type_is_a(icon, Gio.Icon))
        this._icon.gicon = icon;
      else this._icon.icon_name = icon;
    }

    _updateOrnamentStyle() {
      // we move the ornament after the label, so we don't need
      // additional padding regardless of ornament visibility
    }
  },
);

export const PopupMenuSection = GObject.registerClass(
  {
    Properties: {
      actor: GObject.ParamSpec.boolean(
        "actor",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
    },
    Signals: {
      "open-state-changed": {},
    },
  },
  class PopupMenuSection extends GObject.Object {
    _init() {
      super._init();
      this.icon = new Icon();
      this.label = "";
      this.children = [];
    }

    addMenuItem(item) {
      this.children.push(item);
    }

    addAction(title, callback, icon) {
      let menuItem;
      if (icon !== undefined) menuItem = new PopupImageMenuItem(title, icon);
      else menuItem = new PopupMenuItem(title);

      this.addMenuItem(menuItem);
      menuItem.connect("activate", (o, event) => {
        callback(event);
      });

      return menuItem;
    }

    addSettingsAction(title, desktopFile) {
      let menuItem = this.addAction(title, () => {
        // let app = Shell.AppSystem.get_default().lookup_app(desktopFile);
        // if (!app) {
        //     log(`Settings panel for desktop file ${desktopFile} could not be loaded!`);
        //     return;
        // }
        // Main.overview.hide();
        // Main.panel.closeQuickSettings();
        // app.activate();
      });

      menuItem.visible = Main.sessionMode.allowSettings;
      this._settingsActions[desktopFile] = menuItem;

      return menuItem;
    }

    setHeader(icon, header) {
      // console.log({ icon, header });
      this.icon["icon-name"] = icon;
      this.label = header;
    }
    addHeaderSuffix(spinner__) {
      // console.log(spinner__);
    }
    addSettingsAction() {}
  },
);
export const PopupSubMenuMenuItem = GObject.registerClass(
  {},
  class PopupSubMenuMenuItem extends PopupBaseMenuItem {
    constructor(name, subMenu__) {
      super();
    }
  },
);

export const PopupSeparatorMenuItem = GObject.registerClass(
  {},
  class PopupSeparatorMenuItem extends PopupBaseMenuItem {},
);

export const Switch = GObject.registerClass(
  {},
  class Switch extends PopupBaseMenuItem {},
);

export const PopupMenu = {
  PopupBaseMenuItem,
  PopupMenuItem,
  PopupMenuSection,
  PopupSubMenuMenuItem,
  PopupSeparatorMenuItem,
  Switch,
};

export const Label = GObject.registerClass(
  {
    Properties: {
      text: GObject.ParamSpec.string(
        "text",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
    },
  },
  class Label extends GObject.Object {
    _init() {
      super._init();
    }
  },
);

export const Icon = GObject.registerClass(
  {
    Properties: {
      "icon-name": GObject.ParamSpec.string(
        "icon-name",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
      title: GObject.ParamSpec.string(
        "title",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
    },
  },
  class Icon extends GObject.Object {
    _init() {
      super._init();
    }
  },
);

export const Spinner = GObject.registerClass(
  class Spinner extends GObject.Object {
    _init(size, params) {
      super._init();
    }
    play() {}
    stop() {}
  },
);

export const QuickMenuToggle = GObject.registerClass(
  {
    Properties: {
      "icon-name": GObject.ParamSpec.string(
        "icon-name",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
      title: GObject.ParamSpec.string(
        "title",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
      subtitle: GObject.ParamSpec.string(
        "subtitle",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
      gicon: GObject.ParamSpec.object(
        "gicon",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        Gio.Icon,
      ),
      "menu-enabled": GObject.ParamSpec.boolean(
        "menu-enabled",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        true,
      ),
      visible: GObject.ParamSpec.boolean(
        "visible",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
      reactive: GObject.ParamSpec.boolean(
        "reactive",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
      checked: GObject.ParamSpec.boolean(
        "checked",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
    },
    Signals: {
      clicked: {},
    },
  },
  class QuickMenuToggle extends GObject.Object {
    _init() {
      super._init();

      this.menu = new PopupMenu.PopupMenuSection();
    }
  },
);

export const SystemIndicator = GObject.registerClass(
  {
    Properties: {
      visible: GObject.ParamSpec.boolean(
        "visible",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
      reactive: GObject.ParamSpec.boolean(
        "reactive",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        false,
      ),
    },
  },
  class SystemIndicator extends GObject.Object {
    _init() {
      super._init();
      this.quickSettingsItems = [];
    }

    _addIndicator() {
      return new Icon();
    }
  },
);

export class ItemSorter {
  [Symbol.iterator] = this.items;

  /**
   * Maintains a list of sorted items. By default, items are
   * assumed to be objects with a name property.
   *
   * Optionally items can have a secondary sort order by
   * recency. If used, items must by objects with a timestamp
   * property that can be used in substraction, and "bigger"
   * must mean "more recent". Number and Date both qualify.
   *
   * @param {object=} options - property object with options
   * @param {Function} options.sortFunc - a custom sort function
   * @param {bool} options.trackMru - whether to track MRU order as well
   **/
  constructor(options = {}) {
    const { sortFunc, trackMru } = {
      sortFunc: this._sortByName.bind(this),
      trackMru: false,
      ...options,
    };

    this._trackMru = trackMru;
    this._sortFunc = sortFunc;
    this._sortFuncMru = this._sortByMru.bind(this);

    this._itemsOrder = [];
    this._itemsMruOrder = [];
  }

  *items() {
    yield* this._itemsOrder;
  }

  *itemsByMru() {
    console.assert(this._trackMru, "itemsByMru: MRU tracking is disabled");
    yield* this._itemsMruOrder;
  }

  _sortByName(one, two) {
    return GLib.utf8_collate(one.name, two.name);
  }

  _sortByMru(one, two) {
    return two.timestamp - one.timestamp;
  }

  _upsert(array, item, sortFunc) {
    this._delete(array, item);
    return Util.insertSorted(array, item, sortFunc);
  }

  _delete(array, item) {
    const pos = array.indexOf(item);
    if (pos >= 0) array.splice(pos, 1);
  }

  /**
   * Insert or update item.
   *
   * @param {any} item - the item to upsert
   * @returns {number} - the sorted position of item
   */
  upsert(item) {
    if (this._trackMru)
      this._upsert(this._itemsMruOrder, item, this._sortFuncMru);

    return this._upsert(this._itemsOrder, item, this._sortFunc);
  }

  /**
   * @param {any} item - item to remove
   */
  delete(item) {
    if (this._trackMru) this._delete(this._itemsMruOrder, item);
    this._delete(this._itemsOrder, item);
  }
}
