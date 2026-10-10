import { baseStyles } from './shared.js';

/**
 * <moore-chart>
 * Transistors per chip, 1971 to 2024, on a linear or logarithmic scale,
 * with a hover tooltip, a plain doubling-every-two-years reference line,
 * and a table view.
 */

const DATA = [
  [1971, 'Intel 4004', 2300],
  [1974, 'Intel 8080', 6000],
  [1978, 'Intel 8086', 29000],
  [1982, 'Intel 80286', 134000],
  [1985, 'Intel 80386', 275000],
  [1989, 'Intel 80486', 1180000],
  [1993, 'Intel Pentium', 3100000],
  [1997, 'Intel Pentium II', 7500000],
  [2000, 'Intel Pentium 4', 42000000],
  [2006, 'Intel Core 2 Duo', 291000000],
  [2008, 'Intel Core i7', 731000000],
  [2011, 'Intel Core i7 (Sandy Bridge)', 1160000000],
  [2014, 'Apple A8', 2000000000],
  [2017, 'Apple A11', 4300000000],
  [2020, 'Apple M1', 16000000000],
  [2022, 'Nvidia H100', 80000000000],
  [2024, 'Nvidia B200', 208000000000],
];

function fmt(n) {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })} billion`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })} million`;
  if (n >= 1e3) return `${(n / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 })} thousand`;
  return n.toLocaleString();
}

