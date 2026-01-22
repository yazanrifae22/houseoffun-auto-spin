/**
 * House of Fun Helper - Constants
 * Centralized configuration for delays, limits, and other constants
 */

const HOFConstants = (() => {
  return {
    // Main Spin Delays
    MAIN_SPIN_MIN_DELAY: 10, // ms - Minimum delay between main spins
    MAIN_SPIN_MAX_DELAY: 50, // ms - Maximum delay between main spins

    // Bonus Spin Delays (OPTIMIZED: reduced for faster throughput)
    BONUS_SPIN_MIN_DELAY: 5, // ms - Minimum delay between bonus spins
    BONUS_SPIN_MAX_DELAY: 25, // ms - Maximum delay between bonus spins
    BONUS_SPIN_FIXED_DELAY: 100, // ms - Fixed delay for certain bonus operations (was 500ms)

    // Dog Spin Delays
    DOG_SPIN_MIN_DELAY: 1000, // ms - Minimum delay between dog spins
    DOG_SPIN_MAX_DELAY: 2000, // ms - Maximum delay between dog spins
    DOG_REWARD_DELAY: 500, // ms - Delay after claiming rewards (was 1000ms)

    // Mini-Game Delays (OPTIMIZED)
    MINIGAME_SPIN_DELAY: 30, // ms - Delay between mini-game spins (was 50ms)

    // Event Stream Delays (OPTIMIZED)
    EVENT_STREAM_DELAY: 50, // ms - Delay between event stream calls (was 200ms)

    // Memory Limits
    MAX_DEBUG_EVENTS: 1000, // Maximum debug events to store
    MAX_LOG_ENTRIES: 200, // Maximum log entries to keep
    MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB

    // Error Handling
    MAX_CONSECUTIVE_ERRORS: 3, // Stop after this many consecutive errors
    ERROR_RETRY_DELAY: 2000, // ms - Delay before retrying after error

    // UI Update Throttling
    UI_UPDATE_THROTTLE: 500, // ms - Minimum time between UI updates
    DOM_THROTTLE: 100, // ms - DOM mutation observer throttle
  }
})()

// Legacy config for backward compatibility
const HOF_CONFIG = {
  // Extension info
  NAME: 'House of Fun Helper',
  VERSION: '2.8.1',

  // Target site
  TARGET_URL: 'https://www.houseoffun.com',
  PLAY_NOW_PATH: '/play-now/',

  // Storage keys
  STORAGE_KEYS: {
    SETTINGS: 'hof_settings',
    USER_DATA: 'hof_user_data',
    LAST_SYNC: 'hof_last_sync',
  },

  // Message types for communication between components
  MESSAGE_TYPES: {
    GET_STATUS: 'GET_STATUS',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    CONTENT_READY: 'CONTENT_READY',
    POPUP_OPENED: 'POPUP_OPENED',
  },

  // Default settings
  DEFAULT_SETTINGS: {
    enabled: true,
    notifications: true,
    autoCollect: false,
  },
}

// Freeze configs to prevent modifications
Object.freeze(HOF_CONFIG)
Object.freeze(HOF_CONFIG.STORAGE_KEYS)
Object.freeze(HOF_CONFIG.MESSAGE_TYPES)
Object.freeze(HOF_CONFIG.DEFAULT_SETTINGS)

// Export for service worker
if (typeof self !== 'undefined') {
  self.HOFConstants = HOFConstants
  self.HOF_CONFIG = HOF_CONFIG
}
