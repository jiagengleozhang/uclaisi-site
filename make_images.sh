#!/bin/sh
# Rebuild the PNG icons and link preview from their SVG sources in assets/.
# Uses macOS's built-in QuickLook (qlmanage) and sips, so it needs no installs.
set -e
cd "$(dirname "$0")/assets"
tmp=$(mktemp -d)

qlmanage -t -s 32 -o "$tmp" favicon.svg >/dev/null 2>&1
mv "$tmp/favicon.svg.png" favicon-32.png
qlmanage -t -s 180 -o "$tmp" apple-touch-icon.svg >/dev/null 2>&1
mv "$tmp/apple-touch-icon.svg.png" apple-touch-icon.png

# QuickLook renders into a square, so fit the 1200x630 canvas into 1200x1200
# (drop width/height so it scales 1:1) and crop the middle 630 rows back out.
sed '/<svg /s/ width="1200" height="630"//' og-image.svg > "$tmp/og.svg"
qlmanage -t -s 1200 -o "$tmp" "$tmp/og.svg" >/dev/null 2>&1
sips -c 630 1200 --cropOffset 285 0 "$tmp/og.svg.png" --out og-image.png >/dev/null

rm -rf "$tmp"
echo "Rebuilt favicon-32.png, apple-touch-icon.png and og-image.png in assets/"
