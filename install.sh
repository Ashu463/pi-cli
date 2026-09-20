#!/usr/bin/env bash
# Installs the latest AEON release binary for this machine.
#   curl -fsSL https://raw.githubusercontent.com/Ashu463/pi-cli/master/install.sh | bash
set -euo pipefail

REPO="Ashu463/pi-cli"
INSTALL_DIR="${AEON_INSTALL_DIR:-$HOME/.aeon/bin}"

os=$(uname -s)
arch=$(uname -m)

case "$os" in
  Linux) platform="linux" ;;
  Darwin) platform="darwin" ;;
  *)
    echo "error: unsupported OS '$os'. AEON's prebuilt binaries cover Linux and macOS." >&2
    echo "On other platforms, install via npm instead: npm i -g aeon-ai (requires Bun for the UI)." >&2
    exit 1
    ;;
esac

case "$arch" in
  x86_64|amd64) cpu="x64" ;;
  arm64|aarch64) cpu="arm64" ;;
  *)
    echo "error: unsupported architecture '$arch'." >&2
    exit 1
    ;;
esac

asset="aeon-${platform}-${cpu}"
url="https://github.com/${REPO}/releases/latest/download/${asset}"

echo "Installing AEON for ${platform}-${cpu}..."
mkdir -p "$INSTALL_DIR"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

if ! curl -fsSL "$url" -o "$tmp"; then
  echo "error: could not download $url" >&2
  echo "Check https://github.com/${REPO}/releases for available builds." >&2
  exit 1
fi

chmod +x "$tmp"
mv "$tmp" "$INSTALL_DIR/aeon"
trap - EXIT

echo "AEON installed to $INSTALL_DIR/aeon"
echo

case ":$PATH:" in
  *":$INSTALL_DIR:"*)
    echo "Run it: aeon"
    ;;
  *)
    shell_rc="$HOME/.bashrc"
    [ -n "${ZSH_VERSION:-}" ] && shell_rc="$HOME/.zshrc"
    echo "Add AEON to your PATH:"
    echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> $shell_rc"
    echo "  source $shell_rc"
    echo
    echo "Then run: aeon"
    ;;
esac
