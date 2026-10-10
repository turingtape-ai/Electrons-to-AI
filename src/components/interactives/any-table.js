import { baseStyles } from './shared.js';
import { logicStyles, andGate, orGate, bubble, lamp, wire, label } from './gate-shapes.js';

/**
 * <any-table>
 * Tick the rows of a two-input truth table where the output should be on.
 * The component builds the circuit by the recipe: one AND gate per "on"
 * row, inverters where the row wants a zero, an OR to join them.
 */

const ROWS = ['00', '01', '10', '11'];
const NAMES = {
  '0000': 'never on', '1000': 'NOR: neither', '0100': 'B and not A', '0010': 'A and not B', '0001': 'AND: both',
  '0110': 'XOR: exactly one', '1001': 'equal: both or neither', '0111': 'OR: at least one', '1110': 'NAND: not both',
  '1111': 'always on', '0011': 'just A', '0101': 'just B', '1100': 'NOT A', '1010': 'NOT B',
  '1011': 'A or not B', '1101': 'B or not A',
};

export class AnyTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.on = new Set(['01', '10']);
    this.a = false;
    this.b = false;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        ${logicStyles}
        .wrap { display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: start; }
        .side { display: flex; flex-direction: column; gap: 12px; }
        .name { font-family: var(--serif, serif); font-size: 17px; color: var(--heading, #f4f0ff); }
        @media (max-width: 560px) { .wrap { grid-template-columns: 1fr; } }
      </style>
      <div class="wrap">
        <div class="side">
          <table class="tt" aria-label="Truth table to build">
            <thead><tr><th>A</th><th>B</th><th>lamp</th></tr></thead>
            <tbody>${ROWS.map((r) => `<tr data-r="${r}"><td>${r[0]}</td><td>${r[1]}</td><td><input type="checkbox" data-r="${r}" ${this.on.has(r) ? 'checked' : ''} aria-label="Lamp on when A is ${r[0]} and B is ${r[1]}"></td></tr>`).join('')}</tbody>
          </table>
          <div class="inputs">
            <button type="button" class="in a" aria-pressed="false">A · off</button>
            <button type="button" class="in b" aria-pressed="false">B · off</button>
          </div>
          <div class="name"></div>
        </div>
        <svg class="scene" viewBox="0 0 480 300" role="img" aria-label="The circuit built from the table"></svg>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('input[type=checkbox]').forEach((c) =>
      c.addEventListener('change', () => {
        if (c.checked) this.on.add(c.dataset.r);
        else this.on.delete(c.dataset.r);
        this.update();
      }),
    );
    root.querySelector('.a').addEventListener('click', () => { this.a = !this.a; this.update(); });
    root.querySelector('.b').addEventListener('click', () => { this.b = !this.b; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const terms = ROWS.filter((r) => this.on.has(r));
    const key = ROWS.map((r) => (this.on.has(r) ? '1' : '0')).join('');
    const now = `${+this.a}${+this.b}`;
    const out = this.on.has(now);

    // ----- draw -----
    const H = 300;
    const railA = 40, railB = 70;
    const n = terms.length;
    const gateX = 150;
    const spacing = n ? Math.min(64, (H - 40) / n) : 0;
    const startY = n ? (H - spacing * n) / 2 + spacing / 2 - 20 : 0;
    let svg = '';
    svg += label(railA, 18, 'A', 'middle', 'big') + label(railB, 18, 'B', 'middle', 'big');
    svg += wire(`M ${railA} 26 L ${railA} ${H - 16}`, this.a) + wire(`M ${railB} 26 L ${railB} ${H - 16}`, this.b);
    const gateOuts = [];
    terms.forEach((r, i) => {
      const y = startY + i * spacing;
      const wantA = r[0] === '1', wantB = r[1] === '1';
      const inA = wantA ? this.a : !this.a;
      const inB = wantB ? this.b : !this.b;
      const live = inA && inB;
      // taps from rails
      svg += `<circle class="term" cx="${railA}" cy="${y + 10}" r="3"></circle><circle class="term" cx="${railB}" cy="${y + 30}" r="3"></circle>`;
      svg += wire(`M ${railA} ${y + 10} L ${wantA ? gateX : gateX - 14} ${y + 10}`, this.a);
      svg += wire(`M ${railB} ${y + 30} L ${wantB ? gateX : gateX - 14} ${y + 30}`, this.b);
      if (!wantA) svg += wire(`M ${gateX - 4} ${y + 10} L ${gateX} ${y + 10}`, inA) + bubble(gateX - 9, y + 10);
      if (!wantB) svg += wire(`M ${gateX - 4} ${y + 30} L ${gateX} ${y + 30}`, inB) + bubble(gateX - 9, y + 30);
      svg += andGate(gateX, y, live);
      svg += label(gateX + 24, y + 24, 'AND', 'middle');
      svg += label(gateX + 62, y + 8, `row ${r[0]} ${r[1]}`, 'start');
      gateOuts.push({ x: gateX + 56, y: y + 20, live });
    });

    const lampX = 440, lampY = H / 2;
    if (n === 0) {
      svg += label(240, lampY - 30, 'no rows ticked, so no gates', 'middle');
      svg += wire(`M 300 ${lampY} L ${lampX - 12} ${lampY}`, false) + lamp(lampX, lampY, false);
    } else if (n === 1) {
      const g = gateOuts[0];
      svg += wire(`M ${g.x} ${g.y} L 300 ${g.y} L 300 ${lampY} L ${lampX - 12} ${lampY}`, g.live) + lamp(lampX, lampY, out);
    } else {
      const orX = 320;
      const orTop = lampY - 20;
      // OR gate with n inputs spread over its left edge
      gateOuts.forEach((g, i) => {
        const iy = orTop + 8 + (24 * i) / Math.max(n - 1, 1);
        const mid = 260 + i * 10;
        svg += wire(`M ${g.x} ${g.y} L ${mid} ${g.y} L ${mid} ${iy} L ${orX + 6} ${iy}`, g.live);
      });
      svg += orGate(orX, orTop, out) + label(orX + 30, lampY + 4, 'OR', 'middle');
      svg += wire(`M ${orX + 56} ${lampY} L ${lampX - 12} ${lampY}`, out) + lamp(lampX, lampY, out);
    }
    svg += label(lampX, lampY - 24, 'lamp', 'middle');
    root.querySelector('svg').innerHTML = svg;

    // ----- controls and text -----
    root.querySelectorAll('tbody tr').forEach((tr) => tr.classList.toggle('now', tr.dataset.r === now));
    const A = root.querySelector('.a'), B = root.querySelector('.b');
    A.textContent = `A · ${this.a ? 'on' : 'off'}`; A.classList.toggle('on', this.a); A.setAttribute('aria-pressed', String(this.a));
    B.textContent = `B · ${this.b ? 'on' : 'off'}`; B.classList.toggle('on', this.b); B.setAttribute('aria-pressed', String(this.b));
    root.querySelector('.name').textContent = `This table is: ${NAMES[key]}.`;
    const gates = n + terms.reduce((s, r) => s + (r[0] === '0') + (r[1] === '0'), 0) + (n > 1 ? 1 : 0);
    root.querySelector('.readout').innerHTML =
      `${n} AND gate${n === 1 ? '' : 's'}, one per ticked row, ${n > 1 ? 'joined by an OR' : n === 1 ? 'straight to the lamp' : 'and nothing to join'}. ` +
      `${gates} gate${gates === 1 ? '' : 's'} in all. With A ${this.a ? 'on' : 'off'} and B ${this.b ? 'on' : 'off'} the lamp is <strong>${out ? 'on' : 'off'}</strong>, as the table says.`;
  }
}