export class MooreChart extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.log = true;
    this.hover = -1;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .chart { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; position: relative; }
        svg { touch-action: none; }
        .grid { stroke: var(--border, #221c40); stroke-width: 1; }
        .axis { stroke: #3a3160; stroke-width: 1; }
        .tick { font-family: var(--sans, sans-serif); font-size: 10.5px; fill: var(--muted, #8d84ad); }
        .line { fill: none; stroke: var(--accent, #8b5cf6); stroke-width: 2; stroke-linejoin: round; }
        .ref { fill: none; stroke: var(--muted, #8d84ad); stroke-width: 1.5; stroke-dasharray: 4 6; opacity: 0.7; }
        .dot { fill: var(--accent, #8b5cf6); stroke: var(--bg, #0d0a1c); stroke-width: 2; }
        .dot.hi { fill: var(--heading, #f4f0ff); }
        .cross { stroke: var(--muted, #8d84ad); stroke-width: 1; stroke-dasharray: 2 4; }
        .ylab { font-family: var(--sans, sans-serif); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .tip {
          position: absolute; pointer-events: none; background: var(--panel, #110d24); border: 1px solid var(--border, #221c40);
          border-radius: 4px; padding: 8px 10px; font-size: 12.5px; color: var(--text, #d9d2f0); min-width: 150px; display: none;
        }
        .tip b { display: block; color: var(--heading, #f4f0ff); font-weight: 500; }
        .tip .n { font-family: var(--serif, serif); font-size: 16px; color: var(--heading, #f4f0ff); }
        .seg { display: inline-flex; border: 1px solid var(--border, #221c40); border-radius: 4px; overflow: hidden; }
        .seg label { padding: 8px 12px; font-size: 12.5px; color: var(--muted, #8d84ad); cursor: pointer; user-select: none; }
        .seg label:has(input:checked) { background: var(--panel, #110d24); color: var(--heading, #f4f0ff); box-shadow: inset 0 0 0 1px var(--accent, #8b5cf6); }
        .seg input { position: absolute; opacity: 0; width: 0; height: 0; }
        .legend { display: flex; gap: 16px; font-size: 12px; color: var(--muted, #8d84ad); align-items: center; }
        .legend i { display: inline-block; width: 18px; height: 0; border-top: 2px solid var(--accent, #8b5cf6); vertical-align: middle; margin-right: 6px; }
        .legend i.ref { border-top: 1.5px dashed var(--muted, #8d84ad); }
        details { margin-top: 12px; }
        summary { cursor: pointer; color: var(--muted, #8d84ad); font-size: 13px; }
        table { border-collapse: collapse; font-size: 12.5px; margin-top: 8px; width: 100%; font-variant-numeric: tabular-nums; }
        th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--border, #221c40); }
        th { font-weight: 500; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted, #8d84ad); }
        td:last-child, th:last-child { text-align: right; }
      </style>
      <div class="controls" style="margin:0 0 10px">
        <span class="seg" role="radiogroup" aria-label="Vertical scale">
          <label><input type="radio" name="scale" value="log" checked> Each step ×10</label>
          <label><input type="radio" name="scale" value="lin"> Ordinary scale</label>
        </span>
        <span class="spacer"></span>
        <span class="legend"><span><i></i>transistors on a chip</span><span><i class="ref"></i>doubling every two years</span></span>
      </div>
      <div class="chart">
        <svg viewBox="0 0 640 340" role="img" aria-label="Transistors per chip from 1971 to 2024"></svg>
        <div class="tip"></div>
      </div>
      <p class="readout" aria-live="polite"></p>
      <details><summary>Show the data as a table</summary>
        <table><thead><tr><th>Year</th><th>Chip</th><th>Transistors</th></tr></thead>
        <tbody>${DATA.map(([y, n, t]) => `<tr><td>${y}</td><td>${n}</td><td>${t.toLocaleString()}</td></tr>`).join('')}</tbody></table>
        <p class="muted" style="font-size:12px;margin:8px 0 0">Approximate published counts for a representative large chip of each year. The last two are accelerator chips rather than general processors; the B200 is two dice in one package.</p>
      </details>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('input[name=scale]').forEach((r) => r.addEventListener('change', () => { this.log = r.value === 'log'; this.draw(); }));
    const svg = root.querySelector('svg');
    svg.addEventListener('pointermove', (e) => this.onMove(e));
    svg.addEventListener('pointerleave', () => { this.hover = -1; this.draw(); });
    this.draw();
  }

  get geom() {
    const W = 640, H = 340, L = 70, Rm = 24, T = 20, B = 44;
    const x = (year) => L + ((year - 1970) / (2026 - 1970)) * (W - L - Rm);
    const yMax = 2.5e11;
    const y = this.log
      ? (v) => T + (1 - (Math.log10(v) - 3) / (Math.log10(yMax) - 3)) * (H - T - B)
      : (v) => T + (1 - v / yMax) * (H - T - B);
    return { W, H, L, Rm, T, B, x, y, yMax };
  }

  onMove(e) {
    const svg = this.shadowRoot.querySelector('svg');
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 640;
    const { x } = this.geom;
    let best = -1, bd = 1e9;
    DATA.forEach(([yr], i) => { const d = Math.abs(x(yr) - px); if (d < bd) { bd = d; best = i; } });
    if (best !== this.hover) { this.hover = best; this.draw(); }
    const tip = this.shadowRoot.querySelector('.tip');
    const [yr, name, t] = DATA[best];
    tip.style.display = 'block';
    tip.innerHTML = `<b>${name}</b>${yr}<div class="n">${t.toLocaleString()}</div><span class="muted">${fmt(t)} transistors</span>`;
    const left = ((x(yr) / 640) * rect.width);
    tip.style.left = `${Math.min(rect.width - 170, Math.max(0, left + 12))}px`;
    tip.style.top = `${Math.max(0, ((this.geom.y(t) / 340) * rect.height) - 70)}px`;
  }

  draw() {
    const { W, H, L, Rm, T, B, x, y, yMax } = this.geom;
    const root = this.shadowRoot;
    let s = '';
    // horizontal grid
    if (this.log) {
      for (let p = 3; p <= 11; p++) {
        const v = Math.pow(10, p);
        s += `<line class="grid" x1="${L}" x2="${W - Rm}" y1="${y(v)}" y2="${y(v)}"></line>`;
        s += `<text class="tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${p === 3 ? '1 thousand' : p === 6 ? '1 million' : p === 9 ? '1 billion' : p === 11 ? '100 billion' : ''}</text>`;
      }
    } else {
      for (let k = 0; k <= 5; k++) {
        const v = (yMax / 5) * k;
        s += `<line class="grid" x1="${L}" x2="${W - Rm}" y1="${y(v)}" y2="${y(v)}"></line>`;
        s += `<text class="tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${k === 0 ? '0' : `${Math.round(v / 1e9)} bn`}</text>`;
      }
    }
    // x axis ticks
    for (let yr = 1970; yr <= 2025; yr += 5) {
      if (yr % 10 === 0) s += `<text class="tick" x="${x(yr)}" y="${H - B + 18}" text-anchor="middle">${yr}</text>`;
      s += `<line class="axis" x1="${x(yr)}" x2="${x(yr)}" y1="${H - B}" y2="${H - B + (yr % 10 === 0 ? 6 : 3)}"></line>`;
    }
    s += `<line class="axis" x1="${L}" x2="${W - Rm}" y1="${H - B}" y2="${H - B}"></line>`;
    // reference doubling line from the first point
    const refPts = [];
    for (let yr = 1971; yr <= 2024; yr += 0.5) {
      const v = 2300 * Math.pow(2, (yr - 1971) / 2);
      if (v > yMax) break;
      refPts.push(`${x(yr).toFixed(1)},${y(v).toFixed(1)}`);
    }
    s += `<polyline class="ref" points="${refPts.join(' ')}"></polyline>`;
    // data line and dots
    s += `<polyline class="line" points="${DATA.map(([yr, , t]) => `${x(yr).toFixed(1)},${y(t).toFixed(1)}`).join(' ')}"></polyline>`;
    if (this.hover >= 0) {
      const [yr, , t] = DATA[this.hover];
      s += `<line class="cross" x1="${x(yr)}" x2="${x(yr)}" y1="${T}" y2="${H - B}"></line><line class="cross" x1="${L}" x2="${W - Rm}" y1="${y(t)}" y2="${y(t)}"></line>`;
    }
    DATA.forEach(([yr, , t], i) => { s += `<circle class="dot ${i === this.hover ? 'hi' : ''}" cx="${x(yr)}" cy="${y(t)}" r="${i === this.hover ? 6 : 4}"></circle>`; });
    s += `<text class="ylab" x="${L}" y="${T - 6}">${this.log ? 'transistors, each step up is ×10' : 'transistors'}</text>`;
    root.querySelector('svg').innerHTML = s;
    if (this.hover < 0) root.querySelector('.tip').style.display = 'none';
    root.querySelector('.readout').innerHTML = this.log
      ? `On this scale a steady doubling is a straight line, and fifty years of chips sit close to the dashed one. A hundred-millionfold increase, 1971 to 2024.`
      : `On an ordinary scale the same data is a flat line for forty years and then a wall. Every chip before 2010 is squashed into the bottom pixel. This is why doubling processes are drawn the other way.`;
  }
}
