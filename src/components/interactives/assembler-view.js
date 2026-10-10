import { baseStyles } from './shared.js';
import { assemble, run } from './machine-core.js';

/**
 * <assembler-view>
 * Write a program for the small machine with names; see the assembler
 * count rows and fill in numbers; run it.
 */

const SAMPLE = `; count down from three
        LOAD count
loop:   OUT
        SUB one
        JZ done
        JUMP loop
done:   HALT
count:  3
one:    1`;

export class AssemblerView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.text = SAMPLE;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
        textarea {
          width: 100%; min-height: 230px; resize: vertical; box-sizing: border-box;
          font: 13.5px/1.5 ui-monospace, 'SF Mono', Menlo, Consolas, monospace; color: var(--heading, #f4f0ff);
          background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 12px 14px;
          tab-size: 8;
        }
        textarea:focus { outline: 2px solid var(--accent, #8b5cf6); outline-offset: 2px; }
        .panel { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 12px 14px; min-height: 230px; }
        .panel h4 { margin: 0 0 8px; font: 500 10.5px var(--sans, sans-serif); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted, #8d84ad); }
        table { border-collapse: collapse; width: 100%; font: 12.5px ui-monospace, Menlo, Consolas, monospace; }
        td { padding: 3px 6px; border-top: 1px solid var(--border, #221c40); color: var(--text, #d9d2f0); white-space: nowrap; }
        td.row { color: var(--muted, #8d84ad); width: 2em; text-align: right; }
        td.lab { color: var(--accent, #8b5cf6); }
        td.num { text-align: right; color: var(--heading, #f4f0ff); font-weight: 600; }
        td.bits { color: var(--muted, #8d84ad); letter-spacing: 0.08em; }
        .err { color: #e8a0a0; font-size: 13px; margin: 6px 0 0; }
        .outp { font-family: var(--serif, serif); font-size: 18px; color: var(--heading, #f4f0ff); letter-spacing: 0.1em; min-height: 1.4em; }
        .outp:empty::before { content: 'not run yet'; color: var(--muted, #8d84ad); font-style: italic; font-size: 14px; letter-spacing: 0; }
        @media (max-width: 600px) { .wrap { grid-template-columns: 1fr; } }
      </style>
      <div class="wrap">
        <div>
          <textarea spellcheck="false" aria-label="Program source">${this.text}</textarea>
          <div class="controls" style="margin-top:10px">
            <button type="button" class="primary runb">Assemble and run</button>
            <button type="button" class="reset">Restore the example</button>
          </div>
        </div>
        <div class="panel">
          <h4>What the machine sees</h4>
          <table><tbody class="list"></tbody></table>
          <div class="err"></div>
          <h4 style="margin-top:14px">Output</h4>
          <div class="outp"></div>
        </div>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    const ta = root.querySelector('textarea');
    ta.addEventListener('input', () => { this.text = ta.value; this.update(false); });
    root.querySelector('.runb').addEventListener('click', () => this.update(true));
    root.querySelector('.reset').addEventListener('click', () => { this.text = SAMPLE; ta.value = SAMPLE; this.update(true); });
    this.update(true);
  }

  update(doRun) {
    const root = this.shadowRoot;
    const { mem, listing, errors } = assemble(this.text);
    root.querySelector('.list').innerHTML = listing
      .map((l) => `<tr><td class="row">${l.row}</td><td class="lab">${l.label ? l.label + ':' : ''}</td><td>${l.src}</td><td class="num">${l.value}</td><td class="bits">${l.value.toString(2).padStart(8, '0')}</td></tr>`)
      .join('');
    root.querySelector('.err').innerHTML = errors.map((e) => `· ${e}`).join('<br>');
    const out = root.querySelector('.readout');
    if (!doRun) { out.textContent = 'Edited. Assemble and run when ready.'; return; }
    if (errors.length) { root.querySelector('.outp').textContent = ''; out.innerHTML = `The assembler stopped: fix the lines above. <span class="muted">An assembler is fussy for a reason; the machine would not notice the mistake, it would just do something else.</span>`; return; }
    const r = run(mem);
    root.querySelector('.outp').textContent = r.output.length > 30 ? r.output.slice(0, 30).join('  ') + '  …' : r.output.join('  ');
    const names = listing.filter((l) => l.label).length;
    out.innerHTML = r.halted
      ? `Ran ${r.steps} instruction${r.steps === 1 ? '' : 's'} and halted. The assembler turned ${names} name${names === 1 ? '' : 's'} into row numbers; insert a line anywhere and it will recount them all.`
      : `Stopped after ${r.steps} instructions without reaching HALT. The program loops forever, which a machine will happily do.`;
  }
}
