import { baseStyles } from './shared.js';

/**
 * <time-slicer>
 * Three programs share one processor for 240 ms. A round-robin scheduler
 * with an adjustable turn length. The music player needs a short burst
 * every 20 ms; the editor needs a short burst after each keystroke; the
 * calculation always wants more.
 */

const TOTAL = 240; // ms simulated
const PROGS = [
  { id: 'music', name: 'Music player', color: '#8b5cf6', need: 2, period: 20 },
  { id: 'editor', name: 'Text editor', color: '#f2b35b', need: 3, keys: [15, 60, 105, 150, 195] },
  { id: 'calc', name: 'Long calculation', color: '#2f6b5a' },
];

export class TimeSlicer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.slice = 10;
  }

  connectedCallback() {
    this.render();
  }

  simulate() {
    const slice = this.slice;
    const segs = [];
    let t = 0;
    // ready work: music wants `need` ms at every period; editor wants `need` ms after each key
    const pending = { music: 0, editor: 0 };
    let nextMusic = 0;
    const keyQueue = PROGS[1].keys.slice();
    const musicLate = [];
    const editorLag = [];
    let musicDue = 0; // when the current music burst was requested
    let editorReq = null;
    let turn = 0;
    const order = ['music', 'editor', 'calc'];
    let calcTime = 0;
    const ctx = { switches: 0 };
    while (t < TOTAL) {
      // release work
      while (nextMusic <= t) { if (pending.music === 0) musicDue = nextMusic; pending.music += PROGS[0].need; nextMusic += PROGS[0].period; }
      while (keyQueue.length && keyQueue[0] <= t) { const k = keyQueue.shift(); if (pending.editor === 0) editorReq = k; pending.editor += PROGS[1].need; }
      // pick the next ready program in round-robin order
      let chosen = null;
      for (let k = 0; k < 3; k++) {
        const id = order[(turn + k) % 3];
        if (id === 'calc' || pending[id] > 0) { chosen = id; turn = (turn + k + 1) % 3; break; }
      }
      const want = chosen === 'calc' ? slice : Math.min(slice, pending[chosen]);
      // a turn ends early if music or a key arrives? no: the clock only taps at slice ends, so a turn runs its full length
      // (this is the point: long slices make others wait)
      const len = chosen === 'calc' ? slice : want;
      const end = Math.min(TOTAL, t + len);
      ctx.switches++;
      segs.push({ id: chosen, from: t, to: end });
      if (chosen === 'music') {
        pending.music -= end - t;
        if (pending.music <= 0) { musicLate.push(end - musicDue); pending.music = 0; }
      } else if (chosen === 'editor') {
        pending.editor -= end - t;
        if (pending.editor <= 0) { editorLag.push(end - editorReq); pending.editor = 0; }
      } else calcTime += end - t;
      t = end;
    }
    const stutters = musicLate.filter((d) => d > 25).length + (pending.music > 0 ? 1 : 0);
    const worstLag = editorLag.length ? Math.max(...editorLag) : 0;
    return { segs, stutters, worstLag, calcTime, switches: ctx.switches, musicLate };
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 16px 16px 12px; }
        .legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--muted, #8d84ad); margin-bottom: 10px; }
        .legend i { display: inline-block; width: 12px; height: 12px; border-radius: 2px; vertical-align: -2px; margin-right: 6px; }
        svg { width: 100%; height: auto; }
        .axis { stroke: #3a3160; }
        .tick { font-family: var(--sans, sans-serif); font-size: 10px; fill: var(--muted, #8d84ad); }
        .lab { font-family: var(--sans, sans-serif); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
        .mark { stroke: var(--heading, #f4f0ff); stroke-width: 1; }
        .stut { fill: #e8a0a0; }
        .slider { display: flex; align-items: center; gap: 12px; flex: 1 1 240px; color: var(--muted, #8d84ad); font-size: 12.5px; }
        .slider input { flex: 1; accent-color: var(--accent, #8b5cf6); }
        .slider .v { color: var(--heading, #f4f0ff); min-width: 3.4em; font-variant-numeric: tabular-nums; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
        .stat { border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 8px 10px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted, #8d84ad); }
        .stat b { display: block; font: 500 18px var(--serif, serif); letter-spacing: 0; text-transform: none; color: var(--heading, #f4f0ff); margin-top: 2px; }
        .stat.bad b { color: #e8a0a0; }
        @media (max-width: 520px) { .stats { grid-template-columns: 1fr; } }
      </style>
      <div class="stage">
        <div class="legend">${PROGS.map((p) => `<span><i style="background:${p.color}"></i>${p.name}</span>`).join('')}<span><i style="background:#e8a0a0"></i>a missed note</span></div>
        <svg viewBox="0 0 640 150" role="img" aria-label="Timeline of which program is running"></svg>
      </div>
      <div class="controls">
        <label class="slider">Length of a turn <input type="range" min="1" max="40" step="1" value="${this.slice}" aria-label="Turn length in milliseconds"> <span class="v"></span></label>
      </div>
      <div class="stats">
        <div class="stat music">music notes missed<b></b></div>
        <div class="stat editor">worst wait after a keystroke<b></b></div>
        <div class="stat calc">calculation's share<b></b></div>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    this.shadowRoot.querySelector('input').addEventListener('input', (e) => { this.slice = +e.target.value; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const r = this.simulate();
    const X = (ms) => 60 + (ms / TOTAL) * 560;
    const rowY = { music: 20, editor: 50, calc: 80 };
    let s = '';
    for (const p of PROGS) s += `<text class="lab" x="56" y="${rowY[p.id] + 14}" text-anchor="end">${p.id}</text>`;
    s += r.segs.map((g) => `<rect x="${X(g.from)}" y="${rowY[g.id]}" width="${Math.max(0.5, X(g.to) - X(g.from) - 0.6)}" height="20" fill="${PROGS.find((p) => p.id === g.id).color}" rx="1"></rect>`).join('');
    // music deadlines and keystrokes
    for (let t = 0; t < TOTAL; t += PROGS[0].period) s += `<line class="mark" x1="${X(t)}" x2="${X(t)}" y1="${rowY.music - 4}" y2="${rowY.music}" opacity="0.5"></line>`;
    for (const k of PROGS[1].keys) s += `<text class="tick" x="${X(k)}" y="${rowY.editor - 4}" text-anchor="middle">key</text>`;
    // stutters: music bursts that finished more than 25 ms after they were due
    let t = 0, idx = 0;
    for (const late of r.musicLate) { if (late > 25) s += `<circle class="stut" cx="${X(t + late)}" cy="${rowY.music + 10}" r="3"></circle>`; t += PROGS[0].period; idx++; }
    s += `<line class="axis" x1="60" x2="620" y1="112" y2="112"></line>`;
    for (let ms = 0; ms <= TOTAL; ms += 40) s += `<text class="tick" x="${X(ms)}" y="${128}" text-anchor="middle">${ms} ms</text><line class="axis" x1="${X(ms)}" x2="${X(ms)}" y1="112" y2="116"></line>`;
    s += `<text class="lab" x="340" y="146" text-anchor="middle">one processor, ${r.switches} turns in ${TOTAL} ms</text>`;
    root.querySelector('svg').innerHTML = s;
    root.querySelector('.v').textContent = `${this.slice} ms`;
    const music = root.querySelector('.stat.music'), ed = root.querySelector('.stat.editor');
    music.querySelector('b').textContent = r.stutters;
    music.classList.toggle('bad', r.stutters > 0);
    ed.querySelector('b').textContent = `${r.worstLag} ms`;
    ed.classList.toggle('bad', r.worstLag > 50);
    const share = Math.round((100 * r.calcTime) / TOTAL);
    root.querySelector('.stat.calc b').textContent = `${share}%`;
    const out = root.querySelector('.readout');
    out.innerHTML = this.slice <= 3
      ? `Tiny turns: nobody waits long, but the processor spends a large part of its time switching, which is work that helps no program. The calculation gets ${share}% and the switching eats the rest.`
      : this.slice >= 24
        ? `Long turns: the calculation runs for ${this.slice} ms at a stretch, and while it does, the music player cannot get its 2 ms burst in time. Notes are missed and keystrokes feel late. Nothing is wrong with any program; the scheduler chose badly.`
        : `A middling turn. The music player is served in time, keystrokes are answered quickly, and the calculation still gets ${share}% of the machine. Real schedulers also let a short, urgent program cut in rather than wait its turn.`;
  }
}
