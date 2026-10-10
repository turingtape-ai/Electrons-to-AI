import { baseStyles } from './shared.js';

/**
 * <relay-switch>
 * A relay: a coil in one loop, a contact in another. Press the key and the
 * armature closes the second loop, lighting a lamp. Modes: a single relay,
 * or a chain of three fed by a weak source; contacts normally open or
 * normally closed.
 */

export class RelaySwitch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.keyDown = false;
    this.chain = false;
    this.nc = false;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .wire { stroke: #4a3f78; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        .wire.live { stroke: var(--fire, #f2b35b); }
        .wire.live.weak { stroke: #a5783b; }
        .plate { stroke: var(--heading, #f4f0ff); stroke-width: 2.5; }
        .plate.short { stroke: var(--muted, #8d84ad); stroke-width: 5; }
        .plate.small { stroke-width: 1.5; }
        .coil { stroke: var(--accent, #8b5cf6); stroke-width: 2.5; fill: none; }
        .core { fill: #3a3160; }
        .core.mag { fill: var(--accent, #8b5cf6); }
        .armature { stroke: var(--text, #d9d2f0); stroke-width: 6; stroke-linecap: round; transform-origin: 0 0; transition: transform 90ms ease-out; }
        .pivot { fill: var(--heading, #f4f0ff); }
        .contact { fill: var(--muted, #8d84ad); }
        .contact.touch { fill: var(--fire, #f2b35b); }
        .lamp { fill: #1a1434; stroke: var(--border, #221c40); stroke-width: 1.5; transition: fill 90ms; }
        .lamp.on { fill: var(--fire, #f2b35b); stroke: var(--fire, #f2b35b); filter: drop-shadow(0 0 10px rgba(242, 179, 91, 0.6)); }
        .label { font-family: var(--sans, sans-serif); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .pct { font-family: var(--sans, sans-serif); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; fill: var(--text, #d9d2f0); }
        .key-lever { stroke: var(--text, #d9d2f0); stroke-width: 5; stroke-linecap: round; transform-origin: 0 0; transition: transform 70ms ease-out; }
        .key.down { background: var(--accent, #8b5cf6); border-color: var(--accent, #8b5cf6); }
        fieldset { border: 0; padding: 0; margin: 0; display: inline-flex; gap: 12px; align-items: center; }
        legend { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
        .seg { display: inline-flex; border: 1px solid var(--border, #221c40); border-radius: 4px; overflow: hidden; }
        .seg label { padding: 8px 11px; font-size: 12.5px; color: var(--muted, #8d84ad); cursor: pointer; user-select: none; }
        .seg label:has(input:checked) { background: var(--panel, #110d24); color: var(--heading, #f4f0ff); box-shadow: inset 0 0 0 1px var(--accent, #8b5cf6); }
        .seg input { position: absolute; opacity: 0; width: 0; height: 0; }
      </style>
      <svg class="scene" viewBox="0 0 760 250" role="img" aria-label="A relay circuit"></svg>
      <div class="controls">
        <button type="button" class="primary key" aria-pressed="false">Key up · press to close</button>
        <span class="spacer"></span>
        <fieldset><legend>Arrangement</legend>
          <span class="seg">
            <label><input type="radio" name="mode" value="one" checked> One relay</label>
            <label><input type="radio" name="mode" value="chain"> Chain of three</label>
          </span>
        </fieldset>
        <fieldset><legend>Contact type</legend>
          <span class="seg">
            <label><input type="radio" name="nc" value="no" checked> Normally open</label>
            <label><input type="radio" name="nc" value="nc"> Normally closed</label>
          </span>
        </fieldset>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelector('.key').addEventListener('click', () => {
      this.keyDown = !this.keyDown;
      this.update();
    });
    root.querySelectorAll('input[name=mode]').forEach((r) =>
      r.addEventListener('change', () => { this.chain = r.value === 'chain'; this.update(); }),
    );
    root.querySelectorAll('input[name=nc]').forEach((r) =>
      r.addEventListener('change', () => { this.nc = r.value === 'nc'; this.update(); }),
    );
    this.update();
  }

  /** One relay drawn with its coil loop entering from the left at y=120 and its contact loop leaving to the right. */
  relay(x, energised, closed, inLive, inWeak, outLive) {
    const top = 70;
    const cx = x; // coil column
    const live = (on, weak) => `wire${on ? ' live' : ''}${on && weak ? ' weak' : ''}`;
    // armature pivot at (x+70, 150); rests at angle 0 (horizontal to the left over core) and is pulled down 8deg
    // Contact: NO contact sits below the armature tip, NC contact sits above it.
    const tipX = cx - 2;
    const noY = 158;
    const ncY = 142;
    return `
      <g class="relay">
        <!-- coil loop: in from the left, down through the coil, to earth -->
        <path class="${live(inLive, inWeak)}" d="M ${cx - 60} 120 L ${cx - 40} 120 L ${cx - 40} ${top + 6} L ${cx} ${top + 6} L ${cx} ${top + 8}"></path>
        <rect class="core ${energised ? 'mag' : ''}" x="${cx - 12}" y="${top + 8}" width="24" height="46" rx="2"></rect>
        <path class="coil" d="${[0, 1, 2, 3, 4].map((i) => `M ${cx - 16} ${top + 12 + i * 9} q 16 -6 32 0`).join(' ')}"></path>
        <path class="${live(inLive, inWeak)}" d="M ${cx} ${top + 54} L ${cx} ${top + 62} L ${cx + 40} ${top + 62} L ${cx + 40} 200"></path>
        <g transform="translate(${cx + 40} 200)"><line class="wire" x1="-12" y1="0" x2="12" y2="0"></line><line class="wire" x1="-7" y1="6" x2="7" y2="6"></line><line class="wire" x1="-2" y1="12" x2="2" y2="12"></line></g>

        <!-- armature, pivoted to the right of the core, hanging over it -->
        <circle class="pivot" cx="${cx + 70}" cy="150" r="4"></circle>
        <line class="armature" x1="${cx + 70}" y1="150" x2="${tipX}" y2="150" style="transform: rotate(${energised ? 7 : 0}deg)"></line>
        <!-- contacts -->
        <rect class="contact ${closed && !this.nc ? 'touch' : ''}" x="${tipX - 6}" y="${noY + 2}" width="14" height="4" rx="1" ${this.nc ? 'opacity="0.25"' : ''}></rect>
        <rect class="contact ${closed && this.nc ? 'touch' : ''}" x="${tipX - 6}" y="${ncY - 6}" width="14" height="4" rx="1" ${this.nc ? '' : 'opacity="0.25"'}></rect>
        <!-- second loop: from the pivot (armature) out to the right; from the contact down and away -->
        <path class="${live(outLive, false)}" d="M ${this.nc ? tipX : tipX} ${this.nc ? ncY - 6 : noY + 6} L ${tipX} ${this.nc ? 230 : 230}"></path>
        <path class="${live(outLive, false)}" d="M ${tipX} 230 L ${cx + 120} 230 L ${cx + 120} 120 L ${cx + 130} 120"></path>
        <path class="${live(outLive, false)}" d="M ${cx + 70} 150 L ${cx + 100} 150 L ${cx + 100} 176"></path>
        <!-- fresh battery for the second loop -->
        <line class="plate" x1="${cx + 88}" y1="180" x2="${cx + 112}" y2="180"></line>
        <line class="plate short" x1="${cx + 94}" y1="188" x2="${cx + 106}" y2="188"></line>
        <path class="wire" d="M ${cx + 100} 190 L ${cx + 100} 200"></path>
        <g transform="translate(${cx + 100} 200)"><line class="wire" x1="-12" y1="0" x2="12" y2="0"></line><line class="wire" x1="-7" y1="6" x2="7" y2="6"></line><line class="wire" x1="-2" y1="12" x2="2" y2="12"></line></g>
        <text class="label" x="${cx + 100}" y="222" text-anchor="middle">fresh</text>
      </g>`;
  }

  update() {
    const root = this.shadowRoot;
    const n = this.chain ? 3 : 1;
    // Signal through the stages
    const inputs = [];
    const energised = [];
    const closed = [];
    let signal = this.keyDown;
    for (let i = 0; i < n; i++) {
      inputs.push(signal);
      energised.push(signal);
      const c = this.nc ? !signal : signal;
      closed.push(c);
      signal = c;
    }
    const lamp = signal;

    // Layout
    const startX = 40;
    const relayGap = this.chain ? 195 : 0;
    const firstRelayX = this.chain ? 180 : 300;
    const weakSource = this.chain;
    const sourcePct = weakSource ? 30 : 100;
    const sourceLive = this.keyDown;

    let svg = '';
    // Source: battery + key, feeding the first coil at y=120
    svg += `
      <text class="label" x="${startX}" y="32">${weakSource ? 'weak current from a long line' : 'control loop'}</text>
      <line class="plate ${weakSource ? 'small' : ''}" x1="${startX + 12}" y1="150" x2="${startX + 12}" y2="${weakSource ? 176 : 186}"></line>
      <line class="plate short" x1="${startX + 22}" y1="${weakSource ? 156 : 158}" x2="${startX + 22}" y2="${weakSource ? 170 : 182}"></line>
      <path class="wire" d="M ${startX + 22} 182 L ${startX + 22} 200"></path>
      <g transform="translate(${startX + 22} 200)"><line class="wire" x1="-12" y1="0" x2="12" y2="0"></line><line class="wire" x1="-7" y1="6" x2="7" y2="6"></line><line class="wire" x1="-2" y1="12" x2="2" y2="12"></line></g>
      <path class="wire ${sourceLive ? 'live' : ''} ${sourceLive && weakSource ? 'weak' : ''}" d="M ${startX + 12} 150 L ${startX + 12} 120 L ${startX + 36} 120"></path>
      <circle class="pivot" cx="${startX + 36}" cy="120" r="4"></circle>
      <line class="key-lever" x1="${startX + 36}" y1="120" x2="${startX + 76}" y2="106" style="transform: rotate(${this.keyDown ? 19 : 0}deg)"></line>
      <rect class="contact ${this.keyDown ? 'touch' : ''}" x="${startX + 68}" y="120" width="12" height="4" rx="1"></rect>
      <text class="label" x="${startX + 44}" y="146">key</text>
      <path class="wire ${sourceLive ? 'live' : ''} ${sourceLive && weakSource ? 'weak' : ''}" d="M ${startX + 74} 124 L ${startX + 74} 120 L ${firstRelayX - 60} 120"></path>
      ${sourceLive ? `<text class="pct" x="${(startX + 74 + firstRelayX - 60) / 2}" y="112" text-anchor="middle">${sourcePct}%</text>` : ''}
    `;
    for (let i = 0; i < n; i++) {
      const x = firstRelayX + i * relayGap;
      const outLive = closed[i];
      svg += this.relay(x, energised[i], closed[i], inputs[i], i === 0 && weakSource, outLive);
      if (outLive) svg += `<text class="pct" x="${x + 125}" y="112" text-anchor="start">100%</text>`;
      svg += `<text class="label" x="${x}" y="${252 - 8}" text-anchor="middle" opacity="0">.</text>`;
      if (i < n - 1) {
        // join this relay's output to the next relay's coil input
        svg += `<path class="wire ${outLive ? 'live' : ''}" d="M ${x + 130} 120 L ${x + relayGap - 60} 120"></path>`;
      }
    }
    // Lamp at the end of the last relay's output
    const lastX = firstRelayX + (n - 1) * relayGap;
    const lampX = lastX + 150;
    svg += `
      <path class="wire ${lamp ? 'live' : ''}" d="M ${lastX + 130} 120 L ${lampX - 14} 120"></path>
      <circle class="lamp ${lamp ? 'on' : ''}" cx="${lampX}" cy="120" r="14"></circle>
      <path class="wire" d="M ${lampX + 14} 120 L ${lampX + 24} 120 L ${lampX + 24} 200"></path>
      <g transform="translate(${lampX + 24} 200)"><line class="wire" x1="-12" y1="0" x2="12" y2="0"></line><line class="wire" x1="-7" y1="6" x2="7" y2="6"></line><line class="wire" x1="-2" y1="12" x2="2" y2="12"></line></g>
      <text class="label" x="${lampX}" y="94" text-anchor="middle">lamp</text>
    `;
    root.querySelector('svg').innerHTML = svg;

    const key = root.querySelector('.key');
    key.classList.toggle('down', this.keyDown);
    key.setAttribute('aria-pressed', String(this.keyDown));
    key.textContent = this.keyDown ? 'Key down · press to open' : 'Key up · press to close';

    const out = root.querySelector('.readout');
    const typ = this.nc ? 'normally closed' : 'normally open';
    if (!this.chain) {
      if (this.keyDown) {
        out.innerHTML = this.nc
          ? `Current in the coil pulls the armature <strong>away</strong> from its contact. The lamp's loop opens and the lamp goes dark. Input on, output off: this is a <strong>not</strong>.`
          : `Current in the coil magnetises the core and pulls the armature down onto its contact. That closes the <strong>second loop</strong>, which has its own battery, and the lamp lights. No electricity crossed from one loop to the other. Only a movement did.`;
      } else {
        out.innerHTML = this.nc
          ? `With the coil idle the spring holds the armature <strong>against</strong> its contact, so the lamp's loop is already closed and the lamp is lit. Press the key to see what happens.`
          : `Two loops that never touch. The key and the coil are in one; the battery and the lamp are in the other. Press the key.`;
      }
    } else {
      if (this.keyDown) {
        out.innerHTML = this.nc
          ? `Each ${typ} relay inverts: on becomes off, off becomes on, three times. Three inversions is one inversion, so the lamp is <strong>${lamp ? 'lit' : 'dark'}</strong>.`
          : `A weak <strong>30%</strong> current, all that survives a long line, is enough to pull the first armature. From there every stage starts a <strong>fresh 100%</strong> current from a fresh battery. The lamp at the end gets a signal as strong as the one that left.`;
      } else {
        out.innerHTML = `Three relays in a row, each with its own battery. The source on the left is weak, as if it had already come a long way. Press the key.`;
      }
    }
  }
}
