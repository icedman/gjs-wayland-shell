import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const CustomStylesPath = '/tmp';

export const Style = class {
  constructor() {
    this.styles = {};
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

    {
      // for debug purposes only
      let fn = Gio.File.new_for_path(`${CustomStylesPath}/${name}.css`);
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
    }

    this.styles[name] = provider;

    Gtk.StyleContext.add_provider_for_display(
      Gdk.Display.get_default(),
      provider,
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
    );

    log(content);
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
