import { baseStyles } from './shared.js';
import { logicStyles, contact, lamp, wire, label } from './gate-shapes.js';

/**
 * <relay-gates>
 * AND, OR and NOT built from relay contacts. Flip the inputs, watch the
 * contacts and the lamp, and fill in the truth table by trying every row.
 */
export class RelayGates extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.mode = 'and';
    this.a = false;
    this.b = false;
    this.seen = { and: new Set(), or: new Set(), not: new Set() };
  }

  connectedCallback() {
    this.render();
  }

  output() {
    if (this.mode === 'and') return this.a && this.b;
    if (this.mode === 'or') return this.a || this.b;
    return !this.a;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        ${logicStyles}
        .wrap { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; }
        .side { display: flex; flex-direction: column; gap: 12px; }
        .relay-box { fill: var(--panel, #110d24); stroke: var(--border, #221c40); stroke-width: 1.5; }
        @media (max-width: 560px) { .wrap { grid-template-columns: 1fr; } }
      </style>
      <div class="controls" style="margin:0 0 12px">
        <span class="seg" role="radiogroup" aria-label="Arrangement">
          <label><input type="radio" name="mode" value="and" checked> AND · in series</label>
          <label><input type="radio" name="mode" value="or"> OR · side by side</label>
          <label><input type="radio" name="mode" value="not"> NOT · the other way round</label>
        </span>
      </div>
      <div class="wrap">
        <svg class="scene" viewBox="0 0 520 260" role="img" aria-label="Relay contacts wired as a gate"></svg>
        <div class="side">
          <div class="inputs">
            <button type="button" class="in a" aria-pressed="false">A · off</button>
            <button type="button" class="in b" aria-pressed="false">B · off</button>
          </div>
          <table class="tt"><thead></thead><tbody></tbody></table>
        </div>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('input[name=mode]').forEach((r) =>
      r.addEventListener('change', () => { this.mode = r.value; this.update(); }),
    );
    root.querySelector('.a').addEventListener('click', () => { this.a = !this.a; this.update(); });
    root.querySelector('.b').addEventListener('click', () => { this.b = !this.b; this.update(); });
    this.update();
  }

  relay(x, y, name, energised, closed, nc = false) {
    // A compact relay: a labelled coil box with the input shown, and a contact above it in the lamp loop.
    return `
      <rect class="relay-box" x="${x - 30}" y="${y}" width="60" height="44" rx="3"></rect>
      <rect class="core ${energised ? 'mag' : ''}" x="${x - 6}" y="${y + 8}" width="12" height="28" rx="1"></rect>
      <path class="coil" d="${[0, 1, 2].map((i) => `M ${x - 10} ${y + 12 + i * 9} q 10 -5 20 0`).join(' ')}"></path>
      ${label(x, y + 60, `relay ${name}`, 'middle')}
      ${label(x, y + 74, energised ? 'coil on' : 'coil off', 'middle')}
      ${contact(x - 18, y - 22, closed)}
      ${label(x + 36, y - 18, nc ? 'NC' : '', 'start')}
    `;
  }

  scene() {
    const out = this.output();
    const bat = `
      <line class="plate" x1="40" y1="110" x2="40" y2="140"></line>
      <line class="plate short" x1="50" y1="116" x2="50" y2="134"></line>
      ${label(28, 160, 'battery')}
    `;
    const lampX = 470;
    if (this.mode === 'and') {
      const ca = this.a, cb = this.b;
      return `${bat}
        ${wire('M 40 110 L 40 70 L 150 70', true)}
        ${this.relay(168, 92, 'A', this.a, ca)}
        ${wire('M 182 70 L 270 70', ca)}
        ${this.relay(288, 92, 'B', this.b, cb)}
        ${wire(`M 302 70 L ${lampX - 12} 70`, out)}
        ${lamp(lampX, 70, out)}
        ${wire(`M ${lampX} 82 L ${lampX} 200 L 50 200 L 50 134`, out)}
        ${label(lampX, 40, 'lamp', 'middle')}
        ${label(260, 230, 'both contacts must be closed', 'middle')}`;
    }
    if (this.mode === 'or') {
      const ca = this.a, cb = this.b;
      return `${bat}
        ${wire('M 40 110 L 40 95 L 120 95', true)}
        ${wire('M 120 95 L 120 40 L 210 40', true)}
        ${wire('M 120 95 L 120 150 L 210 150', true)}
        ${this.relay(228, 62, 'A', this.a, ca)}
        ${wire('M 246 40 L 340 40 L 340 95', ca)}
        ${this.relay(228, 172, 'B', this.b, cb)}
        ${wire('M 246 150 L 340 150 L 340 95', cb)}
        ${wire(`M 340 95 L ${lampX - 12} 95`, out)}
        ${lamp(lampX, 95, out)}
        ${wire(`M ${lampX} 107 L ${lampX} 254 L 50 254 L 50 134`, out)}
        ${label(lampX, 65, 'lamp', 'middle')}
        ${label(410, 210, 'either path will do', 'middle')}`;
    }
    const closed = !this.a;
    return `${bat}
      ${wire('M 40 110 L 40 70 L 210 70', true)}
      ${this.relay(228, 92, 'A', this.a, closed, true)}
      ${wire(`M 242 70 L ${lampX - 12} 70`, out)}
      ${lamp(lampX, 70, out)}
      ${wire(`M ${lampX} 82 L ${lampX} 200 L 50 200 L 50 134`, out)}
      ${label(lampX, 40, 'lamp', 'middle')}
      ${label(260, 230, 'the contact is closed at rest and opens when the coil pulls', 'middle')}`;
  }

  update() {
    const root = this.shadowRoot;
    const out = this.output();
    root.querySelector('svg').innerHTML = this.scene();
    const two = this.mode !== 'not';
    const bBtn = root.querySelector('.b');
    bBtn.style.display = two ? '' : 'none';
    root.querySelector('.a').textContent = `A · ${this.a ? 'on' : 'off'}`;
    root.querySelector('.a').classList.toggle('on', this.a);
    root.querySelector('.a').setAttribute('aria-pressed', String(this.a));
    bBtn.textContent = `B · ${this.b ? 'on' : 'off'}`;
    bBtn.classList.toggle('on', this.b);
    bBtn.setAttribute('aria-pressed', String(this.b));

    const key = two ? `${+this.a}${+this.b}` : `${+this.a}`;
    this.seen[this.mode].add(key);
    const rows = two ? ['00', '01', '10', '11'] : ['0', '1'];
    const fn = { and: (a, b) => a && b, or: (a, b) => a || b, not: (a) => !a }[this.mode];
    root.querySelector('thead').innerHTML = two
      ? '<tr><th>A</th><th>B</th><th>lamp</th><th></th></tr>'
      : '<tr><th>A</th><th>lamp</th><th></th></tr>';
    root.querySelector('tbody').innerHTML = rows
      .map((r) => {
        const a = r[0] === '1', b = r[1] === '1';
        const o = fn(a, b);
        const seen = this.seen[this.mode].has(r);
        return `<tr class="${r === key ? 'now' : ''}">${two ? `<td>${+a}</td><td>${+b}</td>` : `<td>${+a}</td>`}<td class="out ${o ? 'one' : ''}">${seen ? (o ? '1' : '0') : '·'}</td><td class="seen">${seen ? 'tried' : ''}</td></tr>`;
      })
      .join('');

    const left = rows.length - this.seen[this.mode].size;
    const name = this.mode.toUpperCase();
    const desc = {
      and: 'Both relays must pull in. Current has to cross both contacts to reach the lamp.',
      or: 'Either relay will do. Two paths, and current takes whichever is open to it.',
      not: 'At rest the contact touches and the lamp is lit. Energise the coil and it pulls the contact away.',
    }[this.mode];
    root.querySelector('.readout').innerHTML =
      `${desc} Lamp is <strong>${out ? 'on' : 'off'}</strong>. ` +
      (left ? `<span class="muted">${left} row${left === 1 ? '' : 's'} of the ${name} table left to try.</span>` : `<span class="muted">That is the whole ${name} table. Same table, same gate, whatever is inside.</span>`);
  }
}
