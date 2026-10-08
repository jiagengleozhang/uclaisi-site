# Deployment

`uclaisi.org` serves this repo as plain static files from cPanel's docroot.
Pushing to `main` goes live within about 5 minutes.

## How it works

There is no webhook: a static site has no app to receive one. Instead a cron
job on the server runs `~/bin/deploy-site.sh` every 5 minutes. The script:

1. `git fetch`es `origin main` in `~/uclaisi-site` (a plain clone; the repo is
   public, so no credentials or deploy key are needed).
2. Exits silently if there is no new commit and the last run was under an hour
   ago. Otherwise it continues, so Luma events refresh at least hourly.
3. `git reset --hard origin/main`, then runs `sync_luma.py` with
   `/opt/alt/python313/bin/python3.13` (the system `python3` is 3.6 and lacks
   `zoneinfo`). If Luma is unreachable the committed `events.js` is kept.
4. `rsync`s the checkout into `~/public_html`, skipping dev files
   (`README.md`, `serve.sh`, `make_images.sh`, `sync_luma.py`, `.git*`) and
   never touching `.htaccess`, `.well-known/` or `cgi-bin/`.

Nothing on the server is edited by hand, so the checkout can always be reset.

## Server facts

| | |
|---|---|
| Host | Namecheap shared hosting, `premium18.web-hosting.com` |
| cPanel user | `uclanyhg` |
| SSH | `ssh uclaisi` (port 21098, key `~/.ssh/uclaisi_cpanel`, configured on Jude's Mac) |
| Checkout | `/home/uclanyhg/uclaisi-site` |
| Docroot | `/home/uclanyhg/public_html` |
| Deploy script | `/home/uclanyhg/bin/deploy-site.sh` (`--force` deploys regardless) |
| Deploy log | `/home/uclanyhg/deploy-site.log` (last 500 lines) |
| Cron | `*/5 * * * * /home/uclanyhg/bin/deploy-site.sh` |

DNS and SSL are unchanged from the previous site: A record `185.61.152.64`,
Namecheap Standard SSL valid until **6 March 2027**, renewed manually, with the
validation token under `public_html/.well-known/pki-validation/` (kept out of
the rsync).

## Short links (`/join`, `/ask`, ...)

`redirects.txt` in this repo lists them, one `path url` per line. On every
deploy the script turns it into `Redirect 302` lines inside a marked block in
`public_html/.htaccess`, so **editing `redirects.txt` on GitHub is all it takes**
to change where a short link goes. The rest of `.htaccess` is cPanel-managed and
not in git; the script never touches anything outside its block.

Current links:

- `/join`: the WhatsApp invite. `content.js` links to `https://uclaisi.org/join`
  and so does printed material, so update the invite here when it changes.
- `/ask`: the Slido for audience questions. Point it at the current event's
  Slido before each event.
- `/events`: the old site's URL, sent to the new hash route.

Also (step 4 of the deploy) `redirects.txt` itself is not copied to the
docroot.

## Checking a deploy

```bash
ssh uclaisi tail -n 20 deploy-site.log
ssh uclaisi bin/deploy-site.sh --force     # deploy right now
```

A successful run ends with `=== deploy finished ok, now at <sha> ===`.

## The previous site

The old Flask site (github.com/jude-sph/UCLAISIweb) is still on the server at
`/home/uclanyhg/flask_app`, with its virtualenv and its `tmp/signups.log` click
log, but its Python app is **stopped** in cPanel's Setup Python App, which is
what removed Passenger from `.htaccess`. Its GitHub webhook is disabled, not
deleted.

To roll back to it:

```bash
ssh uclaisi 'crontab -r; cloudlinux-selector start --interpreter python --app-root flask_app'
```

and remove the redirect lines from `.htaccess` (Passenger would otherwise
never see `/join`). Re-enable the webhook on the old repo if pushes there
should deploy again.
