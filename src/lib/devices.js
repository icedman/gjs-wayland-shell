import Gdk from 'gi://Gdk?version=4.0';

function pointerInWindow(w) {
  let res = [false, 0, 0];
  const surface = w.get_surface();
  const display = surface?.get_display();
  const seat = display?.get_default_seat();
  const pointer = seat?.get_pointer();
  const device_position = surface?.get_device_position(pointer) ?? res;
  return device_position;
}

function getModifierStates(w) {
  try {
    const surface = w?.get_surface();
    const display = surface?.get_display() ?? Gdk.Display.get_default();
    const seat = display?.get_default_seat();
    const keyboard = seat?.get_keyboard();
    console.log(seat);
    console.log(keyboard);
    console.log(keyboard?.modifier_state);

    return {
      ctrl:
        (keyboard?.get_modifier_state() & Gdk.ModifierType.CONTROL_MASK) > 0,
      shift: (keyboard?.get_modifier_state() & Gdk.ModifierType.SHIFT_MASK) > 0,
      alt: (keyboard?.get_modifier_state() & Gdk.ModifierType.ALT_MASK) > 0,
      meta: (keyboard?.get_modifier_state() & Gdk.ModifierType.META_MASK) > 0,
      hyper: (keyboard?.get_modifier_state() & Gdk.ModifierType.HYPER_MASK) > 0,
    };
  } catch (err) {
    console.log(err);
    return {};
  }
}

export { pointerInWindow, getModifierStates };
