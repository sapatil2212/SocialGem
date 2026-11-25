// Plain mutable values shared between the page and the 3D frame loop.
// They change many times a second, so they must not go through React state.
export const fx = { pulse: 0, dayTurn: 0 };

export function pulse(amount = 1) {
  fx.pulse = Math.min(1.4, fx.pulse + amount);
}
