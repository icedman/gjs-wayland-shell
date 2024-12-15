import { ShellInterface } from './compositors/shellInterface.js';
import NiriShell from './compositors/niri.js';
import HyprShell from './compositors/hyprland.js';
import SwayShell from './compositors/sway.js';

function ShellService(wm) {
  let supportedWM = {
    niri: NiriShell,
    hyprland: HyprShell,
    sway: SwayShell,
  };

  let testShells = Object.keys(supportedWM);
  if (wm && supportedWM[wm]) {
    testShells = [supportedWM[wm]];
  }

  for (let i = 0; i < testShells.length; i++) {
    let shell = new supportedWM[testShells[i]]();
    let connection = shell.connect();
    if (connection) {
      shell.disconnect(connection);
      console.log(testShells[i]);
      return shell;
    }
  }

  return new ShellInterface();
}

export default ShellService;
