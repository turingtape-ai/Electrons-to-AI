import { baseStyles, reducedMotion } from './shared.js';

/**
 * <beacon-chain>
 * A row of hilltops. Light the first fire and watch the signal pass tower to
 * tower. A toggle reveals that each tower holds exactly one of two states.
 *
 * Attributes:
 *   towers   number of hills (default 6)
 *   delay    milliseconds per hop (default 650)
 */
export class BeaconChain extends HTMLElement {
  static get observedAttributes() {
    return ['towers', 'delay'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.lit = [];
    this.timers = [];
    this.showBits = false;
    this.meaning = 0;
    this.finishedHops = 0;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.clearTimers();
  }

  attributeChangedCallback() {
    if (this.shadowRoot && this.shadowRoot.childElementCount) this.render();
  }

  get count() {
    const n = parseInt(this.getAttribute('towers') ?? '6', 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 2), 10) : 6;
  }

  get hopDelay() {
    const d = parseInt(this.getAttribute('delay') ?? '650', 10);
    return Number.isFinite(d) ? d : 650;
  }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  // ----- geometry -------------------------------------------------------

  layout() {
    const n = this.count;
    const W = 760;
    const H = 230;
    const groundY = 212;
    const margin = 36;
    const step = (W - margin * 2) / (n - 1);
    // Alternate hill heights a little so the row looks like country, not a chart.
    const heights = [118, 136, 108, 142, 124, 134, 112, 140, 120, 130];
    const hills = [];
    for (let i = 0; i < n; i++) {
      const x = margin + step * i;
      const peakY = groundY - heights[i % heights.length] + 20;
      hills.push({ x, peakY, halfW: step * 0.78 });
    }
    return { W, H, groundY, hills };
  }

  hillPath(h, groundY) {
    const { x, peakY, halfW } = h;
    const l = x - halfW;
    const r = x + halfW;
    const c1 = halfW * 0.55;
    return [
      `M ${l} ${groundY}`,
      `C ${x - c1} ${peakY}, ${x - c1 * 0.4} ${peakY}, ${x} ${peakY}`,
      `C ${x + c1 * 0.4} ${peakY}, ${x + c1} ${peakY}, ${r} ${groundY}`,
      'Z',
    ].join(' ');
  }

  // ----- rendering ------------------------------------------------------

