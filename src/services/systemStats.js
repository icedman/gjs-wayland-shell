import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { Extension } from '../lib/extensionInterface.js';

// Adopted from the Gnome Shell Extensions
// [multicore-system-monitor@igrek.dev](https://extensions.gnome.org/extension/6364/multicore-system-monitor/)

const CPU_REFRESH_INTERVAL = 3000; // in milliseconds
const MEMORY_REFRESH_INTERVAL = 6000; // in milliseconds
const DISK_REFRESH_INTERVAL = 1000 * 60 * 3; // in milliseconds

let cpuUsage = []; // first line represents the total CPU usage, next - consecutive cores

function getCurrentCpuUsage() {
  const file = '/proc/stat';
  const contents = GLib.file_get_contents(file);
  if (!contents[0]) {
    return [];
  }
  const content = new TextDecoder().decode(contents[1]);
  const lines = content.split('\n');
  // first line represents the total CPU usage
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('cpu')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 11) {
        const user = parseInt(parts[1]);
        const nice = parseInt(parts[2]);
        const system = parseInt(parts[3]);
        const idle = parseInt(parts[4]);
        const iowait = parseInt(parts[5]);
        const irq = parseInt(parts[6]);
        const softirq = parseInt(parts[7]);
        const steal = parseInt(parts[8]);
        const guest = parseInt(parts[9]);
        const guest_nice = parseInt(parts[10]);

        const total =
          user +
          nice +
          system +
          idle +
          iowait +
          irq +
          softirq +
          steal +
          guest +
          guest_nice;
        const busyTime =
          user + nice + system + irq + softirq + steal + guest + guest_nice;

        const busyDelta = busyTime - (cpuUsage[i]?.busyTime || 0);
        const totalDelta = total - (cpuUsage[i]?.total || 0);
        const usage = totalDelta > 0 ? busyDelta / totalDelta : 0;
        cpuUsage[i] = {
          busyTime: busyTime,
          total: total,
          usage: usage,
        };
      }
    }
  }
  return cpuUsage;
}

function getCurrentMemoryStats() {
  const file = '/proc/meminfo';
  const contents = GLib.file_get_contents(file);
  if (!contents[0]) {
    return {};
  }
  const content = new TextDecoder().decode(contents[1]);
  const lines = content.split('\n');
  let memoryStats = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const parts = line.split(/\s+/);
    if (parts.length === 3) {
      const key = parts[0].replace(':', '');
      const value = parseInt(parts[1], 10);
      memoryStats[key] = value; // in kilobytes
    }
  }

  const total = memoryStats['MemTotal'];
  const used = total - memoryStats['MemAvailable'];
  const swapUsed = memoryStats['SwapTotal'] - memoryStats['SwapFree'];
  const swapUsagePercent = Math.round(
    (swapUsed / memoryStats['SwapTotal']) * 100,
  );
  const swapUsage = swapUsagePercent / 100;
  const usagePercent = Math.round((used / total) * 100);
  const usage = usagePercent / 100;

  return {
    total: total,
    free: memoryStats['MemFree'],
    buffers: memoryStats['Buffers'],
    cached: memoryStats['Cached'],
    usagePercent: usagePercent,
    used: used,
    usage: usage,
    available: memoryStats['MemAvailable'],
    dirty: memoryStats['Dirty'],
    writeback: memoryStats['Writeback'],
    dirtyWriteback: memoryStats['Dirty'] + memoryStats['Writeback'],
    swapFree: memoryStats['SwapFree'],
    swapTotal: memoryStats['SwapTotal'],
    swapUsagePercent: swapUsagePercent,
    swapUsed: swapUsed,
    swapUsage: swapUsage,
  };
}

function getCurrentDiskUsage() {
  try {
    const [ok, out, err, exit] = GLib.spawn_command_line_sync('df -h');
    const content = new TextDecoder().decode(out);
    const lines = content.split('\n').map((line) => line.split(/\s+/));
    const header = lines[0];
    let res = {};
    for (let i = 1; i < lines.length; i++) {
      const data = lines[i];
      if (!data[0].startsWith('/')) {
        continue;
      }
      let mount = {};
      for (let i = 0; i < header.length; i++) {
        mount[header[i]] = data[i];
      }
      if (mount['Mounted']) {
        res[mount['Mounted']] = mount;
      }
    }
    return res;
  } catch (err) {
    //
  }
  return {};
}

function formatBytes(kbs) {
  if (kbs < 1024) {
    return `${kbs} KiB`;
  } else if (kbs < 1024 * 1024) {
    return `${(kbs / 1024).toFixed(2)} MiB`;
  } else {
    return `${(kbs / 1024 / 1024).toFixed(2)} GiB`;
  }
}

const SystemStats = GObject.registerClass(
  {
    Signals: {
      'stats-cpu-update': { param_types: [GObject.TYPE_OBJECT] },
      'stats-memory-update': { param_types: [GObject.TYPE_OBJECT] },
      'stats-disk-update': { param_types: [GObject.TYPE_OBJECT] },
    },
  },
  class SystemStats extends Extension {
    _init(params) {
      super._init(params);
    }

    async enable() {
      super.enable();
      this.verbose = false;
      this.state = {};

      this._cpuRefreshId = setInterval(() => {
        this.updateCpuUsage();
      }, CPU_REFRESH_INTERVAL);
      this._memoryRefreshId = setInterval(() => {
        this.updateMemoryStats();
      }, MEMORY_REFRESH_INTERVAL);
      this._diskRefreshId = setInterval(() => {
        this.updateDiskUsage();
      }, DISK_REFRESH_INTERVAL);
    }

    disable() {
      super.disable();
      if (this._cpuRefreshId) {
        clearInterval(this._cpuRefreshId);
        this._cpuRefreshId = null;
      }
      if (this._memoryRefreshId) {
        clearInterval(this._memoryRefreshId);
        this._memoryRefreshId = null;
      }
      if (this._diskRefreshId) {
        clearInterval(this._diskRefreshId);
        this._diskRefreshId = null;
      }
    }

    sync() {
      this.updateCpuUsage();
      this.updateMemoryStats();
      this.updateDiskUsage();
    }

    updateCpuUsage() {
      let cpu = getCurrentCpuUsage();
      this.state['cpu'] = cpu;
      if (this.verbose) {
        console.log(cpu);
      }
      this.emit('stats-cpu-update', this);
    }

    updateMemoryStats() {
      let mem = getCurrentMemoryStats();
      this.state['memory'] = mem;
      if (this.verbose) {
        console.log(mem);
      }
      this.emit('stats-memory-update', this);
    }

    updateDiskUsage() {
      let disk = getCurrentDiskUsage();
      this.state['disk'] = disk;
      if (this.verbose) {
        console.log(disk);
      }
      this.emit('stats-disk-update', this);
    }
  },
);

export default SystemStats;
