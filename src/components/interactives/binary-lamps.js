import { baseStyles } from './shared.js';

/**
 * <binary-lamps>
 * Eight lamps worth 128 down to 1. Click to toggle, or count up and down
 * and watch the carries ripple.
 */
export class BinaryLamps extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.value = 13;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 20px 16px 14px; }
        .row { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; max-width: 520px; margin: 0 auto; }
        .cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .lamp {
          width: 100%; aspect-ratio: 1; max-width: 52px; border-radius: 50%; padding: 0; cursor: pointer;
          background: #1a1434; border: 1px solid var(--border, #221c40);
          font: 600 13px var(--sans, sans-serif); color: var(--muted, #8d84ad);
          transition: background-color 120ms, box-shadow 120ms;
        }
        .lamp:hover { border-color: var(--accent, #8b5cf6); }
        .lamp.on { background: var(--fire, #f2b35b); color: #2a1c05; box-shadow: 0 0 18px 2px rgba(242, 179, 91, 0.3); }
        .lamp.changed { box-shadow: 0 0 0 3px var(--accent, #8b5cf6); }
        .worth { font-size: 11px; color: var(--muted, #8d84ad); letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
        .sum { margin-top: 16px; text-align: center; font-family: var(--serif, serif); font-size: 17px; color: var(--text, #d9d2f0); min-height: 1.5em; }
        .sum strong { color: var(--heading, #f4f0ff); font-weight: 500; font-size: 22px; }
        .bits { text-align: center; font-size: 12px; letter-spacing: 0.3em; color: var(--muted, #8d84ad); margin-top: 4px; font-variant-numeric: tabular-nums; }
        label.toggle input.num {
          width: 80px; height: auto; font: 400 14px var(--sans, sans-serif); color: var(--heading, #f4f0ff);
          background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 8px 10px;
        }
      </style>
      <div class="stage">
        <div class="row">
          ${[7, 6, 5, 4, 3, 2, 1, 0].map((i) => `<div class="cell"><button type="button" class="lamp" data-i="${i}" aria-pressed="false" aria-label="Lamp worth ${1 << i}"></button><span class="worth">${1 << i}</span></div>`).join('')}
        </div>
        <div class="sum"></div>
        <div class="bits"></div>
      </div>
      <div class="controls">
        <button type="button" class="dec">− 1</button>
        <button type="button" class="primary inc">+ 1</button>
        <button type="button" class="clear">All dark</button>
        <span class="spacer"></span>
        <label class="toggle" style="cursor:default">Set to <input type="number" class="num" min="0" max="255" value="${this.value}" aria-label="Decimal value"></label>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('.lamp').forEach((b) =>
      b.addEventListener('click', () => this.set(this.value ^ (1 << +b.dataset.i))),
    );
    root.querySelector('.inc').addEventListener('click', () => this.set((this.value + 1) & 255));
    root.querySelector('.dec').addEventListener('click', () => this.set((this.value + 255) & 255));
    root.querySelector('.clear').addEventListener('click', () => this.set(0));
    root.querySelector('.num').addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      if (Number.isFinite(v)) this.set(Math.max(0, Math.min(255, v)), false);
    });
    this.set(this.value);
  }

  set(v, syncInput = true) {
    const root = this.shadowRoot;
    const old = this.value;
    this.value = v;
    const parts = [];
    root.querySelectorAll('.lamp').forEach((b) => {
      const i = +b.dataset.i;
      const on = !!(v & (1 << i));
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? '1' : '0';
      const changed = ((old ^ v) >> i) & 1;
      b.classList.toggle('changed', !!changed);
      if (changed) setTimeout(() => b.classList.remove('changed'), 450);
      if (on) parts.push(1 << i);
    });
    root.querySelector('.sum').innerHTML = parts.length
      ? `${parts.join(' + ')} = <strong>${v}</strong>`
      : `nothing lit = <strong>0</strong>`;
    root.querySelector('.bits').textContent = v.toString(2).padStart(8, '0');
    if (syncInput) root.querySelector('.num').value = v;
    const changedCount = ((old ^ v).toString(2).match(/1/g) || []).length;
    const out = root.querySelector('.readout');
    if (old === v) out.textContent = '';
    else if (v === (old + 1) & 255 && changedCount > 1)
      out.innerHTML = `Adding one changed <strong>${changedCount}</strong> lamps at once: a run of lit lamps went dark and the carry landed on the next one up. That is a ripple.`;
    else if (v === 0 && old === 255) out.innerHTML = `255 plus one is 256, which needs a ninth lamp. With only eight, the count wraps round to 0. Remember this when we get to subtraction.`;
    else out.innerHTML = `Eight lamps, each either lit or dark: 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 = <strong>256</strong> different numbers, 0 to 255.`;
  }
}
