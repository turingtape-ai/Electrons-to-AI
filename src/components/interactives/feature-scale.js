import { baseStyles } from './shared.js';

/**
 * <feature-scale>
 * The smallest feature a chip factory could draw, by year, placed on a
 * ruler beside things of known size.
 */

const NODES = [
  [1971, 10000], [1975, 6000], [1979, 3000], [1985, 1500], [1989, 1000], [1995, 350],
  [1999, 180], [2001, 130], [2004, 90], [2007, 45], [2012, 22], [2017, 10], [2022, 3],
];
// sizes in nanometres
const THINGS = [
  ['a human hair', 70000],
  ['a red blood cell', 7000],
  ['a bacterium', 1000],
  ['a wavelength of green light', 530],
  ['a flu virus', 100],
  ['the width of DNA', 2],
  ['spacing of silicon atoms', 0.24],
];

function sizeAt(year) {
  if (year <= NODES[0][0]) return NODES[0][1];
  for (let i = 1; i < NODES.length; i++) {
    if (year <= NODES[i][0]) {
      const [y0, s0] = NODES[i - 1], [y1, s1] = NODES[i];
      const t = (year - y0) / (y1 - y0);
      return Math.pow(10, Math.log10(s0) + t * (Math.log10(s1) - Math.log10(s0)));
    }
  }
  return NODES[NODES.length - 1][1];
}

function nm(v) {
  if (v >= 1000) return `${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} µm`;
  return `${v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 1 : 0 })} nm`;
}

export class FeatureScale extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.year = 1985;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .rule { stroke: #3a3160; stroke-width: 1; }
        .tick { font-family: var(--sans, sans-serif); font-size: 10px; fill: var(--muted, #8d84ad); }
        .thing { font-family: var(--sans, sans-serif); font-size: 11px; fill: var(--text, #d9d2f0); }
        .thing-mark { stroke: var(--muted, #8d84ad); stroke-width: 1; }
        .feat { fill: var(--fire, #f2b35b); }
        .feat-lab { font-family: var(--sans, sans-serif); font-size: 11.5px; font-weight: 600; fill: var(--heading, #f4f0ff); }
        .slider { display: flex; align-items: center; gap: 12px; flex: 1 1 260px; color: var(--muted, #8d84ad); font-size: 12.5px; }
        .slider input { flex: 1; accent-color: var(--accent, #8b5cf6); }
        .slider .v { color: var(--heading, #f4f0ff); font-variant-numeric: tabular-nums; min-width: 3em; }
        .big { font-family: var(--serif, serif); font-size: 19px; color: var(--heading, #f4f0ff); margin-top: 10px; }
      </style>
      <svg class="scene" viewBox="0 0 640 260" role="img" aria-label="A size ruler from atoms to a hair, with the chip feature size marked"></svg>
      <div class="controls">
        <label class="slider">Year <input type="range" min="1971" max="2022" step="1" value="${this.year}" aria-label="Year"> <span class="v"></span></label>
      </div>
      <div class="big"></div>
      <p class="readout" aria-live="polite"></p>
    `;
    this.shadowRoot.querySelector('input').addEventListener('input', (e) => { this.year = +e.target.value; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const size = sizeAt(this.year);
    // log ruler: 0.1 nm .. 100,000 nm across x 60..600
    const lx = (v) => 60 + ((Math.log10(v) + 1) / 7) * 540;
    let s = '';
    const ry = 150;
    s += `<line class="rule" x1="60" x2="600" y1="${ry}" y2="${ry}"></line>`;
    for (let p = -1; p <= 6; p++) {
      const v = Math.pow(10, p);
      s += `<line class="rule" x1="${lx(v)}" x2="${lx(v)}" y1="${ry - 5}" y2="${ry + 5}"></line>`;
      s += `<text class="tick" x="${lx(v)}" y="${ry + 20}" text-anchor="middle">${nm(v)}</text>`;
    }
    s += `<text class="tick" x="60" y="${ry + 38}">← smaller · each step is ten times · larger →</text>`;
    // things, staggered above the rule
    THINGS.forEach(([name, v], i) => {
      const x = lx(v);
      const yy = 128 - (i % 3) * 26;
      s += `<line class="thing-mark" x1="${x}" x2="${x}" y1="${yy + 4}" y2="${ry - 6}"></line>`;
      s += `<text class="thing" x="${x}" y="${yy}" text-anchor="${i === THINGS.length - 1 ? 'start' : i === 0 ? 'end' : 'middle'}">${name}</text>`;
    });
    // the feature
    const fx = lx(size);
    s += `<polygon class="feat" points="${fx},${ry + 44} ${fx - 7},${ry + 58} ${fx + 7},${ry + 58}"></polygon>`;
    s += `<text class="feat-lab" x="${fx}" y="${ry + 76}" text-anchor="${fx > 560 ? 'end' : fx < 100 ? 'start' : 'middle'}">smallest feature, ${this.year}: ${nm(size)}</text>`;
    root.querySelector('svg').innerHTML = s;
    root.querySelector('.v').textContent = this.year;
    const acrossHair = Math.round(70000 / size);
    const smaller = THINGS.filter(([, v]) => v > size).map(([n]) => n);
    const atoms = Math.round(size / 0.24);
    root.querySelector('.big').textContent = `${acrossHair.toLocaleString()} of them side by side would span a human hair.`;
    root.querySelector('.readout').innerHTML =
      (size > 1000 ? `In ${this.year} the finest line a factory could print was wider than a bacterium.`
        : size > 100 ? `By ${this.year} the lines were finer than a wavelength of the light used to print them, which took considerable trickery.`
          : size > 10 ? `By ${this.year} a feature was smaller than a virus: about ${atoms.toLocaleString()} silicon atoms across.`
            : `By ${this.year} the names had drifted from the physical sizes, but the real features were a few dozen atoms across. There is not much further down to go.`) +
      (smaller.length ? ` Smaller than ${smaller.length === 1 ? smaller[0] : smaller.slice(0, -1).join(', ') + ' and ' + smaller[smaller.length - 1]}.` : '');
  }
}
