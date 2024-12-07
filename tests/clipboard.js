import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
// import ByteArray from 'gi://byteArray';

Gtk.init();

let clipboard = Gdk.Display.get_default().get_clipboard();
// let contentProvider = Gdk.ContentProvider.new_for_value(new GLib.Variant('s', 'hello world'));
// clipboard.set_content(contentProvider);
// clipboard.set_text('hi');

let string = 'Hello World!';
// const data = Uint8Array.from(string.split("").map(x => x.charCodeAt()))
const data = new TextEncoder().encode(string);

let provider = Gdk.ContentProvider.new_for_bytes('text/plain', data);
clipboard.set_content(provider);
console.log(provider.formats);

// let cc = clipboard.get_content();
// let val = cc.get_value();

console.log(clipboard);
