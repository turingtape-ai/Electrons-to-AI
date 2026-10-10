import { baseStyles } from './shared.js';

/**
 * <protocol-stack>
 * A request is wrapped in an envelope at each layer on the way down, then
 * carried across a network where each machine opens only what it needs.
 */

const LAYERS = [
  { name: 'Application', color: '#f2b35b', header: 'GET /chapters/01-beacons/', who: 'the web browser and the web server', what: 'What is wanted: a page, by name.' },
  { name: 'Transport', color: '#8b5cf6', header: 'from port 51234 · to port 443 · piece 1 of 3 · please acknowledge', who: 'the two ends only', what: 'Numbering, acknowledging and resending, so the conversation arrives whole and in order.' },
  { name: 'Network', color: '#2f6b5a', header: 'from 203.0.113.7 · to 198.51.100.42', who: 'every router along the way', what: 'The destination machine’s address. This is the envelope routers read.' },
  { name: 'Link', color: '#6a5f94', header: 'to the next machine on this wire or radio', who: 'only the next machine', what: 'How to reach the very next hop. Replaced at every hop.' },
];

const PATH = [
  { name: 'your laptop', opens: 4, note: 'wraps all four envelopes and sends the bits over Wi-Fi' },
  { name: 'home router', opens: 2, note: 'opens the link envelope, reads the network address, puts on a fresh link envelope for the next hop' },
  { name: 'a router in the city', opens: 2, note: 'same again: looks at the network address, never at what is inside' },
  { name: 'a router near the server', opens: 2, note: 'same again' },
  { name: 'the server', opens: 4, note: 'unwraps everything; the transport layer puts the pieces in order; the web server reads the request' },
];

export class ProtocolStack extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.wrapped = 1; // how many envelopes are on (1 = just the request)
    this.hop = 0;
    this.mode = 'wrap';
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 16px; }
        .env { border: 2px solid; border-radius: 6px; padding: 10px 12px 12px; margin: 0; transition: opacity 160ms; }
        .env .h { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted, #8d84ad); margin-bottom: 8px; }
        .env .h b { color: var(--heading, #f4f0ff); font-weight: 600; letter-spacing: 0.12em; }
        .env .hd { font: 12px ui-monospace, Menlo, monospace; color: var(--text, #d9d2f0); margin-bottom: 8px; }
        .env.dim { opacity: 0.35; }
        .msg { font-family: var(--serif, serif); font-size: 15px; color: var(--heading, #f4f0ff); padding: 8px 10px; border: 1px dashed var(--border, #221c40); border-radius: 4px; }
        .path { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 12px; }
        .stop { padding: 8px 6px; border: 1px solid var(--border, #221c40); border-radius: 4px; text-align: center; font-size: 11px; color: var(--muted, #8d84ad); cursor: pointer; }
        .stop.on { color: var(--heading, #f4f0ff); border-color: var(--accent, #8b5cf6); background: color-mix(in srgb, var(--accent, #8b5cf6) 16%, transparent); }
        .stop small { display: block; font-size: 10px; margin-top: 3px; }
        .who { margin-top: 10px; font-size: 13px; color: var(--text, #d9d2f0); min-height: 3em; }
        .who b { color: var(--accent, #8b5cf6); font-weight: 600; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; display: block; margin-bottom: 3px; }
        .seg { display: inline-flex; border: 1px solid var(--border, #221c40); border-radius: 4px; overflow: hidden; }
        .seg label { padding: 8px 12px; font-size: 12.5px; color: var(--muted, #8d84ad); cursor: pointer; user-select: none; }
        .seg label:has(input:checked) { background: var(--panel, #110d24); color: var(--heading, #f4f0ff); box-shadow: inset 0 0 0 1px var(--accent, #8b5cf6); }
        .seg input { position: absolute; opacity: 0; width: 0; height: 0; }
        @media (max-width: 560px) { .path { grid-template-columns: repeat(2, 1fr); } }
      </style>
      <div class="controls" style="margin:0 0 12px">
        <span class="seg" role="radiogroup" aria-label="Mode">
          <label><input type="radio" name="m" value="wrap" checked> Wrap it up</label>
          <label><input type="radio" name="m" value="travel"> Send it across</label>
        </span>
        <span class="spacer"></span>
        <span class="wrapctl"><button type="button" class="less">Take one off</button> <button type="button" class="primary more">Add an envelope</button></span>
      </div>
      <div class="stage"><div class="envs"></div><div class="path"></div></div>
      <div class="who"></div>
      <p class="readout"></p>
    `;
    const root = this.shadowRoot;
    root.querySelectorAll('input[name=m]').forEach((r) => r.addEventListener('change', () => { this.mode = r.value; if (this.mode === 'travel') this.wrapped = 4; this.update(); }));
    root.querySelector('.more').addEventListener('click', () => { if (this.wrapped < 4) { this.wrapped++; this.update(); } });
    root.querySelector('.less').addEventListener('click', () => { if (this.wrapped > 1) { this.wrapped--; this.update(); } });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const travel = this.mode === 'travel';
    root.querySelector('.wrapctl').style.display = travel ? 'none' : '';
    root.querySelector('.path').style.display = travel ? '' : 'none';
    const stop = PATH[this.hop];
    // which layers are "visible" to this hop: it opens the outer `opens` envelopes counting from the link layer
    const openedAt = (li) => !travel || li >= 4 - stop.opens;
    let html = `<div class="msg">“Please send me Chapter 1.”</div>`;
    for (let li = 0; li < this.wrapped; li++) {
      const L = LAYERS[li];
      const dim = travel && !openedAt(li);
      html = `<div class="env ${dim ? 'dim' : ''}" style="border-color:${L.color}"><div class="h"><b>${L.name}</b><span>read by ${L.who}</span></div><div class="hd">${L.header}</div>${html}</div>`;
    }
    root.querySelector('.envs').innerHTML = html;
    root.querySelector('.path').innerHTML = PATH.map((p, i) => `<div class="stop ${i === this.hop ? 'on' : ''}" data-i="${i}">${p.name}<small>${p.opens === 4 ? 'opens everything' : 'reads the network envelope'}</small></div>`).join('');
    root.querySelectorAll('.stop').forEach((el) => el.addEventListener('click', () => { this.hop = +el.dataset.i; this.update(); }));
    root.querySelector('.more').disabled = this.wrapped >= 4;
    root.querySelector('.less').disabled = this.wrapped <= 1;
    const who = root.querySelector('.who');
    if (!travel) {
      const L = LAYERS[this.wrapped - 1];
      who.innerHTML = this.wrapped === 1
        ? `<b>The request itself</b>Just text. Nothing yet says who it is for or how it should get there.`
        : `<b>${L.name} envelope</b>${L.what}`;
    } else {
      who.innerHTML = `<b>${stop.name}</b>${stop.note.charAt(0).toUpperCase() + stop.note.slice(1)}.`;
    }
    root.querySelector('.readout').innerHTML = travel
      ? `Dim envelopes are ones this machine never opens. The routers in the middle see only the network address; the request itself passes through three machines that have no idea what it says.`
      : this.wrapped === 4
        ? `Four envelopes, each added by a layer that solves one problem and knows nothing about the others. Switch to “Send it across” to see who opens which.`
        : `Each layer wraps what it is handed and writes its own header on the outside. It never looks inside.`;
  }
}
