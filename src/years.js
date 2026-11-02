// The year slider lives with the wildfire filters, but other layers (funding) follow it too.
let current = null;
const listeners = [];

export function setYears(y0, y1) {
  current = [y0, y1];
  for (const fn of listeners) fn(y0, y1);
}

export function onYears(fn) {
  listeners.push(fn);
  if (current) fn(...current);
}
