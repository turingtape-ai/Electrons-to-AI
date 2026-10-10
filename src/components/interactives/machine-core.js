// The small machine from Chapter 8, shared by the interactives that assemble
// and run programs for it. Instruction = opcode × 16 + address; values 0..127.
export const OPS = ['HALT', 'LOAD', 'ADD', 'SUB', 'STORE', 'JUMP', 'JZ', 'OUT'];

export function decode(v) {
  const code = Math.floor(v / 16);
  return { code, op: OPS[code] ?? null, a: v % 16 };
}

export function encode(op, a = 0) {
  return OPS.indexOf(op) * 16 + a;
}

/** Run a 16-row memory image to completion. Returns { output, steps, halted, mem }. */
export function run(memIn, maxSteps = 1000) {
  const mem = memIn.slice();
  let pc = 0, acc = 0, steps = 0;
  const output = [];
  while (steps < maxSteps) {
    const { op, a } = decode(mem[pc]);
    steps++;
    let next = (pc + 1) % 16;
    if (op === 'HALT' || op === null) return { output, steps, halted: true, mem };
    if (op === 'LOAD') acc = mem[a];
    if (op === 'ADD') acc = (acc + mem[a]) % 128;
    if (op === 'SUB') acc = (acc - mem[a] + 128) % 128;
    if (op === 'STORE') mem[a] = acc;
    if (op === 'JUMP') next = a;
    if (op === 'JZ' && acc === 0) next = a;
    if (op === 'OUT') output.push(acc);
    pc = next;
  }
  return { output, steps, halted: false, mem };
}

/**
 * Two-pass assembler. Lines: [label:] MNEMONIC [operand] | [label:] number.
 * Operands may be names or numbers. Returns { mem, listing, errors }.
 */
export function assemble(text) {
  const lines = text.split('\n');
  const items = [];
  const labels = {};
  const errors = [];
  let row = 0;
  lines.forEach((raw, i) => {
    const line = raw.replace(/;.*$/, '').trim();
    if (!line) return;
    let rest = line;
    let label = null;
    const m = rest.match(/^([A-Za-z_]\w*)\s*:\s*(.*)$/);
    if (m) { label = m[1]; rest = m[2].trim(); }
    if (label) {
      if (labels[label] !== undefined) errors.push(`line ${i + 1}: "${label}" is named twice`);
      labels[label] = row;
    }
    if (!rest) { if (label) items.push({ line: i + 1, label, kind: 'empty', row }); return; }
    if (row >= 16) { errors.push(`line ${i + 1}: the machine has only 16 rows`); return; }
    const parts = rest.split(/\s+/);
    if (/^\d+$/.test(parts[0])) {
      items.push({ line: i + 1, label, kind: 'data', value: +parts[0], row, src: rest });
    } else {
      const op = parts[0].toUpperCase();
      if (!OPS.includes(op)) { errors.push(`line ${i + 1}: "${parts[0]}" is not an instruction`); return; }
      items.push({ line: i + 1, label, kind: 'instr', op, operand: parts[1] ?? null, row, src: rest });
    }
    row++;
  });
  const mem = new Array(16).fill(0);
  const listing = [];
  for (const it of items) {
    if (it.kind === 'empty') continue;
    let value = 0;
    if (it.kind === 'data') {
      value = it.value;
      if (value > 127) errors.push(`line ${it.line}: ${value} does not fit in a row (0 to 127)`);
    } else {
      let a = 0;
      const needs = !(it.op === 'HALT' || it.op === 'OUT');
      if (needs) {
        if (it.operand === null) { errors.push(`line ${it.line}: ${it.op} needs a row or a name`); }
        else if (/^\d+$/.test(it.operand)) a = +it.operand;
        else if (labels[it.operand] !== undefined) a = labels[it.operand];
        else errors.push(`line ${it.line}: no row is named "${it.operand}"`);
        if (a > 15) errors.push(`line ${it.line}: row ${a} does not exist`);
      }
      value = encode(it.op, a & 15);
    }
    mem[it.row] = value & 127;
    listing.push({ row: it.row, label: it.label, src: it.src, value: mem[it.row] });
  }
  return { mem, listing, errors };
}
