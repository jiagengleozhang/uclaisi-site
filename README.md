# UCLAISI terminal site

A redesign of [uclaisi.org](https://uclaisi.org) where the whole site is an AI-agent-style terminal.
Everything is drawn as text on a character grid (box-drawing borders, rules, even the QR code),
sized to the window and redrawn on resize.
Plain HTML/CSS/JS, with no build step.

## Run locally

```sh
./serve.sh        # http://localhost:8000
./serve.sh 3000   # custom port
```

## Events from Luma

Upcoming events on the [Luma calendar](https://lu.ma/UCLAISI) show up in the welcome
screen's "Coming up" section and in `/events`. Luma doesn't let browsers read its calendar
from other websites, so `sync_luma.py` downloads it into `events.js`:

```sh
python3 sync_luma.py   # serve.sh runs this every time it starts
```

On the live site, run it on a schedule (e.g. hourly cron or a GitHub Action) and redeploy
`events.js`. Past events drop off by themselves, so an old snapshot is out of date but never wrong.

## Editing text

All the words live in `content.js`:

- `SITE`: term name, links, email, and which commands show under the prompt
- `EVENTS`: sessions that aren't on Luma (like reading groups). Luma events are added automatically.
- `TEAM`, `SOCIALS`: committee members for `/team`, social accounts for `/contact`
- `FAQ`: questions and answers for `/faq` (shown like a `man` page)
- `TRACKS`: the three `/start` paths (technical, policy, philosophy) with starter readings
- `PAGES`: one entry per section. Each becomes a command (`/events`) and a URL (`#/events`).
  `keywords` let plain-English questions like "how do I join?" find the right page.
- `SMALLTALK`: joke replies (`sudo`, `rm -rf`, `exit`, ...)

### Drafts and missing info

Items marked `status: "draft"` (wording that needs approval) or `status: "todo"` (needs
information) show with a yellow tag when you run the site locally, and are hidden on the
live site. Delete the `status` once something is approved or filled in.
Search `content.js` for `TODO(needs info)` to find what's still open.

## How visitors get around

- Slash commands: `/start`, `/about`, `/programme`, `/events`, `/join`, `/luma`, `/faq`,
  `/team`, `/contact`, `/help`, `/clear` (`/start technical|policy|philosophy` for a track)
- Plain English: "what's on this term?", "can I come to the reading group?"
- Shell habits: `ls`, `cd events`, `cat join.md`, `man uclaisi`
- Clicking: every purple `/command` is clickable, and the line under the prompt has quick links
- `/crt` turns the CRT effect (glow, scanlines, curved glass, and a bulge in desktop
  Chrome/Edge/Firefox) on or off; the choice is remembered per visitor
- Keys: `/` opens the command menu, ↑↓ history, Tab completes, Esc skips the animation, Ctrl+L clears

## Files

- `index.html`: the terminal page (the only page)
- `style.css`: colors and the terminal font (system monospace: SF Mono, Menlo, Consolas)
- `script.js`: draws the character grid, handles commands, streams replies, URL routing
- `content.js`: all the text
- `events.js`: upcoming Luma events, written by `sync_luma.py` (don't edit by hand)
- `sync_luma.py`: copies events from the Luma calendar into `events.js`
- `assets/`: the WhatsApp QR code (converted to text at runtime), the tab icon (`favicon.svg`),
  the home-screen icon, and the link-preview image (`og-image.svg`). Edit the SVGs, then run
  `./make_images.sh` to rebuild the PNGs.
