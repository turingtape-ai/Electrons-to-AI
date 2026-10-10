import { baseStyles, reducedMotion } from './shared.js';

/**
 * <switch-race devices="relay,tube,transistor">
 * Each device switches as fast as it can for one second. Counters show how
 * many switchings that is, and how long it would take at one per second.
 */

const DEVICES = {
  relay: { name: 'Relay', time: '1 thousandth of a second', perSecond: 1e3 },
  tube: { name: 'Vacuum tube', time: '1 millionth of a second', perSecond: 1e6 },
  transistor: { name: 'Transistor (modern)', time: '10 trillionths of a second', perSecond: 1e11 },
};

function human(n) {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })} billion`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })} million`;
  return n.toLocaleString();
}

function atOnePerSecond(n) {
  const s = n;
  if (s < 3600) return `${Math.round(s / 60)} minutes`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(1)} hours`;
  if (s < 86400 * 365) return `${Math.round(s / 86400)} days`;
  return `${Math.round(s / (86400 * 365.25)).toLocaleString()} years`;
}

export class SwitchRace extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.raf = null;
    this.start = 0;
    this.done = false;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  get devices() {
    return (this.getAttribute('devices') ?? 'relay,tube').split(',').map((s) => s.trim()).filter((k) => DEVICES[k]);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .rows { display: grid; grid-template-columns: auto auto 1fr auto; gap: 10px 16px; align-items: center; background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 16px 18px; }
        .name { color: var(--heading, #f4f0ff); font-weight: 500; }
        .name small { display: block; font-weight: 400; color: var(--muted, #8d84ad); font-size: 11.5px; }
        .lamp { width: 22px; height: 22px; border-radius: 50%; background: #1a1434; border: 1px solid var(--border, #221c40); }
        .lamp.on { background: var(--fire, #f2b35b); }
        .lamp.blur { background: #8a6a3a; }
        .count { font-family: var(--serif, serif); font-size: 22px; color: var(--heading, #f4f0ff); font-variant-numeric: tabular-nums; text-align: right; }
        .count small { display: block; font: 400 11.5px var(--sans, sans-serif); color: var(--muted, #8d84ad); }
        .so { font-size: 12.5px; color: var(--muted, #8d84ad); }
        .so b { color: var(--text, #d9d2f0); font-weight: 500; }
        @media (max-width: 520px) { .rows { grid-template-columns: auto 1fr; } .so { grid-column: 1 / -1; } }
      </style>
      <div class="rows">
        ${this.devices.map((k) => `
          <div class="name">${DEVICES[k].name}<small>one switching takes ${DEVICES[k].time}</small></div>
          <div class="lamp" data-k="${k}"></div>
          <div class="count" data-k="${k}">0<small>switchings</small></div>
          <div class="so" data-k="${k}"></div>`).join('')}
      </div>
      <div class="controls">
        <button type="button" class="primary go">Run for one second</button>
        <span class="readout" style="margin:0"></span>
      </div>
    `;
    this.shadowRoot.querySelector('.go').addEventListener('click', () => this.run());
    this.show(0, false);
  }

  run() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.done = false;
    this.start = performance.now();
    this.shadowRoot.querySelector('.go').disabled = true;
    const tick = (t) => {
      const frac = Math.min(1, (t - this.start) / 1000);
      this.show(frac, true);
      if (frac < 1) this.raf = requestAnimationFrame(tick);
      else { this.done = true; this.show(1, false); this.shadowRoot.querySelector('.go').disabled = false; }
    };
    if (reducedMotion()) { this.done = true; this.show(1, false); this.shadowRoot.querySelector('.go').disabled = false; return; }
    this.raf = requestAnimationFrame(tick);
  }

  show(frac, running) {
    const root = this.shadowRoot;
    for (const k of this.devices) {
      const d = DEVICES[k];
      const n = Math.floor(d.perSecond * frac);
      root.querySelector(`.count[data-k="${k}"]`).innerHTML = `${n.toLocaleString()}<small>switchings</small>`;
      const lamp = root.querySelector(`.lamp[data-k="${k}"]`);
      lamp.className = 'lamp';
      if (running) {
        if (d.perSecond <= 1e3) lamp.classList.toggle('on', Math.floor(frac * 16) % 2 === 0); // visibly blinking
        else lamp.classList.add('blur'); // too fast to see
      }
      root.querySelector(`.so[data-k="${k}"]`).innerHTML = frac >= 1
        ? `That is <b>${human(n)}</b> in one second. Counted aloud at one per second, it would take <b>${atOnePerSecond(n)}</b>.`
        : '';
    }
    const out = root.querySelector('.readout');
    if (!running && !this.done) out.textContent = 'The relay can blink slowly enough to see. The others will be a blur.';
    else if (running) out.textContent = 'Running…';
    else out.innerHTML = this.devices.length > 2
      ? `Same truth table in every row. The relay machine and the transistor machine do the same arithmetic; one of them finishes before you have blinked.`
      : `A thousandfold. Everything in Part II kept working exactly as designed, and ran a thousand times faster, because only the inside of the switch changed.`;
  }
}
