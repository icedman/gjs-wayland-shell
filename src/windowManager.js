import { WindowManagerInterface } from './compositors/wmInterface.js';
import NiriShell from './compositors/niri.js';
import HyprShell from './compositors/hyprland.js';
import SwayShell from './compositors/sway.js';
import DwlShell from './compositors/dwl.js';

function WindowManagerService(wm) {
  let supportedWM = {
    niri: NiriShell,
    hyprland: HyprShell,
    sway: SwayShell,
    dwl: DwlShell,
  };

  let testWMs = Object.keys(supportedWM);
  if (wm && supportedWM[wm]) {
    testWMs = [supportedWM[wm]];
  }

  for (let i = 0; i < testWMs.length; i++) {
    let target = testWMs[i];
    console.log(`checking ${target}...`);
    let wm = new supportedWM[target]();
    if (wm.isAvailable()) {
      console.log(`${target} found running`);
      return wm;
    }
  }

  return new WindowManagerInterface();
}

export default WindowManagerService;
