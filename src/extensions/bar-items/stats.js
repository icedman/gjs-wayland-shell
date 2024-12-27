export function createCpuStats(config) {
  let cpuStats = Main.panel.create_panelitem(config);
  let statsService = Main.stats;

  statsService.connectObject(
    'stats-cpu-update',
    () => {
      let state = statsService.state.cpu ?? [];
      cpuStats.set_icon(config.icon ?? 'cpu-alt-symbolic');
      if (state[0]) {
        let usage = Math.round(state[0]['usage'] * 100) / 100;
        cpuStats.set_label(`${usage}%`);
      }
    },
    cpuStats,
  );
  statsService.sync();

  cpuStats.on_click = () => {};

  cpuStats.connect('destroy', () => {
    statsService.disconnectObject(cpuStats);
  });
  return cpuStats;
}

function formatMemory(state, fmt = '%usage%', config) {
  let res = fmt;
  Object.keys(state).forEach((k) => {
    res = res.replace(`%${k}`, state[k]);
  });
  return res;
}

export function createMemoryStats(config) {
  let memoryStats = Main.panel.create_panelitem(config);
  let statsService = Main.stats;

  statsService.connectObject(
    'stats-memory-update',
    () => {
      let state = statsService.state.memory ?? {};
      if (state['total']) {
        memoryStats.set_icon(config.icon ?? 'memory-symbolic');
        memoryStats.set_label(formatMemory(state, config.format, config));
      }
    },
    memoryStats,
  );
  statsService.sync();

  memoryStats.on_click = () => {};

  memoryStats.connect('destroy', () => {
    statsService.disconnectObject(memoryStats);
  });
  return memoryStats;
}

function formatDisk(state, fmt = '%Filesystem %Used/%Size %Use%', config) {
  let res = fmt;
  Object.keys(state).forEach((k) => {
    res = res.replace(`%${k}`, state[k]);
  });
  return res;
}

export function createDiskStats(config) {
  let diskStats = Main.panel.create_panelitem(config);
  let statsService = Main.stats;

  statsService.connectObject(
    'stats-disk-update',
    () => {
      console.log(statsService.state);
      let disk = statsService.state.disk ?? {};
      let state = disk[config.on ?? '/'];
      if (!state) return;

      // [
      //     "Filesystem",
      //     "Size",
      //     "Used",
      //     "Avail",
      //     "Use%",
      //     "Mounted"
      // ]

      if (state['Mounted']) {
        diskStats.set_icon(config.icon ?? 'hard-disk-symbolic');
        diskStats.set_label(formatDisk(state, config.format, config));
      }
    },
    diskStats,
  );
  statsService.sync();

  diskStats.on_click = () => {};

  diskStats.connect('destroy', () => {
    statsService.disconnectObject(diskStats);
  });
  return diskStats;
}
