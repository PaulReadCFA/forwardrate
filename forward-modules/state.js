export const state = {
  spot1Year: 6.3,
  spot2Year: 8.0,
  viewMode: 'chart',
  errors: {},
  forwardCalculations: null,
  listeners: []
};

export function setState(updates) {
  Object.assign(state, updates);
  state.listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  state.listeners.push(fn);
}
