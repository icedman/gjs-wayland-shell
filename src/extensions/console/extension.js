import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

class ConsoleExtension {
  enable() {
    if (!GLib.getenv('DEBUG_CONSOLE')) {
      return;
    }

    // Command history array and index
    this.commandHistory = [];
    this.historyIndex = -1;

    // Create the main application window
    const window = new Gtk.Window({
      name: 'Console',
      title: 'Console',
      default_width: 400,
      default_height: 300,
    });

    window.connect('close-request', () => {
      window.hide();
      return false;
    });

    // Create a vertical box to hold widgets
    const vbox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 10,
    });
    window.set_child(vbox);

    // Create a text view to display output
    const outputView = new Gtk.TextView({ name: 'Output' });
    outputView.editable = false;
    // outputView.set_sensitive(false);
    outputView.wrap_mode = Gtk.WrapMode.WORD;
    const outputBuffer = outputView.buffer;

    this.outputView = outputView;

    const scroller = new Gtk.ScrolledWindow({ vexpand: true });
    scroller.set_child(outputView);
    // scroller.set_sensitive(false);
    vbox.append(scroller);

    // Create a text entry for user input
    const entry = new Gtk.Entry({ name: 'Entry' });
    entry.placeholder_text = 'Enter a command...';
    vbox.append(entry);

    this.scroller = scroller;

    // Function to append text to the output view
    function appendOutput(text) {
      outputBuffer.insert(outputBuffer.get_end_iter(), text, text.length);
      // let adj = scroller.get_adjustment();
      // adj.set_value(adj.get_upper());
    }

    // Add functionality to execute entered scripts
    entry.connect('activate', () => {
      let command = entry.text;

      if (command.startsWith(':')) {
        command =
          this.commandHistory[
            this.historyIndex + parseInt(command.replace(':', ''), 10)
          ];
        if (command) {
          entry.text = command;
        }
        return;
      } else {
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length; // Reset index for new entries
      }

      try {
        const result = eval(command); // Evaluate the GJS command
        appendOutput(`> ${command}\n${result}\n`);
      } catch (error) {
        appendOutput(`Error: ${error.message}\n`);
      }
      entry.text = ''; // Clear the input after execution
    });

    let event = new Gtk.EventControllerKey();
    event.connect('key-pressed', (w, key, keycode) => {
      let historyIndex = this.historyIndex;
      let commandHistory = this.commandHistory;
      if (key === Gdk.KEY_Up) {
        // Navigate to the previous command
        if (historyIndex > 0) {
          historyIndex--;
          entry.text = commandHistory[historyIndex];
          entry.set_position(-1); // Move the cursor to the end
        }
      } else if (key === Gdk.KEY_Down) {
        // Navigate to the next command
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          entry.text = commandHistory[historyIndex];
          entry.set_position(-1); // Move the cursor to the end
        } else {
          historyIndex = commandHistory.length;
          entry.text = ''; // Clear the input field if beyond history
        }
      }

      this.historyIndex = historyIndex;
      this.commandHistory = commandHistory;
    });
    entry.add_controller(event);

    // Show all widgets and run the application
    window.present();

    this.window = window;
  }

  clear() {
    const outputBuffer = this.outputView.buffer;
    outputBuffer.set_text('', 0);
  }

  disable() {
    this.window.hide();
    this.window = null;
  }

  preferences() {}
}

const Extension = ConsoleExtension;
export { Extension };