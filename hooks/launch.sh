#!/usr/bin/env bash
set -euo pipefail

# ClaudeVaders Launcher
# Usage: launch.sh start|stop

COMMAND="${1:-}"
PID_FILE="${HOME}/.claudevaders.pid"
SIGNAL_FILE="${HOME}/.claudevaders-signal"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="${SCRIPT_DIR}/../game"

# Detect OS
detect_os() {
  case "$(uname -s)" in
    Linux*)  echo "linux" ;;
    Darwin*) echo "macos" ;;
    CYGWIN*|MINGW*|MSYS*) echo "windows" ;;
    *)       echo "unknown" ;;
  esac
}

# Find available terminal emulator (Linux)
find_linux_terminal() {
  local term="${LOADING_GAME_TERMINAL:-}"
  if [[ -n "$term" ]] && command -v "$term" &>/dev/null; then
    echo "$term"
    return
  fi

  for t in kitty alacritty gnome-terminal konsole xfce4-terminal xterm; do
    if command -v "$t" &>/dev/null; then
      echo "$t"
      return
    fi
  done

  echo ""
}

# Launch game in new terminal (Linux)
launch_linux() {
  local term
  term=$(find_linux_terminal)

  if [[ -z "$term" ]]; then
    echo "Error: No terminal emulator found" >&2
    exit 1
  fi

  local game_cmd="cd '$GAME_DIR' && node index.js"

  case "$term" in
    kitty)
      kitty --title "ClaudeVaders" -d "$GAME_DIR" bash -c "$game_cmd" &
      ;;
    alacritty)
      alacritty --title "ClaudeVaders" --working-directory "$GAME_DIR" -e bash -c "$game_cmd" &
      ;;
    gnome-terminal)
      gnome-terminal --title="ClaudeVaders" --working-directory="$GAME_DIR" -- bash -c "$game_cmd" &
      ;;
    konsole)
      konsole --workdir "$GAME_DIR" -e bash -c "$game_cmd" &
      ;;
    xfce4-terminal)
      xfce4-terminal --title="ClaudeVaders" --working-directory="$GAME_DIR" -e "bash -c '$game_cmd'" &
      ;;
    xterm)
      xterm -title "ClaudeVaders" -e "cd '$GAME_DIR' && node index.js" &
      ;;
  esac

  echo $!
}

# Launch game in new terminal (macOS)
launch_macos() {
  local term="${LOADING_GAME_TERMINAL:-}"

  # Try kitty first if available/configured
  if [[ "$term" == "kitty" ]] || { [[ -z "$term" ]] && command -v kitty &>/dev/null; }; then
    kitty --title "ClaudeVaders" -d "$GAME_DIR" bash -c "node index.js" &
    echo $!
    return
  fi

  # Try iTerm2
  if [[ -d "/Applications/iTerm.app" ]]; then
    osascript <<EOF
tell application "iTerm"
  create window with default profile
  tell current session of current window
    write text "cd '$GAME_DIR' && node index.js"
  end tell
end tell
EOF
    # Can't get PID easily from AppleScript, use pgrep
    sleep 0.5
    pgrep -n "node" || echo ""
    return
  fi

  # Fall back to Terminal.app
  osascript <<EOF
tell application "Terminal"
  do script "cd '$GAME_DIR' && node index.js"
  activate
end tell
EOF
  sleep 0.5
  pgrep -n "node" || echo ""
}

# Launch game in new terminal (Windows/Git Bash)
launch_windows() {
  local game_cmd="cd '$GAME_DIR' && node index.js"

  if command -v wt.exe &>/dev/null; then
    wt.exe -d "$GAME_DIR" bash -c "$game_cmd" &
    echo $!
  elif command -v cmd.exe &>/dev/null; then
    cmd.exe /c start bash -c "$game_cmd" &
    echo $!
  else
    echo "Error: No terminal found" >&2
    exit 1
  fi
}

# Check if game is already running
is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    # Stale PID file
    rm -f "$PID_FILE"
  fi
  return 1
}

# Start the game
cmd_start() {
  # Don't start if already running
  if is_running; then
    exit 0
  fi

  # Check node is available
  if ! command -v node &>/dev/null; then
    echo "Error: Node.js not found" >&2
    exit 1
  fi

  # Install deps if needed
  if [[ ! -d "$GAME_DIR/node_modules" ]]; then
    (cd "$GAME_DIR" && npm install --silent) || true
  fi

  local os
  os=$(detect_os)

  local pid=""
  case "$os" in
    linux)   pid=$(launch_linux) ;;
    macos)   pid=$(launch_macos) ;;
    windows) pid=$(launch_windows) ;;
    *)
      echo "Error: Unsupported OS" >&2
      exit 1
      ;;
  esac

  if [[ -n "$pid" ]]; then
    echo "$pid" > "$PID_FILE"
  fi
}

# Stop the game
cmd_stop() {
  if [[ ! -f "$PID_FILE" ]]; then
    exit 0
  fi

  local pid
  pid=$(cat "$PID_FILE")

  # Check if still running
  if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$PID_FILE"
    exit 0
  fi

  local os
  os=$(detect_os)

  # Send signal based on OS
  case "$os" in
    linux|macos)
      kill -USR1 "$pid" 2>/dev/null || true
      ;;
    windows)
      # Use signal file for Windows
      touch "$SIGNAL_FILE"
      ;;
  esac

  # Don't remove PID file - game will clean up on exit
}

# Main
case "$COMMAND" in
  start) cmd_start ;;
  stop)  cmd_stop ;;
  *)
    echo "Usage: launch.sh start|stop" >&2
    exit 1
    ;;
esac
