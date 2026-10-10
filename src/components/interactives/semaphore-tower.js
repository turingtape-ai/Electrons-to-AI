import { baseStyles } from './shared.js';

/**
 * <semaphore-tower>
 * A Chappe-style tower: a crossbeam (the regulator) with a short arm at each
 * end. Each arm takes one of seven positions. Click an arm, or a cell in the
 * table, and read off which symbol the shape stands for.
 *
 * The alphabet here is a teaching alphabet invented for this page so that
 * visitors can spell. Chappe's operators sent numbers that pointed into a
 * code book, which the chapter text explains.
 */

// Positions are named from the arm's point of view: "in" means toward the
// mast, "out" means away from it. Angles use the usual convention
// (0 = right, 90 = up) and are mirrored for the two arms.
const POSITIONS = ['up', 'up-in', 'down-in', 'down', 'down-out', 'out', 'up-out'];
const LEFT_ANGLES = [90, 45, 315, 270, 225, 180, 135];
const RIGHT_ANGLES = [90, 135, 225, 270, 315, 0, 45];

const SYMBOLS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  ...'0123456789'.split(''),
  'space', '.', ',', '?', '’', '-',
  'START', 'END', 'ERASE', 'WAIT', 'ACK', 'REPEAT', 'ALARM',
];

const CONTROL = new Set(['START', 'END', 'ERASE', 'WAIT', 'ACK', 'REPEAT', 'ALARM']);

function symbolFor(left, right) {
  return SYMBOLS[left * 7 + right];
}

function tip(px, py, angleDeg, len) {
  const a = (angleDeg * Math.PI) / 180;
  return [px + len * Math.cos(a), py - len * Math.sin(a)];
}

