import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

const appRegistry = {};

function getAppInfo(app) {
  if (!app) {
    return {};
  }
  let appInfo = app;
  if (appInfo && typeof appInfo === 'string') {
    if (appRegistry[appInfo]) {
      return appRegistry[appInfo];
    }
    let desktopAppInfo = Gio.DesktopAppInfo.new(app);
    if (desktopAppInfo) {
      let id = desktopAppInfo.get_id();
      let icon_name = desktopAppInfo.get_string('Icon');
      let title = desktopAppInfo.get_string('Name');
      let exec = (desktopAppInfo.get_string('Exec') ?? '').trim();
      appInfo = {
        id,
        title,
        icon_name,
        exec,
      };
    } else {
      appInfo = {
        id: appInfo,
      };
    }
  }

  if (appRegistry[appInfo.id]) {
    return appRegistry[appInfo.id];
  }

  if (appInfo && !appInfo.menu) {
    appInfo.menu = getAppInfoMenu(appInfo);
  }

  appRegistry[appInfo.id] = appInfo;
  // console.log(appInfo);
  return appInfo;
}

function getAppInfoFromFile(file) {
  let desktopAppInfo = Gio.DesktopAppInfo.new_from_filename(file);
  return getAppInfo(desktopAppInfo);
}

function getAppInfoMenu(appInfo) {
  let items = [
    {
      id: appInfo.id,
      action: 'open',
      name: 'Open Window',
      exec: appInfo.exec,
    },
  ];

  let desktopAppInfo = Gio.DesktopAppInfo.new(appInfo.id ?? 'xxx');
  if (!desktopAppInfo) {
    return items;
  }

  let content = null;

  try {
    content = GLib.file_get_contents(desktopAppInfo.filename)[1];
  } catch (err) {
    return null;
  }

  let lines = String.fromCharCode.apply(null, content).split('\n');

  // console.log(lines);
  desktopAppInfo.list_actions().forEach((action) => {
    let name = desktopAppInfo.get_action_name(action);
    let nextExec = false;
    let exec = null;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.includes(`${action}]`)) {
        nextExec = true;
      }
      if (nextExec && line.startsWith('Exec')) {
        exec = line
          .replace('Exec=', '')
          .replace('%U', '')
          .replace('%u', '')
          .trim();
        break;
      }
    }

    items.push({ action, name, exec });
  });

  return items;
}

export { getAppInfo, getAppInfoFromFile };
