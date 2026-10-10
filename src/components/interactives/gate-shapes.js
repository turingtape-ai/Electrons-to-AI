// Small SVG helpers shared by the logic interactives: gate symbols, a lamp,
// and an inline switch. All take a top-left origin and return markup.

/** AND gate, 56 wide by 40 tall, inputs on the left at y+10 and y+30, output at (x+56, y+20). */
export function andGate(x, y, on = false) {
  return `<path class="gate ${on ? 'on' : ''}" d="M ${x} ${y} h 30 a 20 20 0 0 1 0 40 h -30 Z"></path>`;
}

/** OR gate, same footprint as AND. */
export function orGate(x, y, on = false) {
  return `<path class="gate ${on ? 'on' : ''}" d="M ${x} ${y} q 14 20 0 40 q 36 -2 56 -20 q -20 -18 -56 -20 Z"></path>`;
}

/** NOT gate, 40 wide, input at y+20, output at (x+48, y+20) after the bubble. */
export function notGate(x, y, on = false) {
  return `<path class="gate ${on ? 'on' : ''}" d="M ${x} ${y} l 36 20 l -36 20 Z"></path><circle class="bubble" cx="${x + 42}" cy="${y + 20}" r="5"></circle>`;
}

/** A small inverter bubble on a wire. */
export function bubble(x, y) {
  return `<circle class="bubble" cx="${x}" cy="${y}" r="5"></circle>`;
}

export function lamp(x, y, on = false, r = 12) {
  return `<circle class="lamp ${on ? 'on' : ''}" cx="${x}" cy="${y}" r="${r}"></circle>`;
}

export function wire(d, on = false) {
  return `<path class="wire ${on ? 'live' : ''}" d="${d}"></path>`;
}

export function label(x, y, text, anchor = 'start', cls = 'label') {
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
}

/** A contact: two terminals and a bar that is flat when closed, tilted when open. */
export function contact(x, y, closed, width = 36) {
  const tilt = closed ? '' : `transform="rotate(-28 ${x} ${y})"`;
  return `
    <circle class="term" cx="${x}" cy="${y}" r="3"></circle>
    <circle class="term" cx="${x + width}" cy="${y}" r="3"></circle>
    <line class="blade ${closed ? 'closed' : ''}" x1="${x}" y1="${y}" x2="${x + width - 4}" y2="${y}" ${tilt}></line>`;
}

export const logicStyles = /* css */ `
  .scene { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; }
  .wire { stroke: #4a3f78; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; transition: stroke 120ms; }
  .wire.live { stroke: var(--fire, #f2b35b); }
  .gate { fill: var(--panel, #110d24); stroke: var(--muted, #8d84ad); stroke-width: 2; transition: stroke 120ms, fill 120ms; }
  .gate.on { stroke: var(--fire, #f2b35b); fill: #2a1f3a; }
  .bubble { fill: var(--bg, #0d0a1c); stroke: var(--muted, #8d84ad); stroke-width: 2; }
  .lamp { fill: #1a1434; stroke: var(--border, #221c40); stroke-width: 1.5; transition: fill 120ms; }
  .lamp.on { fill: var(--fire, #f2b35b); stroke: var(--fire, #f2b35b); filter: drop-shadow(0 0 10px rgba(242, 179, 91, 0.6)); }
  .label { font-family: var(--sans, sans-serif); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; fill: var(--muted, #8d84ad); }
  .big { font-family: var(--sans, sans-serif); font-size: 13px; font-weight: 600; fill: var(--heading, #f4f0ff); }
  .term { fill: var(--muted, #8d84ad); }
  .blade { stroke: var(--text, #d9d2f0); stroke-width: 3; stroke-linecap: round; transition: transform 120ms ease; }
  .blade.closed { stroke: var(--fire, #f2b35b); }
  .plate { stroke: var(--heading, #f4f0ff); stroke-width: 2.5; }
  .plate.short { stroke: var(--muted, #8d84ad); stroke-width: 5; }
  .coil { stroke: var(--accent, #8b5cf6); stroke-width: 2.5; fill: none; }
  .core { fill: #3a3160; }
  .core.mag { fill: var(--accent, #8b5cf6); }

  .inputs { display: flex; gap: 10px; flex-wrap: wrap; }
  .in {
    min-width: 64px; padding: 9px 12px; border-radius: 4px; cursor: pointer;
    font: 600 13px/1 var(--sans, sans-serif); letter-spacing: 0.06em;
    color: var(--muted, #8d84ad); background: transparent; border: 1px solid var(--border, #221c40);
  }
  .in.on { color: #2a1c05; background: var(--fire, #f2b35b); border-color: var(--fire, #f2b35b); }
  .in:hover { border-color: var(--accent, #8b5cf6); }

  table.tt { border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
  table.tt th, table.tt td { padding: 5px 10px; text-align: center; border-bottom: 1px solid var(--border, #221c40); }
  table.tt th { font-weight: 500; color: var(--muted, #8d84ad); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; }
  table.tt tr.now td { background: color-mix(in srgb, var(--accent, #8b5cf6) 22%, transparent); color: var(--heading, #f4f0ff); }
  table.tt td.out { font-weight: 600; color: var(--heading, #f4f0ff); }
  table.tt td.out.one { color: var(--fire, #f2b35b); }
  table.tt td.seen { color: var(--muted, #8d84ad); font-size: 11px; }
  table.tt input { accent-color: var(--accent, #8b5cf6); width: 16px; height: 16px; cursor: pointer; }
  .seg { display: inline-flex; border: 1px solid var(--border, #221c40); border-radius: 4px; overflow: hidden; }
  .seg label { padding: 8px 12px; font-size: 12.5px; color: var(--muted, #8d84ad); cursor: pointer; user-select: none; }
  .seg label:has(input:checked) { background: var(--panel, #110d24); color: var(--heading, #f4f0ff); box-shadow: inset 0 0 0 1px var(--accent, #8b5cf6); }
  .seg input { position: absolute; opacity: 0; width: 0; height: 0; }
`;