  render() {
    const n = this.count;
    if (this.lit.length !== n) this.lit = new Array(n).fill(false);
    const { W, H, groundY, hills } = this.layout();

    const meanings = [
      'The fleet has been sighted.',
      'The pass is clear. Come through.',
      'The harvest is in.',
      'Send help.',
    ];

    const towers = hills
      .map((h, i) => {
        const tx = h.x;
        const ty = h.peakY;
        return `
          <g class="tower" data-i="${i}" transform="translate(${tx} ${ty})" tabindex="${i === 0 ? 0 : -1}" role="${i === 0 ? 'button' : 'img'}" aria-label="${i === 0 ? 'Light the first fire' : `Hill ${i + 1}`}">
            <rect class="post" x="-3" y="-30" width="6" height="30" rx="1"></rect>
            <rect class="basket" x="-10" y="-38" width="20" height="9" rx="2"></rect>
            <g class="flame" transform="translate(0 -38)">
              <path class="flame-outer" d="M0 -26 C 7 -17, 9 -9, 6 -2 C 3 3, -3 3, -6 -2 C -9 -9, -7 -17, 0 -26 Z"></path>
              <path class="flame-inner" d="M0 -16 C 3.5 -11, 4.5 -6, 3 -2 C 1.5 1, -1.5 1, -3 -2 C -4.5 -6, -3.5 -11, 0 -16 Z"></path>
              <circle class="glow" r="26" cy="-8"></circle>
            </g>
            <text class="bit" y="30" text-anchor="middle">${this.lit[i] ? '1' : '0'}</text>
            <text class="bit-word" y="46" text-anchor="middle">${this.lit[i] ? 'lit' : 'dark'}</text>
          </g>`;
      })
      .join('');

    const hillShapes = hills
      .map((h, i) => `<path class="hill ${i % 2 ? 'hill-b' : 'hill-a'}" d="${this.hillPath(h, groundY)}"></path>`)
      .join('');

    // Thin sight-lines between neighbouring towers, lit as the signal passes.
    const sightLines = hills
      .slice(1)
      .map((h, i) => {
        const a = hills[i];
        return `<line class="sight" data-i="${i + 1}" x1="${a.x}" y1="${a.peakY - 52}" x2="${h.x}" y2="${h.peakY - 52}"></line>`;
      })
      .join('');

    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .hill-a { fill: #1a1434; }
        .hill-b { fill: #150f2c; }
        .ground { fill: #110c25; }
        .post { fill: #3a3160; }
        .basket { fill: #4a3f78; }
        .sight { stroke: var(--border, #221c40); stroke-width: 1; stroke-dasharray: 3 5; opacity: 0.9; }
        .sight.on { stroke: var(--fire, #f2b35b); stroke-dasharray: none; opacity: 0.35; }
        .flame { opacity: 0; transform-origin: 0 0; transition: opacity 260ms ease; }
        .tower.lit .flame { opacity: 1; }
        .flame-outer { fill: var(--fire, #f2b35b); }
        .flame-inner { fill: #fff1d6; }
        .glow { fill: var(--fire, #f2b35b); opacity: 0.08; }
        .tower.lit .flame-outer { animation: flicker 1.1s ease-in-out infinite alternate; transform-origin: 0 0; }
        .tower.lit .flame-inner { animation: flicker 0.8s ease-in-out infinite alternate-reverse; transform-origin: 0 0; }
        @keyframes flicker {
          from { transform: scale(1, 1) translateX(0); }
          to { transform: scale(0.92, 1.08) translateX(0.6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .flame, .tower.lit .flame-outer, .tower.lit .flame-inner { animation: none; transition: none; }
        }
        .tower[role='button'] { cursor: pointer; }
        .tower[role='button']:hover .basket { fill: var(--accent, #8b5cf6); }
        .tower:focus-visible { outline: none; }
        .tower:focus-visible .basket { fill: var(--accent, #8b5cf6); }
        .bit, .bit-word { font-family: var(--sans, sans-serif); fill: var(--muted, #8d84ad); opacity: 0; transition: opacity 200ms ease; }
        .bit { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .bit-word { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
        .tower.lit .bit { fill: var(--heading, #f4f0ff); }
        :host([data-bits]) .bit, :host([data-bits]) .bit-word { opacity: 1; }
        .legend { margin-top: 10px; font-size: 13px; color: var(--muted, #8d84ad); display: none; }
        :host([data-bits]) .legend { display: block; }
      </style>
      <svg class="scene" viewBox="0 0 ${W} ${H}" aria-labelledby="bc-title" role="group">
        <title id="bc-title">A row of ${n} hills with a fire basket on each</title>
        ${sightLines}
        ${hillShapes}
        <rect class="ground" x="0" y="${groundY}" width="${W}" height="${H - groundY}"></rect>
        ${towers}
      </svg>
      <p class="legend">Under each hill: the one thing the next watcher can see. Two possible states, nothing in between. Later we will call this a <strong>bit</strong>.</p>
      <div class="controls">
        <button class="primary light" type="button">Light the first fire</button>
        <button class="reset" type="button">Put them out</button>
        <span class="spacer"></span>
        <label class="toggle"><input class="bits" type="checkbox" ${this.showBits ? 'checked' : ''}> Show what each hill carries</label>
      </div>
      <div class="controls" style="margin-top:10px">
        <label class="toggle" style="cursor:default">Agreed at dawn, this fire means:
          <select class="meaning" aria-label="Agreed meaning of the fire">
            ${meanings.map((m, i) => `<option value="${i}" ${i === this.meaning ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </label>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;

    if (this.showBits) this.setAttribute('data-bits', '');
    else this.removeAttribute('data-bits');

    const root = this.shadowRoot;
    root.querySelector('.light').addEventListener('click', () => this.light());
    root.querySelector('.reset').addEventListener('click', () => this.reset());
    root.querySelector('.bits').addEventListener('change', (e) => {
      this.showBits = e.target.checked;
      if (this.showBits) this.setAttribute('data-bits', '');
      else this.removeAttribute('data-bits');
      this.updateReadout();
    });
    root.querySelector('.meaning').addEventListener('change', (e) => {
      this.meaning = parseInt(e.target.value, 10);
      this.updateReadout();
    });
    const first = root.querySelector('.tower[data-i="0"]');
    first.addEventListener('click', () => this.light());
    first.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.light();
      }
    });

    this.applyState();
    this.updateReadout();
  }

  applyState() {
    const root = this.shadowRoot;
    root.querySelectorAll('.tower').forEach((el) => {
      const i = parseInt(el.dataset.i, 10);
      el.classList.toggle('lit', this.lit[i]);
      el.querySelector('.bit').textContent = this.lit[i] ? '1' : '0';
      el.querySelector('.bit-word').textContent = this.lit[i] ? 'lit' : 'dark';
    });
    root.querySelectorAll('.sight').forEach((el) => {
      const i = parseInt(el.dataset.i, 10);
      el.classList.toggle('on', this.lit[i - 1] && this.lit[i]);
    });
    const anyLit = this.lit.some(Boolean);
    root.querySelector('.light').disabled = anyLit;
    root.querySelector('.reset').disabled = !anyLit;
  }

  light() {
    if (this.lit.some(Boolean)) return;
    this.clearTimers();
    const n = this.count;
    const instant = reducedMotion();
    const delay = instant ? 0 : this.hopDelay;
    for (let i = 0; i < n; i++) {
      const t = setTimeout(() => {
        this.lit[i] = true;
        this.finishedHops = i;
        this.applyState();
        this.updateReadout(i);
      }, delay * i);
      this.timers.push(t);
    }
  }

  reset() {
    this.clearTimers();
    this.lit = new Array(this.count).fill(false);
    this.finishedHops = 0;
    this.applyState();
    this.updateReadout();
  }

  updateReadout(justLit) {
    const out = this.shadowRoot.querySelector('.readout');
    const n = this.count;
    const litCount = this.lit.filter(Boolean).length;
    const meaning = this.shadowRoot.querySelector('.meaning').selectedOptions[0]?.textContent ?? '';

    if (litCount === 0) {
      out.innerHTML = `Each watcher has one instruction: <em>if you see the fire to your left, light your own.</em> Nobody has to run anywhere.`;
      return;
    }
    if (litCount < n) {
      out.innerHTML = `Hill ${litCount} is burning. The watcher on hill ${litCount + 1} is looking left&hellip;`;
      return;
    }
    const hops = n - 1;
    out.innerHTML =
      `The news crossed ${hops} valley${hops === 1 ? '' : 's'} without anyone leaving their post. ` +
      `In the capital they read it as: <em>${meaning}</em> ` +
      `<span class="muted">The fire did not say that. The agreement did. Change the agreement above and the same fire says something else.</span>`;
  }
}
