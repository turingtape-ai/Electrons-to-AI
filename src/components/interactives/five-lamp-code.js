import { baseStyles } from './shared.js';
import { MORSE, morseUnits } from './morse-key.js';

/**
 * <five-lamp-code>
 * Five two-state lamps, read as one of thirty-two symbols. A fixed-width
 * code in the spirit of Baudot's, with a teaching assignment of letters.
 * Also compares the length of a word in this code and in Morse.
 */

const SYMBOLS = [
  'space',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  '.', ',', '?', 'FIGS', 'END',
];

function codeFor(ch) {
  const i = ch === ' ' ? 0 : SYMBOLS.indexOf(ch);
  return i < 0 ? null : i.toString(2).padStart(5, '0');
}

export class FiveLampCode extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.bits = [0, 1, 0, 0, 0]; // H
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage {
          background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px;
          padding: 22px 20px 18px; display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center;
        }
        .lamps { display: flex; gap: 12px; justify-content: center; }
        .lamp {
          width: 52px; height: 52px; border-radius: 50%; cursor: pointer; padding: 0;
          background: #1a1434; border: 1px solid var(--border, #221c40);
          transition: background-color 120ms, box-shadow 120ms;
          font: 600 12px var(--sans, sans-serif); color: var(--muted, #8d84ad);
        }
        .lamp:hover { border-color: var(--accent, #8b5cf6); }
        .lamp.on { background: var(--fire, #f2b35b); color: #2a1c05; box-shadow: 0 0 22px 2px rgba(242, 179, 91, 0.3); }
        .read { text-align: right; min-width: 110px; }
        .read .sym { font-family: var(--serif, serif); font-size: 44px; line-height: 1; color: var(--heading, #f4f0ff); }
        .read .sym.ctl { font-family: var(--sans, sans-serif); font-size: 18px; letter-spacing: 0.14em; }
        .read .bits { margin-top: 6px; font-size: 12px; letter-spacing: 0.2em; color: var(--muted, #8d84ad); font-variant-numeric: tabular-nums; }
        .note { margin-top: 10px; font-size: 13px; color: var(--muted, #8d84ad); }
        .compare { margin-top: 18px; }
        .compare input {
          width: 100%; font: 400 15px/1.2 var(--sans, sans-serif); color: var(--heading, #f4f0ff);
          background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 9px 11px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .compare input:focus { outline: 2px solid var(--accent, #8b5cf6); outline-offset: 2px; }
        .bars { margin-top: 12px; display: grid; grid-template-columns: 90px 1fr 60px; gap: 8px 12px; align-items: center; font-size: 13px; }
        .bars .lab { color: var(--muted, #8d84ad); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
        .bars .bar { height: 10px; background: var(--border, #221c40); border-radius: 2px; overflow: hidden; }
        .bars .bar i { display: block; height: 100%; background: var(--accent, #8b5cf6); transition: width 200ms ease; }
        .bars .bar.m i { background: var(--fire, #f2b35b); }
        .bars .n { font-variant-numeric: tabular-nums; color: var(--heading, #f4f0ff); text-align: right; }
        @media (max-width: 520px) {
          .stage { grid-template-columns: 1fr; }
          .read { text-align: center; }
          .lamp { width: 44px; height: 44px; }
        }
      </style>
      <div class="stage">
        <div class="lamps" role="group" aria-label="Five lamps">
          ${this.bits.map((b, i) => `<button type="button" class="lamp ${b ? 'on' : ''}" data-i="${i}" aria-pressed="${b ? 'true' : 'false'}" aria-label="Lamp ${i + 1}">${i + 1}</button>`).join('')}
        </div>
        <div class="read" aria-live="polite">
          <div class="sym"></div>
          <div class="bits"></div>
        </div>
      </div>
      <p class="note">Two choices, five times over: 2 × 2 × 2 × 2 × 2 = 32 patterns. Twenty-six letters, three marks of punctuation, "space", a signal to switch to figures, and "end". No gaps are needed, because every symbol is exactly five lamps long.</p>

      <div class="compare">
        <input type="text" class="word" maxlength="20" value="THE QUIET" aria-label="Word to compare">
        <div class="bars">
          <span class="lab">Five lamps</span><div class="bar f"><i></i></div><span class="n f"></span>
          <span class="lab">Morse</span><div class="bar m"><i></i></div><span class="n m"></span>
        </div>
        <p class="readout compare-note"></p>
      </div>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('.lamp').forEach((b) =>
      b.addEventListener('click', () => {
        const i = +b.dataset.i;
        this.bits[i] = this.bits[i] ? 0 : 1;
        b.classList.toggle('on', !!this.bits[i]);
        b.setAttribute('aria-pressed', this.bits[i] ? 'true' : 'false');
        this.update();
      }),
    );
    root.querySelector('.word').addEventListener('input', () => this.compare());
    this.update();
    this.compare();
  }

  update() {
    const i = parseInt(this.bits.join(''), 2);
    const s = SYMBOLS[i];
    const el = this.shadowRoot.querySelector('.sym');
    const ctl = s.length > 1;
    el.textContent = ctl ? s.toUpperCase() : s;
    el.classList.toggle('ctl', ctl);
    this.shadowRoot.querySelector('.bits').textContent = this.bits.map((b) => (b ? '1' : '0')).join(' ') + `  (${i})`;
  }

  compare() {
    const root = this.shadowRoot;
    const word = root.querySelector('.word').value.toUpperCase().replace(/[^A-Z ]/g, '');
    const letters = [...word];
    const five = letters.length * 5;
    let morse = 0;
    letters.forEach((ch, i) => {
      if (ch === ' ') {
        morse += 7 - 3; // the 3-unit letter gap already counted becomes a 7-unit word gap
        return;
      }
      morse += morseUnits(ch);
      if (i < letters.length - 1 && letters[i + 1] !== ' ') morse += 3;
    });
    const max = Math.max(five, morse, 1);
    root.querySelector('.bar.f i').style.width = `${(100 * five) / max}%`;
    root.querySelector('.bar.m i').style.width = `${(100 * morse) / max}%`;
    root.querySelector('.n.f').textContent = five ? `${five} units` : '';
    root.querySelector('.n.m').textContent = morse ? `${morse} units` : '';
    const note = root.querySelector('.compare-note');
    if (!word.trim()) {
      note.textContent = 'Type a word.';
    } else if (morse < five) {
      note.innerHTML = `Morse wins here: common letters have short codes. Try a word full of rare letters, like <strong>QUIZ</strong>.`;
    } else if (morse > five) {
      note.innerHTML = `Five lamps win here: Morse pays for rare letters and for the silences. Try a word full of E and T, like <strong>TEETH</strong>.`;
    } else {
      note.textContent = 'A tie. Both codes spend the same on this word.';
    }
  }
}
