import { baseStyles } from './shared.js';

/**
 * <language-ladder>
 * One task, adding 1 to 10, at four heights: machine numbers, assembly,
 * a FORTRAN-era language, and a modern one.
 */

const RUNGS = [
  {
    name: 'Machine numbers',
    think: 'Every row number. Every opcode. Where each jump lands, by hand. Insert a line and recount.',
    code: `28   45   76   29   62   77
104  80   28   112  0    0
0    10   1`,
    note: 'Fifteen rows of the small machine. Rows 12, 13, 14 hold the total, the counter, and the number one.',
  },
  {
    name: 'Assembly',
    think: 'Names for rows and operations. Still one line per instruction; the loop is a jump you place yourself.',
    code: `loop:   LOAD total
        ADD n
        STORE total
        LOAD n
        SUB one
        STORE n
        JZ done
        JUMP loop
done:   LOAD total
        OUT
        HALT
total:  0
n:      10
one:    1`,
    note: 'The assembler fills in the numbers. The shape of the loop is still yours to build.',
  },
  {
    name: 'A 1957-style language',
    think: 'Variables and a counted loop. The compiler places the jump, invents the counter, and picks the rows.',
    code: `      TOTAL = 0
      DO 10 N = 1, 10
   10 TOTAL = TOTAL + N
      PRINT TOTAL`,
    note: 'Four lines. Addresses have disappeared. You still say how to count.',
  },
  {
    name: 'A modern language',
    think: 'The intent, more or less. The language supplies the range, the summing, and the printing.',
    code: `print(sum(range(1, 11)))`,
    note: 'One line. Underneath it, somebody else’s compiler, somebody else’s loop, the same adder from Chapter 6.',
  },
];

export class LanguageLadder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.i = 1;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .rungs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .rung { padding: 10px 8px; border: 1px solid var(--border, #221c40); border-radius: 4px; cursor: pointer; text-align: center; font: 500 12px var(--sans, sans-serif); color: var(--muted, #8d84ad); background: transparent; }
        .rung.on { color: var(--heading, #f4f0ff); border-color: var(--accent, #8b5cf6); background: color-mix(in srgb, var(--accent, #8b5cf6) 16%, transparent); }
        .rung small { display: block; font-weight: 400; font-size: 10.5px; margin-top: 3px; }
        pre { margin: 12px 0 0; padding: 14px 16px; background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; font: 13.5px/1.55 ui-monospace, 'SF Mono', Menlo, Consolas, monospace; color: var(--heading, #f4f0ff); overflow-x: auto; min-height: 120px; }
        .think { margin-top: 10px; font-size: 13.5px; color: var(--text, #d9d2f0); }
        .think b { color: var(--accent, #8b5cf6); font-weight: 600; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; display: block; margin-bottom: 3px; }
        @media (max-width: 560px) { .rungs { grid-template-columns: 1fr 1fr; } }
      </style>
      <div class="rungs">${RUNGS.map((r, i) => `<button type="button" class="rung" data-i="${i}">${r.name}<small>${r.code.trim().split('\n').length} line${r.code.trim().split('\n').length === 1 ? '' : 's'}</small></button>`).join('')}</div>
      <pre></pre>
      <div class="think"><b>What the writer has to think about</b><span class="t"></span></div>
      <p class="readout"></p>
    `;
    this.shadowRoot.querySelectorAll('.rung').forEach((b) => b.addEventListener('click', () => { this.i = +b.dataset.i; this.update(); }));
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const r = RUNGS[this.i];
    root.querySelectorAll('.rung').forEach((b) => b.classList.toggle('on', +b.dataset.i === this.i));
    root.querySelector('pre').textContent = r.code;
    root.querySelector('.t').textContent = r.think;
    root.querySelector('.readout').innerHTML = `${r.note} <span class="muted">All four produce 55.</span>`;
  }
}
