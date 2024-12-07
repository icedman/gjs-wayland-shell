import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

function callGetInitialResultSet(query) {
  try {
    // Connect to the D-Bus session
    const proxy = new Gio.DBusProxy({
      g_connection: Gio.DBus.session,
      g_name: 'org.gnome.Nautilus',
      g_object_path: '/org/gnome/Nautilus/SearchProvider',
      g_interface_name: 'org.gnome.Shell.SearchProvider2',
    });

    // console.log(proxy);
    // console.log(proxy.GetInitialResultSet);

    const queryArray = [query]; // This should be an array of strings, even if it contains one string

    // Call the method synchronously using call_sync()
    const resultSet = proxy.call_sync(
      'GetInitialResultSet', // Method name
      GLib.Variant.new('(as)', [queryArray]), // Arguments (array of strings)
      Gio.DBusCallFlags.NONE, // No flags
      -1, // No timeout (wait indefinitely)
      null, // No cancellable
    );

    const resultArray = resultSet.deepUnpack(); // Unpack the variant result
    console.log(resultArray);

    // Handle and log the result set
    // log(`Received initial result set: ${JSON.stringify(resultSet)}`);
  } catch (e) {
    logError('Error calling GetInitialResultSet: ' + e.message);
  }
}

function logError(message) {
  print(message); // Optionally print to the console for debugging
}

function getTermsForSearchString(searchString) {
  searchString = searchString.replace(/^\s+/g, '').replace(/\s+$/g, '');
  if (searchString === '') return [];
  return searchString.split(/\s+/);
}

callGetInitialResultSet('board');

/*
gdbus call --session --dest=org.gnome.Nautilus --object-path=/org/gnome/Nautilus/SearchProvider --method=org.gnome.Shell.SearchProvider2.GetInitialResultSet "['board']"
*/
