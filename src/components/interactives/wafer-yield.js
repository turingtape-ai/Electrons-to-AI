import { baseStyles } from './shared.js';

/**
 * <wafer-yield>
 * A wafer, scattered defects, and dice of adjustable size. Shows yield and
 * cost per good die.
 */

const WAFER_COST = 10000;
const R = 150; // wafer radius in SVG units

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class WaferYield extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.die = 24;
    this.defects = 25;
    this.seed = 7;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .wrap { display: grid; grid-template-columns: 320px 1fr; gap: 18px; align-items: start; }
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .wafer { fill: #171230; stroke: #3a3160; stroke-width: 2; }
        .die { fill: #2d2457; stroke: #0d0a1c; stroke-width: 1; }
        .die.bad { fill: #3a1d2a; }
        .die.good { fill: #2f6b5a; }
        .def { fill: var(--fire, #f2b35b); }
        .side { display: flex; flex-direction: column; gap: 12px; }
        .slider { display: flex; flex-direction: column; gap: 4px; color: var(--muted, #8d84ad); font-size: 12.5px; }
        .slider input { accent-color: var(--accent, #8b5cf6); width: 100%; }
        .slider .v { color: var(--heading, #f4f0ff); font-variant-numeric: tabular-nums; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .stat { border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 8px 10px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted, #8d84ad); }
        .stat b { display: block; font: 500 20px var(--serif, serif); letter-spacing: 0; text-transform: none; color: var(--heading, #f4f0ff); font-variant-numeric: tabular-nums; margin-top: 2px; }
        @media (max-width: 600px) { .wrap { grid-template-columns: 1fr; } .scene { max-width: 320px; margin: 0 auto; } }
      </style>
      <div class="wrap">
        <svg class="scene" viewBox="0 0 320 320" role="img" aria-label="A wafer cut into dice with defects scattered on it"></svg>
        <div class="side">
          <label class="slider"><span>Die size · <span class="v dv"></span></span><input type="range" class="die" min="10" max="75" step="1" value="${this.die}" aria-label="Die size"></label>
          <label class="slider"><span>Defects on the wafer · <span class="v fv"></span></span><input type="range" class="def" min="0" max="80" step="1" value="${this.defects}" aria-label="Number of defects"></label>
          <div class="controls" style="margin:0"><button type="button" class="again">Scatter them again</button></div>
          <div class="stats">
            <div class="stat">dice on the wafer<b class="total"></b></div>
            <div class="stat">good dice<b class="good"></b></div>
            <div class="stat">yield<b class="yield"></b></div>
            <div class="stat">cost per good die<b class="cost"></b></div>
          </div>
        </div>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelector('input.die').addEventListener('input', (e) => { this.die = +e.target.value; this.update(); });
    root.querySelector('input.def').addEventListener('input', (e) => { this.defects = +e.target.value; this.update(); });
    root.querySelector('.again').addEventListener('click', () => { this.seed = (this.seed * 31 + 17) % 100000; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const rnd = seeded(this.seed);
    const defects = [];
    for (let i = 0; i < this.defects; i++) {
      // uniform over the disc
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (R - 4);
      defects.push([160 + r * Math.cos(a), 160 + r * Math.sin(a)]);
    }
    const d = this.die;
    const dice = [];
    const n = Math.floor((2 * R) / d);
    const off = 160 - (n * d) / 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = off + i * d, y = off + j * d;
      // keep dice whose four corners are inside the wafer
      const inside = [[x, y], [x + d, y], [x, y + d], [x + d, y + d]].every(([cx, cy]) => Math.hypot(cx - 160, cy - 160) <= R - 2);
      if (!inside) continue;
      const bad = defects.some(([dx, dy]) => dx >= x && dx < x + d && dy >= y && dy < y + d);
      dice.push({ x, y, bad });
    }
    const good = dice.filter((t) => !t.bad).length;
    root.querySelector('svg').innerHTML =
      `<circle class="wafer" cx="160" cy="160" r="${R}"></circle>` +
      dice.map((t) => `<rect class="die ${t.bad ? 'bad' : 'good'}" x="${t.x}" y="${t.y}" width="${d}" height="${d}"></rect>`).join('') +
      defects.map(([x, y]) => `<circle class="def" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2"></circle>`).join('');
    root.querySelector('.dv').textContent = d < 20 ? 'small' : d < 45 ? 'medium' : 'large';
    root.querySelector('.fv').textContent = this.defects;
    root.querySelector('.total').textContent = dice.length;
    root.querySelector('.good').textContent = good;
    root.querySelector('.yield').textContent = dice.length ? `${Math.round((100 * good) / dice.length)}%` : '–';
    root.querySelector('.cost').textContent = good ? `$${Math.round(WAFER_COST / good).toLocaleString()}` : 'no good dice';
    const out = root.querySelector('.readout');
    const bigRatio = (d * d) / (24 * 24);
    out.innerHTML = good
      ? `The wafer costs $${WAFER_COST.toLocaleString()} to make whatever is on it. ${this.defects} defect${this.defects === 1 ? '' : 's'} spoil ${dice.length - good} of ${dice.length} dice. ` +
        (d >= 45
          ? `A large die is a large target: each one has about ${bigRatio.toFixed(0)} times the area of a medium die to catch a speck in, and the cost of a good chip climbs steeply.`
          : d <= 18
            ? `Small dice lose only the few that actually catch a speck, so the yield is high and each good chip is cheap. The pressure, then, is to fit more into a small die rather than make the die bigger.`
            : `Make the dice larger and watch the yield fall faster than the count. Make them smaller and watch it climb.`)
      : `Every die caught at least one defect. Nothing to sell. Shrink the dice or clean the room.`;
  }
}
