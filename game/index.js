#!/usr/bin/env node
'use strict';

const Game = require('./game');

// State
let game = null;
let taskComplete = false;

// Signal file for Windows compatibility (no SIGUSR1)
const fs = require('fs');
const path = require('path');
const SIGNAL_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.claudevaders-signal');

// Handle task completion signal
function handleTaskComplete() {
  taskComplete = true;
  if (game) {
    game.showTaskComplete();
  }
}

// Unix: SIGUSR1
process.on('SIGUSR1', handleTaskComplete);

// Windows: poll for signal file
const signalPollInterval = setInterval(() => {
  if (fs.existsSync(SIGNAL_FILE)) {
    try {
      fs.unlinkSync(SIGNAL_FILE);
    } catch (e) {
      // Ignore cleanup errors
    }
    handleTaskComplete();
  }
}, 500);

// Clean exit
function cleanup() {
  clearInterval(signalPollInterval);
  try {
    fs.unlinkSync(SIGNAL_FILE);
  } catch (e) {
    // Ignore
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start game
game = new Game({
  onExit: cleanup
});

game.start();
