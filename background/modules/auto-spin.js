/**
 * Auto-Spin Module
 * Manages automated spinning with proper stop mechanism
 */

const AutoSpin = (() => {
  let isActive = false
  let shouldStop = false
  let currentTimeoutId = null

  let stats = {
    totalSpins: 0,
    totalWins: 0,
    startBalance: 0,
    currentBalance: 0,
    startTime: null,
  }

  let config = {
    minDelay: 1000,
    maxDelay: 2000,
    maxSpins: 0,
    stopOnLoss: 0,
  }

  let currentTabId = null

  /**
   * Start auto-spin
   */
  async function start(tabId, userConfig = {}) {
    if (isActive) {
      console.log('[HOF AutoSpin] Already running')
      return
    }

    // Update configuration
    config = {
      minDelay: userConfig.minDelay || 1000,
      maxDelay: userConfig.maxDelay || 2000,
      maxSpins: userConfig.maxSpins || 0,
      stopOnLoss: userConfig.stopOnLoss || 0,
    }

    // Reset state
    isActive = true
    shouldStop = false
    currentTimeoutId = null
    currentTabId = tabId

    stats = {
      totalSpins: 0,
      totalWins: 0,
      startBalance: 0,
      currentBalance: 0,
      startTime: Date.now(),
    }

    console.log('%c[HOF AutoSpin] 🚀 STARTED', 'background:blue;color:white;font-size:16px')

    // Notify tab
    if (currentTabId) {
      notifyTab('AUTO_SPIN_STARTED', { config })
    }

    // Start the loop
    runLoop()
  }

  /**
   * Stop auto-spin immediately
   */
  async function stop() {
    if (!isActive) {
      console.log('[HOF AutoSpin] Not running')
      return stats
    }

    console.log('%c[HOF AutoSpin] 🛑 STOPPING', 'background:red;color:white;font-size:16px')

    // Set stop flag
    shouldStop = true

    // Clear any pending timeout immediately
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      currentTimeoutId = null
    }

    // Mark as inactive
    isActive = false

    // Save to history if we did any spins
    if (stats.totalSpins > 0) {
      await self.History.saveSession(stats)
    }

    // Notify tab
    if (currentTabId) {
      notifyTab('AUTO_SPIN_STOPPED', { stats })
    }

    console.log(
      `[HOF AutoSpin] Stopped. Spins: ${stats.totalSpins}, Profit: ${stats.currentBalance - stats.startBalance}`,
    )

    return stats
  }

  /**
   * Main auto-spin loop with proper abort mechanism
   */
  async function runLoop() {
    // Check stop flag before doing anything
    if (shouldStop || !isActive) {
      await finalizeStop()
      return
    }

    // Check max spins limit
    if (config.maxSpins > 0 && stats.totalSpins >= config.maxSpins) {
      console.log('[HOF AutoSpin] Max spins reached')
      await stop()
      return
    }

    // Check loss limit
    if (config.stopOnLoss > 0 && stats.startBalance > 0) {
      const currentLoss = stats.startBalance - stats.currentBalance
      if (currentLoss >= config.stopOnLoss) {
        console.log('[HOF AutoSpin] Loss limit reached')
        await stop()
        return
      }
    }

    try {
      // Execute spin
      const capturedRequest = self.RequestCapture.getCapturedRequest()
      const result = await self.SpinReplay.replaySpin(capturedRequest, currentTabId)

      // Check stop flag immediately after spin
      if (shouldStop || !isActive) {
        await finalizeStop()
        return
      }

      // Process result
      if (result.status === 200 && result.data?.result) {
        const gameInfo = result.data.result.gameInfo
        const balance = gameInfo?.common?.balance || 0
        const wins = gameInfo?.wins || []

        let spinWin = 0
        for (const win of wins) {
          spinWin += win.win || 0
        }

        // Set start balance from first spin
        if (stats.totalSpins === 0) {
          stats.startBalance = balance - spinWin
        }

        // Update stats
        stats.totalSpins++
        stats.totalWins += spinWin
        stats.currentBalance = balance

        // Notify progress (throttled)
        if (currentTabId) {
          notifyTab('AUTO_SPIN_PROGRESS', {
            spinNumber: stats.totalSpins,
            spinWin: spinWin,
            stats: stats,
          })
        }
      }
    } catch (err) {
      console.error('[HOF AutoSpin] Spin error:', err)
    }

    // Check stop flag before scheduling next iteration
    if (shouldStop || !isActive) {
      await finalizeStop()
      return
    }

    // Schedule next spin with random delay
    const delay =
      Math.floor(Math.random() * (config.maxDelay - config.minDelay + 1)) + config.minDelay

    currentTimeoutId = setTimeout(() => {
      currentTimeoutId = null
      runLoop()
    }, delay)
  }

  /**
   * Finalize stop (cleanup)
   */
  async function finalizeStop() {
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      currentTimeoutId = null
    }
    isActive = false
    shouldStop = false
  }

  /**
   * Notify content script
   */
  function notifyTab(type, data = {}) {
    if (!currentTabId) return

    chrome.tabs.sendMessage(currentTabId, { type, ...data }).catch(() => {
      // Tab might be closed
    })
  }

  /**
   * Get current status
   */
  function getStatus() {
    return {
      isActive,
      stats,
      config,
    }
  }

  return {
    start,
    stop,
    getStatus,
    isActive: () => isActive,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.AutoSpin = AutoSpin
}
