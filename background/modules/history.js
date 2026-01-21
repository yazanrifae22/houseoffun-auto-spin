/**
 * History Module
 * Manages session history storage and retrieval
 */

const History = (() => {
  const MAX_HISTORY_ITEMS = 50

  /**
   * Save a completed session to history
   * @param {Object} stats - Session statistics
   * @param {string} type - 'main' or 'dog'
   */
  async function saveSession(stats, type = 'main') {
    // Calculate total profit including bonus wins
    const baseProfit = stats.currentBalance - stats.startBalance
    const freeSpinWins = stats.freeSpinWins || 0
    const starSpinWins = stats.starSpinWins || 0
    const totalProfit = baseProfit + freeSpinWins + starSpinWins

    const session = {
      date: new Date().toISOString(),
      spins: stats.totalSpins,
      totalWins: stats.totalWins,
      startBalance: stats.startBalance,
      endBalance: stats.currentBalance,
      profit: totalProfit, // Total profit including all bonuses
      baseProfit: baseProfit, // Base profit without bonuses
      freeSpinWins: freeSpinWins,
      starSpinWins: starSpinWins,
      duration: Date.now() - stats.startTime,
      type: type, // 'main' or 'dog'
    }

    const storageKey = type === 'dog' ? 'hof_dog_history' : 'hof_history'
    const data = await chrome.storage.local.get([storageKey])
    const history = data[storageKey] || []

    // Add to beginning
    history.unshift(session)

    // Keep only last MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history.length = MAX_HISTORY_ITEMS
    }

    await chrome.storage.local.set({ [storageKey]: history })
    console.log(`[HOF] ${type.toUpperCase()} session saved to history`, session)
  }

  /**
   * Get all history
   * @param {string} type - 'main' or 'dog'
   */
  async function getHistory(type = 'main') {
    const storageKey = type === 'dog' ? 'hof_dog_history' : 'hof_history'
    const data = await chrome.storage.local.get([storageKey])
    return data[storageKey] || []
  }

  /**
   * Clear all history
   * @param {string} type - 'main' or 'dog'
   */
  async function clearHistory(type = 'main') {
    const storageKey = type === 'dog' ? 'hof_dog_history' : 'hof_history'
    await chrome.storage.local.remove([storageKey])
    console.log(`[HOF] ${type.toUpperCase()} history cleared`)
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
