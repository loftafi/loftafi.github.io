#!/usr/bin/env bash
# Regenerate the README screenshots. Renders content/posts/lorem-preview.md
# in each skin × theme (minima, tui × light, dark), then composes the pairs
# side-by-side into screenshot.png (minima) and screenshot-tui.png.
#
# Requires: zola, chromium, imagemagick. Run from repo root.
#
# The URL params (?skin=…&theme=…) are read by base.html's boot script, so
# no localStorage priming is needed — one headless load per variant.

set -euo pipefail

PORT=1114
POST=lorem-preview
OUTDIR=$(mktemp -d)
trap 'rm -rf "$OUTDIR"; kill $ZOLA_PID 2>/dev/null || true' EXIT

zola serve --port "$PORT" --interface 127.0.0.1 >/dev/null 2>&1 &
ZOLA_PID=$!

# Wait for the server to come up.
for _ in $(seq 1 20); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/posts/$POST/"; then break; fi
  sleep 0.3
done

for skin in minima tui; do
  for theme in light dark; do
    s=${skin/minima/}
    url="http://127.0.0.1:$PORT/posts/$POST/?skin=$s&theme=$theme"
    chromium --headless --disable-gpu --hide-scrollbars --no-sandbox \
      --virtual-time-budget=5000 --window-size=1200,1800 \
      --screenshot="$OUTDIR/raw-$skin-$theme.png" "$url" 2>/dev/null
  done
done

# `screenshot.png` is the primary (minima) — Zola themes showcase reads
# that filename. `screenshot-tui.png` is the supplementary one.
magick "$OUTDIR/raw-minima-light.png" "$OUTDIR/raw-minima-dark.png" +append -bordercolor '#ddd' -border 2 screenshot.png
magick "$OUTDIR/raw-tui-light.png"    "$OUTDIR/raw-tui-dark.png"    +append -bordercolor '#ddd' -border 2 screenshot-tui.png

echo "Wrote screenshot.png, screenshot-tui.png"
