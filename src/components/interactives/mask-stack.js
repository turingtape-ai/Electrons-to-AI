import { baseStyles } from './shared.js';

/**
 * <mask-stack>
 * A NOT gate (complementary pair) seen from above, built up one printed
 * layer at a time: wells, active silicon, gate strip, contacts, metal.
 */

const LAYERS = [
  {
    name: 'Well',
    what: 'A region of the wafer soaked with a dopant to make it the other kind of silicon, so the upper transistor can be the complementary type.',
    draw: () => `<rect class="well" x="40" y="30" width="240" height="110" rx="4"></rect><text class="tag" x="46" y="136">well · upper</text>`,
  },
  {
    name: 'Active silicon',
    what: 'The strips where transistors will live: a source and a drain on each side of where the gate will cross. Everything outside these strips is covered in thick glass and does nothing.',
    draw: () => `<rect class="active" x="80" y="60" width="160" height="50" rx="3"></rect><rect class="active" x="80" y="190" width="160" height="50" rx="3"></rect>`,
  },
  {
    name: 'Gate strip',
    what: 'One thin strip of conducting material laid across both active regions, over a skin of glass. Where it crosses the silicon it becomes a gate; both transistors share it, so one input drives both.',
    draw: () => `<rect class="poly" x="150" y="20" width="20" height="240" rx="2"></rect><text class="tag" x="176" y="186">one strip, two gates</text>`,
  },
  {
    name: 'Contacts',
    what: 'Small holes etched through the glass down to the silicon and to the gate strip, so that the metal of the next layer can touch them.',
    draw: () => [[100, 85], [220, 85], [100, 215], [220, 215], [160, 262]].map(([x, y]) => `<rect class="ct" x="${x - 6}" y="${y - 6}" width="12" height="12"></rect>`).join(''),
  },
  {
    name: 'Metal',
    what: 'Lines of metal on top of the glass: a supply rail along the top, a ground rail along the bottom, a line joining the two drains (the output), and a line to the gate strip (the input). The wiring is printed like everything else.',
    draw: () => `
      <rect class="metal" x="30" y="8" width="260" height="14" rx="2"></rect><text class="tag light" x="36" y="19">supply</text>
      <rect class="metal" x="30" y="278" width="260" height="14" rx="2"></rect><text class="tag light" x="36" y="289">ground</text>
      <rect class="metal" x="94" y="8" width="12" height="84"></rect>
      <rect class="metal" x="94" y="208" width="12" height="84"></rect>
      <rect class="metal" x="214" y="79" width="12" height="142"></rect>
      <rect class="metal" x="214" y="140" width="80" height="12"></rect><text class="tag" x="250" y="134">output</text>
      <rect class="metal" x="120" y="256" width="46" height="12"></rect><rect class="metal" x="120" y="150" width="12" height="118"></rect>
      <rect class="metal" x="0" y="150" width="132" height="12"></rect><text class="tag" x="4" y="146">input</text>`,
  },
];

export class MaskStack extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.n = 2;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .wrap { display: grid; grid-template-columns: 320px 1fr; gap: 18px; align-items: start; }
        .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        .wafer { fill: #171230; }
        .well { fill: #231b47; stroke: #3a3160; stroke-dasharray: 4 4; }
        .active { fill: #2f6b5a; }
        .poly { fill: #c2415e; opacity: 0.92; }
        .ct { fill: #f4f0ff; stroke: #0d0a1c; }
        .metal { fill: #8d84ad; opacity: 0.92; }
        .tag { font-family: var(--sans, sans-serif); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .tag.light { fill: #0d0a1c; }
        ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
        li { display: flex; align-items: baseline; gap: 10px; padding: 7px 10px; border: 1px solid var(--border, #221c40); border-radius: 4px; cursor: pointer; color: var(--muted, #8d84ad); }
        li.on { color: var(--heading, #f4f0ff); border-color: var(--accent, #8b5cf6); }
        li.now { background: color-mix(in srgb, var(--accent, #8b5cf6) 18%, transparent); }
        li i { display: inline-block; width: 12px; height: 12px; border-radius: 2px; flex: none; }
        li .num { font-size: 11px; min-width: 1.2em; }
        .what { margin-top: 10px; font-size: 13.5px; line-height: 1.5; color: var(--text, #d9d2f0); min-height: 4.5em; }
        @media (max-width: 600px) { .wrap { grid-template-columns: 1fr; } .scene { max-width: 320px; } }
      </style>
      <div class="wrap">
        <svg class="scene" viewBox="0 0 320 300" role="img" aria-label="A NOT gate seen from above, layer by layer">
          <rect class="wafer" x="0" y="0" width="320" height="300"></rect>
          <g class="layers"></g>
        </svg>
        <div>
          <ol>
            ${LAYERS.map((l, i) => `<li data-i="${i}"><span class="num">${i + 1}</span><i style="background:${['#231b47', '#2f6b5a', '#c2415e', '#f4f0ff', '#8d84ad'][i]}"></i><span>${l.name}</span></li>`).join('')}
          </ol>
          <div class="controls" style="margin-top:12px">
            <button type="button" class="prev">Remove a layer</button>
            <button type="button" class="primary next">Add the next layer</button>
          </div>
          <div class="what"></div>
        </div>
      </div>
      <p class="readout"></p>
    `;
    const root = this.shadowRoot;
    root.querySelector('.next').addEventListener('click', () => { if (this.n < LAYERS.length) { this.n++; this.update(); } });
    root.querySelector('.prev').addEventListener('click', () => { if (this.n > 0) { this.n--; this.update(); } });
    root.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => { this.n = +li.dataset.i + 1; this.update(); }));
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    root.querySelector('.layers').innerHTML = LAYERS.slice(0, this.n).map((l) => l.draw()).join('');
    root.querySelectorAll('li').forEach((li) => {
      const i = +li.dataset.i;
      li.classList.toggle('on', i < this.n);
      li.classList.toggle('now', i === this.n - 1);
    });
    root.querySelector('.next').disabled = this.n >= LAYERS.length;
    root.querySelector('.prev').disabled = this.n <= 0;
    const l = LAYERS[this.n - 1];
    root.querySelector('.what').innerHTML = l ? `<strong>${this.n}. ${l.name}.</strong> ${l.what}` : 'A bare, polished wafer. Nothing printed yet.';
    root.querySelector('.readout').innerHTML = this.n >= LAYERS.length
      ? `Five masks, five printings, and a complete NOT gate with its wiring. A real chip uses a few dozen masks and up to a dozen levels of metal, but every one of them is made this same way, and each printing makes every gate on the wafer at once.`
      : `Each layer is one mask and one round of coat, expose, wash, treat, strip. The mask does not care how many gates it draws.`;
  }
}
