// The terminal. Everything is drawn as text on a character grid sized to the window,
// and redrawn when the window changes size. All of the words come from content.js.
(() => {
  "use strict";

  const screen = document.getElementById("screen");
  const welcome = document.getElementById("welcome");
  const log = document.getElementById("log");
  const composer = document.getElementById("composer");
  const input = document.getElementById("prompt");
  const mirror = document.getElementById("mirror");
  const below = document.getElementById("below");

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const baseTitle = document.title;
  // Running locally: show items marked `status: "draft"` / `"todo"` in content.js, with a tag.
  // On the live site they're hidden until the status is removed.
  const PREVIEW = ["localhost", "127.0.0.1", ""].includes(location.hostname);
  // (non-breaking spaces so a tag never wraps across lines)
  const STATUS_TAG = { draft: "draft\u00a0·\u00a0needs\u00a0approval", todo: "todo\u00a0·\u00a0needs\u00a0info" };
  const visible = (item) => !item.status || PREVIEW;

  const MAX_TEXT = 140; // replies run to the window edge, up to this many columns
  const SPINNER = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
  const VERBS = ["Aligning", "Interpreting", "Red-teaming", "Evaluating", "Probing", "Overseeing", "Reading the paper", "Steering"];
  const ART = [
    " █████╗ ██╗███████╗██╗",
    "██╔══██╗██║██╔════╝██║",
    "███████║██║███████╗██║",
    "██╔══██║██║╚════██║██║",
    "██║  ██║██║███████║██║",
    "╚═╝  ╚═╝╚═╝╚══════╝╚═╝",
  ];

  const byName = new Map();
  for (const page of PAGES) {
    for (const name of [page.id, ...(page.aliases || [])]) byName.set(name, page);
  }

  const MENU = [
    ...PAGES.map((p) => ({ name: p.id, aliases: p.aliases || [], desc: p.desc })),
    { name: "crt", aliases: [], desc: "turn the CRT screen effect on or off" },
    { name: "help", aliases: [], desc: "list commands" },
    { name: "clear", aliases: ["home"], desc: "clear the conversation" },
  ];

  let cols = 80;
  let artScale = 1; // art font size ÷ grid font size
  let qr = null; // the WhatsApp QR code as lines of text, once loaded
  const turns = [];
  let started = false; // true once the visitor sends something; the welcome tips then make way

  // ---------- Text grid ----------
  // A line is an array of segments: { t: text, c?: class, cmd?: command, href?: url, fill?: text }.

  const seg = (t, c = "") => ({ t, c });
  const cmd = (command, label = command, c = "") => ({ t: label, cmd: command, c });
  const spaces = (n) => seg(" ".repeat(Math.max(0, n)));
  const len = (segs) => segs.reduce((n, s) => n + s.t.length, 0);
  const asSegs = (p) => (typeof p === "string" ? (p ? [seg(p)] : []) : p);
  const padTo = (segs, width) => [...segs, spaces(width - len(segs))];

  function center(segs, width) {
    const left = Math.floor((width - len(segs)) / 2);
    return [spaces(left), ...segs, spaces(width - left - len(segs))];
  }

  // **bold**, [label](url) and `/command`
  function parse(text, c = "") {
    const out = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)|`(\/[a-z]+)`|\*\*([^*]+)\*\*/g;
    let last = 0;
    for (let m; (m = re.exec(text)); last = re.lastIndex) {
      if (m.index > last) out.push(seg(text.slice(last, m.index), c));
      if (m[1]) out.push({ t: m[1], href: m[2] });
      else if (m[3]) out.push(cmd(m[3]));
      else out.push(seg(m[4], `${c} b`.trim()));
    }
    if (last < text.length) out.push(seg(text.slice(last), c));
    return out;
  }

  // Word-wrap segments to `width` columns. `first` prefixes the first line, `rest` the others.
  function wrap(segs, width, first = "", rest = first) {
    const tokens = [];
    for (const s of segs) {
      for (const part of s.t.split(/( +)/)) if (part) tokens.push({ ...s, t: part, src: s });
    }
    const lines = [];
    let line, used, fresh;
    const start = (prefix) => {
      line = [...asSegs(prefix)];
      used = len(line);
      fresh = true;
    };
    start(first);

    let gap = null; // spaces waiting to see if the next word fits
    for (let tok of tokens) {
      if (/^ +$/.test(tok.t)) {
        if (!fresh) gap = tok;
        continue;
      }
      const g = gap ? gap.t.length : 0;
      if (!fresh && used + g + tok.t.length > width) {
        lines.push(line);
        start(rest);
      } else if (gap && !fresh) {
        line.push(gap);
        used += g;
      }
      gap = null;
      while (fresh && used + tok.t.length > width) { // a word longer than the line
        const room = Math.max(1, width - used);
        line.push({ ...tok, t: tok.t.slice(0, room) });
        tok = { ...tok, t: tok.t.slice(room) };
        lines.push(line);
        start(rest);
      }
      if (tok.t) {
        line.push(tok);
        used += tok.t.length;
        fresh = false;
      }
    }
    lines.push(line);
    return lines.map(joinRuns);
  }

  // After wrapping, put neighbouring words from the same segment back together, so a link is
  // one element per line instead of one per word.
  function joinRuns(line) {
    const out = [];
    for (const s of line) {
      const prev = out[out.length - 1];
      if (prev && s.src && prev.src === s.src) out[out.length - 1] = { ...prev, t: prev.t + s.t };
      else out.push(s);
    }
    return out;
  }

  function box(rows, width, title) {
    const inner = width - 2;
    return [
      [seg("╭─── ", "bd"), seg(title, "bt"), seg(` ${"─".repeat(Math.max(0, inner - 5 - title.length))}╮`, "bd")],
      ...rows.map((r) => [seg("│ ", "bd"), ...padTo(r, width - 4), seg(" │", "bd")]),
      [seg(`╰${"─".repeat(inner)}╯`, "bd")],
    ];
  }

  const DECOR = /\b(bd|vr|art|qr)\b/;

  // Links that wrap onto several lines become several elements; give them a shared group id.
  const linkGroups = new WeakMap();
  let nextGroup = 0;
  function groupOf(src) {
    if (!linkGroups.has(src)) linkGroups.set(src, String(++nextGroup));
    return linkGroups.get(src);
  }

  function segEl(s) {
    if (s.art) return artSlot(s);
    let node;
    if (s.href) {
      node = document.createElement("a");
      node.href = s.href;
      node.target = "_blank";
      node.rel = "noopener noreferrer";
      node.className = "link";
    } else if (s.cmd || s.fill) {
      node = document.createElement("a");
      node.href = s.cmd && s.cmd.startsWith("/") ? `#${s.cmd.trim().replace(/\s+/g, "/")}` : "#";
      node.className = `cmd ${s.c || ""}`.trim();
      if (s.cmd) node.dataset.cmd = s.cmd;
      else node.dataset.fill = s.fill;
    } else if (s.c) {
      node = document.createElement("span");
      node.className = s.c;
      if (DECOR.test(s.c)) node.setAttribute("aria-hidden", "true");
    } else {
      return document.createTextNode(s.t);
    }
    node.textContent = s.t;
    if (s.src && (s.href || s.cmd)) node.dataset.group = groupOf(s.src);
    return node;
  }

  // Art is drawn at its own (larger) size so it stays legible, while the grid text is smaller.
  // Inside the grid, `s.t` reserves the columns and `s.rows` grid lines are left blank under it;
  // the art is laid over that space so box borders on either side stay unbroken.
  function artSlot(s) {
    const slot = span("art-slot", s.t);
    slot.setAttribute("aria-hidden", "true");
    const box = span("art-box", "");
    box.style.height = `${s.rows * 1.15}em`;
    box.append(span(`art ${s.c}`, s.art.join("\n")));
    slot.append(box);
    return slot;
  }

  function lineEl(segs, cls) {
    const div = document.createElement("div");
    div.className = cls ? `ln ${cls}` : "ln";
    if (segs.art) { // art outside the grid (the QR code) is its own block
      div.classList.add("art-block");
      div.setAttribute("aria-hidden", "true");
      div.append(span(`art ${segs.c}`, segs.art.join("\n")));
    } else if (!len(segs)) div.textContent = " ";
    else for (const s of segs) if (s.t) div.append(segEl(s));
    return div;
  }

  // ---------- Screens ----------

  // Upcoming events: Luma's (events.js, written by sync_luma.py) plus any added by hand in
  // content.js. Past events drop off by themselves, even if the snapshot is old.
  function upcomingEvents() {
    const luma = typeof LUMA_EVENTS === "undefined" ? [] : LUMA_EVENTS;
    const now = Date.now();
    const at = (ev) => (ev.start ? Date.parse(ev.start) : Infinity);
    return [...luma, ...EVENTS]
      .filter((ev) => !ev.start || Date.parse(ev.end || ev.start) > now)
      .map((ev) => ({ ...ev, when: ev.start ? formatWhen(ev.start) : ev.date }))
      .sort((a, b) => (at(a) === at(b) ? 0 : at(a) < at(b) ? -1 : 1));
  }

  // "Thu 8 Oct · 18:00", in London time wherever the visitor is
  function formatWhen(iso) {
    const parts = {};
    const format = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
    for (const { type, value } of format.formatToParts(new Date(iso))) parts[type] = value;
    return `${parts.weekday} ${parts.day} ${parts.month} · ${parts.hour}:${parts.minute}`;
  }

  // One event per line: when, then the title (linked to its Luma page).
  function eventLines(events, W, first, indent) {
    const w = Math.max(...events.map((ev) => ev.when.length)) + 2;
    return events.flatMap((ev, i) => wrap(
      [ev.url ? { t: ev.title, href: ev.url } : seg(ev.title), ...(ev.place ? [seg(`  ${ev.place}`, "dim")] : [])],
      W,
      [seg(i ? indent : first), seg(ev.when.padEnd(w), "acc")],
      indent + " ".repeat(w),
    ));
  }

  function welcomeLines() {
    const inner = cols - 4;
    const artRows = Math.ceil(ART.length * artScale);
    const left = (w) => [
      [],
      [seg("Welcome to", "b")], // the logo below finishes the sentence: Welcome to / U C L / AISI
      [seg("U C L", "acc2")],
      [{ t: " ".repeat(w), art: ART, rows: artRows, c: "logo" }],
      ...Array.from({ length: artRows - 1 }, () => []),
      [],
      [seg("UCL AI Safety Initiative", "dim")],
      [seg(SITE.cwd, "dim")],
    ];
    // As many upcoming events as fit in `room` lines, plus a pointer to /events for the rest.
    const comingUp = (w, room) => {
      const events = upcomingEvents();
      if (!events.length) return wrap([seg(`${SITE.term} — nothing scheduled yet`, "dim")], w);
      for (let n = events.length; n > 0; n--) {
        const lines = eventLines(events.slice(0, n), w, "", "");
        const more = n < events.length ? [[cmd("/events"), seg(` for ${events.length - n} more`, "dim")]] : [];
        if (lines.length + more.length <= room || n === 1) return [...lines, ...more];
      }
    };
    // Before the first message: tips, then the next few events. After it, the tips are gone and
    // Coming up takes the whole column.
    const tips = (w, room) => (started
      ? [[seg("Coming up", "acc b")], ...comingUp(w, room - 1)]
      : [
        [seg("Tips for getting started", "acc b")],
        ...wrap([cmd("/start"), seg(" if you're new to AI safety")], w),
        ...wrap([seg("Ask anything, e.g. "), cmd(SITE.suggestion)], w),
        ...wrap([cmd("/help"), seg(" to see everything I can do")], w),
        [seg("─".repeat(w), "vr")],
        [seg("Coming up", "acc b")],
        ...(upcomingEvents().length
          ? eventLines(upcomingEvents().slice(0, 3), w, "", "")
          : wrap([seg(`${SITE.term} — nothing scheduled yet`, "dim")], w)),
      ]);

    let rows;
    if (inner >= 72) {
      const lw = Math.max(32, Math.ceil(ART[0].length * artScale) + 6);
      const rw = inner - lw - 3;
      const l = left(lw);
      const right = [[], ...tips(rw, l.length - 1)];
      const height = Math.max(l.length, right.length);
      rows = Array.from({ length: height }, (_, i) =>
        [...center(l[i] || [], lw), seg(" │ ", "vr"), ...padTo(right[i] || [], rw)]);
    } else {
      rows = [...left(inner).map((l) => center(l, inner)), [], ...tips(inner, 6), []];
    }
    return box(rows, cols, "UCLAISI v26.27");
  }

  function userLines(text) {
    return wrap([seg(text, "t2")], cols, [seg("❯", "dim glyph"), seg(" ")], "  ");
  }

  function blockLines(b, W, lead) {
    if (b.h) return wrap([seg(b.h, "b")], W, lead, "  ");
    if (b.p) return wrap(parse(b.p), W, lead, "  ");
    if (b.dim) return wrap(parse(b.dim, "dim"), W, lead, "  ");
    if (b.list) {
      return b.list.flatMap(([title, text], i) => [
        ...(i ? [[]] : []),
        ...wrap([seg(title, "b")], W, [seg(i ? "  " : lead), seg(String(i + 1).padStart(2, "0"), "dim"), seg("  ")], "      "),
        ...wrap(parse(text, "t2"), W, "      "),
      ]);
    }
    if (b.rows) {
      const w = Math.max(...b.rows.map(([c]) => c.length)) + 3;
      return b.rows.flatMap(([c, desc], i) =>
        wrap([seg(desc, "t2")], W, [seg(i ? "  " : lead), cmd(c), spaces(w - c.length)], " ".repeat(2 + w)));
    }
    if (b.files) {
      return wrap(b.files.flatMap(([label, c], i) => [...(i ? [seg("   ")] : []), cmd(c, label)]), W, lead, "  ");
    }
    if (b.links) {
      const w = Math.max(...b.links.map(([label]) => label.length)) + 3;
      return b.links.map(([label, href], i) =>
        [seg(i ? "  " : lead), seg(label.padEnd(w), "dim"), { t: href.replace(/^(https?:\/\/|mailto:)/, ""), href }]);
    }
    if (b.note) return wrap([seg(b.note, "warn")], W, lead, "  ");
    if (b.tracks) {
      const names = Object.keys(TRACKS).map((k) => `/start ${k}`);
      const w = Math.max(...names.map((n) => n.length)) + 3;
      return Object.entries(TRACKS).flatMap(([key, track], i) =>
        wrap([seg(track.blurb, "t2")], W, [seg(i ? "  " : lead), cmd(`/start ${key}`), spaces(w - names[i].length)], " ".repeat(2 + w)));
    }
    if (b.sessions) {
      return wrap([seg("Good sessions to try: ", "t2"), seg(b.sessions.join(", "))], W, lead, "  ");
    }
    if (b.readings) {
      const shown = b.readings.filter(visible);
      if (!shown.length) return wrap([seg(b.empty, "t2")], W, lead, "  ");
      return shown.flatMap((r, i) => [
        ...(i ? [[]] : []),
        ...wrap([seg(r.title, "b"), seg(`  ${r.by}`, "dim"), ...tag(r)], W,
          [seg(i ? "  " : lead), seg(String(i + 1).padStart(2, "0"), "dim"), seg("  ")], "      "),
        ...(r.url ? [[seg("      "), { t: r.url.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: r.url }]] : []),
        ...wrap([seg(r.why, "t2")], W, "      "),
      ]);
    }
    if (b.team) {
      if (!TEAM.length) return wrap([seg(b.team, "t2")], W, lead, "  ");
      const w = Math.max(...TEAM.map((m) => m.name.length)) + 3;
      return TEAM.flatMap((m, i) => [
        ...wrap([seg(m.role, "t2")], W, [seg(i ? "  " : lead), seg(m.name, "b"), spaces(w - m.name.length)], " ".repeat(2 + w)),
        ...(m.about ? wrap([seg(m.about, "dim")], W, " ".repeat(2 + w)) : []),
      ]);
    }
    if (b.faq) return manLines(b.faq.filter(visible), W);
    if (b.schedule !== undefined) {
      const events = upcomingEvents();
      if (!events.length) return wrap(parse(b.schedule), W, lead, "  ");
      return eventLines(events, W, lead, "  ");
    }
    if (b.qr) {
      // Only on screens wide enough, and not on phones (you can't scan your own screen).
      if (!qr || !finePointer || W < Math.ceil(qr[0].length * artScale) + 4) return [];
      return [[seg(lead), seg(b.caption || "", "dim")], [], Object.assign([], { art: qr, c: "qr" })];
    }
    return [];
  }

  const tag = (item) => (item.status ? [seg("  "), seg(`[${STATUS_TAG[item.status]}]`, "warn")] : []);

  // /faq, laid out like `man` output.
  function manLines(items, W) {
    const name = "UCLAISI(1)";
    const title = "UCLAISI Manual";
    const gap = W - 2 - name.length * 2 - title.length;
    const header = gap >= 2
      ? [seg("  "), seg(name, "b"), spaces(Math.floor(gap / 2)), seg(title, "dim"), spaces(Math.ceil(gap / 2)), seg(name, "b")]
      : [seg("  "), seg(name, "b")];
    const out = [
      header,
      [],
      [seg("  "), seg("NAME", "b")],
      ...wrap([seg("uclaisi - frequently asked questions", "t2")], W, "       "),
      [],
      [seg("  "), seg("QUESTIONS", "b")],
    ];
    items.forEach((item, i) => {
      if (i) out.push([]);
      out.push(...wrap([seg(item.q, "b"), ...tag(item)], W, "       "));
      out.push(...wrap(parse(item.a, item.status === "todo" ? "warn" : ""), W, "           "));
    });
    return out;
  }

  function replyLines(intent) {
    const W = Math.min(cols, MAX_TEXT);
    const out = [];
    if (intent.tool) {
      const [, name, args] = intent.tool.match(/^(\w+)\((.*)\)$/) || [null, intent.tool, ""];
      out.push([seg("● ", intent.error ? "err" : "ok"), seg(name, "b t2"), seg(`(${args})`, "dim")]);
      out.push(...wrap([seg(intent.result, intent.error ? "err" : "dim")], W, [seg("  ⎿  ", "dim")], "     "));
      out.push([]);
    }
    let prev = null;
    for (const b of intent.blocks) {
      if (!visible(b)) continue;
      const lead = prev ? "  " : "● ";
      let lines = blockLines(b, W, b.status ? "  " : lead);
      if (!lines.length) continue;
      if (b.status) lines = [[seg(lead), seg(`[${STATUS_TAG[b.status]}]`, "warn")], ...lines];
      if (prev && !prev.h) out.push([]);
      out.push(...lines);
      prev = b;
    }
    if (intent.next) {
      const links = intent.next.flatMap((id, i) => [...(i ? [seg(" · ", "dim")] : []), cmd(`/${id}`)]);
      out.push([], [seg("  next  ", "dim"), ...links]);
    }
    return out;
  }

  function replyEl(intent) {
    const div = document.createElement("div");
    div.className = "reply";
    div.append(lineEl([]), ...replyLines(intent).map((l) => lineEl(l)));
    return div;
  }

  function renderTurn(turn) {
    const kids = [lineEl([]), ...userLines(turn.text).map((l) => lineEl(l, "user"))];
    if (turn.intent) kids.push(replyEl(turn.intent));
    turn.el.replaceChildren(...kids);
  }

  // What shows under the prompt: the slash-command menu, the shortcuts, or the status line.
  let matches = [];
  let sel = 0;

  function renderBelow() {
    const value = input.value;
    const m = value.match(/^\/(\S*)$/);
    const q = m ? m[1].toLowerCase() : "";
    // Match the command name only. Aliases still work when typed in full (byName resolves
    // them), but listing /luma under "/c" because of its "calendar" alias just looks wrong.
    matches = m ? MENU.filter((c) => c.name.startsWith(q)) : [];
    sel = Math.min(sel, Math.max(0, matches.length - 1));

    let lines;
    if (matches.length) {
      const w = Math.max(...MENU.map((c) => c.name.length)) + 4;
      lines = matches.map((c, i) => {
        const cls = i === sel ? "acc" : "t2";
        return [seg(i === sel ? "› " : "  ", cls), cmd(`/${c.name}`, `/${c.name}`, cls), spaces(w - c.name.length - 1), seg(c.desc, i === sel ? "acc" : "dim")];
      });
    } else if (value === "?") {
      const items = ["/ for commands", "↑ ↓ for history", "tab to autofill", "esc to skip", "ctrl+l to clear", "click any /command"];
      const w = 22;
      const perRow = Math.max(1, Math.floor((cols - 2) / w));
      lines = [];
      for (let i = 0; i < items.length; i += perRow) {
        lines.push([seg("  "), ...items.slice(i, i + perRow).map((t) => seg(t.padEnd(w), "dim"))]);
      }
    } else {
      // Like Claude Code: "? for shortcuts" on the left. The quick commands go on the right,
      // or on their own when both don't fit (phones).
      const nav = [];
      SITE.nav.forEach((id, i) => nav.push(...(i ? [seg("  ")] : []), cmd(`/${id}`)));
      const hint = [seg("  "), { t: "? for shortcuts", fill: "?", c: "dim" }];
      const gap = cols - len(hint) - len(nav);
      lines = [gap >= 2 ? [...hint, spaces(gap), ...nav] : [seg("  "), ...nav]];
    }
    below.replaceChildren(...lines.map((l) => lineEl(l)));
  }

  function measureCols() {
    const probe = document.createElement("span");
    probe.textContent = "─".repeat(100);
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
    screen.append(probe);
    const charWidth = probe.getBoundingClientRect().width / 100;
    probe.remove();
    const style = getComputedStyle(screen);
    const avail = screen.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return Math.max(24, Math.floor(avail / charWidth));
  }

  function measureArtScale() {
    const artSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--art-size"));
    return artSize / parseFloat(getComputedStyle(screen).fontSize) || 1;
  }

  function layout(force) {
    const next = measureCols();
    const scale = measureArtScale();
    if (next === cols && scale === artScale && !force) return;
    cols = next;
    artScale = scale;
    if (task) task.skip();
    renderWelcome();
    turns.forEach(renderTurn);
    renderBelow();
  }

  // ---------- The WhatsApp QR code, redrawn as text ----------

  async function loadQR() {
    const block = PAGES.flatMap((p) => p.blocks).find((b) => b.qr);
    if (!block) return;
    try {
      qr = qrToText(await (await fetch(block.qr)).text());
    } catch {
      // Opened straight from disk (file://) so it can't be fetched. The QR is left out.
    }
  }

  // Reads the SVG's module grid, keeps a 2-module quiet zone, and packs two rows into
  // each line with half-block characters, the way `qrencode -t UTF8` does.
  function qrToText(svg) {
    const size = Number(svg.match(/viewBox="0 0 (\d+)/)[1]);
    const d = svg.match(/class="qrline"[^>]*\sd="([^"]+)"/)[1];
    const dark = Array.from({ length: size }, () => new Array(size).fill(false));
    let x = 0;
    let y = 0;
    for (const [, op, args] of d.matchAll(/([Mmh])([^Mmh]*)/g)) {
      const n = args.trim().split(/[\s,]+/).map(Number);
      if (op === "M") [x, y] = n;
      else if (op === "m") { x += n[0]; y += n[1]; }
      else {
        for (let i = 0; i < n[0]; i++) dark[Math.floor(y)][x + i] = true;
        x += n[0];
      }
    }
    const lo = 2;
    const hi = size - 2;
    const lines = [];
    for (let r = lo; r < hi; r += 2) {
      let line = "";
      for (let c = lo; c < hi; c++) {
        const top = !dark[r][c];
        const bottom = !(dark[r + 1] && dark[r + 1][c]);
        line += top && bottom ? "█" : top ? "▀" : bottom ? "▄" : " ";
      }
      lines.push(line);
    }
    return lines;
  }

  // ---------- Understanding input ----------

  const lineCount = (blocks) =>
    blocks.reduce((n, b) => n + ((b.list || b.faq) ? (b.list || b.faq).length * 3 : b.rows ? b.rows.length : 2), 0);

  function pageIntent(page) {
    return {
      route: page.id,
      title: page.title,
      tool: page.tool || `Read(${page.file})`,
      result: page.result || `Read ${lineCount(page.blocks)} lines`,
      blocks: page.blocks,
      next: page.next,
      opens: page.opens,
    };
  }

  function startIntent(key) {
    const track = TRACKS[key];
    if (!track) return pageIntent(byName.get("start"));
    return {
      route: `start/${key}`,
      title: track.title,
      tool: `Read(start/${key}.md)`,
      result: `Read ${track.readings.length * 3 + 4} lines`,
      blocks: [
        { h: track.title },
        { p: track.blurb },
        { sessions: track.sessions },
        { h: "Start with" },
        { readings: track.readings, empty: "A starter reading list is coming soon." },
      ],
      next: ["events", "faq"],
    };
  }

  function helpIntent() {
    return {
      route: "help",
      title: "Help",
      blocks: [
        { h: "Commands" },
        { rows: MENU.map((c) => [`/${c.name}`, c.desc]) },
        { dim: "Or just ask in plain English, e.g. \"how do I join?\"" },
      ],
    };
  }

  function lsIntent() {
    return {
      tool: "Bash(ls)",
      result: `${PAGES.filter((p) => p.file).length} files`,
      blocks: [{ files: PAGES.filter((p) => p.file).map((p) => [p.file, `/${p.id}`]) }],
    };
  }

  function fallbackIntent() {
    return {
      blocks: [
        { p: "I'm a very small model: I only know about UCLAISI." },
        { p: "Try `/about`, `/programme`, `/events` or `/join`, or `/help` for everything." },
      ],
    };
  }

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Whole-word match, plurals included ("event" matches "events" but "term" doesn't match "terminal").
  const mentions = (text, word) => new RegExp(`(^|[^a-z0-9])${escapeRe(word)}(s|es)?($|[^a-z0-9])`).test(text);

  function resolve(raw) {
    const text = raw.trim().replace(/[‘’]/g, "'");
    const lower = text.toLowerCase();

    if (lower.startsWith("/")) {
      const [name, arg] = lower.slice(1).split(/\s+/);
      if (name === "help") return { ...helpIntent(), quick: true };
      if (name === "crt") return crtIntent(arg);
      if (name === "clear" || name === "home") return { clear: true };
      const page = byName.get(name);
      if (page && page.id === "start" && arg) return { ...startIntent(arg), quick: true };
      if (page) return { ...pageIntent(page), quick: true };
      return { blocks: [{ p: `Unknown command: /${name}` }, { p: "Try `/help` to see what's available." }], quick: true };
    }

    // A few real shell commands, for people who treat it like a terminal.
    const [verb, arg = ""] = lower.split(/\s+/);
    if (verb === "ls" || verb === "dir") return lsIntent();
    if (verb === "clear" || verb === "cls") return { clear: true };
    if (verb === "help" || lower === "?") return helpIntent();
    if (verb === "man") return pageIntent(byName.get("faq"));
    if (["cd", "cat", "open", "less", "more", "head", "vim", "nano"].includes(verb)) {
      const name = arg.replace(/^~?\/?/, "").replace(/\/$/, "").replace(/\.md$/, "");
      if (!name || name === ".." || name === "~") return { clear: true };
      const page = byName.get(name) || PAGES.find((p) => (p.file || "").toLowerCase() === `${name}.md`);
      if (page) return pageIntent(page);
      return {
        tool: `Bash(${text})`,
        result: `${verb}: ${arg}: No such file or directory`,
        error: true,
        blocks: [{ p: "Type ls to see what's here, or `/help` for commands." }],
      };
    }

    for (const s of SMALLTALK) {
      if (s.match.test(lower)) return { tool: s.tool, result: s.result, error: s.error, blocks: [{ p: s.text }] };
    }

    // Plain English: the page whose keywords match best wins. Longer phrases count for more.
    let best = null;
    let bestScore = 0;
    for (const page of PAGES) {
      const score = page.keywords.filter((k) => mentions(lower, k)).reduce((n, k) => n + k.length, 0);
      if (score > bestScore) [best, bestScore] = [page, score];
    }
    return best ? pageIntent(best) : fallbackIntent();
  }

  // ---------- Running a turn ----------

  // A task is one reply in progress. skip() makes it finish instantly.
  function newTask() {
    const wakers = new Set();
    return {
      fast: reducedMotion,
      skip() {
        this.fast = true;
        wakers.forEach((wake) => wake());
      },
      wait(ms) {
        if (this.fast) return Promise.resolve();
        return new Promise((resolve) => {
          const wake = () => { clearTimeout(id); wakers.delete(wake); resolve(); };
          const id = setTimeout(wake, ms);
          wakers.add(wake);
        });
      },
    };
  }

  let queue = Promise.resolve();
  let queued = 0;
  let task = null;
  const past = [];
  let histIdx = 0;
  let draft = "";

  function renderWelcome() {
    welcome.replaceChildren(...welcomeLines().map((l) => lineEl(l)));
  }

  function submit(raw, { fromNav = false } = {}) {
    const text = raw.trim();
    if (!text) return;
    if (!fromNav) past.push(text);
    if (!fromNav && !started) {
      started = true;
      renderWelcome();
    }
    histIdx = past.length;
    draft = "";
    const intent = resolve(text);
    if (intent.opens) {
      // Only for the explicit command (not questions or page loads). It has to happen now,
      // inside the click or keypress, or the browser blocks the new tab.
      const win = fromNav || !intent.quick ? null : window.open(intent.opens, "_blank");
      if (win) win.opener = null;
      intent.result = win ? "Opened in a new tab" : "Use the link below to open it";
    }
    if (task) task.skip();
    renderBelow();
    queued++;
    queue = queue.then(() => execute(text, intent, fromNav)).catch(console.error);
  }

  async function execute(text, intent, fromNav) {
    queued--;
    const t = (task = newTask());
    if (queued > 0) t.fast = true; // more input is waiting behind this one

    if (intent.clear) {
      clearLog();
      if (!fromNav) setRoute(null);
      task = null;
      return;
    }

    const turn = { el: document.createElement("div"), text, intent: null };
    turn.el.className = "turn";
    turns.push(turn);
    renderTurn(turn);
    log.append(turn.el);
    turn.el.scrollIntoView({ block: "start", behavior: t.fast ? "auto" : "smooth" });

    await think(turn.el, t, intent.quick ? 280 : 800);

    turn.intent = intent;
    const reply = replyEl(intent);
    turn.el.append(reply);
    if (intent.route && !fromNav) setRoute(intent.route);
    if (intent.title) document.title = `${intent.title} · ${baseTitle}`;

    await stream(reply, t);
    if (task === t) task = null;
  }

  async function think(parent, t, ms) {
    if (t.fast) return;
    const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
    const blank = lineEl([]);
    const line = lineEl([seg(SPINNER[0], "acc"), seg(` ${verb}…`, "acc"), seg(" (esc to interrupt)", "dim")]);
    const glyph = line.firstChild;
    parent.append(blank, line);
    let i = 0;
    const id = setInterval(() => { glyph.textContent = SPINNER[++i % SPINNER.length]; }, 90);
    await t.wait(ms);
    clearInterval(id);
    blank.remove();
    line.remove();
  }

  // Reveal the reply a few characters at a time, like tokens arriving.
  async function stream(root, t) {
    const steps = [];
    let total = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add("pending");
        steps.push({ el: node });
      } else {
        steps.push({ text: node, full: node.data });
        total += node.data.length;
        node.data = "";
      }
    }

    const perFrame = Math.max(6, Math.ceil(total / 75)); // whole reply in ~1.2s
    let budget = perFrame;
    for (const step of steps) {
      if (step.el) {
        step.el.classList.remove("pending");
        continue;
      }
      for (let i = 0; i < step.full.length;) {
        if (budget <= 0 && !t.fast) {
          await t.wait(16);
          budget = perFrame;
        }
        const take = t.fast ? step.full.length - i : Math.min(budget, step.full.length - i);
        i += take;
        budget -= take;
        step.text.data = step.full.slice(0, i);
      }
    }
  }

  function clearLog() {
    turns.length = 0;
    log.replaceChildren();
    document.title = baseTitle;
    (root.classList.contains("crt-warp") ? screen : window).scrollTo(0, 0);
  }

  // ---------- URLs: every page has one, and back/forward work ----------

  function setRoute(name) {
    if (!name) {
      if (location.hash) history.pushState(null, "", location.pathname + location.search);
      return;
    }
    const hash = `#/${name}`;
    if (location.hash !== hash) history.pushState(null, "", hash);
  }

  // "#/events" -> "events", "#/start/policy" -> "start policy"
  function routeFromHash() {
    const m = location.hash.match(/^#\/([a-z]+)(?:\/([a-z]+))?/);
    if (!m || !(m[1] === "help" || byName.has(m[1]))) return null;
    return m[2] ? `${m[1]} ${m[2]}` : m[1];
  }

  window.addEventListener("popstate", () => {
    const name = routeFromHash();
    submit(name ? `/${name}` : "/clear", { fromNav: true });
  });

  // ---------- Prompt with a block cursor ----------

  function span(cls, text) {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function renderMirror() {
    const focused = document.activeElement === input;
    const value = input.value;
    mirror.replaceChildren();
    if (!value) {
      const ph = input.placeholder;
      if (focused) mirror.append(span("cur", ph[0]), span("dim", ph.slice(1)));
      else mirror.append(span("dim", ph));
      return;
    }
    if (!focused) {
      mirror.textContent = value;
      return;
    }
    const at = input.selectionDirection === "backward" ? input.selectionStart : input.selectionEnd;
    const i = Math.min(at ?? value.length, value.length);
    const cur = span("cur", value[i] || " ");
    mirror.append(value.slice(0, i), cur, value.slice(i + 1));
    const overflow = cur.offsetLeft + cur.offsetWidth - mirror.clientWidth;
    mirror.scrollLeft = Math.max(0, overflow);
  }

  function refocus() {
    if (finePointer) input.focus({ preventScroll: true });
  }

  function setInput(value) {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
    renderBelow();
    renderMirror();
  }

  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value;
    setInput("");
    if (value.trim() !== "?") submit(value);
  });

  input.addEventListener("input", () => {
    sel = 0;
    renderBelow();
    renderMirror();
  });
  for (const type of ["focus", "blur", "select", "click", "keyup"]) input.addEventListener(type, renderMirror);
  document.addEventListener("selectionchange", () => {
    if (document.activeElement === input) renderMirror();
  });

  input.addEventListener("keydown", (e) => {
    const menuOpen = matches.length > 0;

    if (menuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      renderBelow();
    } else if (menuOpen && e.key === "Tab") {
      e.preventDefault();
      setInput(`/${matches[sel].name}`);
    } else if (e.key === "Tab" && !e.shiftKey && !input.value && SITE.suggestion) {
      e.preventDefault(); // Tab on an empty prompt takes the suggestion
      setInput(SITE.suggestion);
    } else if (menuOpen && e.key === "Enter") {
      e.preventDefault();
      const command = `/${matches[sel].name}`;
      setInput("");
      submit(command);
    } else if (e.key === "Escape") {
      if (menuOpen || input.value === "?") setInput("");
      else if (task) task.skip();
    } else if (e.key === "ArrowUp" && histIdx > 0) {
      e.preventDefault();
      if (histIdx === past.length) draft = input.value;
      setInput(past[--histIdx]);
    } else if (e.key === "ArrowDown" && histIdx < past.length) {
      e.preventDefault();
      histIdx++;
      setInput(histIdx === past.length ? draft : past[histIdx]);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      submit("/clear");
    }
  });

  // Typing anywhere goes to the prompt; Esc anywhere skips the current reply.
  document.addEventListener("keydown", (e) => {
    if (e.target === input) return;
    if (e.key === "Escape" && task) task.skip();
    else if (e.target.closest("a, button")) return; // let Enter activate the focused link
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) input.focus({ preventScroll: true });
  });

  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-cmd], [data-fill]");
    if (target) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let modified clicks open #/page in a new tab
      e.preventDefault();
      if (target.dataset.cmd) {
        setInput("");
        submit(target.dataset.cmd);
      } else {
        setInput(input.value === target.dataset.fill ? "" : target.dataset.fill);
      }
      refocus();
      return;
    }
    if (task && e.target.closest("#log")) task.skip();
    if (!e.target.closest("a, input") && !String(getSelection())) refocus();
  });

  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      layout();
      updateWarp();
    });
  });

  // Hovering any piece of a link that wrapped onto several lines highlights all of it.
  for (const [type, on] of [["mouseover", true], ["mouseout", false]]) {
    document.addEventListener(type, (e) => {
      const link = e.target.closest && e.target.closest("[data-group]");
      if (!link) return;
      for (const part of document.querySelectorAll(`[data-group="${link.dataset.group}"]`)) {
        part.classList.toggle("hl", on);
      }
    });
  }

  // ---------- CRT effect (styles in style.css, on/off saved per visitor) ----------

  const root = document.documentElement;
  const WARP = 0.02; // how much the screen bulges: things at the corners move in by 2% of the width
  // Safari (and every iPhone browser) can't run this kind of filter on a live page, and on
  // phones it costs too much, so those get the glow and glass without the bulge.
  const webkit = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent)
    || /iPad|iPhone|iPod/.test(navigator.userAgent);

  function setCrt(on) {
    root.classList.toggle("crt", on);
    try { localStorage.setItem("crt", on ? "on" : "off"); } catch {}
    updateWarp();
    layout();
  }

  function crtIntent(arg) {
    const on = arg === "on" ? true : arg === "off" ? false : !root.classList.contains("crt");
    setCrt(on);
    return {
      quick: true,
      blocks: [{ p: on ? "CRT effect on." : "CRT effect off." }, { dim: `\`/crt\` again to turn it ${on ? "off" : "back on"}.` }],
    };
  }

  // Where the bulge draws the point (x, y) from: a little further out from the centre, more so
  // towards the corners. The displacement map and the click correction both use this.
  function warpOffset(x, y, rect) {
    const u = ((x - rect.left) / rect.width) * 2 - 1;
    const v = ((y - rect.top) / rect.height) * 2 - 1;
    const r2 = u * u + v * v;
    return [(u * WARP * r2 * rect.width) / 2, (v * WARP * r2 * rect.height) / 2];
  }

  function updateWarp() {
    const on = root.classList.contains("crt") && finePointer && !webkit;
    root.classList.toggle("crt-warp", on);
    if (!on) return;

    // Draw the displacement map: red = how far to shift sideways, green = up/down, 50% = none.
    const rect = screen.getBoundingClientRect();
    const n = 128;
    const scale = 2 * WARP * Math.max(rect.width, rect.height); // biggest shift, both directions
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = n;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(n, n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = rect.left + ((i + 0.5) / n) * rect.width;
        const y = rect.top + ((j + 0.5) / n) * rect.height;
        const [dx, dy] = warpOffset(x, y, rect);
        const k = (j * n + i) * 4;
        img.data[k] = Math.round((0.5 + dx / scale) * 255);
        img.data[k + 1] = Math.round((0.5 + dy / scale) * 255);
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const filter = document.getElementById("crt-warp");
    const map = document.getElementById("crt-map");
    for (const el of [filter, map]) {
      el.setAttribute("x", 0);
      el.setAttribute("y", 0);
      el.setAttribute("width", rect.width);
      el.setAttribute("height", rect.height);
    }
    map.setAttribute("href", canvas.toDataURL());
    document.getElementById("crt-displace").setAttribute("scale", scale);
  }

  // The bulge moves what you see, not where things really are. Send each click to whatever is
  // drawn under the pointer instead of what's physically there.
  let remapping = false;
  document.addEventListener("click", (e) => {
    if (remapping || !e.isTrusted || !root.classList.contains("crt-warp")) return;
    const [dx, dy] = warpOffset(e.clientX, e.clientY, screen.getBoundingClientRect());
    const target = document.elementFromPoint(e.clientX + dx, e.clientY + dy);
    if (!target || target === e.target) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    remapping = true;
    target.click();
    remapping = false;
  }, true);

  // ---------- Start ----------

  input.placeholder = `Try "${SITE.suggestion}"`;

  // A different splash line on every visit, never the same one twice in a row.
  // (localStorage can be unavailable, e.g. in private windows; then it's just random.)
  const splash = document.getElementById("splash");
  if (SPLASHES.length) {
    let last = -1;
    try {
      const stored = localStorage.getItem("splash");
      if (stored !== null) last = Number(stored);
    } catch {}
    let pick = Math.floor(Math.random() * SPLASHES.length);
    if (SPLASHES.length > 1 && pick === last) pick = (pick + 1) % SPLASHES.length;
    try { localStorage.setItem("splash", String(pick)); } catch {}
    splash.textContent = SPLASHES[pick];
    splash.hidden = false;
  }
  updateWarp();
  layout(true);
  renderMirror();
  refocus();
  loadQR().finally(() => {
    const start = routeFromHash();
    if (start) submit(`/${start}`, { fromNav: true });
  });
})();
