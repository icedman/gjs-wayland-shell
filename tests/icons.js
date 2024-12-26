import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GdkPixbuf from 'gi://GdkPixbuf';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

Gtk.init();

function createIconGridView() {
  const window = new Gtk.Window({
    title: 'Icon Grid Example',
    default_width: 400,
    default_height: 300,
  });

  window.connect('close-request', () => {
    loop.quit();
    return true;
  });

  // Define the object to hold data (icon name and label)
  const IconItem = GObject.registerClass(
    {
      Properties: {
        iconName: GObject.ParamSpec.string(
          'iconName',
          'Icon Name',
          'The icon name',
          GObject.ParamFlags.READWRITE,
          '',
        ),
        label: GObject.ParamSpec.string(
          'label',
          'Label',
          'The label text',
          GObject.ParamFlags.READWRITE,
          '',
        ),
      },
    },
    class IconItem extends GObject.Object {
      constructor(props) {
        super(props);
      }
    },
  );

  // Create a Gio.ListStore and set the item type to IconItem
  const listStore = new Gio.ListStore({ item_type: IconItem });

  // Populate the list store with data
  const items = [
    ['folder', 'Folder'],
    ['user-home', 'Home'],
    ['folder-downloads', 'Downloads'],
  ];

  for (let i = 0; i < 20; i++) {
    items.forEach(([iconName, label]) => {
      const iconItem = new IconItem();
      iconItem.iconName = iconName;
      iconItem.label = label;
      listStore.append(iconItem);
    });
  }
  // Create a selection model based on the Gio.ListStore
  const selectionModel = new Gtk.SingleSelection({ model: listStore });

  // Create a `Gtk.GridView` with a custom factory
  const gridView = new Gtk.GridView({
    model: selectionModel,
  });

  const factory = Gtk.SignalListItemFactory.new();

  factory.connect('setup', (factory, listItem) => {
    const box = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 4,
    });

    const icon = new Gtk.Image();
    const label = new Gtk.Label({ xalign: 0.5, visible: false });
    icon.set_pixel_size(48);

    box.append(icon);
    box.append(label);
    listItem.set_child(box);
  });

  factory.connect('bind', (factory, listItem) => {
    const box = listItem.get_child();
    const icon = box.get_first_child();
    const label = icon.get_next_sibling();
    const item = listItem.get_item();
    icon.set_from_icon_name(item.iconName);
    label.set_label(item.label);
  });

  gridView.set_factory(factory);

  const scrolledWindow = new Gtk.ScrolledWindow();
  scrolledWindow.set_child(gridView);
  window.set_child(scrolledWindow);
  window.show();
}

createIconGridView();

let loop = GLib.MainLoop.new(null, false);
loop.run();
