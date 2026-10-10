import { baseStyles, reducedMotion } from './shared.js';

/**
 * <morse-key>
 * A key to tap: short press is a dot, long press a dash, a pause ends the
 * letter, a longer pause ends the word. Also sends a typed word by blinking
 * a lamp, and shows the alphabet sorted by code length.
 */

export const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....',
  6: '-....', 7: '--...', 8: '---..', 9: '----.', 0: '-----',
};
const DECODE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

const DOT_MAX = 200; // ms: a press shorter than this is a dot
const LETTER_GAP = 550; // ms of silence that ends a letter
const WORD_GAP = 1400; // ms of silence that ends a word
const UNIT = 110; // ms per dot when the lamp sends a typed word

function pretty(code) {
  return code.replace(/\./g, '·').replace(/-/g, '—');
}

/** Length of a letter in dot-units: marks plus the one-unit gaps between them. */
export function morseUnits(letter) {
  const code = MORSE[letter];
  if (!code) return 0;
  let n = 0;
  for (const c of code) n += c === '.' ? 1 : 3;
  return n + (code.length - 1);
}

export class MorseKey extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.buffer = '';
    this.text = '';
    this.pressedAt = 0;
    this.gapTimer = null;
    this.wordTimer = null;
    this.sending = false;
    this.sendTimers = [];
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.stopSending();
    clearTimeout(this.gapTimer);
    clearTimeout(this.wordTimer);
  }

  render() {
    const byLength = Object.entries(MORSE)
      .filter(([k]) => /[A-Z]/.test(k))
      .sort((a, b) => morseUnits(a[0]) - morseUnits(b[0]) || a[0].localeCompare(b[0]));

    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage {
          display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center;
          background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px;
          padding: 18px 20px;
        }
        .lamp-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .lamp {
          width: 64px; height: 64px; border-radius: 50%;
          background: #1a1434; border: 1px solid var(--border, #221c40);
          transition: background-color 60ms linear, box-shadow 60ms linear;
        }
        .lamp.on { background: var(--fire, #f2b35b); box-shadow: 0 0 28px 4px rgba(242, 179, 91, 0.35); }
        .lamp-label { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted, #8d84ad); }
        .key {
          display: block; width: 100%; min-height: 96px; border-radius: 6px;
          background: var(--panel, #110d24); border: 1px solid var(--border, #221c40);
          color: var(--heading, #f4f0ff); font: 500 15px/1.3 var(--sans, sans-serif);
          cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: none;
          transition: transform 50ms ease, background-color 50ms ease;
        }
        .key:hover { border-color: var(--accent, #8b5cf6); }
        .key.down { transform: translateY(2px); background: var(--accent, #8b5cf6); border-color: var(--accent, #8b5cf6); }
        .key small { display: block; margin-top: 6px; color: var(--muted, #8d84ad); font-weight: 400; font-size: 12.5px; }
        .key.down small { color: #efe9ff; }
        .tape {
          margin-top: 14px; display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; align-items: baseline;
          font-size: 13.5px;
        }
        .tape dt { color: var(--muted, #8d84ad); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; }
        .tape dd { margin: 0; min-height: 1.4em; }
        .code { font-family: var(--serif, serif); font-size: 22px; letter-spacing: 0.08em; color: var(--heading, #f4f0ff); }
        .decoded { font-family: var(--serif, serif); font-size: 21px; letter-spacing: 0.12em; color: var(--heading, #f4f0ff); word-break: break-all; }
        .decoded .cursor { display: inline-block; width: 1px; height: 1em; background: var(--accent, #8b5cf6); vertical-align: -0.15em; margin-left: 2px; }
        .send-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 16px; }
        input[type='text'] {
          flex: 1 1 160px; font: 400 15px/1.2 var(--sans, sans-serif); color: var(--heading, #f4f0ff);
          background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 9px 11px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        input[type='text']:focus { outline: 2px solid var(--accent, #8b5cf6); outline-offset: 2px; }
        .sent { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px 14px; min-height: 2.2em; }
        .sent .glyph { display: flex; flex-direction: column; align-items: center; opacity: 0.35; transition: opacity 120ms; }
        .sent .glyph.done { opacity: 1; }
        .sent .glyph.now { opacity: 1; }
        .sent .glyph b { font-family: var(--serif, serif); font-weight: 500; font-size: 17px; color: var(--heading, #f4f0ff); }
        .sent .glyph span { font-family: var(--serif, serif); font-size: 15px; letter-spacing: 0.08em; color: var(--muted, #8d84ad); }
        .sent .glyph.now span { color: var(--fire, #f2b35b); }
        details { margin-top: 18px; }
        summary { cursor: pointer; color: var(--muted, #8d84ad); font-size: 13px; letter-spacing: 0.04em; user-select: none; }
        summary:hover { color: var(--text, #d9d2f0); }
        .alpha { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 4px 10px; font-size: 13px; }
        .alpha div { display: flex; justify-content: space-between; gap: 8px; padding: 3px 6px; border-bottom: 1px solid var(--border, #221c40); }
        .alpha b { font-family: var(--serif, serif); font-weight: 500; color: var(--heading, #f4f0ff); }
        .alpha span { font-family: var(--serif, serif); letter-spacing: 0.06em; color: var(--text, #d9d2f0); }
        .alpha-note { margin-top: 8px; font-size: 12.5px; color: var(--muted, #8d84ad); }
        @media (max-width: 520px) {
          .stage { grid-template-columns: 1fr; }
          .lamp-wrap { flex-direction: row; justify-content: center; }
        }
      </style>

      <div class="stage">
        <button class="key" type="button" aria-label="Telegraph key. Hold briefly for a dot, longer for a dash.">
          Hold to send
          <small>short for a dot · long for a dash · pause to end the letter</small>
        </button>
        <div class="lamp-wrap">
          <div class="lamp" aria-hidden="true"></div>
          <span class="lamp-label">lamp</span>
        </div>
      </div>

      <dl class="tape">
        <dt>this letter</dt><dd class="code" aria-live="polite"></dd>
        <dt>received</dt><dd class="decoded" aria-live="polite"><span class="cursor"></span></dd>
      </dl>
      <div class="controls">
        <button type="button" class="clear">Clear</button>
        <span class="readout" style="margin:0"></span>
      </div>

      <div class="send-row">
        <input type="text" class="word" maxlength="24" placeholder="Type a word for the lamp to send" aria-label="Word to send" value="HELLO">
        <button type="button" class="primary send">Send it</button>
      </div>
      <div class="sent" aria-live="polite"></div>

      <details>
        <summary>Show the alphabet, shortest codes first</summary>
        <div class="alpha">
          ${byLength.map(([k, v]) => `<div><b>${k}</b><span>${pretty(v)}</span></div>`).join('')}
        </div>
        <p class="alpha-note">A dot is one unit, a dash three, with one unit of silence between marks. E and T, the commonest letters in English, are the shortest. The rarest, like Q, J and Z, are among the longest.</p>
      </details>
    `;

    const root = this.shadowRoot;
    const key = root.querySelector('.key');
    const down = (e) => {
      if (e.type === 'keydown' && (e.repeat || !(e.key === ' ' || e.key === 'Enter'))) return;
      if (e.type === 'keydown') e.preventDefault();
      if (this.pressedAt) return;
      this.press();
    };
    const up = (e) => {
      if (e.type === 'keyup' && !(e.key === ' ' || e.key === 'Enter')) return;
      if (!this.pressedAt) return;
      this.release();
    };
    key.addEventListener('pointerdown', (e) => { key.setPointerCapture?.(e.pointerId); down(e); });
    key.addEventListener('pointerup', up);
    key.addEventListener('pointercancel', up);
    key.addEventListener('keydown', down);
    key.addEventListener('keyup', up);
    key.addEventListener('blur', up);

    root.querySelector('.clear').addEventListener('click', () => {
      this.buffer = '';
      this.text = '';
      this.flush();
    });
    root.querySelector('.send').addEventListener('click', () => this.sendWord());
    root.querySelector('.word').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendWord();
    });

    this.flush();
  }

  // ----- tapping ---------------------------------------------------------

  press() {
    this.stopSending();
    clearTimeout(this.gapTimer);
    clearTimeout(this.wordTimer);
    this.pressedAt = performance.now();
    this.shadowRoot.querySelector('.key').classList.add('down');
    this.lamp(true);
  }

  release() {
    const held = performance.now() - this.pressedAt;
    this.pressedAt = 0;
    this.shadowRoot.querySelector('.key').classList.remove('down');
    this.lamp(false);
    this.buffer += held < DOT_MAX ? '.' : '-';
    this.flush();
    this.gapTimer = setTimeout(() => this.endLetter(), LETTER_GAP);
  }

  endLetter() {
    if (!this.buffer) return;
    const letter = DECODE[this.buffer] ?? '?';
    this.text += letter;
    this.lastLetter = { code: this.buffer, letter };
    this.buffer = '';
    this.flush();
    this.wordTimer = setTimeout(() => {
      if (this.text && !this.text.endsWith(' ')) {
        this.text += ' ';
        this.flush();
      }
    }, WORD_GAP - LETTER_GAP);
  }

  lamp(on) {
    this.shadowRoot.querySelector('.lamp').classList.toggle('on', on);
  }

  flush() {
    const root = this.shadowRoot;
    root.querySelector('.code').textContent = pretty(this.buffer);
    const dec = root.querySelector('.decoded');
    dec.innerHTML = `${this.text.replace(/ /g, '  ')}<span class="cursor"></span>`;
    const out = root.querySelector('.readout');
    if (this.buffer) {
      const guess = DECODE[this.buffer];
      out.textContent = guess ? `So far that is ${guess}. Keep going or pause.` : 'No letter matches yet.';
    } else if (this.lastLetter) {
      const { code, letter } = this.lastLetter;
      out.textContent =
        letter === '?'
          ? `${pretty(code)} is not a letter in this code. The wrong pattern is as valid as the right one.`
          : `${pretty(code)} is ${letter}.`;
    } else {
      out.textContent = 'Try E (one dot), then T (one dash), then S (three dots).';
    }
  }

  // ----- sending a typed word --------------------------------------------

  stopSending() {
    for (const t of this.sendTimers) clearTimeout(t);
    this.sendTimers = [];
    this.sending = false;
    this.lamp(false);
    this.shadowRoot.querySelector('.send').disabled = false;
  }

  sendWord() {
    this.stopSending();
    const word = this.shadowRoot
      .querySelector('.word')
      .value.toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .slice(0, 24);
    const sent = this.shadowRoot.querySelector('.sent');
    const letters = [...word];
    sent.innerHTML = letters
      .map((ch, i) =>
        ch === ' '
          ? `<div class="glyph" data-i="${i}"><b>&nbsp;</b><span>&nbsp;</span></div>`
          : `<div class="glyph" data-i="${i}"><b>${ch}</b><span>${pretty(MORSE[ch] ?? '')}</span></div>`,
      )
      .join('');
    if (!word) return;

    const glyphs = [...sent.querySelectorAll('.glyph')];
    if (reducedMotion()) {
      glyphs.forEach((g) => g.classList.add('done'));
      return;
    }

    // Build a schedule: [time, action]
    const plan = [];
    let t = 0;
    letters.forEach((ch, i) => {
      if (ch === ' ') {
        t += UNIT * 4; // word gap is 7; 3 already added after the last letter
        return;
      }
      plan.push([t, () => glyphs.forEach((g, j) => g.classList.toggle('now', j === i))]);
      const code = MORSE[ch] ?? '';
      [...code].forEach((m, k) => {
        plan.push([t, () => this.lamp(true)]);
        t += m === '.' ? UNIT : UNIT * 3;
        plan.push([t, () => this.lamp(false)]);
        if (k < code.length - 1) t += UNIT;
      });
      plan.push([t, () => { glyphs[i].classList.remove('now'); glyphs[i].classList.add('done'); }]);
      t += UNIT * 3;
    });
    plan.push([t, () => this.stopSending()]);

    this.sending = true;
    this.shadowRoot.querySelector('.send').disabled = true;
    for (const [when, fn] of plan) this.sendTimers.push(setTimeout(fn, when));
  }
}
