// Export logs as we need to expose it to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_LOGS') {
    sendResponse({ logs: Logger.getLogs() })
  }
  if (message.type === 'CLEAR_LOGS') {
    Logger.clearLogs()
    sendResponse({ success: true })
  }
  if (message.type === 'GET_LOG_STATS') {
    sendResponse({ stats: Logger.getStats() })
  }
  return true
})

// Also pass logs through existing message handler
