import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { Extension } from './lib/extensionInterface.js';
import { getAppInfo } from './lib/appInfo.js';
import { loadRemoteSearchProviders } from './services/remoteSearch.js';

const SEARCH_PROVIDERS_SCHEMA = 'org.gnome.desktop.search-providers';
const SEARCH_ONKEY_DELAY = 750;

function getTermsForSearchString(searchString) {
  searchString = searchString.replace(/^\s+/g, '').replace(/\s+$/g, '');
  if (searchString === '') return [];
  return searchString.split(/\s+/);
}

const Search = GObject.registerClass(
  {
    Signals: { 'search-updated': {} },
  },
  class Search extends Extension {
    _init(params) {
      this.name = params?.name ?? 'Search';
      delete params?.name;
      super._init({
        ...(params ?? {}),
      });
    }

    enable() {
      let _searchSettings = new Gio.Settings({
        schema_id: SEARCH_PROVIDERS_SCHEMA,
      });
      this.providers = loadRemoteSearchProviders(_searchSettings);
      this.cancellable = new Gio.Cancellable();

      this.results = {};
      this.previousResults = {};
      this.matchedApps = [];
      this.matchedSearch = [];

      this.default_width = 600;
      this.default_height = 400;

      this.window = new Gtk.Window({
        title: this.name,
        name: this.name,
        hexpand: true,
        vexpand: true,
        default_width: this.default_width,
        default_height: this.default_height,
      });

      let prefix = 'search';
      this.stylePrefix = this.name.toLowerCase();

      this.settings = Main.settings;
      this.settingsMap = {
        // [`${prefix}-padding`]: this.update_style.bind(this),
        // [`${prefix}-icon-shadow`]: this.update_style.bind(this),
        // [`${prefix}-icon-size`]: this.update_icon_size.bind(this),
        // [`${prefix}-icon-scale`]: this.update_icon_size.bind(this),
        [`${prefix}-scale-width`]: this.update_layout.bind(this),
        [`${prefix}-scale-height`]: this.update_layout.bind(this),
        [`${prefix}-show-panel-icon`]: this.update_icons.bind(this),
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
      builder.add_from_file(`./ui/search.ui`);
      let widget = builder.get_object('search-window');
      let entry = builder.get_object('entry');
      // entry.set_icon_from_icon_name('system-search-symbolic');

      let searchIcon = Gio.ThemedIcon.new('system-search-symbolic');
      // Set the icon to the primary position
      entry.set_icon_from_gicon(Gtk.EntryIconPosition.PRIMARY, searchIcon);
      entry.set_placeholder_text('Type to search...');

      let clearIcon = Gio.ThemedIcon.new('edit-clear-symbolic');
      entry.set_icon_from_gicon(Gtk.EntryIconPosition.SECONDARY, clearIcon);
      entry.connect('icon-press', (widget, icon_position, event) => {
        if (icon_position === Gtk.EntryIconPosition.SECONDARY) {
          widget.set_text(''); // Clear the entry text
          this.clear();
        }
      });

      this.resultsView = builder.get_object('results-view');
      this.resultsView.add_css_class('results-view');
      this.resultsApps = builder.get_object('results-apps');
      this.resultsApps.add_css_class('results-apps');

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

      entry.connect('activate', () => {
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
      entry.connect('changed', () => {
        searchOnKeyPress();
      });
      this.entry = entry;

      this.entryContainer = builder.get_object('entry-container');
      this.entryContainer.add_css_class('entry-container');

      let event = new Gtk.EventControllerKey();
      event.connect('key-pressed', (w, key, keycode) => {
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

      // this.overlay = new Gtk.Overlay({ hexpand: true, vexpand: true });
      // this.background = new Gtk.Box({ hexpand: true, vexpand: true });
      // this.background.add_css_class('blurred-background');
      // this.overlay.add_overlay(this.background);
      // this.overlay.add_overlay(this.widget);
      // this.window.set_child(this.overlay);

      this.container = widget;
      this.window.set_child(this.container);

      LayerShell.init_for_window(this.window);
      LayerShell.set_layer(this.window, LayerShell.Layer.TOP);
      LayerShell.set_keyboard_mode(
        this.window,
        LayerShell.KeyboardMode.EXCLUSIVE,
      );

      if (Main?.dbus) {
        Main.dbus.connectObject('request-search', this.show.bind(this), this);
      }

      super.enable();

      this.load_settings();
      this.update_layout();
      this.update_style();

      this.attachPanelItems();

      Main.panel.connect('notify::enabled', () => {
        if (Main.panel.enabled) {
          this.attachPanelItems();
        } else {
          this.panelItems = null;
        }
      });
    }

    createSearchIcon() {
      let item = new Main.panel.PanelItem();
      item.set_label('');
      item.set_icon('system-search-symbolic');
      item.sort_order = -1;

      let evt = new Gtk.GestureClick();
      evt.connect('pressed', (actor, count) => {
        this.toggle();
      });
      item.add_controller(evt);
      return item;
    }

    attachPanelItems() {
      if (!Main.panel.enabled || this.panelItems) return;
      if (!this.SHOW_PANEL_ICON) return;

      this.panelItems = [];
      {
        let item = this.createSearchIcon();
        Main.panel.trail.append(item);
        this.panelItems.push(item);
      }

      Main.panel.window.sort_icons();
    }

    detachPanelItems() {
      if (!this.panelItems) return;

      (this.panelItems || []).forEach((item) => {
        item.parent?.remove(item);
      });
      this.panelItems = null;
    }

    update_icons() {
      if (this.SHOW_PANEL_ICON) {
        this.attachPanelItems();
      } else {
        this.detachPanelItems();
      }
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

      this.detachPanelItems();

      this.providers = null;
      this.cancellable = null;
      super.disable();
    }

    async _doProviderSearch(provider, previousResults) {
      provider.searchInProgress = true;

      let _isSubSearch = false;

      try {
        let results;
        let resultsMetas;
        if (_isSubSearch && previousResults) {
          results = await provider.getSubsearchResultSet(
            previousResults,
            this.terms,
            this.cancellable,
          );
        } else {
          results = await provider.getInitialResultSet(
            this.terms,
            this.cancellable,
          );
          if (results && results.length) {
            resultsMetas = await provider.getResultMetas(
              results,
              this.cancellable,
            );
            this.results[provider.id] = resultsMetas;
            provider.searchInProgress = false;
          }
          // console.log(results);
          // console.log(resultsMetas);
          return Promise.resolve(results);
        }
      } catch (err) {
        console.log(err);
        provider.searchInProgress = false;
        return Promise.reject(err);
      }
    }

    async search(terms) {
      this.cancellable.cancel();
      this.cancellable.reset();
      this.terms = getTermsForSearchString(terms);
      if (!this.terms.length) return;

      this.providers.forEach(async (provider) => {
        this.results[provider.id] = null;
        let previousProviderResults = this.previousResults[provider.id];
        this.previousResults[provider.id] = await this._doProviderSearch(
          provider,
          previousProviderResults,
        );
        this.updateResults();
      });

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
          ss.push(`color: rgba(${foregroundColor.join(',')});`);
        }
        ss.push(`font-size: ${fontSize}pt;`);
        styles.push(`#${windowName} * { ${ss.join(' ')}}`);
      }

      // entry text
      {
        let ss = [];
        if (entryColor[3] > 0) {
          ss.push(`color: rgba(${entryColor.join(',')});`);
        }
        ss.push(`font-size: ${entryFontSize}pt;`);
        styles.push(`#${windowName} entry * { ${ss.join(' ')}}`);
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
        styles.push(`#${windowName} { ${ss.join(' ')}}`);
        styles.push(`#${windowName} entry { ${ss.join(' ')}}`);
        styles.push(`#${windowName} .entry-container { ${ss.join(' ')}}`);
        ss = [`border-radius: ${Math.floor(borderRadius * 0.6)}px;`];
        styles.push(`#${windowName} .result-row:focus { ${ss.join(' ')}}`);
        styles.push(`#${windowName} button { ${ss.join(' ')}}`);
      }

      // border
      // background & border
      {
        let ss = [];
        ss.push(`border: ${border}px solid rgba(${borderColor.join(',')});`);
        if (backgroundColor[3] > 0) {
          ss.push(`background: rgba(${backgroundColor.join(',')});`);
        }
        styles.push(`#${windowName} .entry-container { ${ss.join(' ')}}`);
        styles.push(`#${windowName}.has-results{ ${ss.join(' ')}}`);
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
        // console.log(JSON.stringify(styles, null, 4));
        this.style.buildCss(`${this.stylePrefix}-style`, styles);
      } catch (err) {
        console.log(err);
      }

      // this.window.queue_resize();
    }

    getCurrentRows() {
      let res = [];
      let n = this.resultsView.get_first_child();
      while (n) {
        res.push(n);
        n = n.get_next_sibling();
      }
      return res;
    }

    updateResults() {
      let res = [];
      this.providers.forEach(async (provider) => {
        let results = this.results[provider.id]?.map((r) => {
          return {
            ...r,
            provider,
          };
        });
        if (results) {
          res = [...res, ...results];
        }
      });

      let ids = res.map((r) => r.id);
      let rows = this.getCurrentRows();
      let row_ids = rows.map((r) => r.id);

      this.window.remove_css_class('has-results');
      this.matchedSearch = res;
      if (this.matchedSearch || this.matchedApps.length) {
        this.window.add_css_class('has-results');
      }

      res.forEach((item) => {
        // too inefficient?
        let row = null; // check if already in the results-view
        if (row_ids.includes(item.id)) {
          return;
        }

        let appInfo = getAppInfo(item.provider.id);

        let builder = new Gtk.Builder();
        builder.add_from_file(`./ui/result-row.ui`);
        row = builder.get_object('result-row');
        row.add_css_class('result-row');
        let name = builder.get_object('result-name');
        name.add_css_class('result-name');
        let desc = builder.get_object('result-description');
        desc.add_css_class('result-description');
        let icon = builder.get_object('result-icon');
        icon.add_css_class('result-icon');

        if (appInfo.icon_name) {
          icon.set_from_icon_name(appInfo.icon_name);
        } else {
          // icon.set_visible
        }

        row.connect('activate', () => {
          this.activateSearchItem(item);
        });
        row.connect('clicked', () => {
          this.activateSearchItem(item);
        });

        name.set_label(item.name);
        desc.set_label(item.description);

        desc.set_ellipsize(3);
        desc.set_max_width_chars(40);

        row.id = item.id;
        this.resultsView.append(row);
      });

      // remove
      rows.forEach((row) => {
        if (!ids.includes(row.id)) {
          if (row.parent) {
            row.parent.remove(row);
          }
        }
      });

      // this.emit('search-updated');
    }

    getCurrentApps() {
      let res = [];
      let n = this.resultsApps.get_first_child();
      while (n) {
        res.push(n);
        n = n.get_next_sibling();
      }
      return res;
    }

    updateApps(apps) {
      let currentApps = this.getCurrentApps();
      let currentApp_ids = currentApps.map((r) => r.id);

      let ids = [];
      this.matchedApps = apps;
      apps.forEach((app) => {
        ids.push(app.id);
        if (currentApp_ids.includes(app.id)) {
          return;
        }
        let btn = new Gtk.Button({
          icon_name: app.icon_name ?? 'user-trash',
        });
        try {
          this.resultsApps.append(btn);
          btn.child.set_pixel_size(64);
          btn.add_css_class('button');
          btn.id = app.id;
          btn.item = app;
          btn.connect('activate', () => {
            Main.shell.spawn(app.exec);
            this.hide();
          });
        } catch (err) {
          console.log(err);
        }
      });

      this.window.remove_css_class('has-results');
      if (this.matchedSearch.length || this.matchedApps.length) {
        this.window.add_css_class('has-results');
      }

      // remove
      currentApps.forEach((row) => {
        if (!ids.includes(row.id)) {
          if (row.parent) {
            row.parent.remove(row);
          }
        }
      });
    }

    clear() {
      this.cancellable.cancel();
      this.matchedApps = [];
      this.results = {};
      if (this._debounceSearchOnKeypress) {
        Main.loTimer.cancel(this._debounceSearchOnKeypress);
        this._debounceSearchOnKeypress = null;
      }
      this.updateApps([]);
      this.updateResults();
    }

    activateSearchItem(item) {
      if (item.clipboardText && item.clipboardText.length > 0) {
        let text = item.clipboardText;
        let clipboard = Gdk.Display.get_default().get_clipboard();
        if (clipboard) {
          const data = new TextEncoder().encode(text);
          let provider = Gdk.ContentProvider.new_for_bytes('text/plain', data);
          clipboard.set_content(provider);
        }
        this.hide();
        return;
      }

      if (item.provider) {
        let appInfo = getAppInfo(item.provider.id);
        Main.shell.spawn(appInfo.exec, item.id);
        this.hide();
        // console.log(item);
        // console.log(appInfo);
      }
    }

    show() {
      // let { width, height } = this.widget.get_allocation();
      // this.overlay.set_size_request(width, height);
      this.window.remove_css_class('has-results');
      this.window.present();
      this.entry.grab_focus();
    }

    hide() {
      this.clear();
      this.window.hide();
    }

    toggle() {
      if (!this.window.visible) {
        this.show();
      } else {
        this.hide();
      }
    }
  },
);

export default Search;
