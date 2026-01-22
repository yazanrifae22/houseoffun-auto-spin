/**
 * Logger Module
 * Centralized logging system with storage and UI updates
 */

const Logger = (() => {
  const MAX_LOGS = self.HOFConstants?.MAX_LOG_ENTRIES || 200 // Keep last 200 logs
  let logs = []
  let logObservers = []

  /**
   * Log types with colors
   */
  const LOG_TYPES = {
    SPIN: { icon: '🎰', color: '#2196f3', label: 'Spin' },
    WIN: { icon: '💰', color: '#4caf50', label: 'Win' },
    BONUS: { icon: '🌟', color: '#ffc107', label: 'Bonus' },
    MINIGAME: { icon: '🎮', color: '#ff9800', label: 'MiniGame' },
    JACKPOT: { icon: '💎', color: '#9c27b0', label: 'Jackpot' },
    POT: { icon: '🎯', color: '#ff9800', label: 'Pot' },
    ERROR: { icon: '❌', color: '#f44336', label: 'Error' },
    INFO: { icon: 'ℹ️', color: '#607d8b', label: 'Info' },
    SUCCESS: { icon: '✅', color: '#00c853', label: 'Success' },
  }

  /**
   * Add a log entry
   */
  function log(type, message, data = null) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: type,
      message: message,
      data: data,
      typeInfo: LOG_TYPES[type] || LOG_TYPES.INFO,
    }

    logs.unshift(logEntry) // Add to beginning

    // Keep only MAX_LOGS
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(0, MAX_LOGS)
    }

    // Notify observers
    notifyObservers(logEntry)

    // Also log to console with styling
    logToConsole(logEntry)
  }

  /**
   * Log to console with nice formatting
   */
  function logToConsole(entry) {
    const style = `background:${entry.typeInfo.color};color:white;font-weight:bold;padding:2px 6px;border-radius:3px`
    const timeStr = new Date(entry.timestamp).toLocaleTimeString()

    if (entry.data) {
      console.log(
        `%c${entry.typeInfo.label}%c ${timeStr} - ${entry.message}`,
        style,
        '',
        entry.data,
      )
    } else {
      console.log(`%c${entry.typeInfo.label}%c ${timeStr} - ${entry.message}`, style, '')
    }
  }

  /**
   * Subscribe to log updates
   */
  function subscribe(callback) {
    logObservers.push(callback)
  }

  /**
   * Notify all observers
   */
  function notifyObservers(logEntry) {
    logObservers.forEach((callback) => {
      try {
        callback(logEntry)
      } catch (err) {
        console.error('Logger observer error:', err)
      }
    })
  }

  /**
   * Get all logs
   */
  function getLogs(filter = null) {
    if (!filter) return logs
    return logs.filter((log) => log.type === filter)
  }

  /**
   * Clear all logs
   */
  function clearLogs() {
    logs = []
    notifyObservers({ type: 'CLEAR' })
  }

  /**
   * Export logs as JSON
   */
  function exportLogs() {
    return JSON.stringify(logs, null, 2)
  }

  /**
   * Get stats
   */
  function getStats() {
    const stats = {}
    logs.forEach((log) => {
      stats[log.type] = (stats[log.type] || 0) + 1
    })
    return stats
  }

  return {
    log,
    subscribe,
    getLogs,
    clearLogs,
    exportLogs,
    getStats,
    LOG_TYPES,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.Logger = Logger
}
