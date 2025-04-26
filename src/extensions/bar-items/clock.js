import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
/*
Type  Meaning
'a' The abbreviated weekday name, e.g. "Sat". If the value does not contain a valid weekday, an exception of type format_error is thrown.
'A' The full weekday name, e.g. "Saturday". If the value does not contain a valid weekday, an exception of type format_error is thrown.
'b' The abbreviated month name, e.g. "Nov". If the value does not contain a valid month, an exception of type format_error is thrown.
'B' The full month name, e.g. "November". If the value does not contain a valid month, an exception of type format_error is thrown.
'c' The date and time representation, e.g. "Sat Nov 12 22:04:00 1955". The modified command %Ec produces the locale's alternate date and time representation.
'C' The year divided by 100 using floored division, e.g. "19". If the result is a single decimal digit, it is prefixed with 0. The modified command %EC produces the locale's alternative representation of the century.
'd' The day of month as a decimal number. If the result is a single decimal digit, it is prefixed with 0. The modified command %Od produces the locale's alternative representation.
'D' Equivalent to %m/%d/%y, e.g. "11/12/55".
'e' The day of month as a decimal number. If the result is a single decimal digit, it is prefixed with a space. The modified command %Oe produces the locale's alternative representation.
'F' Equivalent to %Y-%m-%d, e.g. "1955-11-12".
'g' The last two decimal digits of the ISO week-based year. If the result is a single digit it is prefixed by 0.
'G' The ISO week-based year as a decimal number. If the result is less than four digits it is left-padded with 0 to four digits.
'h' Equivalent to %b, e.g. "Nov".
'H' The hour (24-hour clock) as a decimal number. If the result is a single digit, it is prefixed with 0. The modified command %OH produces the locale's alternative representation.
'I' The hour (12-hour clock) as a decimal number. If the result is a single digit, it is prefixed with 0. The modified command %OI produces the locale's alternative representation.
'j' If the type being formatted is a specialization of duration, the decimal number of days without padding. Otherwise, the day of the year as a decimal number. Jan 1 is 001. If the result is less than three digits, it is left-padded with 0 to three digits.
'm' The month as a decimal number. Jan is 01. If the result is a single digit, it is prefixed with 0. The modified command %Om produces the locale's alternative representation.
'M' The minute as a decimal number. If the result is a single digit, it is prefixed with 0. The modified command %OM produces the locale's alternative representation.
'n' A new-line character.
'p' The AM/PM designations associated with a 12-hour clock.
'q' The duration's unit suffix.
'Q' The duration's numeric value (as if extracted via .count()).
'r' The 12-hour clock time, e.g. "10:04:00 PM".
'R' Equivalent to %H:%M, e.g. "22:04".
'S' Seconds as a decimal number. If the number of seconds is less than 10, the result is prefixed with 0. If the precision of the input cannot be exactly represented with seconds, then the format is a decimal floating-point number with a fixed format and a precision matching that of the precision of the input (or to a microseconds precision if the conversion to floating-point decimal seconds cannot be made within 18 fractional digits). The modified command %OS produces the locale's alternative representation.
't' A horizontal-tab character.
'T' Equivalent to %H:%M:%S.
'u' The ISO weekday as a decimal number (1-7), where Monday is 1. The modified command %Ou produces the locale's alternative representation.
'U' The week number of the year as a decimal number. The first Sunday of the year is the first day of week 01. Days of the same year prior to that are in week 00. If the result is a single digit, it is prefixed with 0. The modified command %OU produces the locale's alternative representation.
'V' The ISO week-based week number as a decimal number. If the result is a single digit, it is prefixed with 0. The modified command %OV produces the locale's alternative representation.
'w' The weekday as a decimal number (0-6), where Sunday is 0. The modified command %Ow produces the locale's alternative representation.
'W' The week number of the year as a decimal number. The first Monday of the year is the first day of week 01. Days of the same year prior to that are in week 00. If the result is a single digit, it is prefixed with 0. The modified command %OW produces the locale's alternative representation.
'x' The date representation, e.g. "11/12/55". The modified command %Ex produces the locale's alternate date representation.
'X' The time representation, e.g. "10:04:00". The modified command %EX produces the locale's alternate time representation.
'y' The last two decimal digits of the year. If the result is a single digit it is prefixed by 0. The modified command %Oy produces the locale's alternative representation. The modified command %Ey produces the locale's alternative representation of offset from %EC (year only).
'Y' The year as a decimal number. If the result is less than four digits it is left-padded with 0 to four digits. The modified command %EY produces the locale's alternative full year representation.
'z' The offset from UTC in the ISO 8601:2004 format. For example -0430 refers to 4 hours 30 minutes behind UTC. If the offset is zero, +0000 is used. The modified commands %Ez and %Oz insert a : between the hours and minutes: -04:30. If the offset information is not available, an exception of type format_error is thrown.
'Z' The time zone abbreviation. If the time zone abbreviation is not available, an exception of type format_error is thrown.
'%' A % character.
*/

