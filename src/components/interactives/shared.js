// Styles shared by every interactive: controls, readouts, small type.
// Colours come from the page's CSS custom properties, which inherit into
// shadow roots, so the components match the site palette automatically.
export const baseStyles = /* css */ `
  :host {
    display: block;
    font-family: var(--sans, sans-serif);
    font-size: 14px;
    line-height: 1.45;
    color: var(--text, #d9d2f0);
  }
  *, *::before, *::after { box-sizing: border-box; }
  svg { display: block; width: 100%; height: auto; }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    margin-top: 14px;
  }
  button {
    appearance: none;
    font: 500 13px/1 var(--sans, sans-serif);
    letter-spacing: 0.02em;
    color: var(--heading, #f4f0ff);
    background: transparent;
    border: 1px solid var(--border, #221c40);
    border-radius: 4px;
    padding: 9px 13px;
    cursor: pointer;
    transition: border-color 140ms ease, background-color 140ms ease;
  }
  button:hover { border-color: var(--accent, #8b5cf6); }
  button.primary { border-color: var(--accent, #8b5cf6); }
  button.primary:hover { background: var(--accent, #8b5cf6); }
  button:disabled { opacity: 0.45; cursor: default; }
  button:disabled:hover { border-color: var(--border, #221c40); background: transparent; }
  button:focus-visible, label:focus-within {
    outline: 2px solid var(--accent, #8b5cf6);
    outline-offset: 3px;
  }
  label.toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted, #8d84ad);
    cursor: pointer;
    user-select: none;
  }
  label.toggle input {
    accent-color: var(--accent, #8b5cf6);
    width: 15px;
    height: 15px;
    margin: 0;
  }
  select {
    font: 400 13px/1.2 var(--sans, sans-serif);
    color: var(--text, #d9d2f0);
    background: var(--bg, #0d0a1c);
    border: 1px solid var(--border, #221c40);
    border-radius: 4px;
    padding: 7px 9px;
  }
  .readout {
    margin-top: 14px;
    min-height: 1.5em;
    color: var(--muted, #8d84ad);
    font-size: 13.5px;
  }
  .readout strong { color: var(--heading, #f4f0ff); font-weight: 500; }
  .readout em { color: var(--text, #d9d2f0); font-style: italic; font-family: var(--serif, serif); font-size: 15px; }
  .muted { color: var(--muted, #8d84ad); }
  .mono { font-variant-numeric: tabular-nums; }
  .spacer { flex: 1 1 auto; }
`;

/** True when the visitor prefers reduced motion. */
export function reducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
