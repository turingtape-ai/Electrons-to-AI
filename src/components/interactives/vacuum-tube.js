import { baseStyles, reducedMotion } from './shared.js';

/**
 * <vacuum-tube>
 * A triode: hot cathode at the bottom, plate at the top, grid between.
 * Drag the grid voltage and watch the electron haze and the plate current.
 */
export class VacuumTube extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.grid = -3; // volts, 0 (open) to -10 (closed)
    this.electrons = [];
    this.raf = null;
    this.last = 0;
  }

  connectedCallback() {
    this.render();
    if (!reducedMotion()) this.loop(0);
  }

  disconnectedCallback() {
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  /** Fraction of the haze that gets through the grid, 0..1. */
  get flow() {
    const t = (this.grid + 10) / 10; // 0 at -10, 1 at 0
    return Math.max(0, Math.min(1, Math.pow(t, 2.2)));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .wrap { display: grid; grid-template-columns: 240px 1fr; gap: 18px; align-items: stretch; }
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .glass { fill: none; stroke: #3a3160; stroke-width: 2; }
        .plate { fill: #6a5f94; }
        .cathode { fill: var(--fire, #f2b35b); filter: drop-shadow(0 0 8px rgba(242, 179, 91, 0.7)); }
        .grid-wire { stroke: var(--accent, #8b5cf6); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 3 9; }
        .e { fill: #c9b8ff; }
        .label { font-family: var(--sans, sans-serif); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .side { display: flex; flex-direction: column; gap: 14px; justify-content: center; }
        .meter { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--muted, #8d84ad); }
        .meter .bar { flex: 1; height: 10px; background: var(--border, #221c40); border-radius: 2px; overflow: hidden; }
        .meter .bar i { display: block; height: 100%; background: var(--fire, #f2b35b); transition: width 120ms ease; }
        .meter .n { min-width: 3.4em; text-align: right; color: var(--heading, #f4f0ff); font-variant-numeric: tabular-nums; }
        .slider { display: flex; flex-direction: column; gap: 6px; color: var(--muted, #8d84ad); font-size: 12.5px; }
        .slider input { width: 100%; accent-color: var(--accent, #8b5cf6); }
        .slider .v { color: var(--heading, #f4f0ff); font-variant-numeric: tabular-nums; }
        .state { font-family: var(--serif, serif); font-size: 20px; color: var(--heading, #f4f0ff); }
        @media (max-width: 520px) { .wrap { grid-template-columns: 1fr; } .scene { max-width: 240px; margin: 0 auto; } }
      </style>
      <div class="wrap">
        <svg class="scene" viewBox="0 0 240 320" role="img" aria-label="A vacuum tube with cathode, grid and plate">
          <rect class="glass" x="40" y="14" width="160" height="292" rx="60"></rect>
          <rect class="plate" x="70" y="48" width="100" height="10" rx="2"></rect>
          <text class="label" x="120" y="40" text-anchor="middle">plate · positive</text>
          <line class="grid-wire" x1="66" y1="165" x2="174" y2="165"></line>
          <text class="label grid-label" x="120" y="150" text-anchor="middle">grid</text>
          <rect class="cathode" x="80" y="262" width="80" height="8" rx="3"></rect>
          <text class="label" x="120" y="290" text-anchor="middle">hot cathode</text>
          <g class="haze"></g>
        </svg>
        <div class="side">
          <label class="slider">
            <span>Grid voltage · <span class="v"></span></span>
            <input type="range" min="-10" max="0" step="0.1" value="${this.grid}" aria-label="Grid voltage in volts">
            <span class="muted" style="display:flex;justify-content:space-between;font-size:11px"><span>−10 V · pushes electrons back</span><span>0 V · lets them through</span></span>
          </label>
          <div class="meter"><span>plate current</span><div class="bar"><i></i></div><span class="n"></span></div>
          <div class="state"></div>
          <div class="controls" style="margin:0">
            <button type="button" class="off">Use as a switch: off</button>
            <button type="button" class="on primary">on</button>
          </div>
        </div>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelector('input[type=range]').addEventListener('input', (e) => { this.grid = +e.target.value; this.update(); });
    root.querySelector('.off').addEventListener('click', () => { this.grid = -10; root.querySelector('input[type=range]').value = -10; this.update(); });
    root.querySelector('.on').addEventListener('click', () => { this.grid = 0; root.querySelector('input[type=range]').value = 0; this.update(); });
    this.update();
    if (reducedMotion()) this.drawStatic();
  }

  update() {
    const root = this.shadowRoot;
    const f = this.flow;
    root.querySelector('.v').textContent = `${this.grid.toFixed(1)} V`;
    root.querySelector('.bar i').style.width = `${f * 100}%`;
    root.querySelector('.n').textContent = `${Math.round(f * 100)}%`;
    root.querySelector('.state').textContent = f < 0.05 ? 'Off. The grid holds the haze back.' : f > 0.9 ? 'On. The haze streams to the plate.' : 'Part way: the grid is throttling the flow.';
    root.querySelector('.readout').innerHTML = f < 0.05
      ? `A few volts of <strong>negative</strong> charge on the grid is enough to turn the electrons round before they reach it. Almost nothing arrives at the plate. The grid drew no current itself: it only pushed.`
      : f > 0.9
        ? `With the grid near zero, electrons boil off the hot cathode and stream straight through the gaps in the grid to the positive plate. Full current, and nothing moved but the electrons. A relay would still be lifting its armature.`
        : `In between, the grid lets some through and turns some back. For a radio this middle region is the useful part: a small wiggle on the grid becomes a large wiggle in the plate current. For a computer only the two ends matter.`;
    if (reducedMotion()) this.drawStatic();
  }

  drawStatic() {
    const f = this.flow;
    const g = this.shadowRoot.querySelector('.haze');
    let s = '';
    for (let i = 0; i < 40; i++) {
      const x = 70 + ((i * 37) % 100);
      const below = i % 3 !== 0 || f > 0.5;
      const y = below ? 180 + ((i * 53) % 75) : 70 + ((i * 29) % 90);
      if (!below && Math.random() > f) continue;
      s += `<circle class="e" cx="${x}" cy="${y}" r="2"></circle>`;
    }
    g.innerHTML = s;
  }

  loop(t) {
    const dt = Math.min(40, t - this.last);
    this.last = t;
    const f = this.flow;
    // spawn
    if (this.electrons.length < 90 && Math.random() < 0.6) {
      this.electrons.push({ x: 82 + Math.random() * 76, y: 258, vy: -(0.05 + Math.random() * 0.05), vx: (Math.random() - 0.5) * 0.02, pass: Math.random() < f });
    }
    const keep = [];
    for (const e of this.electrons) {
      e.y += e.vy * dt;
      e.x += e.vx * dt;
      if (e.y < 172 && e.y > 158 && !e.pass && e.vy < 0) e.vy = -e.vy * 0.8; // turned back by the grid
      if (e.y > 258 || e.y < 60) continue;
      if (e.x < 62 || e.x > 178) e.vx = -e.vx;
      keep.push(e);
    }
    this.electrons = keep;
    this.shadowRoot.querySelector('.haze').innerHTML = keep.map((e) => `<circle class="e" cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="2"></circle>`).join('');
    this.raf = requestAnimationFrame((tt) => this.loop(tt));
  }
}
