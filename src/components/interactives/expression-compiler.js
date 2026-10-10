import { baseStyles } from './shared.js';

/**
 * <expression-compiler>
 * A formula becomes tokens, then a tree, then instructions for the small
 * accumulator machine.
 */

const VARS = { a: 2, b: 3, c: 4, x: 5, y: 6 };

function tokenize(src) {
  const toks = [];
  const re = /\s*(?:(\d+)|([a-z])|([+\-*/×÷()]))/gy;
  let m, pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    m = re.exec(src);
    if (!m || m.index !== pos) {
      // skip trailing whitespace
      if (/^\s*$/.test(src.slice(pos))) break;
      throw new Error(`I do not know what to do with "${src[pos]}"`);
    }
    if (m[1]) toks.push({ t: 'num', v: +m[1] });
    else if (m[2]) toks.push({ t: 'var', v: m[2] });
    else toks.push({ t: 'op', v: m[3].replace('×', '*').replace('÷', '/') });
    pos = re.lastIndex;
  }
  return toks;
}

function parse(toks) {
  let i = 0;
  const peek = () => toks[i];
  const take = () => toks[i++];
  function primary() {
    const t = take();
    if (!t) throw new Error('the formula ends too soon');
    if (t.t === 'num' || t.t === 'var') return { kind: t.t, v: t.v };
    if (t.t === 'op' && t.v === '(') {
      const e = sum();
      const c = take();
      if (!c || c.v !== ')') throw new Error('a bracket was opened and never closed');
      return e;
    }
    throw new Error(`unexpected "${t.v}"`);
  }
  function product() {
    let left = primary();
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = take().v;
      left = { kind: 'bin', op, l: left, r: primary() };
    }
    return left;
  }
  function sum() {
    let left = product();
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = take().v;
      left = { kind: 'bin', op, l: left, r: product() };
    }
    return left;
  }
  const e = sum();
  if (i < toks.length) throw new Error(`unexpected "${toks[i].v}" after the end of the formula`);
  return e;
}

const OPNAME = { '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV' };
const OPSYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };

function gen(node, code, temps) {
  const ref = (n) => (n.kind === 'num' ? `#${n.v}` : n.v);
  if (node.kind !== 'bin') { code.push(`LOAD ${ref(node)}`); return; }
  if (node.r.kind !== 'bin') {
    gen(node.l, code, temps);
    code.push(`${OPNAME[node.op]} ${ref(node.r)}`);
  } else {
    gen(node.r, code, temps);
    const t = `T${++temps.n}`;
    code.push(`STORE ${t}`);
    gen(node.l, code, temps);
    code.push(`${OPNAME[node.op]} ${t}`);
  }
}

function evaluate(n) {
  if (n.kind === 'num') return n.v;
  if (n.kind === 'var') return VARS[n.v];
  const l = evaluate(n.l), r = evaluate(n.r);
  if (n.op === '+') return l + r;
  if (n.op === '-') return l - r;
  if (n.op === '*') return l * r;
  return r === 0 ? NaN : Math.trunc(l / r);
}

function layout(node) {
  // in-order x positions, depth y
  let x = 0;
  const nodes = [], edges = [];
  function walk(n, depth) {
    const me = { n, depth };
    if (n.kind === 'bin') { const l = walk(n.l, depth + 1); me.x = x++; const r = walk(n.r, depth + 1); edges.push([me, l], [me, r]); }
    else me.x = x++;
    nodes.push(me);
    return me;
  }
  walk(node, 0);
  const width = x, depth = Math.max(...nodes.map((m) => m.depth)) + 1;
  return { nodes, edges, width, depth };
}

