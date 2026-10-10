import { baseStyles, reducedMotion } from './shared.js';

/**
 * <transistor-valve>
 * A cross-section of a field-effect transistor. Raise the gate voltage and
 * a channel forms under the gate, joining source to drain.
 */
export class TransistorValve extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.vg = 0.4;
    this.raf = null;
    this.phase = 0;
  }

  connectedCallback() {
    this.render();
    if (!reducedMotion()) this.loop();
  }

  disconnectedCallback() {
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  get open() {
    // threshold 1 V, full at 3 V
    return Math.max(0, Math.min(1, (this.vg - 1) / 2));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .sub { fill: #171230; }
        .n { fill: #2d2457; }
        .ox { fill: #4a5a8a; }
        .gate { fill: #8d84ad; }
        .gate.on { fill: var(--accent, #8b5cf6); }
        .metal { fill: #6a5f94; }
        .chan { fill: var(--fire, #f2b35b); }
        .q { fill: #ffe2b0; }
        .label { font-family: var(--sans, sans-serif); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .wire { stroke: #4a3f78; stroke-width: 2.5; fill: none; }
        .wire.live { stroke: var(--fire, #f2b35b); }
        .lamp { fill: #1a1434; stroke: var(--border, #221c40); stroke-width: 1.5; }
        .lamp.on { fill: var(--fire, #f2b35b); stroke: var(--fire, #f2b35b); filter: drop-shadow(0 0 10px rgba(242, 179, 91, 0.6)); }
        .slider { display: flex; align-items: center; gap: 12px; flex: 1 1 240px; color: var(--muted, #8d84ad); font-size: 12.5px; }
        .slider input { flex: 1; accent-color: var(--accent, #8b5cf6); }
        .slider .v { color: var(--heading, #f4f0ff); min-width: 3.2em; font-variant-numeric: tabular-nums; }
        .meter { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-size: 12.5px; color: var(--muted, #8d84ad); }
        .meter .bar { flex: 1; height: 8px; background: var(--border, #221c40); border-radius: 2px; overflow: hidden; }
        .meter .bar i { display: block; height: 100%; background: var(--fire, #f2b35b); transition: width 120ms ease; }
      </style>
      <svg class="scene" viewBox="0 0 640 260" role="img" aria-label="Cross-section of a transistor">
        <!-- substrate -->
        <rect class="sub" x="40" y="120" width="560" height="110"></rect>
        <text class="label" x="320" y="222" text-anchor="middle">silicon of the other kind · does not conduct on its own</text>
        <!-- source and drain -->
        <rect class="n" x="90" y="120" width="130" height="50" rx="4"></rect>
        <rect class="n" x="420" y="120" width="130" height="50" rx="4"></rect>
        <text class="label" x="155" y="150" text-anchor="middle">source</text>
        <text class="label" x="485" y="150" text-anchor="middle">drain</text>
        <!-- channel -->
        <rect class="chan" x="220" y="120" width="200" height="8" opacity="0"></rect>
        <g class="charges"></g>
        <!-- oxide and gate -->
        <rect class="ox" x="214" y="113" width="212" height="7"></rect>
        <rect class="gate" x="220" y="88" width="200" height="25" rx="2"></rect>
        <text class="label" x="320" y="104" text-anchor="middle" fill="#fff" style="fill:#f4f0ff">gate</text>
        <text class="label" x="320" y="80" text-anchor="middle">a skin of glass thinner than you can see</text>
        <!-- metal contacts -->
        <rect class="metal" x="130" y="100" width="50" height="20" rx="2"></rect>
        <rect class="metal" x="460" y="100" width="50" height="20" rx="2"></rect>
        <!-- wires: source to ground, drain through lamp to supply -->
        <path class="wire s" d="M 155 100 L 155 40 L 60 40"></path>
        <path class="wire d" d="M 485 100 L 485 40 L 560 40"></path>
        <circle class="lamp" cx="580" cy="40" r="12"></circle>
        <text class="label" x="60" y="30">supply</text>
        <text class="label" x="580" y="20" text-anchor="middle">lamp</text>
        <path class="wire g" d="M 320 88 L 320 60 L 320 60"></path>
        <text class="label" x="320" y="54" text-anchor="middle">gate voltage</text>
      </svg>
      <div class="controls">
        <label class="slider">Gate <input type="range" min="0" max="3" step="0.1" value="${this.vg}" aria-label="Gate voltage"> <span class="v"></span></label>
      </div>
      <div class="meter"><span>current · source to drain</span><div class="bar"><i></i></div></div>
      <p class="readout" aria-live="polite"></p>
    `;
    this.shadowRoot.querySelector('input').addEventListener('input', (e) => { this.vg = +e.target.value; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const o = this.open;
    root.querySelector('.v').textContent = `${this.vg.toFixed(1)} V`;
    root.querySelector('.chan').setAttribute('opacity', String(o * 0.9));
    root.querySelector('.gate').classList.toggle('on', this.vg >= 1);
    root.querySelector('.bar i').style.width = `${o * 100}%`;
    root.querySelectorAll('.wire.s, .wire.d').forEach((w) => w.classList.toggle('live', o > 0.15));
    root.querySelector('.lamp').classList.toggle('on', o > 0.15);
    root.querySelector('.readout').innerHTML = this.vg < 1
      ? `Below about one volt nothing happens. Between source and drain is silicon of the wrong kind, with nothing loose in it. No channel, no current. The transistor is <strong>off</strong>.`
      : o < 0.6
        ? `The field from the gate reaches through the glass and pulls loose charges up into a thin layer underneath it. A <strong>channel</strong> is forming. Current begins to flow from source to drain, and the gate itself has drawn nothing: the glass insulates it.`
        : `The channel is fully open and current flows freely. The transistor is <strong>on</strong>. Nothing is hot, nothing has moved, and the switch is a few dozen atoms long.`;
    if (reducedMotion()) this.drawCharges(0);
  }

  drawCharges(phase) {
    const o = this.open;
    const g = this.shadowRoot.querySelector('.charges');
    if (o <= 0) { g.innerHTML = ''; return; }
    const n = Math.round(4 + o * 14);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = 224 + ((i * 193 / n + phase * 60 * o) % 192);
      s += `<circle class="q" cx="${x.toFixed(1)}" cy="124" r="2"></circle>`;
    }
    g.innerHTML = s;
  }

  loop() {
    this.phase = (this.phase + 0.016) % 1000;
    this.drawCharges(this.phase);
    this.raf = requestAnimationFrame(() => this.loop());
  }
}
