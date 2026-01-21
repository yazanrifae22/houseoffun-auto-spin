/**
 * House of Fun Helper - Background Service Worker
 * Modular architecture with improved performance and stop mechanism
 */

// Import all modules
importScripts(
  'modules/logger.js',
  'modules/log-messenger.js',
  'modules/debug-recorder.js',
  'modules/request-capture.js',
  'modules/spin-replay.js',
  'modules/event-replay.js',
  'modules/event-bonus-stream.js',
  'modules/bonus-game-replay.js',
  'modules/minigame-replay.js',
  'modules/history.js',
  'modules/auto-spin.js',
  'modules/dog-auto-spin.js',
  'modules/message-handler.js',
)

console.log(
  '[HOF] 🎰 Service worker loaded v2.8 with ALL Bonuses Auto-Play (Stars, Free Spins, etc.)',
)

// Initialize all modules
RequestCapture.init()
MessageHandler.init()

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[HOF] Extension installed/updated')
})