export class ExpressionCompiler extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.src = '(a + b) * 3 - c';
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${baseStyles}
        input.src {
          width: 100%; box-sizing: border-box; font: 18px var(--serif, serif); color: var(--heading, #f4f0ff);
          background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 10px 14px; letter-spacing: 0.04em;
        }
        input.src:focus { outline: 2px solid var(--accent, #8b5cf6); outline-offset: 2px; }
        .stages { display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 12px; margin-top: 12px; }
        .stage { background: var(--bg, #0d0a1c); border: 1px solid var(--border, #221c40); border-radius: 4px; padding: 12px 14px; min-height: 200px; }
        .stage h4 { margin: 0 0 10px; font: 500 10.5px var(--sans, sans-serif); letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent, #8b5cf6); }
        .toks { display: flex; flex-wrap: wrap; gap: 6px; }
        .tok { padding: 4px 8px; border-radius: 3px; border: 1px solid var(--border, #221c40); font: 13px ui-monospace, Menlo, monospace; color: var(--text, #d9d2f0); }
        .tok.num { color: var(--fire, #f2b35b); } .tok.var { color: var(--heading, #f4f0ff); } .tok.op { color: var(--accent, #8b5cf6); }
        svg { width: 100%; height: auto; }
        .edge { stroke: #4a3f78; stroke-width: 1.5; }
        .node circle { fill: var(--panel, #110d24); stroke: var(--muted, #8d84ad); stroke-width: 1.5; }
        .node.bin circle { stroke: var(--accent, #8b5cf6); }
        .node text { font: 600 13px var(--sans, sans-serif); fill: var(--heading, #f4f0ff); text-anchor: middle; dominant-baseline: central; }
        .node.num text { fill: var(--fire, #f2b35b); }
        ol { margin: 0; padding: 0 0 0 1.6em; font: 13px/1.7 ui-monospace, Menlo, monospace; color: var(--text, #d9d2f0); }
        ol li::marker { color: var(--muted, #8d84ad); }
        .err { color: #e8a0a0; font-size: 13px; }
        .vals { font-size: 12px; color: var(--muted, #8d84ad); margin-top: 8px; }
        @media (max-width: 640px) { .stages { grid-template-columns: 1fr; } .stage { min-height: 0; } }
      </style>
      <input class="src" type="text" value="${this.src}" spellcheck="false" aria-label="Formula">
      <div class="vals">Names stand for: ${Object.entries(VARS).map(([k, v]) => `${k} = ${v}`).join(', ')}. The machine has one accumulator and as many temporary rows as it needs.</div>
      <div class="stages">
        <div class="stage"><h4>1 · Words</h4><div class="toks"></div></div>
        <div class="stage"><h4>2 · Tree</h4><div class="tree"></div></div>
        <div class="stage"><h4>3 · Instructions</h4><ol class="code"></ol></div>
      </div>
      <p class="readout" aria-live="polite"></p>
    `;
    this.shadowRoot.querySelector('input.src').addEventListener('input', (e) => { this.src = e.target.value; this.update(); });
    this.update();
  }

  update() {
    const root = this.shadowRoot;
    const toksEl = root.querySelector('.toks'), treeEl = root.querySelector('.tree'), codeEl = root.querySelector('.code'), out = root.querySelector('.readout');
    let toks;
    try {
      toks = tokenize(this.src);
      toksEl.innerHTML = toks.map((t) => `<span class="tok ${t.t}">${t.t === 'op' ? OPSYM[t.v] ?? t.v : t.v}</span>`).join('') || '<span class="muted">nothing yet</span>';
    } catch (e) {
      toksEl.innerHTML = `<span class="err">${e.message}</span>`; treeEl.innerHTML = ''; codeEl.innerHTML = ''; out.textContent = ''; return;
    }
    if (!toks.length) { treeEl.innerHTML = ''; codeEl.innerHTML = ''; out.textContent = 'Type a formula.'; return; }
    let tree;
    try { tree = parse(toks); }
    catch (e) { treeEl.innerHTML = `<span class="err">${e.message}</span>`; codeEl.innerHTML = ''; out.textContent = 'The words are fine but they do not make a formula.'; return; }

    const { nodes, edges, width, depth } = layout(tree);
    const W = Math.max(200, width * 44), H = depth * 54 + 20;
    const px = (m) => 22 + m.x * ((W - 44) / Math.max(width - 1, 1));
    const py = (m) => 24 + m.depth * 54;
    treeEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Parse tree">
      ${edges.map(([p, c]) => `<line class="edge" x1="${px(p)}" y1="${py(p)}" x2="${px(c)}" y2="${py(c)}"></line>`).join('')}
      ${nodes.map((m) => `<g class="node ${m.n.kind}"><circle cx="${px(m)}" cy="${py(m)}" r="15"></circle><text x="${px(m)}" y="${py(m)}">${m.n.kind === 'bin' ? OPSYM[m.n.op] : m.n.v}</text></g>`).join('')}
    </svg>`;

    const code = [], temps = { n: 0 };
    gen(tree, code, temps);
    codeEl.innerHTML = code.map((c) => `<li>${c.replace('#', '')}</li>`).join('');
    const val = evaluate(tree);
    const ops = nodes.filter((m) => m.n.kind === 'bin').length;
    out.innerHTML = `${toks.length} words, a tree with ${ops} operation${ops === 1 ? '' : 's'}, ${code.length} instructions and ${temps.n} temporary row${temps.n === 1 ? '' : 's'}. With the values above the answer is <strong>${Number.isNaN(val) ? 'undefined (division by zero)' : val}</strong>. <span class="muted">${ops > 1 ? 'The tree, not the left-to-right order of the words, decided what happens first.' : ''}</span>`;
  }
}
