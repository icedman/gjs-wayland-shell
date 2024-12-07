import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import LayerShell from 'gi://Gtk4LayerShell';
import { Extension } from './lib/extensionInterface.js';
import { getAppInfo, getAppInfoFromFile } from './lib/appInfo.js';
import { loadRemoteSearchProviders } from './services/remoteSearch.js';

const SEARCH_PROVIDERS_SCHEMA = 'org.gnome.desktop.search-providers';

function getTermsForSearchString(searchString) {
  searchString = searchString.replace(/^\s+/g, '').replace(/\s+$/g, '');
  if (searchString === '') return [];
  return searchString.split(/\s+/);
}

const Search = GObject.registerClass(
  {
    Signals: { 'terms-changed': {} },
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

      this.window = new Gtk.Window({
        title: this.name,
        name: this.name,
        hexpand: true,
        vexpand: true,
        default_width: 600,
        default_height: 400,
      });

      let builder = new Gtk.Builder();
      builder.add_from_file(`./ui/search.ui`);
      let widget = builder.get_object('search-window');
      let entry = builder.get_object('entry');
      this.resultsView = builder.get_object('results-view');

      entry.connect('activate', () => {
        this.search(entry.text);
      });

      let event = new Gtk.EventControllerKey();
      event.connect('key-pressed', (w, key, keycode) => {
        switch (key) {
          case Gdk.KEY_Escape: {
            this.hide();
            break;
          }
          default:
            break;
        }
      });
      this.window.add_controller(event);

      this.window.set_child(widget);

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
      // this.show();
    }

    disable() {
      if (Main?.dbus) {
        Main.dbus.disconnectObject(this);
      }
      this.window.destroy();
      this.window = null;

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
          }
          this.results[provider.id] = resultsMetas;
          // console.log(results);
          // console.log(resultsMetas);
          // return Promise.resolve(results);
        }
      } catch (err) {
        console.log(err);
        // return Promise.reject(err);
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
        let results = this.results[provider.id];
        if (results) {
          res = [...results];
        }
      });

      let ids = res.map((r) => r.id);
      console.log(ids);

      res.forEach((item) => {
        // too inefficient
        let builder = new Gtk.Builder();
        builder.add_from_file(`./ui/result-row.ui`);
        let row = builder.get_object('result-row');
        let name = builder.get_object('result-name');
        let desc = builder.get_object('result-description');
        name.set_label(item.name);
        desc.set_label(item.description);
        row.id = item.id;
        this.resultsView.append(row);
      });

      // remove
      let rows = this.getCurrentRows();
      rows.forEach((row) => {
        if (!ids.includes(row.id)) {
          if (row.parent) {
            row.parent.remove(row);
          }
        }
      });
    }

    clear() {
      this.cancellable.cancel();
    }

    show() {
      this.window.present();
      // this.window.show();
    }

    hide() {
      this.window.hide();
    }
  },
);

export default Search;
