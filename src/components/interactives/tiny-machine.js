import { baseStyles, reducedMotion } from './shared.js';

/**
 * <tiny-machine>
 * Sixteen rows of memory, an accumulator, a program counter, and the
 * fetch / decode / execute cycle, one beat at a time.
 *
 * Instruction = opcode × 16 + address. Values live in 0..127.
 */

const OPS = ['HALT', 'LOAD', 'ADD', 'SUB', 'STORE', 'JUMP', 'JZ', 'OUT'];
const OP_HELP = {
  HALT: 'stop',
  LOAD: 'copy row a into the accumulator',
  ADD: 'add row a to the accumulator',
  SUB: 'subtract row a from the accumulator',
  STORE: 'copy the accumulator into row a',
  JUMP: 'set the counter to a',
  JZ: 'if the accumulator is 0, set the counter to a',
  OUT: 'write the accumulator to the output',
};

const PROGRAMS = {
  add: {
    title: 'Add two numbers',
    mem: { 0: 1 * 16 + 10, 1: 2 * 16 + 11, 2: 4 * 16 + 12, 3: 7 * 16, 4: 0, 10: 7, 11: 5, 12: 0 },
    note: 'Rows 10 and 11 hold the numbers. The result goes to row 12 and to the output.',
  },
  count: {
    title: 'Count down',
    mem: { 0: 1 * 16 + 10, 1: 7 * 16, 2: 3 * 16 + 11, 3: 6 * 16 + 5, 4: 5 * 16 + 1, 5: 0, 10: 3, 11: 1 },
    note: 'A loop. Row 3 jumps out only when the accumulator reaches zero.',
  },
  mult: {
    title: 'Multiply by repeated addition',
    mem: { 0: 1 * 16 + 13, 1: 6 * 16 + 8, 2: 3 * 16 + 15, 3: 4 * 16 + 13, 4: 1 * 16 + 14, 5: 2 * 16 + 12, 6: 4 * 16 + 14, 7: 5 * 16, 8: 1 * 16 + 14, 9: 7 * 16, 10: 0, 12: 3, 13: 4, 14: 0, 15: 1 },
    note: 'Row 12 times row 13. Each pass adds row 12 to a running total in row 14 and counts row 13 down.',
  },
};

function decode(v) {
  const op = Math.floor(v / 16) % 8;
  const a = v % 16;
  return { op: OPS[op], a };
}

