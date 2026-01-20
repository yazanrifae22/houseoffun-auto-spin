/**
 * History Module
 * Manages session history storage and retrieval
 */

const History = (() => {
  const MAX_HISTORY_ITEMS = 50

  /**
   * Save a completed session to history
   */
  async function saveSession(stats) {
    const session = {
      date: new Date().toISOString(),
      spins: stats.totalSpins,
      totalWins: stats.totalWins,
      startBalance: stats.startBalance,
      endBalance: stats.currentBalance,
      profit: stats.currentBalance - stats.startBalance,
      duration: Date.now() - stats.startTime,
    }

    const data = await chrome.storage.local.get(['hof_history'])
    const history = data.hof_history || []

    // Add to beginning
    history.unshift(session)

    // Keep only last MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS
    }

    await chrome.storage.local.set({ hof_history: history })
    console.log('[HOF] Session saved to history', session)
  }

  /**
   * Get all history
   */
  async function getHistory() {
    const data = await chrome.storage.local.get(['hof_history'])
    return data.hof_history || []
  }

  /**
   * Clear all history
   */
  async function clearHistory() {
    await chrome.storage.local.remove(['hof_history'])
    console.log('[HOF] History cleared')
  }

  return {
    saveSession,
    getHistory,
    clearHistory,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.History = History
}
