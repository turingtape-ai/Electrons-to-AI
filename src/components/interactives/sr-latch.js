import { baseStyles } from './shared.js';
import { logicStyles, orGate, bubble, lamp, wire, label, contact } from './gate-shapes.js';

/**
 * <sr-latch>
 * One bit of memory. In the relay view, a relay holds itself in through its
 * own contact. In the gate view, two NOR gates lean on each other. Set and
 * Reset are momentary buttons.
 */
export class SrLatch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.q = false;
    this.set = false;
    this.reset = false;
    this.view = 'relay';
    this.history = [];
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        ${logicStyles}
        .push { min-width: 110px; min-height: 46px; user-select: none; -webkit-user-select: none; touch-action: none; }
        .push.down { background: var(--accent, #8b5cf6); border-color: var(--accent, #8b5cf6); }
        .relay-box { fill: var(--panel, #110d24); stroke: var(--border, #221c40); stroke-width: 1.5; }
        .hist { margin-top: 8px; font-size: 12px; color: var(--muted, #8d84ad); letter-spacing: 0.04em; min-height: 1.4em; }
        .hist b { color: var(--heading, #f4f0ff); font-weight: 500; }
      </style>
      <div class="controls" style="margin:0 0 12px">
        <span class="seg" role="radiogroup" aria-label="View">
          <label><input type="radio" name="view" value="relay" checked> As a relay</label>
          <label><input type="radio" name="view" value="gates"> As gates</label>
        </span>
      </div>
      <svg class="scene" viewBox="0 0 560 230" role="img" aria-label="A latch"></svg>
      <div class="controls">
        <button type="button" class="push set">Set · hold</button>
        <button type="button" class="push reset">Reset · hold</button>
        <span class="spacer"></span>
        <span class="muted">Press and release. The lamp remembers.</span>
      </div>
      <p class="readout" aria-live="polite"></p>
      <div class="hist"></div>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('input[name=view]').forEach((r) =>
      r.addEventListener('change', () => { this.view = r.value; this.update(); }),
    );
    for (const which of ['set', 'reset']) {
      const btn = root.querySelector(`.${which}`);
      const down = () => { this[which] = true; this.step(); };
      const up = () => { if (this[which]) { this[which] = false; this.step(true); } };
      btn.addEventListener('pointerdown', (e) => { btn.setPointerCapture?.(e.pointerId); down(); });
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('blur', up);
      btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(); } });
      btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
    }
    this.update();
  }

  step(released = false) {
    const before = this.q;
    if (this.reset) this.q = false;
    else if (this.set) this.q = true;
    // else: holds
    if (released) {
      this.history.push(`released, lamp stays <b>${this.q ? 'on' : 'off'}</b>`);
      if (this.history.length > 4) this.history.shift();
    } else if (before !== this.q) {
      this.history.push(`${this.reset ? 'Reset' : 'Set'} pressed, lamp <b>${this.q ? 'on' : 'off'}</b>`);
      if (this.history.length > 4) this.history.shift();
    }
    this.update();
  }

  relayScene() {
    const q = this.q;
    const coilOn = q;
    return `
      <line class="plate" x1="40" y1="100" x2="40" y2="130"></line>
      <line class="plate short" x1="50" y1="106" x2="50" y2="124"></line>
      ${label(26, 150, 'battery')}
      ${wire('M 40 100 L 40 60 L 120 60', true)}
      <!-- two paths to the coil: the Set button, and the relay's own contact -->
      ${wire('M 120 60 L 120 40 L 190 40', true)}
      ${wire('M 120 60 L 120 110 L 190 110', true)}
      ${contact(190, 40, this.set)}
      ${label(208, 26, 'set button', 'middle')}
      ${contact(190, 110, q)}
      ${label(208, 132, 'its own contact', 'middle')}
      ${wire('M 226 40 L 280 40 L 280 75', this.set)}
      ${wire('M 226 110 L 280 110 L 280 75', q)}
      <!-- reset: normally closed, in series -->
      ${wire('M 280 75 L 310 75', this.set || q)}
      ${contact(310, 75, !this.reset)}
      ${label(328, 60, 'reset button (NC)', 'middle')}
      ${wire('M 346 75 L 400 75 L 400 90', (this.set || q) && !this.reset)}
      <!-- coil -->
      <rect class="relay-box" x="370" y="90" width="60" height="46" rx="3"></rect>
      <rect class="core ${coilOn ? 'mag' : ''}" x="394" y="98" width="12" height="30" rx="1"></rect>
      <path class="coil" d="M 390 103 q 10 -5 20 0 M 390 112 q 10 -5 20 0 M 390 121 q 10 -5 20 0"></path>
      ${label(400, 152, 'coil', 'middle')}
      ${wire('M 400 136 L 400 170 L 50 170 L 50 124', (this.set || q) && !this.reset)}
      <!-- the lamp loop, through a second contact on the same armature -->
      ${wire('M 440 75 L 500 75', q)}
      ${contact(440, 75, q, 36)}
      ${wire('M 476 75 L 500 75 L 500 90', q)}
      ${lamp(500, 102, q)}
      ${label(500, 128, 'lamp', 'middle')}
      ${label(470, 200, 'the holding path: the coil keeps its own contact closed', 'middle')}
      ${wire('M 400 75 L 440 75', q)}
    `;
  }

  gateScene() {
    const q = this.q, nq = !this.q;
    const s = this.set, r = this.reset;
    // Top NOR: inputs R and Q̄ -> output Q.  Bottom NOR: inputs S and Q -> output Q̄.
    return `
      ${label(40, 56, 'R', 'middle', 'big')}${label(40, 180, 'S', 'middle', 'big')}
      ${wire('M 52 52 L 180 52', r)}${wire('M 52 176 L 180 176', s)}
      ${wire('M 160 72 L 180 72', nq)}${wire('M 160 156 L 180 156', q)}
      ${orGate(180, 42, q)}${bubble(241, 62)}${label(206, 66, 'NOR', 'middle')}
      ${orGate(180, 146, nq)}${bubble(241, 166)}${label(206, 170, 'NOR', 'middle')}
      ${wire('M 246 62 L 330 62', q)}${wire('M 246 166 L 330 166', nq)}
      <!-- cross coupling -->
      ${wire('M 290 62 L 290 110 L 150 130 L 150 156 L 160 156', q)}
      ${wire('M 290 166 L 290 118 L 150 98 L 150 72 L 160 72', nq)}
      <circle class="term" cx="290" cy="62" r="3"></circle><circle class="term" cx="290" cy="166" r="3"></circle>
      ${label(345, 66, 'Q', 'start', 'big')}${label(345, 170, 'not Q', 'start', 'big')}
      ${wire('M 330 62 L 420 62 L 420 90', q)}
      ${lamp(420, 102, q)}${label(420, 128, 'lamp', 'middle')}
      ${label(280, 215, 'each gate holds the other: NOR is on only when both its inputs are off', 'middle')}
    `;
  }

  update() {
    const root = this.shadowRoot;
    root.querySelector('svg').innerHTML = this.view === 'relay' ? this.relayScene() : this.gateScene();
    root.querySelector('.set').classList.toggle('down', this.set);
    root.querySelector('.reset').classList.toggle('down', this.reset);
    const out = root.querySelector('.readout');
    if (this.set && this.reset) out.innerHTML = `Both pressed. In this circuit Reset wins, because it breaks the path to the coil. Let go of both and see what stays.`;
    else if (this.set) out.innerHTML = this.view === 'relay'
      ? `The Set button feeds the coil. The armature pulls in, closing <strong>both</strong> of its contacts: one lights the lamp, the other feeds the coil a second way. Now let go.`
      : `S is on, so the bottom NOR goes off, so both inputs of the top NOR are off, so Q goes on. Q feeds back and holds the bottom one off. Now let go.`;
    else if (this.reset) out.innerHTML = this.view === 'relay'
      ? `Reset breaks the only path still feeding the coil. The armature drops, both contacts open, and the holding path is gone for good.`
      : `R is on, so the top NOR goes off, so both inputs of the bottom NOR are off, so not-Q goes on and holds the top one off.`;
    else out.innerHTML = this.q
      ? `Nothing is pressed and the lamp is <strong>on</strong>. The circuit is feeding itself. It will stay this way until Reset.`
      : `Nothing is pressed and the lamp is <strong>off</strong>. The circuit remembers that too. It will stay this way until Set.`;
    root.querySelector('.hist').innerHTML = this.history.join(' · ');
  }
}