export class TinyMachine extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.program = 'count';
    this.timer = null;
    this.load('count');
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.stop();
  }

  load(name) {
    this.program = name;
    this.mem = new Array(16).fill(0);
    for (const [k, v] of Object.entries(PROGRAMS[name].mem)) this.mem[+k] = v;
    this.resetState();
  }

  resetState() {
    this.pc = 0;
    this.acc = 0;
    this.ir = null;
    this.phase = 0; // 0 fetch, 1 decode, 2 execute
    this.halted = false;
    this.output = [];
    this.beats = 0;
    this.explain = 'Ready. The counter points at row 0.';
    this.touched = null;
  }

  /** One beat of the cycle. */
  beat() {
    if (this.halted) return;
    this.beats++;
    this.touched = null;
    if (this.phase === 0) {
      this.ir = this.mem[this.pc];
      this.explain = `<strong>Fetch.</strong> Read row ${this.pc}. It holds the number ${this.ir}.`;
      this.phase = 1;
    } else if (this.phase === 1) {
      const { op, a } = decode(this.ir);
      const opn = Math.floor(this.ir / 16) % 8;
      this.explain = `<strong>Decode.</strong> ${this.ir} = ${opn} × 16 + ${a}. Operation ${opn} is <strong>${op}</strong>${op === 'HALT' || op === 'OUT' ? '' : `, applied to row ${a}`}. One wire out of eight comes on.`;
      this.phase = 2;
    } else {
      const { op, a } = decode(this.ir);
      let next = (this.pc + 1) % 16;
      switch (op) {
        case 'HALT':
          this.halted = true;
          this.explain = `<strong>Execute.</strong> HALT. The cycle stops turning.`;
          break;
        case 'LOAD':
          this.acc = this.mem[a];
          this.touched = a;
          this.explain = `<strong>Execute.</strong> Copy row ${a} (${this.mem[a]}) into the accumulator. Counter moves on to ${next}.`;
          break;
        case 'ADD': {
          const before = this.acc;
          this.acc = (this.acc + this.mem[a]) % 128;
          this.touched = a;
          this.explain = `<strong>Execute.</strong> ${before} + ${this.mem[a]} = ${this.acc} in the accumulator. Counter moves on to ${next}.`;
          break;
        }
        case 'SUB': {
          const before = this.acc;
          this.acc = (this.acc - this.mem[a] + 128) % 128;
          this.touched = a;
          this.explain = `<strong>Execute.</strong> ${before} − ${this.mem[a]} = ${this.acc} in the accumulator. Counter moves on to ${next}.`;
          break;
        }
        case 'STORE':
          this.mem[a] = this.acc;
          this.touched = a;
          this.explain = `<strong>Execute.</strong> Copy the accumulator (${this.acc}) into row ${a}. Counter moves on to ${next}.`;
          break;
        case 'JUMP':
          next = a;
          this.explain = `<strong>Execute.</strong> Replace the counter with ${a}. The next fetch reads row ${a}.`;
          break;
        case 'JZ':
          if (this.acc === 0) {
            next = a;
            this.explain = `<strong>Execute.</strong> The accumulator is 0, so the counter becomes ${a}. A result just chose the next step.`;
          } else {
            this.explain = `<strong>Execute.</strong> The accumulator is ${this.acc}, not 0, so nothing happens. Counter moves on to ${next}.`;
          }
          break;
        case 'OUT':
          this.output.push(this.acc);
          this.explain = `<strong>Execute.</strong> Write ${this.acc} to the output. Counter moves on to ${next}.`;
          break;
      }
      if (!this.halted) this.pc = next;
      this.phase = 0;
    }
    this.update();
    if (this.halted) this.stop();
  }

  run() {
    if (this.halted) return;
    this.stop();
    const interval = reducedMotion() ? 0 : 320;
    this.timer = setInterval(() => this.beat(), interval || 60);
    this.update();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.shadowRoot.childElementCount) this.update();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .top { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .panel { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 14px 16px; }
        .panel h4 { margin: 0 0 10px; font: 500 10.5px var(--sans, sans-serif); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted, #8d84ad); }
        .regs { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; align-items: baseline; font-size: 13px; }
        .regs .k { color: var(--muted, #8d84ad); letter-spacing: 0.08em; text-transform: uppercase; font-size: 10.5px; }
        .regs .v { font-family: var(--serif, serif); font-size: 20px; color: var(--heading, #f4f0ff); font-variant-numeric: tabular-nums; }
        .regs .v small { font: 400 12px var(--sans, sans-serif); color: var(--muted, #8d84ad); margin-left: 8px; }
        .beats { display: flex; gap: 6px; margin-top: 12px; }
        .beats span { flex: 1; text-align: center; padding: 6px 4px; border: 1px solid var(--border, #221c40); border-radius: 3px; font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted, #8d84ad); }
        .beats span.now { border-color: var(--accent, #8b5cf6); color: var(--heading, #f4f0ff); background: color-mix(in srgb, var(--accent, #8b5cf6) 20%, transparent); }
        .explain { margin-top: 12px; font-size: 13.5px; line-height: 1.5; min-height: 3.2em; color: var(--text, #d9d2f0); }
        .explain strong { color: var(--accent, #8b5cf6); font-weight: 600; }
        .outp { font-family: var(--serif, serif); font-size: 18px; color: var(--heading, #f4f0ff); min-height: 1.4em; letter-spacing: 0.1em; }
        .outp:empty::before { content: 'nothing yet'; color: var(--muted, #8d84ad); font-style: italic; font-size: 14px; letter-spacing: 0; }
        table { border-collapse: collapse; width: 100%; font-size: 12.5px; font-variant-numeric: tabular-nums; }
        th { text-align: left; font-weight: 500; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted, #8d84ad); padding: 2px 6px 6px; }
        td { padding: 2px 6px; border-top: 1px solid var(--border, #221c40); }
        tr.pc td { background: color-mix(in srgb, var(--accent, #8b5cf6) 22%, transparent); }
        tr.touched td { background: color-mix(in srgb, var(--fire, #f2b35b) 18%, transparent); }
        td.addr { color: var(--muted, #8d84ad); width: 2.4em; }
        td.mn { color: var(--text, #d9d2f0); white-space: nowrap; }
        td.mn .op { color: var(--heading, #f4f0ff); font-weight: 500; }
        td.mn .dat { color: var(--muted, #8d84ad); font-style: italic; font-family: var(--serif, serif); }
        input.cell {
          width: 52px; font: 500 13px var(--sans, sans-serif); color: var(--heading, #f4f0ff); text-align: right;
          background: transparent; border: 1px solid transparent; border-radius: 3px; padding: 3px 6px;
        }
        input.cell { -moz-appearance: textfield; appearance: textfield; }
        input.cell::-webkit-inner-spin-button, input.cell::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input.cell:hover, input.cell:focus { border-color: var(--border, #221c40); background: var(--panel, #110d24); outline: none; }
        input.cell:focus { border-color: var(--accent, #8b5cf6); }
        .pcmark { display: inline-block; width: 8px; color: var(--accent, #8b5cf6); font-weight: 700; }
        details { margin-top: 14px; }
        summary { cursor: pointer; color: var(--muted, #8d84ad); font-size: 13px; letter-spacing: 0.04em; }
        .ops { display: grid; grid-template-columns: auto auto 1fr; gap: 4px 14px; font-size: 12.5px; margin-top: 8px; }
        .ops b { color: var(--heading, #f4f0ff); font-weight: 500; }
        .ops i { color: var(--muted, #8d84ad); font-style: normal; font-variant-numeric: tabular-nums; }
        .ops span { color: var(--text, #d9d2f0); }
        @media (max-width: 600px) { .top { grid-template-columns: 1fr; } }
      </style>
      <div class="controls" style="margin:0 0 12px">
        <label class="toggle" style="cursor:default">Program
          <select class="prog" aria-label="Program">
            ${Object.entries(PROGRAMS).map(([k, p]) => `<option value="${k}" ${k === this.program ? 'selected' : ''}>${p.title}</option>`).join('')}
          </select>
        </label>
        <span class="spacer"></span>
        <button type="button" class="primary step">Step one beat</button>
        <button type="button" class="run">Run</button>
        <button type="button" class="reset">Reset</button>
      </div>
      <div class="top">
        <div class="panel">
          <h4>Machine</h4>
          <div class="regs">
            <span class="k">counter</span><span class="v pc"></span>
            <span class="k">accumulator</span><span class="v acc"></span>
            <span class="k">instruction</span><span class="v ir"></span>
          </div>
          <div class="beats"><span data-p="0">fetch</span><span data-p="1">decode</span><span data-p="2">execute</span></div>
          <div class="explain" aria-live="polite"></div>
          <h4 style="margin-top:14px">Output</h4>
          <div class="outp"></div>
        </div>
        <div class="panel">
          <h4>Memory · 16 rows</h4>
          <table><thead><tr><th></th><th>row</th><th>holds</th><th>read as</th></tr></thead><tbody></tbody></table>
        </div>
      </div>
      <p class="readout prog-note"></p>
      <details>
        <summary>The eight operations (the wiring of the decoder)</summary>
        <div class="ops">
          ${OPS.map((op, i) => `<i>${i} × 16 + a</i><b>${op}${op === 'HALT' || op === 'OUT' ? '' : ' a'}</b><span>${OP_HELP[op]}</span>`).join('')}
        </div>
      </details>
    `;
    const root = this.shadowRoot;
    root.querySelector('.prog').addEventListener('change', (e) => { this.stop(); this.load(e.target.value); this.update(); });
    root.querySelector('.step').addEventListener('click', () => { this.stop(); this.beat(); });
    root.querySelector('.run').addEventListener('click', () => (this.timer ? this.stop() : this.run()));
    root.querySelector('.reset').addEventListener('click', () => { this.stop(); this.resetState(); this.update(); });
    root.querySelector('tbody').addEventListener('change', (e) => {
      const inp = e.target.closest('input.cell');
      if (!inp) return;
      const v = parseInt(inp.value, 10);
      this.mem[+inp.dataset.row] = Number.isFinite(v) ? Math.max(0, Math.min(127, v)) : 0;
      this.update();
    });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    root.querySelector('.pc').textContent = this.pc;
    root.querySelector('.acc').textContent = this.acc;
    const ir = root.querySelector('.ir');
    if (this.ir === null) ir.innerHTML = `<small>none fetched</small>`;
    else {
      const { op, a } = decode(this.ir);
      ir.innerHTML = `${this.ir}<small>${this.phase === 1 ? 'about to decode' : `${op}${op === 'HALT' || op === 'OUT' ? '' : ' ' + a}`}</small>`;
    }
    root.querySelectorAll('.beats span').forEach((s) => s.classList.toggle('now', +s.dataset.p === this.phase && !this.halted));
    root.querySelector('.explain').innerHTML = this.explain + (this.halted ? ` <span class="muted">${this.beats} beats in all. Reset to run again.</span>` : '');
    root.querySelector('.outp').textContent = this.output.join('  ');
    root.querySelector('.run').textContent = this.timer ? 'Pause' : 'Run';
    root.querySelector('.step').disabled = this.halted;
    root.querySelector('.run').disabled = this.halted;

    const focused = root.activeElement?.classList?.contains('cell') ? +root.activeElement.dataset.row : -1;
    if (focused < 0) {
      root.querySelector('tbody').innerHTML = this.mem
        .map((v, r) => {
          const { op, a } = decode(v);
          const isData = v < 16 && op === 'HALT' && v !== 0 ? true : false;
          const mn = v === 0 ? `<span class="op">HALT</span> <span class="dat">or the number 0</span>` : isData ? `<span class="dat">the number ${v}</span>` : `<span class="op">${op}</span>${op === 'HALT' || op === 'OUT' ? '' : ` ${a}`} <span class="dat">or ${v}</span>`;
          return `<tr class="${r === this.pc && !this.halted ? 'pc' : ''} ${r === this.touched ? 'touched' : ''}"><td><span class="pcmark">${r === this.pc && !this.halted ? '▸' : ''}</span></td><td class="addr">${r}</td><td><input class="cell" data-row="${r}" type="number" min="0" max="127" value="${v}" aria-label="Row ${r}"></td><td class="mn">${mn}</td></tr>`;
        })
        .join('');
    }
    root.querySelector('.prog-note').innerHTML = `${PROGRAMS[this.program].note} <span class="muted">Every row is just a number; the machine reads whichever row the counter points at as an instruction.</span>`;
  }
}
