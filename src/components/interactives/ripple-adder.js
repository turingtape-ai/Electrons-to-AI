import { baseStyles } from './shared.js';

/**
 * <ripple-adder>
 * Two four-bit numbers, four full-adder columns, and a carry that can be
 * stepped from column to column.
 */
export class RippleAdder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.a = 0b0111; // 7
    this.b = 0b0101; // 5
    this.settled = 4; // number of columns (from the right) that have settled
  }

  connectedCallback() {
    this.render();
  }

  bits(v) {
    return [3, 2, 1, 0].map((i) => (v >> i) & 1);
  }

  compute() {
    const cols = [];
    let carry = 0;
    for (let i = 0; i < 4; i++) {
      const a = (this.a >> i) & 1, b = (this.b >> i) & 1;
      const sum = a ^ b ^ carry;
      const cout = (a & b) | (carry & (a ^ b));
      cols.push({ i, a, b, cin: carry, sum, cout });
      carry = cout;
    }
    return { cols, carryOut: carry };
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 18px 16px 14px; overflow-x: auto; }
        .grid { display: grid; grid-template-columns: 92px repeat(4, 1fr) 70px; gap: 6px 8px; align-items: center; min-width: 440px; }
        @media (max-width: 560px) {
          .stage { padding: 14px 10px 12px; }
          .grid { grid-template-columns: 62px repeat(4, 1fr) 44px; gap: 6px 4px; min-width: 0; }
          .rowlab { font-size: 9px; letter-spacing: 0.06em; padding-right: 2px; }
          .bit { width: 36px; height: 36px; font-size: 13px; }
          .bit.carry { width: 26px; height: 26px; }
          .cell { padding: 6px 3px; font-size: 9px; letter-spacing: 0.04em; }
          .dec { font-size: 15px; }
        }
        .rowlab { font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted, #8d84ad); text-align: right; padding-right: 6px; }
        .worth { text-align: center; font-size: 11px; color: var(--muted, #8d84ad); font-variant-numeric: tabular-nums; }
        .bit {
          width: 44px; height: 44px; margin: 0 auto; border-radius: 50%; padding: 0; display: grid; place-items: center;
          background: #1a1434; border: 1px solid var(--border, #221c40);
          font: 600 14px var(--sans, sans-serif); color: var(--muted, #8d84ad);
          transition: background-color 120ms, box-shadow 120ms;
        }
        button.bit { cursor: pointer; }
        button.bit:hover { border-color: var(--accent, #8b5cf6); }
        .bit.on { background: var(--fire, #f2b35b); color: #2a1c05; }
        .bit.wait { background: transparent; border-style: dashed; color: var(--muted, #8d84ad); }
        .bit.carry { width: 30px; height: 30px; font-size: 12px; }
        .bit.carry.on { background: var(--accent, #8b5cf6); color: #fff; }
        .cell {
          padding: 8px 6px; border-radius: 4px; border: 1px solid var(--border, #221c40); background: var(--panel, #110d24);
          text-align: center; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted, #8d84ad);
        }
        .cell.busy { border-color: var(--accent, #8b5cf6); color: var(--heading, #f4f0ff); }
        .cell.wait { opacity: 0.5; }
        .arrow { text-align: center; color: var(--muted, #8d84ad); font-size: 14px; }
        .dec { text-align: center; font-family: var(--serif, serif); font-size: 18px; color: var(--heading, #f4f0ff); font-variant-numeric: tabular-nums; }
        .eq { margin-top: 14px; text-align: center; font-family: var(--serif, serif); font-size: 19px; color: var(--text, #d9d2f0); }
        .eq strong { color: var(--heading, #f4f0ff); font-weight: 500; }
      </style>
      <div class="stage"><div class="grid"></div><div class="eq"></div></div>
      <div class="controls">
        <button type="button" class="primary step">Step the carry</button>
        <button type="button" class="settle">Settle everything</button>
        <button type="button" class="reset">Unsettle</button>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelector('.step').addEventListener('click', () => { if (this.settled < 4) { this.settled++; this.update(); } });
    root.querySelector('.settle').addEventListener('click', () => { this.settled = 4; this.update(); });
    root.querySelector('.reset').addEventListener('click', () => { this.settled = 0; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const { cols, carryOut } = this.compute();
    const col = (i) => cols[3 - i]; // display order: worth 8,4,2,1 left to right
    const settledAt = (i) => col(i).i < this.settled;
    const bitBtn = (which, i) => {
      const c = col(i);
      const v = which === 'a' ? c.a : c.b;
      return `<button type="button" class="bit ${v ? 'on' : ''}" data-which="${which}" data-i="${c.i}" aria-label="${which.toUpperCase()} bit worth ${1 << c.i}">${v}</button>`;
    };
    const carryIn = (i) => {
      const c = col(i);
      if (c.i === 0) return `<div class="bit carry" title="no carry into the first column">0</div>`;
      const known = c.i - 1 < this.settled;
      return `<div class="bit carry ${known ? (c.cin ? 'on' : '') : 'wait'}">${known ? c.cin : '?'}</div>`;
    };
    const sumBit = (i) => {
      const c = col(i);
      const known = settledAt(i);
      return `<div class="bit ${known ? (c.sum ? 'on' : '') : 'wait'}">${known ? c.sum : '?'}</div>`;
    };
    const cell = (i) => {
      const c = col(i);
      const known = settledAt(i);
      const busy = c.i === this.settled;
      return `<div class="cell ${known ? '' : 'wait'} ${busy ? 'busy' : ''}">full adder<br>${known ? `${c.a}+${c.b}+${c.cin} = ${c.sum}, carry ${c.cout}` : busy ? 'waiting for carry' : 'waiting'}</div>`;
    };
    const finalKnown = this.settled === 4;
    root.querySelector('.grid').innerHTML = `
      <div class="rowlab">worth</div>${[0, 1, 2, 3].map((i) => `<div class="worth">${1 << col(i).i}</div>`).join('')}<div class="worth">value</div>
      <div class="rowlab">A</div>${[0, 1, 2, 3].map((i) => bitBtn('a', i)).join('')}<div class="dec">${this.a}</div>
      <div class="rowlab">B</div>${[0, 1, 2, 3].map((i) => bitBtn('b', i)).join('')}<div class="dec">${this.b}</div>
      <div class="rowlab">carry in</div>${[0, 1, 2, 3].map(carryIn).join('')}<div></div>
      <div class="rowlab"></div>${[0, 1, 2, 3].map(cell).join('')}<div class="arrow">←</div>
      <div class="rowlab">sum</div>${[0, 1, 2, 3].map(sumBit).join('')}<div class="dec">${finalKnown ? (carryOut ? `${this.a + this.b}` : `${this.a + this.b}`) : '?'}</div>
      <div class="rowlab">carry out</div><div class="bit carry ${finalKnown ? (carryOut ? 'on' : '') : 'wait'}" style="grid-column: 2">${finalKnown ? carryOut : '?'}</div>
    `;
    root.querySelectorAll('button.bit').forEach((b) =>
      b.addEventListener('click', () => {
        const m = 1 << +b.dataset.i;
        if (b.dataset.which === 'a') this.a ^= m; else this.b ^= m;
        this.settled = 0;
        this.update();
      }),
    );
    const total = this.a + this.b;
    root.querySelector('.eq').innerHTML = finalKnown
      ? `${this.a} + ${this.b} = <strong>${total}</strong>${carryOut ? ` <span class="muted">(the fifth lamp, the carry out, is worth 16)</span>` : ''}`
      : `${this.a} + ${this.b} = <strong>?</strong>`;
    root.querySelector('.step').disabled = finalKnown;
    const out = root.querySelector('.readout');
    if (this.settled === 0) out.innerHTML = 'Inputs are set but nothing has settled. The first column can start at once: it has no carry to wait for.';
    else if (!finalKnown) out.innerHTML = `Column${this.settled > 1 ? 's' : ''} worth ${Array.from({ length: this.settled }, (_, k) => 1 << k).join(', ')} ${this.settled > 1 ? 'have' : 'has'} settled and passed ${cols[this.settled - 1].cout ? 'a carry' : 'no carry'} along. The next column was waiting for exactly that.`;
    else {
      const chain = cols.filter((c) => c.cout).length;
      out.innerHTML = chain
        ? `Settled. The carry travelled through ${chain} column${chain === 1 ? '' : 's'} on the way. Try 15 + 1 to see it go the whole distance.`
        : `Settled with no carries at all. Every column could have been done at the same moment. Try 7 + 1 to see a ripple.`;
    }
  }
}
