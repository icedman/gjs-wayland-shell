import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';
import * as FileUtils from '../lib/fileUtils.js';
import { getAppInfo, getAppInfoFromFile } from '../lib/appInfo.js';
import { Search } from './fuzzy-app-search/search.js';

// Simple function to calculate Levenshtein distance
function levenshtein(a, b) {
  let tmp;
  let i, j;
  let alen = a.length;
  let blen = b.length;
  let arr = [];

  for (i = 0; i <= alen; i++) {
    arr[i] = [i];
  }
  for (j = 0; j <= blen; j++) {
    arr[0][j] = j;
  }
  for (i = 1; i <= alen; i++) {
    for (j = 1; j <= blen; j++) {
      tmp = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      arr[i][j] = Math.min(
        arr[i - 1][j] + 1,
        arr[i][j - 1] + 1,
        arr[i - 1][j - 1] + tmp,
      );
    }
  }
  return arr[alen][blen];
}

const SystemApps = GObject.registerClass(
  {},
  class SystemApps extends Extension {
    _init(params) {
      super._init(params);
    }

    async collectApps() {
      if (this._search) {
        this._search.refresh();
      } else {
        this.apps = Gio.app_info_get_all();
      }
    }

    async watchAppDirs() {
      // use appInfoMonitor? ... this is expensive?
      let dataDirs = GLib.get_system_data_dirs();
      dataDirs.unshift(GLib.get_user_data_dir());

      //   this.monitored = [];
      for (let i = 0; i < dataDirs.length; i++) {
        let path = GLib.build_filenamev([dataDirs[i], 'applications']);
        console.log(path);
        //     let dir = Gio.File.new_for_path(path);
        //     let watched = dir.monitor_directory(
        //       Gio.FileMonitorFlags.WATCH_MOVES,
        //       null,
        //     );
        //     watched.connectObject(
        //       'changed',
        //       (fileMonitor, file, otherFile, eventType) => {
        //         this.collectApps();
        //       },
        //       this,
        //     );
        //     this.monitored.push(dataDirs);
      }
    }

    // unwatchAppDirs() {
    //   if (this.monitored) {
    //     this.monitored.forEach((m) => {
    //       m.disconnectObject(this);
    //     });
    //     this.monitored = null;
    //   }
    // }

    async enable() {
      super.enable();
      this._search = new Search();

      this.watchAppDirs();
      this.monitor = Gio.AppInfoMonitor.get();
      this.monitor.connectObject('changed', this.collectApps.bind(this), this);

      this.collectApps();
    }

    disable() {
      super.disable();
      // this.unwatchAppDirs();
      if (this.monitor) {
        this.monitor.disconnectObject(this);
        this.monitor = null;
      }
      if (this._search) {
        this._search = null;
      }
    }

    async search(query) {
      if (!this._search || !this._search.isReady()) {
        return this.search_levenshtein(query);
      }
      return new Promise((resolve, reject) => {
        this._search.find(query.split(' ')).then((res) => {
          resolve(res.map((id) => getAppInfo(id)));
        });
      });
    }

    // Function to search applications with fuzzy matching
    async search_levenshtein(query) {
      let apps = this.apps;
      if (!apps) return Promise.reject('apps not available');

      let normalizedQuery = query.toLowerCase();
      let result = [];
      let fallback = [];
      for (let i = 0; i < apps.length; i++) {
        let app = apps[i];
        let appName = app.get_name().toLowerCase();

        // Use Levenshtein distance to calculate similarity
        let distance = levenshtein(normalizedQuery, appName);

        // Define a threshold for fuzzy match (lower is more lenient)
        if (distance <= 3) {
          // Adjust this threshold for better results
          result.push({ app, distance });
        }

        if (
          result.length == 0 &&
          normalizedQuery.length > 3 &&
          appName.includes(normalizedQuery)
        ) {
          fallback.push({ app, distance: 0 });
        }
      }

      if (result.length == 0) {
        result = fallback;
      }

      // Sort by the closest match (smallest distance)
      result.sort((a, b) => a.distance - b.distance);

      // Return the sorted apps, without the distance information
      return Promise.resolve(
        result.map((item) => getAppInfo(item.app.get_id() ?? 'xxx')),
      );
    }
  },
);

export default SystemApps;
