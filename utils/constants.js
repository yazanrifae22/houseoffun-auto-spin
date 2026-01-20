/**
 * House of Fun Helper - Constants
 * Shared constants and configuration values
 */

const HOF_CONFIG = {
  // Extension info
  NAME: 'House of Fun Helper',
  VERSION: '1.0.0',

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

// Freeze the config to prevent modifications
Object.freeze(HOF_CONFIG)
Object.freeze(HOF_CONFIG.STORAGE_KEYS)
Object.freeze(HOF_CONFIG.MESSAGE_TYPES)
Object.freeze(HOF_CONFIG.DEFAULT_SETTINGS)
