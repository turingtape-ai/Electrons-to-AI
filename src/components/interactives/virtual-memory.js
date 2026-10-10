import { baseStyles } from './shared.js';

/**
 * <virtual-memory>
 * Two programs, each with pages numbered from 0, mapped by tables onto
 * the frames of real memory. One may try to touch the other's page.
 */

const FRAMES = 12;

export class VirtualMemory extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tables = { A: [5, 2, 9, null], B: [0, 7, 3, 10] };
    this.sel = 'A';
    this.msg = '';
    this.fault = null;
  }

  connectedCallback() {
    this.render();
  }

  usedFrames() {
    return new Set([...this.tables.A, ...this.tables.B].filter((f) => f !== null));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 14px 10px; }
        svg { width: 100%; height: auto; }
        .box { fill: var(--panel, #110d24); stroke: var(--border, #221c40); stroke-width: 1; }
        .box.A { fill: #2a1f4d; } .box.B { fill: #1f3f36; }
        .box.os { fill: #2d2457; }
        .box.hi { stroke: var(--heading, #f4f0ff); stroke-width: 2; }
        .box.bad { fill: #4a1d2a; stroke: #e8a0a0; }
        .t { font-family: var(--sans, sans-serif); font-size: 10.5px; fill: var(--text, #d9d2f0); text-anchor: middle; dominant-baseline: central; }
        .lab { font-family: var(--sans, sans-serif); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .map { stroke: #4a3f78; stroke-width: 1.5; fill: none; }
        .map.hi { stroke: var(--fire, #f2b35b); stroke-width: 2; }
        .map.bad { stroke: #e8a0a0; stroke-dasharray: 4 4; }
        .seg { display: inline-flex; border: 1px solid var(--border, #221c40); border-radius: 4px; overflow: hidden; }
        .seg label { padding: 8px 12px; font-size: 12.5px; color: var(--muted, #8d84ad); cursor: pointer; user-select: none; }
        .seg label:has(input:checked) { background: var(--panel, #110d24); color: var(--heading, #f4f0ff); box-shadow: inset 0 0 0 1px var(--accent, #8b5cf6); }
        .seg input { position: absolute; opacity: 0; width: 0; height: 0; }
      </style>
      <div class="stage"><svg viewBox="0 0 640 300" role="img" aria-label="Two programs' pages mapped onto real memory"></svg></div>
      <div class="controls">
        <span class="seg" role="radiogroup" aria-label="Which program's view">
          <label><input type="radio" name="p" value="A" checked> Follow program A</label>
          <label><input type="radio" name="p" value="B"> Follow program B</label>
        </span>
        <span class="spacer"></span>
        <button type="button" class="more">A asks for one more page</button>
        <button type="button" class="poke">A reaches for B's page 1</button>
        <button type="button" class="reset">Reset</button>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('input[name=p]').forEach((r) => r.addEventListener('change', () => { this.sel = r.value; this.fault = null; this.update(); }));
    root.querySelector('.more').addEventListener('click', () => {
      const used = this.usedFrames();
      const free = [];
      for (let f = 1; f < FRAMES; f++) if (!used.has(f)) free.push(f);
      const slot = this.tables.A.indexOf(null);
      if (slot < 0) { this.msg = 'A already has all four of its pages mapped.'; }
      else if (!free.length) { this.msg = 'No free frame. A real operating system would copy a stale page out to disk and reuse its frame.'; }
      else { this.tables.A[slot] = free[Math.floor(free.length / 2)]; this.msg = `The operating system picked an unused frame, frame ${this.tables.A[slot]}, wrote it into A's table under page ${slot}, and A sees nothing but "page ${slot} works now."`; }
      this.fault = null; this.sel = 'A'; root.querySelector('input[value=A]').checked = true; this.update();
    });
    root.querySelector('.poke').addEventListener('click', () => {
      this.fault = { prog: 'A', target: this.tables.B[1] };
      this.sel = 'A'; root.querySelector('input[value=A]').checked = true;
      this.msg = `A tries to read what is in frame ${this.tables.B[1]}. But A can only name pages 0 to 3, and its table maps them to frames ${this.tables.A.filter((f) => f !== null).join(', ')}. There is no page in A's table that leads to frame ${this.tables.B[1]}, so A has no way even to say that address. If it reaches for a page number its table lacks, the hardware stops it and the operating system steps in: a fault.`;
      this.update();
    });
    root.querySelector('.reset').addEventListener('click', () => { this.tables = { A: [5, 2, 9, null], B: [0, 7, 3, 10] }; this.fault = null; this.msg = ''; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const sel = this.sel;
    let s = '';
    const pageX = { A: 40, B: 40 };
    const pageY = { A: 50, B: 190 };
    // programs' views
    for (const p of ['A', 'B']) {
      s += `<text class="lab" x="${pageX[p]}" y="${pageY[p] - 30}">program ${p} thinks it has</text>`;
      this.tables[p].forEach((f, i) => {
        const x = pageX[p] + i * 46, y = pageY[p];
        const hi = p === sel;
        const bad = this.fault && this.fault.prog === p && false;
        s += `<rect class="box ${p} ${hi ? 'hi' : ''} ${bad ? 'bad' : ''}" x="${x}" y="${y}" width="40" height="40" rx="3" ${f === null ? 'opacity="0.4" stroke-dasharray="3 3"' : ''}></rect><text class="t" x="${x + 20}" y="${y + 20}">page ${i}</text>`;
      });
      s += `<text class="lab" x="${pageX[p]}" y="${pageY[p] - 14}">table: ${this.tables[p].map((f, i) => `${i}→${f === null ? '–' : f}`).join('  ')}</text>`;
    }
    // real memory column
    const mx = 470, mh = 20;
    s += `<text class="lab" x="${mx + 60}" y="18" text-anchor="middle">real memory</text>`;
    for (let f = 0; f < FRAMES; f++) {
      const y = 28 + f * (mh + 2);
      let owner = null, pg = null;
      for (const p of ['A', 'B']) { const i = this.tables[p].indexOf(f); if (i >= 0) { owner = p; pg = i; } }
      const isTarget = this.fault && this.fault.target === f;
      const cls = f === 0 ? 'os' : owner ?? '';
      s += `<rect class="box ${cls} ${owner === sel ? 'hi' : ''} ${isTarget ? 'bad' : ''}" x="${mx}" y="${y}" width="120" height="${mh}" rx="2"></rect>`;
      s += `<text class="t" x="${mx + 60}" y="${y + mh / 2}">frame ${f}${f === 0 ? ' · operating system' : owner ? ` · ${owner}'s page ${pg}` : ' · free'}</text>`;
    }
    // mapping lines for the selected program
    this.tables[sel].forEach((f, i) => {
      if (f === null) return;
      const x1 = pageX[sel] + i * 46 + 20, y1 = pageY[sel] + 40;
      const y2 = 28 + f * (mh + 2) + mh / 2;
      s += `<path class="map hi" d="M ${x1} ${y1} C ${x1} ${y1 + 50}, ${mx - 140} ${y2}, ${mx} ${y2}"></path>`;
    });
    if (this.fault) {
      const y2 = 28 + this.fault.target * (mh + 2) + mh / 2;
      s += `<path class="map bad" d="M ${pageX.A + 3 * 46 + 20} ${pageY.A + 40} C ${pageX.A + 3 * 46 + 20} ${pageY.A + 90}, 340 ${y2}, ${mx} ${y2}"></path>`;
      s += `<text class="t" x="${pageX.B + 92}" y="${pageY.B + 72}" style="fill:#e8a0a0">A reaches for a page it has no table entry for · fault</text>`;
    }
    root.querySelector('svg').innerHTML = s;
    const out = root.querySelector('.readout');
    out.innerHTML = this.msg || (sel === 'A'
      ? `Program A uses addresses in pages 0 to 3. The hardware looks each one up in A's table and goes to the real frame instead. A never learns the frame numbers, and A's compiler never had to care where it would be loaded.`
      : `Program B also uses pages 0 to 3, the same numbers as A, and they land in entirely different frames. Both programs were compiled to run "at address 0" and both do.`);
  }
}
