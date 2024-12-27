import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';

export function formatDate(date, fmt = '%Y/%m/%d %H:%M') {
  const components = {
    '%Y': date.getFullYear(), // Full year
    '%y': String(date.getFullYear()).slice(-2), // Last two digits of year
    '%m': String(date.getMonth() + 1).padStart(2, '0'), // Month (01-12)
    '%d': String(date.getDate()).padStart(2, '0'), // Day of the month (01-31)
    '%H': String(date.getHours()).padStart(2, '0'), // Hour (00-23)
    '%I': String(date.getHours() % 12 || 12).padStart(2, '0'), // Hour (01-12)
    '%M': String(date.getMinutes()).padStart(2, '0'), // Minutes (00-59)
    '%S': String(date.getSeconds()).padStart(2, '0'), // Seconds (00-59)
    '%p': date.getHours() < 12 ? 'AM' : 'PM', // AM/PM
  };
  return fmt.replace(/%[YymdHIMSip]/g, (match) => components[match] || match);
}

export function createClock(config) {
  let clock = Main.panel.create_panelitem(config);
  const updateClock = () => {
    let d = new Date();
    let dt = formatDate(new Date(), config.format);
    clock.set_label(dt);
  };
  clock.clockTimer = Main.timer.runLoop(
    updateClock,
    config.interval ?? 5000, // << todo!
    'clockTimer',
  );
  updateClock();

  let builder = new Gtk.Builder();
  builder.add_from_file(`${this.path}/ui/calendar.ui`);
  let widget = builder.get_object('calendar-widget');
  widget.add_css_class('calendar-widget');
  widget.parent?.remove(widget);

  let menu = clock.menu;
  menu.has_arrow = true;

  menu.child.append(widget);

  clock.on_click = () => {
    menu.popup();
  };

  clock.connect('destroy', () => {
    if (clock.clockTimer) {
      Main.timer.cancel(clock.clockTimer);
      clock.clockTimer = null;
    }
  });
  return clock;
}
