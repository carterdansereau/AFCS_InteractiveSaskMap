import { HIGHWAYS } from './config.js';

// Checkboxes under the highways toggle that choose which highway series are drawn.
export function highwayControls(map, layerId) {
  const el = document.createElement('div');
  el.className = 'sub-filters';
  const boxes = HIGHWAYS.series.map((s, i) => `<label><input type="checkbox" data-i="${i}" ${s.on ? 'checked' : ''}> ${s.label}</label>`);
  boxes.push(`<label><input type="checkbox" data-ramps> Ramps & short connectors</label>`);
  el.innerHTML = boxes.join('');

  const update = () => {
    const ranges = [...el.querySelectorAll('input[data-i]:checked')].map((box) => {
      const s = HIGHWAYS.series[box.dataset.i];
      return ['all', ['>=', ['get', 'hwy'], s.min], ['<=', ['get', 'hwy'], s.max]];
    });
    const filter = ['all', ['any', ...ranges]];
    if (!el.querySelector('input[data-ramps]').checked) filter.push(['in', ['get', 'cls'], ['literal', HIGHWAYS.mainClasses]]);
    map.setFilter(layerId, filter);
  };
  el.addEventListener('change', update);
  update();
  return el;
}
