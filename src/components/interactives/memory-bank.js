import { baseStyles } from './shared.js';

/**
 * <memory-bank>
 * Four rows of four latches, a two-bit address, a decoder that lights one
 * row, and write and read paths.
 */
export class MemoryBank extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.rows = [0b1010, 0b0011, 0, 0b0110];
    this.addr = 1;
    this.input = 0b1001;
    this.lastWrite = null;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 18px 16px; }
        .top { display: flex; flex-wrap: wrap; gap: 18px 28px; align-items: flex-start; margin-bottom: 20px; }
        .block h4 { margin: 0 0 8px; font: 500 10.5px var(--sans, sans-serif); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted, #8d84ad); }
        .lamps { display: flex; gap: 6px; }
        .lamp {
          width: 34px; height: 34px; border-radius: 50%; padding: 0; display: grid; place-items: center;
          background: #1a1434; border: 1px solid var(--border, #221c40);
          font: 600 12px var(--sans, sans-serif); color: var(--muted, #8d84ad);
        }
        button.lamp { cursor: pointer; }
        button.lamp:hover { border-color: var(--accent, #8b5cf6); }
        .lamp.on { background: var(--fire, #f2b35b); color: #2a1c05; }
        .lamp.addr.on { background: var(--accent, #8b5cf6); color: #fff; }
        .grid { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 6px 10px; align-items: center; }
        .cells .lamp { width: 30px; height: 30px; font-size: 11px; flex: none; }
        .rowlab { white-space: nowrap; }
        @media (max-width: 600px) {
          .line span { display: none; }
          .line i { width: 18px; }
        }
        .line { display: flex; align-items: center; gap: 8px; font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted, #8d84ad); white-space: nowrap; }
        .line i { display: block; width: 28px; height: 2px; background: var(--border, #221c40); }
        .line.live { color: var(--heading, #f4f0ff); }
        .line.live i { background: var(--fire, #f2b35b); }
        .rowlab { font-size: 12px; color: var(--muted, #8d84ad); font-variant-numeric: tabular-nums; }
        .rowlab b { color: var(--heading, #f4f0ff); font-weight: 500; }
        .cells { display: flex; gap: 6px; padding: 4px; border-radius: 4px; border: 1px solid transparent; }
        .cells.sel { border-color: var(--accent, #8b5cf6); }
        .cells.flash { background: color-mix(in srgb, var(--accent, #8b5cf6) 25%, transparent); }
        .val { font-family: var(--serif, serif); font-size: 15px; color: var(--muted, #8d84ad); min-width: 2em; }
        .out .lamp { border-color: var(--accent, #8b5cf6); }
        .big { font-family: var(--serif, serif); font-size: 20px; color: var(--heading, #f4f0ff); margin-left: 10px; }
      </style>
      <div class="stage">
        <div class="top">
          <div class="block">
            <h4>Address</h4>
            <div class="lamps addr-lamps">
              <button type="button" class="lamp addr" data-i="1" aria-label="Address bit worth 2">2</button>
              <button type="button" class="lamp addr" data-i="0" aria-label="Address bit worth 1">1</button>
            </div>
          </div>
          <div class="block">
            <h4>Bits to write</h4>
            <div class="lamps in-lamps">
              ${[3, 2, 1, 0].map((i) => `<button type="button" class="lamp in" data-i="${i}" aria-label="Input bit worth ${1 << i}">${1 << i}</button>`).join('')}
            </div>
            <div class="controls" style="margin-top:10px"><button type="button" class="primary write">Write to this row</button></div>
          </div>
          <div class="block">
            <h4>Read out · follows the address</h4>
            <div class="lamps out"></div>
          </div>
        </div>
        <div class="block">
          <h4>Decoder → rows of latches</h4>
          <div class="grid rows"></div>
        </div>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('.addr').forEach((b) => b.addEventListener('click', () => { this.addr ^= 1 << +b.dataset.i; this.update(); }));
    root.querySelectorAll('.in').forEach((b) => b.addEventListener('click', () => { this.input ^= 1 << +b.dataset.i; this.update(); }));
    root.querySelector('.write').addEventListener('click', () => {
      this.rows[this.addr] = this.input;
      this.lastWrite = this.addr;
      this.update();
      const el = root.querySelector(`.cells[data-row="${this.addr}"]`);
      el?.classList.add('flash');
      setTimeout(() => el?.classList.remove('flash'), 500);
    });
    this.update();
  }

  lampRow(v, cls = '') {
    return [3, 2, 1, 0].map((i) => `<span class="lamp ${cls} ${(v >> i) & 1 ? 'on' : ''}">${(v >> i) & 1}</span>`).join('');
  }

  update() {
    const root = this.shadowRoot;
    root.querySelectorAll('.addr').forEach((b) => {
      const on = !!(this.addr & (1 << +b.dataset.i));
      b.classList.toggle('on', on);
    });
    root.querySelectorAll('.in').forEach((b) => {
      const on = !!(this.input & (1 << +b.dataset.i));
      b.classList.toggle('on', on);
    });
    const a1 = (this.addr >> 1) & 1, a0 = this.addr & 1;
    const terms = ['not A1 · not A0', 'not A1 · A0', 'A1 · not A0', 'A1 · A0'];
    root.querySelector('.rows').innerHTML = [0, 1, 2, 3]
      .map((r) => {
        const live = r === this.addr;
        return `
          <div class="line ${live ? 'live' : ''}" title="${terms[r]}"><span>${terms[r]}</span><i></i></div>
          <div class="rowlab">row <b>${r}</b> <span class="muted">· ${(r >> 1) & 1}${r & 1}</span></div>
          <div class="cells ${live ? 'sel' : ''}" data-row="${r}">${this.lampRow(this.rows[r])}<span class="val">${this.rows[r]}</span></div>`;
      })
      .join('');
    root.querySelector('.out').innerHTML = this.lampRow(this.rows[this.addr]) + `<span class="big">${this.rows[this.addr]}</span>`;
    const out = root.querySelector('.readout');
    out.innerHTML =
      `Address <strong>${a1}${a0}</strong> is ${this.addr}. The decoder's AND gate for ${terms[this.addr]} is the one live line, so row ${this.addr} is connected to the read-out lamps and the others are not. ` +
      (this.lastWrite === this.addr ? `You wrote <strong>${this.rows[this.addr]}</strong> here; it stayed, because each cell is a latch.` : `Change the address and the read-out changes with it; the rows themselves keep what they hold.`);
  }
}
