import { baseStyles } from './shared.js';

/**
 * <cmos-inverter>
 * A complementary pair: one transistor that conducts when its gate is high,
 * one when it is low, stacked between supply and ground. Output is the
 * opposite of input, and no current flows in either resting state.
 */
export class CmosInverter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.inp = false;
    this.flips = 0;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .wrap { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; }
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .wire { stroke: #4a3f78; stroke-width: 2.5; fill: none; stroke-linecap: round; }
        .wire.live { stroke: var(--fire, #f2b35b); }
        .wire.ctl { stroke: var(--accent, #8b5cf6); }
        .t { fill: var(--panel, #110d24); stroke: var(--muted, #8d84ad); stroke-width: 2; }
        .t.on { stroke: var(--fire, #f2b35b); fill: #2a1f3a; }
        .bub { fill: var(--bg, #0d0a1c); stroke: var(--muted, #8d84ad); stroke-width: 2; }
        .label { font-family: var(--sans, sans-serif); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .big { font-family: var(--sans, sans-serif); font-size: 12px; font-weight: 600; fill: var(--heading, #f4f0ff); }
        .lamp { fill: #1a1434; stroke: var(--border, #221c40); stroke-width: 1.5; }
        .lamp.on { fill: var(--fire, #f2b35b); stroke: var(--fire, #f2b35b); filter: drop-shadow(0 0 10px rgba(242, 179, 91, 0.6)); }
        .side { display: flex; flex-direction: column; gap: 10px; min-width: 190px; }
        .stat { border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 10px 12px; font-size: 12.5px; color: var(--muted, #8d84ad); }
        .stat b { display: block; font-family: var(--serif, serif); font-weight: 500; font-size: 20px; color: var(--heading, #f4f0ff); }
        .in { padding: 12px; font: 600 14px var(--sans, sans-serif); border-radius: 4px; cursor: pointer; border: 1px solid var(--border, #221c40); color: var(--muted, #8d84ad); background: transparent; }
        .in.on { background: var(--fire, #f2b35b); color: #2a1c05; border-color: var(--fire, #f2b35b); }
        @media (max-width: 520px) { .wrap { grid-template-columns: 1fr; } }
      </style>
      <div class="wrap">
        <svg class="scene" viewBox="0 0 420 300" role="img" aria-label="Two complementary transistors between supply and ground"></svg>
        <div class="side">
          <button type="button" class="in" aria-pressed="false">Input · low</button>
          <div class="stat">current from supply to ground, right now<b class="cur"></b></div>
          <div class="stat">energy spent so far<b class="en"></b></div>
        </div>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    this.shadowRoot.querySelector('.in').addEventListener('click', () => { this.inp = !this.inp; this.flips++; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const inp = this.inp;
    const pOn = !inp; // upper transistor conducts when the gate is low
    const nOn = inp; // lower transistor conducts when the gate is high
    const out = pOn; // pulled to supply when the upper one conducts
    const x = 210;
    root.querySelector('svg').innerHTML = `
      <text class="label" x="${x}" y="22" text-anchor="middle">supply · high</text>
      <path class="wire ${pOn ? 'live' : ''}" d="M ${x} 28 L ${x} 60"></path>
      <!-- upper (p-type): bubble on the gate -->
      <rect class="t ${pOn ? 'on' : ''}" x="${x - 26}" y="60" width="52" height="56" rx="4"></rect>
      <circle class="bub" cx="${x - 36}" cy="88" r="5"></circle>
      <text class="label" x="${x + 36}" y="84">on when</text>
      <text class="label" x="${x + 36}" y="98">gate is low</text>
      <path class="wire ${pOn ? 'live' : ''}" d="M ${x} 116 L ${x} 150"></path>
      <!-- output node -->
      <circle class="bub" cx="${x}" cy="150" r="3" style="fill:#f4f0ff;stroke:none"></circle>
      <path class="wire ${out ? 'live' : ''}" d="M ${x} 150 L 368 150"></path>
      <circle class="lamp ${out ? 'on' : ''}" cx="380" cy="150" r="12"></circle>
      <text class="label" x="412" y="128" text-anchor="end">output · ${out ? 'high' : 'low'}</text>
      <path class="wire ${nOn ? 'live' : ''}" d="M ${x} 150 L ${x} 184"></path>
      <!-- lower (n-type) -->
      <rect class="t ${nOn ? 'on' : ''}" x="${x - 26}" y="184" width="52" height="56" rx="4"></rect>
      <text class="label" x="${x + 36}" y="208">on when</text>
      <text class="label" x="${x + 36}" y="222">gate is high</text>
      <path class="wire ${nOn ? 'live' : ''}" d="M ${x} 240 L ${x} 272"></path>
      <g transform="translate(${x} 272)"><line class="wire" x1="-14" y1="0" x2="14" y2="0"></line><line class="wire" x1="-9" y1="6" x2="9" y2="6"></line><line class="wire" x1="-4" y1="12" x2="4" y2="12"></line></g>
      <text class="label" x="${x}" y="296" text-anchor="middle">ground · low</text>
      <!-- input to both gates -->
      <path class="wire ctl" d="M 50 150 L 120 150 L 120 88 L ${x - 41} 88 M 120 150 L 120 212 L ${x - 26} 212"></path>
      <text class="big" x="46" y="140" text-anchor="start">input · ${inp ? 'high' : 'low'}</text>
      <!-- lamp return -->
      <path class="wire" d="M 380 162 L 380 272"></path>
      <g transform="translate(380 272)"><line class="wire" x1="-14" y1="0" x2="14" y2="0"></line><line class="wire" x1="-9" y1="6" x2="9" y2="6"></line><line class="wire" x1="-4" y1="12" x2="4" y2="12"></line></g>
    `;
    const btn = root.querySelector('.in');
    btn.textContent = `Input · ${inp ? 'high' : 'low'}`;
    btn.classList.toggle('on', inp);
    btn.setAttribute('aria-pressed', String(inp));
    root.querySelector('.cur').textContent = 'none';
    root.querySelector('.en').textContent = `${this.flips} tiny unit${this.flips === 1 ? '' : 's'}, one per flip`;
    root.querySelector('.readout').innerHTML = inp
      ? `Input high: the <strong>lower</strong> transistor conducts and pulls the output down to ground. The upper one is off, so there is no path from supply to ground. Output low, lamp dark, and nothing is being spent to hold it there.`
      : `Input low: the <strong>upper</strong> transistor conducts and pulls the output up to the supply. The lower one is off, so again no path from supply to ground. Output high, lamp lit, and still nothing is being spent to hold it there.`;
  }
}