export class SemaphoreTower extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.left = 0;
    this.right = 5;
    this.message = [];
  }

  connectedCallback() {
    this.render();
  }

  // ----- small glyph for the table headers -------------------------------

  glyph(angle) {
    const [x, y] = tip(9, 9, angle, 7);
    return `<svg class="glyph" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="1.6"></circle><line x1="9" y1="9" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"></line></svg>`;
  }

  // ----- rendering -------------------------------------------------------

  render() {
    const W = 520;
    const H = 300;
    const mastX = 260;
    const beamY = 120;
    const halfBeam = 100;
    const armLen = 72;
    const lx = mastX - halfBeam;
    const rx = mastX + halfBeam;

    const tableRows = POSITIONS.map((rowName, li) => {
      const cells = POSITIONS.map((_, ri) => {
        const s = symbolFor(li, ri);
        const cls = CONTROL.has(s) ? 'ctl' : s === 'space' ? 'ctl' : '';
        return `<td><button type="button" class="cell ${cls}" data-l="${li}" data-r="${ri}" aria-label="Left arm ${rowName}, right arm ${POSITIONS[ri]}: ${s}">${s === 'space' ? '␣' : s}</button></td>`;
      }).join('');
      return `<tr><th scope="row">${this.glyph(LEFT_ANGLES[li])}<span>${rowName}</span></th>${cells}</tr>`;
    }).join('');

    const headCells = POSITIONS.map(
      (name, ri) => `<th scope="col">${this.glyph(RIGHT_ANGLES[ri])}<span>${name}</span></th>`,
    ).join('');

    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .sky-line { stroke: var(--border, #221c40); stroke-width: 1; }
        .hut { fill: #150f2c; stroke: #2a2350; }
        .roof { fill: #1a1434; }
        .mast { stroke: #4a3f78; stroke-width: 7; stroke-linecap: round; }
        .beam { stroke: #8d84ad; stroke-width: 8; stroke-linecap: round; }
        .arm { stroke: var(--accent, #8b5cf6); stroke-width: 8; stroke-linecap: round; transition: all 180ms ease; }
        .pivot { fill: var(--heading, #f4f0ff); }
        .ghost { stroke: var(--border, #221c40); stroke-width: 1.5; stroke-dasharray: 2 4; opacity: 0.7; }
        .half { fill: transparent; cursor: pointer; }
        .half:hover + .hint, .half:focus-visible + .hint { opacity: 1; }
        .half:focus-visible { outline: none; stroke: var(--accent, #8b5cf6); stroke-width: 1; }
        .hint { font-family: var(--sans, sans-serif); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; fill: var(--muted, #8d84ad); opacity: 0; transition: opacity 150ms ease; pointer-events: none; }
        .symbol { font-family: var(--serif, serif); font-size: 44px; fill: var(--heading, #f4f0ff); }
        .symbol.ctl { font-family: var(--sans, sans-serif); font-size: 20px; letter-spacing: 0.14em; }
        .symbol-label { font-family: var(--sans, sans-serif); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        @media (prefers-reduced-motion: reduce) { .arm { transition: none; } }

        .strip { margin-top: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .message {
          flex: 1 1 200px; min-height: 40px; padding: 8px 12px;
          border: 1px solid var(--border, #221c40); border-radius: 4px;
          font-family: var(--serif, serif); font-size: 19px; color: var(--heading, #f4f0ff);
          letter-spacing: 0.04em; white-space: pre-wrap; word-break: break-word;
        }
        .message .ctl-token { font-family: var(--sans, sans-serif); font-size: 11px; letter-spacing: 0.12em; color: var(--accent, #8b5cf6); border: 1px solid var(--border, #221c40); border-radius: 3px; padding: 2px 5px; margin: 0 2px; vertical-align: middle; }
        .message:empty::before { content: 'Your message will appear here.'; color: var(--muted, #8d84ad); font-style: italic; font-size: 16px; }

        details { margin-top: 18px; }
        summary { cursor: pointer; color: var(--muted, #8d84ad); font-size: 13px; letter-spacing: 0.04em; user-select: none; }
        summary:hover { color: var(--text, #d9d2f0); }
        .table-wrap { overflow-x: auto; margin-top: 10px; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; min-width: 420px; }
        th { font-weight: 500; color: var(--muted, #8d84ad); text-align: center; padding: 4px 2px; font-size: 9.5px; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        thead th { vertical-align: bottom; }
        thead th .glyph { display: block; margin: 0 auto 2px; }
        th[scope='row'] { text-align: left; padding-right: 6px; width: 84px; }
        th[scope='row'] .glyph { display: inline-block; vertical-align: -3px; margin-right: 4px; }
        .glyph { width: 15px; height: 15px; }
        .glyph circle { fill: var(--muted, #8d84ad); }
        .glyph line { stroke: var(--text, #d9d2f0); stroke-width: 1.8; stroke-linecap: round; }
        thead th:first-child { text-align: left; font-size: 9px; letter-spacing: 0.03em; }
        td { padding: 2px; }
        .cell {
          display: block; width: 100%; padding: 7px 0; border-radius: 3px;
          font: 500 13px/1 var(--serif, serif); color: var(--text, #d9d2f0);
          border: 1px solid var(--border, #221c40); background: var(--panel, #110d24);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cell.ctl { font-family: var(--sans, sans-serif); font-size: 8.5px; letter-spacing: 0.04em; }
        .cell:hover { border-color: var(--accent, #8b5cf6); }
        .cell.current { background: var(--accent, #8b5cf6); border-color: var(--accent, #8b5cf6); color: #fff; }
        .table-note { margin-top: 8px; font-size: 12.5px; color: var(--muted, #8d84ad); }
        @media (max-width: 520px) {
          table { min-width: 0; }
          th span { display: none; }
          th[scope='row'] { width: 26px; padding-right: 2px; }
          th[scope='row'] .glyph { margin-right: 0; }
          thead th:first-child { font-size: 0; }
          .cell { font-size: 12px; padding: 7px 0; }
          .cell.ctl { font-size: 7.5px; letter-spacing: 0; }
        }
      </style>

      <svg class="scene" viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="st-title">
        <title id="st-title">A semaphore tower with two movable arms</title>
        <line class="sky-line" x1="0" y1="${H - 22}" x2="${W}" y2="${H - 22}"></line>
        <rect class="hut" x="${mastX - 44}" y="${H - 82}" width="88" height="60" rx="2"></rect>
        <path class="roof" d="M ${mastX - 52} ${H - 82} L ${mastX} ${H - 114} L ${mastX + 52} ${H - 82} Z"></path>
        <line class="mast" x1="${mastX}" y1="${H - 114}" x2="${mastX}" y2="${beamY}"></line>

        <!-- faint spokes showing the seven positions each arm can take -->
        ${LEFT_ANGLES.map((a) => { const [x, y] = tip(lx, beamY, a, armLen); return `<line class="ghost" x1="${lx}" y1="${beamY}" x2="${x}" y2="${y}"></line>`; }).join('')}
        ${RIGHT_ANGLES.map((a) => { const [x, y] = tip(rx, beamY, a, armLen); return `<line class="ghost" x1="${rx}" y1="${beamY}" x2="${x}" y2="${y}"></line>`; }).join('')}

        <line class="beam" x1="${lx}" y1="${beamY}" x2="${rx}" y2="${beamY}"></line>
        <line class="arm left-arm" x1="${lx}" y1="${beamY}" x2="${lx}" y2="${beamY - armLen}"></line>
        <line class="arm right-arm" x1="${rx}" y1="${beamY}" x2="${rx}" y2="${beamY - armLen}"></line>
        <circle class="pivot" cx="${lx}" cy="${beamY}" r="4"></circle>
        <circle class="pivot" cx="${rx}" cy="${beamY}" r="4"></circle>

        <text class="symbol-label" x="${W - 18}" y="30" text-anchor="end">reads as</text>
        <text class="symbol" x="${W - 18}" y="74" text-anchor="end"></text>

        <!-- click targets -->
        <rect class="half" data-side="left" x="0" y="0" width="${mastX}" height="${H - 22}" tabindex="0" role="button" aria-label="Turn the left arm"></rect>
        <text class="hint" x="16" y="${H - 36}">click: turn left arm</text>
        <rect class="half" data-side="right" x="${mastX}" y="0" width="${W - mastX}" height="${H - 22}" tabindex="0" role="button" aria-label="Turn the right arm"></rect>
        <text class="hint" x="${W - 16}" y="${H - 36}" text-anchor="end">click: turn right arm</text>
      </svg>

      <div class="controls">
        <button type="button" class="turn" data-side="left">Turn left arm</button>
        <button type="button" class="turn" data-side="right">Turn right arm</button>
        <span class="spacer"></span>
        <button type="button" class="primary add">Add this symbol to the message</button>
      </div>
      <div class="strip">
        <div class="message" aria-live="polite" aria-label="Message so far"></div>
        <button type="button" class="clear">Clear</button>
      </div>
      <p class="readout" aria-live="polite"></p>

      <details>
        <summary>Show the whole table (49 shapes)</summary>
        <div class="table-wrap">
          <table>
            <thead><tr><th>left ↓ &nbsp; right →</th>${headCells}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        <p class="table-note">Rows are the left arm, columns the right arm. Click any cell to set the tower. Seven positions each makes 7 × 7 = 49 shapes, enough for an alphabet, ten digits, a little punctuation, and seven service signals.</p>
      </details>
    `;

    const root = this.shadowRoot;
    root.querySelectorAll('.turn').forEach((b) =>
      b.addEventListener('click', () => this.turn(b.dataset.side)),
    );
    root.querySelectorAll('.half').forEach((r) => {
      r.addEventListener('click', () => this.turn(r.dataset.side));
      r.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.turn(r.dataset.side);
        }
      });
    });
    root.querySelectorAll('.cell').forEach((c) =>
      c.addEventListener('click', () => {
        this.left = parseInt(c.dataset.l, 10);
        this.right = parseInt(c.dataset.r, 10);
        this.update();
      }),
    );
    root.querySelector('.add').addEventListener('click', () => this.addSymbol());
    root.querySelector('.clear').addEventListener('click', () => {
      this.message = [];
      this.renderMessage();
    });

    this.geom = { lx, rx, beamY, armLen };
    this.update();
  }

  turn(side) {
    if (side === 'left') this.left = (this.left + 1) % 7;
    else this.right = (this.right + 1) % 7;
    this.update();
  }

  addSymbol() {
    const s = symbolFor(this.left, this.right);
    if (s === 'ERASE') {
      this.message.pop();
    } else {
      this.message.push(s);
    }
    this.renderMessage();
  }

  renderMessage() {
    const el = this.shadowRoot.querySelector('.message');
    el.innerHTML = this.message
      .map((s) => {
        if (s === 'space') return ' ';
        if (CONTROL.has(s)) return `<span class="ctl-token">${s}</span>`;
        return s;
      })
      .join('');
  }

  update() {
    const root = this.shadowRoot;
    const { lx, rx, beamY, armLen } = this.geom;
    const [lxe, lye] = tip(lx, beamY, LEFT_ANGLES[this.left], armLen);
    const [rxe, rye] = tip(rx, beamY, RIGHT_ANGLES[this.right], armLen);
    const la = root.querySelector('.left-arm');
    const ra = root.querySelector('.right-arm');
    la.setAttribute('x2', lxe.toFixed(1));
    la.setAttribute('y2', lye.toFixed(1));
    ra.setAttribute('x2', rxe.toFixed(1));
    ra.setAttribute('y2', rye.toFixed(1));

    const s = symbolFor(this.left, this.right);
    const big = root.querySelector('.symbol');
    const isCtl = CONTROL.has(s) || s === 'space';
    big.textContent = s === 'space' ? 'SPACE' : s;
    big.classList.toggle('ctl', isCtl);

    root.querySelectorAll('.cell').forEach((c) => {
      c.classList.toggle(
        'current',
        parseInt(c.dataset.l, 10) === this.left && parseInt(c.dataset.r, 10) === this.right,
      );
    });

    const readout = root.querySelector('.readout');
    const what = isCtl
      ? `the service signal <strong>${s === 'space' ? 'space' : s}</strong>`
      : `the symbol <strong>${s}</strong>`;
    readout.innerHTML = `Left arm <strong>${POSITIONS[this.left]}</strong>, right arm <strong>${POSITIONS[this.right]}</strong>. In this alphabet that shape is ${what}. <span class="muted">The operator on the next hill copies the shape, not the meaning.</span>`;
  }
}
