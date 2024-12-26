const { Gtk, Gio, GObject } = imports.gi;

// Initialize GTK
Gtk.init(null);

// Define a simple model for the GridView
const ListModel = GObject.registerClass(
  {},
  class ListModel extends GObject.Object {
    _init() {
      super._init();
    }

    static [GObject.properties] = {
      label: GObject.ParamSpec.string(
        'label',
        'Label',
        'Button Label',
        GObject.ParamFlags.READWRITE,
        '',
      ),
      icon_name: GObject.ParamSpec.string(
        'icon_name',
        'Icon Name',
        'Icon Name',
        GObject.ParamFlags.READWRITE,
        '',
      ),
    };

    _init(label, icon_name) {
      super._init();
      this.label = label;
      this.icon_name = icon_name;
    }
  },
);

// Create a button widget to represent each item in the grid
function createButtonWidget(item) {
  const button = new Gtk.Button();

  const vbox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 5,
  });

  const icon = new Gtk.Image({
    icon_name: item.icon_name,
    pixel_size: 48,
  });

  const label = new Gtk.Label({ label: item.label });

  vbox.append(icon);
  vbox.append(label);

  button.set_child(vbox);

  return button;
}

// App Activation
function onActivate() {
  // Create a new window
  const window = new Gtk.Window({
    title: 'GridView Example',
    default_width: 400,
    default_height: 300,
  });

  // Connect the destroy signal to exit the application
  window.connect('destroy', () => Gtk.main_quit());

  // Create a ListStore to hold the data
  const items = new Gio.ListStore({ item_type: ListModel });

  // Add items to the ListStore
  items.append(new ListModel('Open Folder', 'folder-open-symbolic'));
  items.append(new ListModel('Save', 'document-save-symbolic'));
  items.append(new ListModel('Trash', 'user-trash-symbolic'));
  items.append(new ListModel('Settings', 'emblem-system-symbolic'));

  // Create a GridView
  const gridView = new Gtk.GridView({
    model: items,
    enable_rubberband: false,
  });

  // Define how each item in the grid should look
  gridView.set_factory(
    Gtk.SignalListItemFactory.new((listItem) => {
      // Bind the item's data to the button widget
      const item = listItem.get_item();
      if (item) {
        const button = createButtonWidget(item);
        listItem.set_child(button);
      }
    }),
  );

  // Add the GridView to the window
  window.set_child(gridView);

  // Show the window
  window.show();
}

// Create the application
const app = new Gtk.Application({
  application_id: 'com.example.gridview',
  flags: Gio.ApplicationFlags.FLAGS_NONE,
});

app.connect('activate', onActivate);

// Run the application
app.run([]);
