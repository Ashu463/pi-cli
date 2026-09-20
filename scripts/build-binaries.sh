#!/usr/bin/env bash
# Builds standalone AEON binaries for every supported platform from a single machine.
#
# Why this works without a multi-OS CI matrix: @opentui/core ships its native renderer as
# per-platform optional dependencies (@opentui/core-<os>-<arch>), and bun only fetches the one
# matching the current machine. `bun install --os=X --cpu=Y` forces it to fetch a different
# platform's package, and `bun build --compile --target=bun-X-Y` then embeds that native library
# plus a matching Bun runtime into a single self-contained binary — verified working across
# linux-x64 (native), darwin-arm64 and windows-x64 (both cross-compiled) before this script existed.
set -euo pipefail

cd "$(dirname "$0")/../apps/pi-cli"
OUT_DIR="../../release"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# os:cpu:bun-target:output-suffix
TARGETS=(
  "linux:x64:bun-linux-x64:linux-x64"
  "linux:arm64:bun-linux-arm64:linux-arm64"
  "darwin:x64:bun-darwin-x64:darwin-x64"
  "darwin:arm64:bun-darwin-arm64:darwin-arm64"
  "win32:x64:bun-windows-x64:windows-x64"
)

for entry in "${TARGETS[@]}"; do
  IFS=":" read -r os cpu bun_target suffix <<< "$entry"
  echo "==> $suffix"

  (cd ../.. && bun install --os="$os" --cpu="$cpu" >/dev/null)

  out="$OUT_DIR/aeon-$suffix"
  [ "$os" = "win32" ] && out="$out.exe"

  bun build --compile --target="$bun_target" src/index.ts --outfile "$out"
done

# leave node_modules matching the machine actually running this script
(cd ../.. && bun install >/dev/null)

echo
echo "Built:"
ls -la "$OUT_DIR"
