import { baseStyles, reducedMotion } from './shared.js';

/**
 * <packet-router>
 * A small network. A message is split into packets, each routed hop by
 * hop from a table; equal-cost routes are alternated so packets arrive
 * out of order; a link can be broken and the tables repair themselves.
 */

const NODES = { A: [60, 150], R1: [200, 60], R2: [200, 240], R3: [360, 60], R4: [360, 240], R5: [280, 150], B: [500, 150] };
const LINKS = [['A', 'R1'], ['A', 'R2'], ['R1', 'R3'], ['R2', 'R4'], ['R1', 'R5'], ['R2', 'R5'], ['R5', 'R3'], ['R5', 'R4'], ['R3', 'B'], ['R4', 'B']];
const PACKET = 4; // characters per packet
// Some links are slower: a packet spends extra ticks crossing them. Routers
// choose by hop count, as simple ones do, so equal-hop routes differ in time.
const SLOW = new Set(['R2-R4', 'R1-R5']);

function key(a, b) { return [a, b].sort().join('-'); }

export class PacketRouter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.broken = new Set();
    this.packets = [];
    this.received = [];
    this.timer = null;
    this.rr = {}; // round-robin counters per node for equal-cost choices
    this.text = 'Fires on the hills';
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this.timer) clearInterval(this.timer);
  }

  neighbours(n) {
    const out = [];
    for (const [a, b] of LINKS) {
      if (this.broken.has(key(a, b))) continue;
      if (a === n) out.push(b);
      if (b === n) out.push(a);
    }
    return out;
  }

  /** Distance of every node to B over working links. */
  distances() {
    const d = { B: 0 };
    const q = ['B'];
    while (q.length) {
      const n = q.shift();
      for (const m of this.neighbours(n)) if (d[m] === undefined) { d[m] = d[n] + 1; q.push(m); }
    }
    return d;
  }

  /** The router's table: for node n, the next hops that get closer to B. */
  nextHops(n, d) {
    return this.neighbours(n).filter((m) => d[m] !== undefined && d[m] < d[n]);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
        svg { width: 100%; height: auto; }
        .link { stroke: #4a3f78; stroke-width: 3; cursor: pointer; }
        .link:hover { stroke: var(--accent, #8b5cf6); }
        .link.broken { stroke: #5a2a36; stroke-dasharray: 6 8; }
        .link.slow { stroke-width: 1.5; }
        .link-hit { stroke: transparent; stroke-width: 18; cursor: pointer; }
        .node circle { fill: var(--panel, #110d24); stroke: var(--muted, #8d84ad); stroke-width: 1.5; }
        .node.end circle { stroke: var(--fire, #f2b35b); }
        .node text { font: 600 11px var(--sans, sans-serif); fill: var(--heading, #f4f0ff); text-anchor: middle; dominant-baseline: central; }
        .tbl { font: 9.5px var(--sans, sans-serif); fill: var(--muted, #8d84ad); text-anchor: middle; }
        .pk rect { fill: var(--fire, #f2b35b); }
        .pk text { font: 600 9px var(--sans, sans-serif); fill: #2a1c05; text-anchor: middle; dominant-baseline: central; }
        .pk.lost rect { fill: #e8a0a0; }
        input.msg { flex: 1 1 200px; font: 15px var(--sans, sans-serif); color: var(--heading, #f4f0ff); background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 8px 11px; }
        .inbox { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 34px; }
        .slot { min-width: 44px; padding: 6px 8px; border: 1px dashed var(--border, #221c40); border-radius: 3px; font: 13px ui-monospace, Menlo, monospace; color: var(--muted, #8d84ad); text-align: center; }
        .slot.got { border-style: solid; border-color: var(--accent, #8b5cf6); color: var(--heading, #f4f0ff); }
        .slot small { display: block; font: 9px var(--sans, sans-serif); letter-spacing: 0.1em; color: var(--muted, #8d84ad); }
        .assembled { font-family: var(--serif, serif); font-size: 18px; color: var(--heading, #f4f0ff); margin-top: 6px; min-height: 1.4em; }
      </style>
      <div class="stage"><svg viewBox="0 0 560 300" role="img" aria-label="A network of routers between A and B"></svg></div>
      <div class="controls">
        <input class="msg" type="text" maxlength="40" value="${this.text}" aria-label="Message to send">
        <button type="button" class="primary send">Send from A to B</button>
        <button type="button" class="fix">Mend all links</button>
      </div>
      <div class="inbox"></div>
      <div class="assembled"></div>
      <p class="readout" aria-live="polite"></p>
    `;
    const root = this.shadowRoot;
    root.querySelector('.send').addEventListener('click', () => this.send());
    root.querySelector('.fix').addEventListener('click', () => { this.broken.clear(); this.draw(); this.say('All links working again. The tables rebuild themselves.'); });
    root.querySelector('input.msg').addEventListener('input', (e) => { this.text = e.target.value; });
    root.querySelector('svg').addEventListener('click', (e) => {
      const hit = e.target.closest('[data-link]');
      if (!hit) return;
      const k = hit.dataset.link;
      if (this.broken.has(k)) this.broken.delete(k); else this.broken.add(k);
      this.draw();
      this.say(this.broken.has(k) ? `Link ${k.replace('-', ' to ')} is down. Its neighbours stop advertising routes through it, and every table adjusts. Send again.` : `Link ${k.replace('-', ' to ')} repaired.`);
    });
    this.draw();
    this.say('Thin links are slow ones. Click any link to break it. Then send a message and watch the packets route around the gap.');
  }

  say(html) { this.shadowRoot.querySelector('.readout').innerHTML = html; }

  send() {
    if (this.timer) clearInterval(this.timer);
    const txt = this.text || 'hello';
    const n = Math.ceil(txt.length / PACKET);
    this.packets = Array.from({ length: n }, (_, i) => ({ seq: i + 1, data: txt.slice(i * PACKET, (i + 1) * PACKET), at: 'A', delay: i, done: false, lost: false, hops: 0 }));
    this.received = new Array(n).fill(null);
    this.rr = {};
    this.arrivals = 0;
    const d = this.distances();
    if (d.A === undefined) { this.say('There is no path from A to B at all. Every packet is dropped at A. Mend a link.'); this.packets.forEach((p) => (p.lost = true)); this.draw(); return; }
    const step = () => {
      let moving = false;
      for (const p of this.packets) {
        if (p.done || p.lost) continue;
        if (p.delay > 0) { p.delay--; moving = true; continue; }
        const dist = this.distances();
        const hops = this.nextHops(p.at, dist);
        if (!hops.length) { p.lost = true; continue; }
        const i = (this.rr[p.at] = (this.rr[p.at] ?? 0) + 1) % hops.length;
        const link = key(p.at, hops[i]);
        p.at = hops[i];
        p.hops++;
        if (SLOW.has(link)) { p.delay = 3; p.slowed = (p.slowed ?? 0) + 1; }
        if (p.at === 'B') { p.done = true; p.arrived = ++this.arrivals; this.received[p.seq - 1] = p; }
        moving = true;
      }
      this.draw();
      if (!moving) {
        clearInterval(this.timer); this.timer = null;
        const lost = this.packets.filter((p) => p.lost).length;
        const order = this.packets.filter((p) => p.done).sort((a, b) => a.arrived - b.arrived).map((p) => p.seq);
        const outOfOrder = order.some((v, i) => i && v < order[i - 1]);
        this.say(lost
          ? `${lost} packet${lost === 1 ? '' : 's'} had nowhere to go and ${lost === 1 ? 'was' : 'were'} dropped. The network promised nothing. The two ends would notice the missing number and send it again.`
          : `All ${n} packets arrived${outOfOrder ? `, out of order (${order.join(', ')}), because some went by slower links` : ', in order this time'}. B used the sequence numbers to put them back together. No router ever saw the whole message.`);
      }
    };
    this.timer = setInterval(step, reducedMotion() ? 10 : 380);
    this.say(`Split into ${n} packets of ${PACKET} characters, each with a sequence number and the address B. Off they go.`);
  }

  draw() {
    const root = this.shadowRoot;
    const d = this.distances();
    let s = '';
    for (const [a, b] of LINKS) {
      const [x1, y1] = NODES[a], [x2, y2] = NODES[b];
      const k = key(a, b);
      s += `<line class="link-hit" data-link="${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line><line class="link ${this.broken.has(k) ? 'broken' : ''} ${SLOW.has(k) ? 'slow' : ''}" data-link="${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
    }
    for (const [n, [x, y]] of Object.entries(NODES)) {
      const end = n === 'A' || n === 'B';
      s += `<g class="node ${end ? 'end' : ''}"><circle cx="${x}" cy="${y}" r="${end ? 18 : 15}"></circle><text x="${x}" y="${y}">${n}</text></g>`;
      if (!end) {
        const hops = this.nextHops(n, d);
        s += `<text class="tbl" x="${x}" y="${y + (y < 150 ? -24 : 28)}">to B: ${hops.length ? 'via ' + hops.join(' or ') : d[n] === undefined ? 'no route' : 'via ' + hops.join('/')}</text>`;
      }
    }
    // packets, fanned out at their node
    const byNode = {};
    for (const p of this.packets) { if (p.done && p.at === 'B') continue; (byNode[p.at] ??= []).push(p); }
    for (const [n, ps] of Object.entries(byNode)) {
      const [x, y] = NODES[n];
      ps.forEach((p, i) => {
        const px = x - (ps.length - 1) * 9 + i * 18, py = y < 150 ? y + 34 : y - 34;
        s += `<g class="pk ${p.lost ? 'lost' : ''}"><rect x="${px - 8}" y="${py - 8}" width="16" height="16" rx="2"></rect><text x="${px}" y="${py}">${p.seq}</text></g>`;
      });
    }
    root.querySelector('svg').innerHTML = s;
    root.querySelector('.inbox').innerHTML = this.received.length
      ? `<span class="muted" style="font-size:12px;margin-right:6px">B's buffer:</span>` + this.received.map((p, i) => `<span class="slot ${p ? 'got' : ''}"><small>${i + 1}</small>${p ? p.data.replace(/ /g, '␣') : '…'}</span>`).join('')
      : '';
    const all = this.received.length && this.received.every(Boolean);
    root.querySelector('.assembled').textContent = all ? `Reassembled: "${this.received.map((p) => p.data).join('')}"` : '';
  }
}