export function formatDate(date, fmt = "%Y/%m/%d %H:%M") {
  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const shortWeekdayNames = weekdayNames.map((name) => name.slice(0, 3));
  const shortMonthNames = monthNames.map((name) => name.slice(0, 3));

  const components = {
    "%Y": () => date.getFullYear(), // Full year
    "%y": () => String(date.getFullYear()).slice(-2), // Last two digits of the year
    "%C": () => String(Math.floor(date.getFullYear() / 100)).padStart(2, "0"), // Century
    "%m": () => String(date.getMonth() + 1).padStart(2, "0"), // Month (01-12)
    "%b": () => shortMonthNames[date.getMonth()], // Abbreviated month name
    "%B": () => monthNames[date.getMonth()], // Full month name
    "%d": () => String(date.getDate()).padStart(2, "0"), // Day of the month (01-31)
    "%e": () => String(date.getDate()).padStart(2, " "), // Day of the month (1-31, space-padded)
    "%H": () => String(date.getHours()).padStart(2, "0"), // Hour (00-23)
    "%I": () => String(date.getHours() % 12 || 12).padStart(2, "0"), // Hour (01-12)
    "%M": () => String(date.getMinutes()).padStart(2, "0"), // Minutes (00-59)
    "%S": () => String(date.getSeconds()).padStart(2, "0"), // Seconds (00-59)
    "%p": () => (date.getHours() < 12 ? "AM" : "PM"), // AM/PM
    "%a": () => shortWeekdayNames[date.getDay()], // Abbreviated weekday name
    "%A": () => weekdayNames[date.getDay()], // Full weekday name
    "%w": () => String(date.getDay()), // Weekday as a number (0-6, Sunday = 0)
    "%u": () => String(date.getDay() === 0 ? 7 : date.getDay()), // ISO weekday (1-7, Monday = 1)
    "%j": () =>
      String(
        Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000),
      ).padStart(3, "0"), // Day of the year (001-366)
    "%U": () =>
      String(
        Math.floor((date - new Date(date.getFullYear(), 0, 1)) / 604800000),
      ).padStart(2, "0"), // Week of the year (Sunday start)
    "%W": () =>
      String(
        Math.floor((date - new Date(date.getFullYear(), 0, 1)) / 604800000) +
          (date.getDay() ? 0 : 1),
      ).padStart(2, "0"), // Week of the year (Monday start)
    "%V": () =>
      String(
        Math.floor((date - new Date(date.getFullYear(), 0, 4)) / 604800000) + 1,
      ).padStart(2, "0"), // ISO week number
    "%z": () => {
      const offset = date.getTimezoneOffset();
      return `${offset >= 0 ? "+" : "-"}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}${String(Math.abs(offset) % 60).padStart(2, "0")}`;
    }, // Timezone offset
    "%Z": () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", // Timezone abbreviation
    "%c": () => date.toString(), // Locale-specific date and time
    "%x": () => date.toLocaleDateString(), // Locale-specific date
    "%X": () => date.toLocaleTimeString(), // Locale-specific time
    "%r": () =>
      `${String(date.getHours() % 12 || 12).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")} ${date.getHours() < 12 ? "AM" : "PM"}`, // 12-hour clock time
    "%R": () =>
      `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`, // Hour:Minute
    "%T": () =>
      `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`, // Hour:Minute:Second
    "%D": () =>
      `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`, // mm/dd/yy
    "%F": () =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, // ISO 8601 date
    "%n": () => "\n", // Newline
    "%t": () => "\t", // Tab
    "%%": () => "%", // Percent sign
    "%:": () => (date.getSeconds() % 2 ? ":" : " "),
  };

  return fmt.replace(/%[a-zA-Z%:]/g, (match) =>
    (components[match] || match).call(),
  );
}

export function createClock(config) {
  let clock = Main.panel.create_panelitem(config);
  const updateClock = () => {
    let d = new Date();
    let dt = formatDate(new Date(), config.format);
    clock.set_label(dt);
  };
  clock.clockTimer = Main.loTimer.runLoop(
    updateClock,
    config.interval ?? 5000,
    "clockTimer",
  );
  updateClock();

  let builder = new Gtk.Builder();
  builder.add_from_file(`${this.path}/ui/calendar.ui`);
  let widget = builder.get_object("calendar-widget");
  widget.add_css_class("calendar-widget");
  widget.parent?.remove(widget);

  let menu = clock.menu;
  menu.has_arrow = true;

  menu.child.append(widget);

  clock.on_click = () => {
    menu.popup();
  };

  clock.connect("destroy", () => {
    if (clock.clockTimer) {
      Main.timer.cancel(clock.clockTimer);
      clock.clockTimer = null;
    }
  });
  return clock;
}
