import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

// Initialize GTK
Gtk.init();

let provider = new Gtk.CssProvider();
provider.load_from_path('style.css');
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  provider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
);

// Create a GTK window
const window = new Gtk.Window({
  title: 'Fastfetch Output',
  default_width: 800,
  default_height: 600,
});
window.connect('destroy', () => Gtk.main_quit());

// Create a scrolled window and text view
const scrolledWindow = new Gtk.ScrolledWindow();
const textView = new Gtk.TextView({
  editable: false,
  wrap_mode: Gtk.WrapMode.WORD,
});
scrolledWindow.set_child(textView);
window.set_child(scrolledWindow);

// Run fastfetch and capture output
function runCommand(command, args) {
  const subprocess = new Gio.Subprocess({
    argv: [command, ...args],
    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
  });

  subprocess.init(null);
  const stdout = subprocess.communicate_utf8(null, null)[1];
  return stdout;
}

// Parse ANSI color codes (basic example, extend as needed)
function parseAnsiToGtk(textBuffer, text) {
  const regex = /\x1b\[(\d+;?)*m/g; // Match ANSI escape codes
  let match;
  let lastIndex = 0;

  const iter = textBuffer.get_end_iter(); // Get iterator for the end of the buffer

  while ((match = regex.exec(text)) !== null) {
    // Insert plain text up to the match
    // textBuffer.insert(iter, text.substring(lastIndex, match.index));
    let t = text.substring(lastIndex, match.index);
    textBuffer.insert(iter, t, t.length);

    // Handle ANSI escape code (this example skips parsing specific codes)
    // You would add logic here to interpret the escape sequence and set appropriate text tags.
    lastIndex = regex.lastIndex;
  }

  // Insert remaining plain text
  // textBuffer.insert(iter, text.substring(lastIndex));
  let t = text.substring(lastIndex);
  textBuffer.insert(iter, t, t.length);
}

// Insert fastfetch output into text view
const output = runCommand('fastfetch', []); // Replace 'fastfetch' with 'neofetch' as needed
const textBuffer = textView.get_buffer();
parseAnsiToGtk(textBuffer, output);

// Show the window
window.show();
// Gtk.main();

let loop = GLib.MainLoop.new(null, false);
loop.run();
