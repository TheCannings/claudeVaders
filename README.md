# ClaudeVaders

```
    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    █  ▄▀▄ ▄▀▄   ▄▀▄ ▄▀▄   ▄▀▄ ▄▀▄   ▄▀▄ ▄▀▄   ▄▀▄ ▄▀▄   ▄▀▄  █
    █  ▀▄▀ ▀▄▀   ▀▄▀ ▀▄▀   ▀▄▀ ▀▄▀   ▀▄▀ ▀▄▀   ▀▄▀ ▀▄▀   ▀▄▀  █
    █   █▀▀▀█     █▀▀▀█     █▀▀▀█     █▀▀▀█     █▀▀▀█     █▀   █
    █   ▀   ▀     ▀   ▀     ▀   ▀     ▀   ▀     ▀   ▀     ▀    █
    █                                                          █
    █                         |                                █
    █                         |                                █
    █                                                          █
    █     ███         ███         ███         ███              █
    █                                                          █
    █                        ▄█▄                               █
    █                       ▀███▀                              █
    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
```

**A Claude Code plugin that brings back the joy of loading screen games.**

## The Inspiration

```
        ╔══════════════════════════════════════════════════════╗
        ║                                                      ║
        ║     I N S E R T   D A T A S E T T E   A N D          ║
        ║                                                      ║
        ║         P R E S S   P L A Y   O N   T A P E          ║
        ║                                                      ║
        ╚══════════════════════════════════════════════════════╝
```

If you grew up in the 80s with a Commodore Amiga, Commodore 64, or ZX Spectrum, you know the ritual: pop in a cassette, press play, and wait. And wait. And *wait*.

Loading a game from tape could take **15-30 minutes**. The screen would flash with hypnotic loading bars. The datasette would screech and warble like a possessed modem.

But some genius developers turned this dead time into something magical: **loading screen games**. Little minigames to keep you entertained while the main game loaded. Invaders. Breakout. Simple, addictive, perfect.

```
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  ░                                                          ░
  ░    L O A D I N G . . .                                   ░
  ░                                                          ░
  ░    ████████████████████████████░░░░░░░░░░░░  67%         ░
  ░                                                          ░
  ░    W H Y   N O T   P L A Y   A   G A M E ?               ░
  ░                                                          ░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

## What This Does

ClaudeVaders is a Claude Code plugin that automatically launches a terminal-based Space Invaders game whenever Claude starts a long-running task. When the task completes, the game shows "Task Complete!" and waits for you to finish your current life.

**No more staring at a spinner. Play some Space Invaders instead.**

## Installation

```bash
# Add the marketplace
/plugin marketplace add TheCannings/claudeVaders

# Install the plugin
/plugin install claudevaders
```

**Requires:** Node.js (you probably already have it)

## How It Works

The plugin uses Claude Code hooks:
- `PreToolUse` hook on `Task` tool → launches the game in a new terminal
- `PostToolUse` hook on `Task` tool → signals task complete

When Claude spawns a subagent for complex work, you get to play. When it's done, you're notified.

## Controls

```
    ←  →     Move ship (or A/D)
   SPACE     Fire
     P       Pause
     Q       Quit
```

## The Nostalgia Corner

Remember these?

```
   ▄████▄   ▄████▄   ███▄ ▄███▓ ███▄ ▄███▓ ▒█████  ▓█████▄  ▒█████   ██▀███  ▓█████
  ▒██▀ ▀█  ▒██▀ ▀█  ▓██▒▀█▀ ██▒▓██▒▀█▀ ██▒▒██▒  ██▒▒██▀ ██▌▒██▒  ██▒▓██ ▒ ██▒▓█   ▀
  ▒▓█    ▄ ▒▓█    ▄ ▓██    ▓██░▓██    ▓██░▒██░  ██▒░██   █▌▒██░  ██▒▓██ ░▄█ ▒▒███
  ▒▓▓▄ ▄██▒▒▓▓▄ ▄██▒▒██    ▒██ ▒██    ▒██ ▒██   ██░░▓█▄   ▌▒██   ██░▒██▀▀█▄  ▒▓█  ▄
  ▒ ▓███▀ ░▒ ▓███▀ ░▒██▒   ░██▒▒██▒   ░██▒░ ████▓▒░░▒████▓ ░ ████▓▒░░██▓ ▒██▒░▒████▒
```

**Ocean Software** was famous for their loading games. While *Robocop* or *Batman* loaded (10+ minutes on tape!), you'd play a simple shooter. It made the wait bearable—even fun.

**Invade-a-Load** on the C64 literally shipped Space Invaders as a loading game. Revolutionary stuff.

**The Spectrum** had games that used the loading noise as sound effects. The screeching wasn't a bug, it was a feature!

## Why This Exists

Modern AI assistants do real work that takes real time. Claude Code's Task tool spawns subagents that can run for minutes on complex operations. That's impressive, but also... boring to wait for.

This plugin brings back that 80s magic: turning idle time into game time.

```
                    ▄▄▄▄▄
                   ▀▀▀▀▀▀▀
                  ▄▀▄▀▄▀▄▀▄
                  ▀▄▀▄▀▄▀▄▀
                     ███
                    ▀▀ ▀▀

            G A M E   O V E R

          B U T   T A S K   D O N E !
```

## License

MIT - Just like the good old public domain games.

---

*"Please wait... loading... loading... why not play a game?"* — Every 80s kid's computer
