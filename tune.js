// Temporary CRT tuning panel. It appears in preview copies of the site (localhost, the GitHub
// Pages preview), never on uclaisi.org, and only changes the viewer's own browser. Once the
// settings are final, copy them into CRT_DEFAULTS in script.js, then delete this file and its
// <script> tag in index.html.
(() => {
  "use strict";

  const api = window.UCLAISI_CRT; // set up by script.js, and only in preview copies
  if (!api) return;

  const MODES = ["none", "roll", "glitch", "both"];
  // [setting, label, min, max, step, unit]
  const GROUPS = [
    ["Screen", [
      ["warp", "Bulge", 0, 0.08, 0.002, ""],
      ["glow", "Glow", 0, 100, 1, "%"],
      ["bloom", "Bloom", 0, 100, 1, "%"],
      ["scanlines", "Scanlines", 0, 0.5, 0.01, ""],
      ["vignette", "Edge darkness", 0, 0.6, 0.01, ""],
    ]],
    ["Roll", [
      ["rollSpeed", "Time per pass", 2, 30, 0.5, "s"],
      ["rollBright", "Brightness", 1, 1.6, 0.01, "×"],
      ["rollHeight", "Band height", 4, 60, 1, "%"],
      ["rollLine", "Edge line", 0, 0.4, 0.01, ""],
    ]],
    ["Glitch", [
      ["glitchEvery", "Every (average)", 1, 30, 0.5, "s"],
      ["glitchLength", "Length", 40, 800, 10, "ms"],
      ["glitchShift", "Jolt", 0, 60, 1, "px"],
      ["glitchSlices", "Slices", 1, 20, 1, ""],
      ["glitchSpread", "Spread", 2, 100, 1, "%"],
      ["glitchTear", "Tear lines", 0, 1, 0.01, ""],
      ["glitchRGB", "Colour split", 0, 6, 0.1, "px"],
    ]],
  ];

  const css = `
    .tune-toggle, .tune { position: fixed; z-index: 40; font: 12px/1.4 var(--font); color: #ECE8EF; }
    .tune-toggle { top: 10px; right: 12px; padding: 3px 9px; background: #0E0B12; border: 1px solid #4F4856;
      border-radius: 6px; cursor: pointer; }
    .tune-toggle:hover { border-color: #B98FD6; }
    .tune { top: 10px; right: 12px; width: 300px; max-height: calc(100vh - 20px); overflow-y: auto;
      padding: 12px 14px; background: rgba(14, 11, 18, 0.97); border: 1px solid #B98FD6; border-radius: 8px;
      text-shadow: none; }
    .tune[hidden], .tune-toggle[hidden] { display: none; }
    .tune header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .tune header b { color: #B98FD6; }
    .tune h4 { margin: 12px 0 4px; font-size: 12px; color: #B98FD6; }
    .tune .row { display: grid; grid-template-columns: 1fr 120px 52px; gap: 6px; align-items: center; margin: 3px 0; }
    .tune .row span:last-child { text-align: right; color: #B5AEBC; font-variant-numeric: tabular-nums; }
    .tune .row.changed span:first-child::after { content: " •"; color: #E2B45C; }
    .tune input[type=range] { width: 100%; accent-color: #B98FD6; }
    .tune .modes, .tune .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .tune button { font: inherit; color: inherit; background: #1E1924; border: 1px solid #4F4856;
      border-radius: 5px; padding: 3px 8px; cursor: pointer; }
    .tune button:hover { border-color: #B98FD6; }
    .tune button.on { background: #500778; border-color: #B98FD6; }
    .tune .actions { margin-top: 14px; }
    .tune p { margin: 10px 0 0; color: #8B8492; }
    .tune .x { border: 0; background: none; padding: 0 2px; color: #8B8492; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const decimals = (step) => (String(step).split(".")[1] || "").length;

  const toggle = el("button", "tune-toggle", "⚙ tune CRT");
  const panel = el("div", "tune");
  panel.hidden = true;

  // Header
  const header = el("header");
  const close = el("button", "x", "✕");
  header.append(el("b", "", "CRT tuning · preview only"), close);
  panel.append(header);

  // Mode buttons
  panel.append(el("h4", "", "Mode"));
  const modes = el("div", "modes");
  const modeButtons = MODES.map((m) => {
    const b = el("button", "", m);
    b.addEventListener("click", () => {
      api.set({ mode: m });
      refresh();
    });
    modes.append(b);
    return [m, b];
  });
  panel.append(modes);

  // Sliders
  const rows = [];
  for (const [title, settings] of GROUPS) {
    panel.append(el("h4", "", title));
    for (const [key, label, min, max, step, unit] of settings) {
      const row = el("label", "row");
      const range = el("input");
      Object.assign(range, { type: "range", min, max, step });
      const value = el("span");
      row.append(el("span", "", label), range, value);
      range.addEventListener("input", () => {
        api.set({ [key]: Number(range.value) });
        refresh();
      });
      panel.append(row);
      rows.push({ key, row, range, value, step, unit });
    }
  }

  // Actions
  const actions = el("div", "actions");
  const glitchNow = el("button", "", "Glitch now");
  const reset = el("button", "", "Reset");
  const copy = el("button", "", "Copy settings");
  actions.append(glitchNow, reset, copy);
  panel.append(actions);
  panel.append(el("p", "", "Changes only affect this browser. Copy the settings and send them over to make them the site's defaults. • marks a changed value."));

  glitchNow.addEventListener("click", () => api.glitchNow());
  reset.addEventListener("click", () => {
    api.reset();
    refresh();
  });
  copy.addEventListener("click", async () => {
    const text = JSON.stringify(api.get(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = "Copied!";
    } catch {
      window.prompt("Copy these settings:", text);
    }
    setTimeout(() => { copy.textContent = "Copy settings"; }, 1500);
  });

  function refresh() {
    const now = api.get();
    for (const [m, b] of modeButtons) b.classList.toggle("on", now.mode === m);
    for (const { key, row, range, value, step, unit } of rows) {
      range.value = now[key];
      value.textContent = `${Number(now[key]).toFixed(decimals(step))}${unit}`;
      row.classList.toggle("changed", now[key] !== api.defaults[key]);
    }
  }

  function open(show) {
    panel.hidden = !show;
    toggle.hidden = show;
    try { localStorage.setItem("crt-tune-open", show ? "1" : ""); } catch {}
  }
  toggle.addEventListener("click", () => open(true));
  close.addEventListener("click", () => open(false));

  document.body.append(toggle, panel);
  refresh();
  let wasOpen = false;
  try { wasOpen = localStorage.getItem("crt-tune-open") === "1"; } catch {}
  open(wasOpen);
})();
