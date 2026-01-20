/**
 * House of Fun Helper - Popup Script
 * Handles popup UI interactions and settings management
 */

document.addEventListener('DOMContentLoaded', init)

// DOM Elements
let enabledToggle
let notificationsToggle
let openGameBtn
let statusIndicator
let versionSpan

/**
 * Initialize the popup
 */
async function init() {
  // Get DOM elements
  enabledToggle = document.getElementById('enabledToggle')
  notificationsToggle = document.getElementById('notificationsToggle')
  openGameBtn = document.getElementById('openGameBtn')
  statusIndicator = document.getElementById('statusIndicator')
  versionSpan = document.getElementById('version')

  // Set version
  const manifest = chrome.runtime.getManifest()
  versionSpan.textContent = `v${manifest.version}`

  // Load settings
  await loadSettings()

  // Set up event listeners
  setupEventListeners()

  // Check if on House of Fun site
  await checkCurrentTab()
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const data = await chrome.storage.local.get(['hof_settings'])
    const settings = data.hof_settings || {
      enabled: true,
      notifications: true,
    }

    enabledToggle.checked = settings.enabled
    notificationsToggle.checked = settings.notifications

    updateStatusIndicator(settings.enabled)
  } catch (error) {
    console.error('[HOF Helper] Error loading settings:', error)
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  const settings = {
    enabled: enabledToggle.checked,
    notifications: notificationsToggle.checked,
  }

  try {
    await chrome.storage.local.set({ hof_settings: settings })
    console.log('[HOF Helper] Settings saved:', settings)

    // Update status indicator
    updateStatusIndicator(settings.enabled)

    // Notify content scripts of settings change
    notifyContentScripts(settings)
  } catch (error) {
    console.error('[HOF Helper] Error saving settings:', error)
  }
}

/**
 * Notify content scripts about settings changes
 */
async function notifyContentScripts(settings) {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.houseoffun.com/*' })
    for (const tab of tabs) {
      chrome.tabs
        .sendMessage(tab.id, {
          type: 'UPDATE_SETTINGS',
          payload: settings,
        })
        .catch(() => {
          // Tab might not have content script loaded
        })
    }
  } catch (error) {
    console.error('[HOF Helper] Error notifying content scripts:', error)
  }
}

/**
 * Update status indicator
 */
function updateStatusIndicator(isEnabled) {
  const dot = statusIndicator.querySelector('.status-dot')
  const text = statusIndicator.querySelector('.status-text')

  if (isEnabled) {
    dot.classList.remove('inactive')
    text.textContent = 'Active'
  } else {
    dot.classList.add('inactive')
    text.textContent = 'Disabled'
  }
}

/**
 * Check current tab to see if we're on House of Fun
 */
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url?.includes('houseoffun.com')) {
      const text = statusIndicator.querySelector('.status-text')
      if (enabledToggle.checked) {
        text.textContent = 'Active on this page'
      }
    }
  } catch (error) {
    console.error('[HOF Helper] Error checking current tab:', error)
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Toggle event listeners
  enabledToggle.addEventListener('change', saveSettings)
  notificationsToggle.addEventListener('change', saveSettings)

  // Open game button
  openGameBtn.addEventListener('click', openHouseOfFun)
}

/**
 * Open House of Fun in a new tab
 */
async function openHouseOfFun() {
  try {
    // Check if HOF is already open
    const tabs = await chrome.tabs.query({ url: '*://*.houseoffun.com/*' })

    if (tabs.length > 0) {
      // Focus the existing tab
      await chrome.tabs.update(tabs[0].id, { active: true })
      await chrome.windows.update(tabs[0].windowId, { focused: true })
    } else {
      // Open new tab
      await chrome.tabs.create({
        url: 'https://www.houseoffun.com/play-now/',
        active: true,
      })
    }

    // Close popup
    window.close()
  } catch (error) {
    console.error('[HOF Helper] Error opening House of Fun:', error)
  }
}
