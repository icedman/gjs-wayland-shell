import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

const CustomStylesPath = '/tmp';

const Style = class {
  constructor() {
    this.styles = {};
    this.style_file = {};
    this.style_contents = {};
  }

  unloadAll() {
    Object.keys(this.styles).forEach((k) => {
      let provider = this.styles[k];
      Gtk.StyleContext.remove_provider_for_display(
        Gdk.Display.get_default(),
        provider,
      );
    });
  }

  build(name, style_array) {
    let content = '';
    style_array.forEach((k) => {
      content = `${content}\n${k}`;
    });

    if (this.style_contents[name] === content) {
      // log('skip regeneration');
      return;
    }

    let provider = this.styles[name];
    if (provider) {
      Gtk.StyleContext.remove_provider_for_display(
        Gdk.Display.get_default(),
        provider,
      );
    }

    provider = new Gtk.CssProvider();

    this.style_contents[name] = content;
    let file_path = `${CustomStylesPath}/${name}.css`;

    {
      // for debug purposes only
      let fn = Gio.File.new_for_path(file_path);
      const [, etag] = fn.replace_contents(
        content,
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null,
      );
    }

    try {
      provider.load_from_string(content);
    } catch (e) {
      logError(e, 'Failed to add application style');
      return;
    }

    console.log('---------');
    console.log(`style ${name}`);

    this.styles[name] = provider;

    Gtk.StyleContext.add_provider_for_display(
      Gdk.Display.get_default(),
      provider,
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
    );

    log(content);

    if (name != 'user') {
      this.reload('user');
    }
  }

  load(name, file_path) {
    let provider = this.styles[name];
    if (provider) {
      Gtk.StyleContext.remove_provider_for_display(
        Gdk.Display.get_default(),
        provider,
      );
    }

    provider = new Gtk.CssProvider();

    try {
      provider.load_from_path(file_path);
    } catch (e) {
      logError(e, 'Failed to add application style');
      return;
    }

    console.log('---------');
    console.log(`style ${name}`);

    this.styles[name] = provider;
    this.style_file[name] = file_path;

    Gtk.StyleContext.add_provider_for_display(
      Gdk.Display.get_default(),
      provider,
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
    );

    if (name != 'user') {
      this.reload('user');
    }
  }

  reload(name) {
    let file_path = this.style_file[name];
    console.log(file_path);
    if (!file_path) {
      return;
    }

    console.log('reloading...');
    this.load(name, file_path);
  }

  rgba(color) {
    let clr = color || [1, 1, 1, 1];
    let res = clr.map((r) => Math.floor(255 * r));
    res[3] = clr[3].toFixed(1);
    return res;
  }

  hex(color) {
    let r = Math.floor(color[0] * 255).toString(16);
    let g = Math.floor(color[1] * 255).toString(16);
    let b = Math.floor(color[2] * 255).toString(16);
    if (r.length == 1) r += r;
    if (g.length == 1) g += g;
    if (b.length == 1) b += b;
    let res = `#${r}${g}${b}`;
    // console.log(`${color} ${res}`);
    return res;
  }
};

const StyleExtension = GObject.registerClass(
  class StyleExtension extends Extension {
    _init(params) {
      let initialStyles = params?.initialStyles ?? [];
      delete params?.initialStyles;
      super._init(params);
      this.style = new Style();
      this.rgba = this.style.rgba;
      this.hex = this.style.hex;

      initialStyles.forEach((style) => {
        try {
          this.loadCssFile(style.name, style.path);
        } catch (err) {
          // todo .. check for file exists
        }
      });
    }

    async enable() {
      super.enable();
    }

    disable() {
      super.disable();
      this.style.unloadAll();
      if (this.monitor) {
        this.monitor.disconnectObject(this);
        this.monitor = null;
      }
    }

    buildCss(name, style_array) {
      this.style.build(name, style_array);
    }

    loadCssFile(name, file_path) {
      this.style.load(name, file_path);
      if (name == 'user') {
        this.watchUser(file_path);
      }
    }

    watchUser(path) {
      // Create a Gio.File object for the file to monitor
      console.log(`watching ${path}`);
      const file = Gio.File.new_for_path(path);

      // Create a file monitor for the file
      this.monitor = file.monitor(Gio.FileMonitorFlags.CHANGES_ONLY, null);

      // Connect the callback to monitor the file for changes
      this.monitor.connectObject(
        'changed',
        (monitor, file, otherFile, eventType) => {
          if (eventType != Gio.FileMonitorEvent.CHANGED) return;
          this.style.reload('user');
        },
        this,
      );
    }
  },
);

export default StyleExtension;
