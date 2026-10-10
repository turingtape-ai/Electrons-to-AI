import { baseStyles, reducedMotion } from './shared.js';

/**
 * <telegraph-line>
 * A battery, a key, a long wire, and a sounder at the far end. Hold the key
 * to send current. A slider lengthens the line; past a point the current
 * arriving is too weak to pull the armature, which sets up the relay.
 */

const PULL_THRESHOLD = 0.4; // fraction of the sent current needed to move the armature
const HALF_LENGTH = 200; // km at which the arriving current has halved... roughly

export class TelegraphLine extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.km = 80;
    this.down = false;
    this.clicks = 0;
  }

  connectedCallback() {
    this.render();
  }

  get strength() {
    return 1 / (1 + this.km / HALF_LENGTH);
  }

  render() {
    const W = 760;
    const H = 250;
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .wire { stroke: #4a3f78; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        .flow { stroke: var(--fire, #f2b35b); stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-dasharray: 6 14; opacity: 0; }
        .flow.on { opacity: 1; animation: run 0.6s linear infinite; }
        @keyframes run { to { stroke-dashoffset: -20; } }
        @media (prefers-reduced-motion: reduce) { .flow.on { animation: none; } }
        .plate { stroke: var(--heading, #f4f0ff); stroke-width: 2.5; }
        .plate.short { stroke: var(--muted, #8d84ad); stroke-width: 5; }
        .ground line { stroke: #4a3f78; stroke-width: 2.5; }
        .lever { stroke: var(--text, #d9d2f0); stroke-width: 5; stroke-linecap: round; transform-origin: 0 0; transition: transform 70ms ease-out; }
        .pivot { fill: var(--heading, #f4f0ff); }
        .contact { fill: var(--muted, #8d84ad); }
        .coil { stroke: var(--accent, #8b5cf6); stroke-width: 2.5; fill: none; }
        .core { fill: #3a3160; }
        .armature { stroke: var(--text, #d9d2f0); stroke-width: 6; stroke-linecap: round; transform-origin: 0 0; transition: transform 70ms ease-out; }
        .stop { fill: #3a3160; }
        .label { font-family: var(--sans, sans-serif); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .km { font-family: var(--serif, serif); font-size: 15px; fill: var(--text, #d9d2f0); font-style: italic; }
        .click { font-family: var(--sans, sans-serif); font-size: 12px; font-weight: 600; letter-spacing: 0.16em; fill: var(--fire, #f2b35b); opacity: 0; }
        .click.on { opacity: 1; }
        .weak { font-family: var(--sans, sans-serif); font-size: 11px; letter-spacing: 0.1em; fill: var(--muted, #8d84ad); opacity: 0; }
        .weak.on { opacity: 1; }

        .controls { align-items: center; }
        .key {
          min-width: 150px; min-height: 48px; font-size: 14px;
          user-select: none; -webkit-user-select: none; touch-action: none;
        }
        .key.down { background: var(--accent, #8b5cf6); border-color: var(--accent, #8b5cf6); }
        .slider { display: flex; align-items: center; gap: 10px; flex: 1 1 220px; color: var(--muted, #8d84ad); }
        .slider input { flex: 1; accent-color: var(--accent, #8b5cf6); }
        .meter { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 12.5px; color: var(--muted, #8d84ad); }
        .meter .bar { flex: 1; height: 8px; background: var(--border, #221c40); border-radius: 2px; position: relative; overflow: hidden; }
        .meter .bar i { display: block; height: 100%; background: var(--fire, #f2b35b); transition: width 120ms ease; }
        .meter .bar s { position: absolute; top: -2px; bottom: -2px; width: 1px; background: var(--heading, #f4f0ff); left: ${PULL_THRESHOLD * 100}%; }
        .meter .n { min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums; color: var(--heading, #f4f0ff); }
      </style>

      <svg class="scene" viewBox="0 0 ${W} ${H}" role="img" aria-label="A telegraph circuit: battery and key on the left, a long wire, and a sounder on the right">
        <!-- sending office -->
        <text class="label" x="40" y="34">Sending office</text>
        <!-- battery -->
        <line class="plate" x1="52" y1="150" x2="52" y2="190"></line>
        <line class="plate short" x1="64" y1="158" x2="64" y2="182"></line>
        <text class="label" x="34" y="212">battery</text>
        <!-- wire from battery top up to key -->
        <path class="wire" d="M 52 150 L 52 112 L 110 112"></path>
        <!-- key: pivot at (110,112), lever to the right, contact at (160,100) -->
        <circle class="pivot" cx="110" cy="112" r="4"></circle>
        <line class="lever key-lever" x1="110" y1="112" x2="170" y2="94"></line>
        <rect class="contact" x="162" y="112" width="12" height="5" rx="1"></rect>
        <text class="label" x="118" y="140">key</text>
        <!-- line wire: from key contact across the top to the coil -->
        <path class="wire line" d="M 168 117 L 168 70 L 560 70 L 560 96"></path>
        <path class="flow" d="M 52 150 L 52 112 L 110 112 M 168 117 L 168 70 L 560 70 L 560 96"></path>
        <text class="km" x="364" y="60" text-anchor="middle"></text>

        <!-- receiving office -->
        <text class="label" x="${W - 40}" y="34" text-anchor="end">Receiving office</text>
        <!-- coil around a core -->
        <rect class="core" x="548" y="96" width="24" height="50" rx="2"></rect>
        <path class="coil" d="M 544 100 q 16 -6 32 0 M 544 110 q 16 -6 32 0 M 544 120 q 16 -6 32 0 M 544 130 q 16 -6 32 0 M 544 140 q 16 -6 32 0"></path>
        <text class="label" x="560" y="212" text-anchor="middle">electromagnet</text>
        <!-- armature: pivot at (620,150) swinging left over the core top... draw as lever pivoted at right -->
        <circle class="pivot" cx="640" cy="160" r="4"></circle>
        <line class="armature" x1="640" y1="160" x2="548" y2="160"></line>
        <rect class="stop" x="544" y="168" width="20" height="4"></rect>
        <text class="label" x="650" y="164">armature</text>
        <text class="click" x="596" y="190" text-anchor="middle">click</text>
        <text class="weak" x="596" y="190" text-anchor="middle">too weak to pull</text>
        <!-- return path from coil bottom to earth -->
        <path class="wire" d="M 560 96 L 560 146"></path>
        <path class="wire" d="M 560 146 L 600 146 L 600 196"></path>
        <g class="ground" transform="translate(600 196)">
          <line x1="-14" y1="0" x2="14" y2="0"></line><line x1="-9" y1="6" x2="9" y2="6"></line><line x1="-4" y1="12" x2="4" y2="12"></line>
        </g>
        <!-- earth return at the sending end -->
        <path class="wire" d="M 64 182 L 64 196 L 100 196"></path>
        <g class="ground" transform="translate(100 196)">
          <line x1="-14" y1="0" x2="14" y2="0"></line><line x1="-9" y1="6" x2="9" y2="6"></line><line x1="-4" y1="12" x2="4" y2="12"></line>
        </g>
        <text class="label" x="${W / 2}" y="238" text-anchor="middle">the earth itself completes the loop</text>
      </svg>

      <div class="controls">
        <button type="button" class="primary key">Hold the key</button>
        <label class="slider">Line length
          <input type="range" min="10" max="600" step="10" value="${this.km}" aria-label="Line length in kilometres">
        </label>
      </div>
      <div class="meter"><span>current arriving</span><div class="bar"><i></i><s title="enough to pull the armature"></s></div><span class="n"></span></div>
      <p class="readout" aria-live="polite"></p>
    `;

    const root = this.shadowRoot;
    const key = root.querySelector('.key');
    const press = () => this.setDown(true);
    const release = () => this.setDown(false);
    key.addEventListener('pointerdown', (e) => { key.setPointerCapture?.(e.pointerId); press(); });
    key.addEventListener('pointerup', release);
    key.addEventListener('pointercancel', release);
    key.addEventListener('blur', release);
    key.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); }
    });
    key.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') release();
    });
    root.querySelector('input[type=range]').addEventListener('input', (e) => {
      this.km = +e.target.value;
      this.update();
    });
    this.update();
  }

  setDown(down) {
    if (this.down === down) return;
    this.down = down;
    if (down && this.strength >= PULL_THRESHOLD) this.clicks++;
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const s = this.strength;
    const pulls = this.down && s >= PULL_THRESHOLD;

    root.querySelector('.key').classList.toggle('down', this.down);
    root.querySelector('.key-lever').style.transform = this.down ? 'rotate(17deg)' : 'rotate(0deg)';
    const flow = root.querySelector('.flow');
    flow.classList.toggle('on', this.down);
    flow.style.opacity = this.down ? String(0.35 + 0.65 * s) : '0';
    root.querySelector('.armature').style.transform = pulls ? 'rotate(7deg)' : 'rotate(0deg)';
    root.querySelector('.click').classList.toggle('on', pulls);
    root.querySelector('.weak').classList.toggle('on', this.down && !pulls);
    root.querySelector('.km').textContent = `${this.km} km of wire`;

    root.querySelector('.meter .bar i').style.width = this.down ? `${s * 100}%` : '0%';
    root.querySelector('.meter .n').textContent = this.down ? `${Math.round(s * 100)}%` : '';

    const out = root.querySelector('.readout');
    const pct = Math.round(s * 100);
    if (s >= PULL_THRESHOLD) {
      out.innerHTML = this.down
        ? `Current flows the whole loop at once. About <strong>${pct}%</strong> of it arrives, enough to pull the armature. <em>Click.</em>`
        : `At ${this.km} km, about <strong>${pct}%</strong> of the current survives the wire. Hold the key and the sounder will answer.${this.clicks ? ` Clicks so far: ${this.clicks}.` : ''}`;
    } else {
      out.innerHTML = this.down
        ? `Current flows, but only about <strong>${pct}%</strong> reaches the coil. The pull is too feeble to lift the armature against its spring. <span class="muted">Nothing arrives at the far end but silence.</span>`
        : `At ${this.km} km only about <strong>${pct}%</strong> of the current would arrive. The sounder will not move. <span class="muted">A bigger battery helps a little. The next chapter has the real answer.</span>`;
    }
  }
}
