import { baseStyles } from './shared.js';
import { OPS } from './machine-core.js';

/**
 * <instruction-decoder>
 * Eight bits, read four ways: as an instruction for the small machine, as a
 * number, as a letter in the 1963 text code, and as a shade of grey.
 */
export class InstructionDecoder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.value = 0b01001000;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .bits { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; max-width: 440px; margin: 0 auto; }
        .bit {
          aspect-ratio: 1; border-radius: 6px; padding: 0; cursor: pointer;
          background: #1a1434; border: 1px solid var(--border, #221c40);
          font: 600 16px var(--sans, sans-serif); color: var(--muted, #8d84ad);
        }
        .bit:hover { border-color: var(--accent, #8b5cf6); }
        .bit.on { background: var(--fire, #f2b35b); color: #2a1c05; }
        .bit.op { border-bottom: 3px solid var(--accent, #8b5cf6); }
        .fields { display: grid; grid-template-columns: 1fr 1fr; max-width: 440px; margin: 6px auto 0; font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted, #8d84ad); text-align: center; }
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 18px 16px 14px; }
        .books { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
        .book { border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 10px 12px; min-height: 86px; }
        .book h4 { margin: 0 0 6px; font: 500 10.5px var(--sans, sans-serif); letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent, #8b5cf6); }
        .book .v { font-family: var(--serif, serif); font-size: 22px; color: var(--heading, #f4f0ff); line-height: 1.2; }
        .book .v small { display: block; font: 400 12px var(--sans, sans-serif); color: var(--muted, #8d84ad); margin-top: 3px; }
        .swatch { display: inline-block; width: 34px; height: 34px; border-radius: 4px; border: 1px solid var(--border, #221c40); vertical-align: middle; margin-right: 10px; }
        .presets { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 520px) { .books { grid-template-columns: 1fr; } }
      </style>
      <div class="stage">
        <div class="bits">${[7, 6, 5, 4, 3, 2, 1, 0].map((i) => `<button type="button" class="bit ${i >= 4 ? 'op' : ''}" data-i="${i}" aria-pressed="false" aria-label="Bit worth ${1 << i}"></button>`).join('')}</div>
        <div class="fields"><span>upper four · which operation</span><span>lower four · which row</span></div>
        <div class="books">
          <div class="book"><h4>As an instruction</h4><div class="v ins"></div></div>
          <div class="book"><h4>As a number</h4><div class="v num"></div></div>
          <div class="book"><h4>As a letter</h4><div class="v chr"></div></div>
          <div class="book"><h4>As a shade</h4><div class="v shd"></div></div>
        </div>
      </div>
      <div class="controls">
        <span class="muted">Try:</span>
        <span class="presets">
          <button type="button" data-v="72">0100 1000</button>
          <button type="button" data-v="97">0110 0001</button>
          <button type="button" data-v="29">0001 1101</button>
          <button type="button" data-v="255">1111 1111</button>
        </span>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('.bit').forEach((b) => b.addEventListener('click', () => { this.value ^= 1 << +b.dataset.i; this.update(); }));
    root.querySelectorAll('.presets button').forEach((b) => b.addEventListener('click', () => { this.value = +b.dataset.v; this.update(); }));
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const v = this.value;
    root.querySelectorAll('.bit').forEach((b) => {
      const on = !!(v & (1 << +b.dataset.i));
      b.classList.toggle('on', on);
      b.textContent = on ? '1' : '0';
      b.setAttribute('aria-pressed', String(on));
    });
    const code = v >> 4, a = v & 15;
    const op = OPS[code];
    const needsA = op && op !== 'HALT' && op !== 'OUT';
    root.querySelector('.ins').innerHTML = op
      ? `${op}${needsA ? ' ' + a : ''}<small>${code} × 16 + ${a}${op === 'HALT' ? ' · stop' : op === 'OUT' ? ' · write the accumulator' : ` · row ${a}`}</small>`
      : `no such instruction<small>the decoder has no wire for ${code}</small>`;
    root.querySelector('.num').innerHTML = `${v}<small>${[7, 6, 5, 4, 3, 2, 1, 0].filter((i) => v & (1 << i)).map((i) => 1 << i).join(' + ') || 'nothing lit'}</small>`;
    const printable = v >= 32 && v <= 126;
    const names = { 10: 'new line', 13: 'carriage return', 9: 'tab', 7: 'ring the bell', 32: 'space', 127: 'delete', 0: 'nothing' };
    root.querySelector('.chr').innerHTML = printable && v !== 32
      ? `${String.fromCharCode(v)}<small>character ${v} of the 1963 code</small>`
      : `<span class="muted" style="font-size:16px">${names[v] ?? (v > 127 ? 'beyond the 7-bit code' : 'a control mark')}</span><small>${v > 127 ? 'the eighth bit was spare for a long time' : `code ${v}`}</small>`;
    root.querySelector('.shd').innerHTML = `<span class="swatch" style="background: rgb(${v},${v},${v})"></span>${Math.round((v / 255) * 100)}% white<small>one of 256 greys</small>`;
    const out = root.querySelector('.readout');
    out.innerHTML = v === 72
      ? `0100 1000 is STORE 8, and 72, and the capital letter H, and a dark grey. The pattern is the same; the book is different.`
      : v === 97
        ? `0110 0001 is JZ 1, and 97, and a small a. Letters and instructions share the same eight bits with no mark to tell them apart.`
        : v === 255
          ? `All eight lit: 255, pure white, no letter in the 7-bit code, and an operation the decoder has no wire for. The machine would do nothing sensible.`
          : `Same eight bits, four readings. Which one is right depends only on who looks at them and why.`;
  }
}
