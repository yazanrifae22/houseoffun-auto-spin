/**
 * Dog Auto-Spin Module
 * Manages automated dog wheel spinning with proper stop mechanism
 */

const DogAutoSpin = (() => {
  let isActive = false
  let shouldStop = false
  let currentTimeoutId = null

  let stats = {
    totalSpins: 0,
    totalBones: 0,
    totalPoints: 0,
    currentLevel: 0,
    progressPercent: 0,
    nextMilestone: null,
    startTime: null,
  }

  let config = {
    minDelay: 1000,
    maxDelay: 2000,
    maxSpins: 0,
  }

  let currentTabId = null

  /**
   * Start dog auto-spin
   */
  async function start(tabId, userConfig = {}) {
    if (isActive) {
      console.log('[HOF DogAutoSpin] Already running')
      return
    }

    // Update configuration
    config = {
      minDelay: userConfig.minDelay || 1000,
      maxDelay: userConfig.maxDelay || 2000,
      maxSpins: userConfig.maxSpins || 0,
    }

    // Reset state
    isActive = true
    shouldStop = false
    currentTimeoutId = null
    currentTabId = tabId

    stats = {
      totalSpins: 0,
      totalBones: 0,
      totalPoints: 0,
      startTime: Date.now(),
    }

    console.log('%c[HOF DogAutoSpin] 🦴 STARTED', 'background:blue;color:white;font-size:16px')

    // Notify tab
    if (currentTabId) {
      notifyTab('DOG_AUTO_SPIN_STARTED', { config })
    }

    // Start the loop
    runLoop()
  }

  /**
   * Stop dog auto-spin immediately
   */
  async function stop() {
    if (!isActive) {
      console.log('[HOF DogAutoSpin] Not running')
      return stats
    }

    console.log('%c[HOF DogAutoSpin] 🛑 STOPPING', 'background:red;color:white;font-size:16px')

    // Set stop flag
    shouldStop = true

    // Clear any pending timeout immediately
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      currentTimeoutId = null
    }

    // Mark as inactive
    isActive = false

    // Notify tab
    if (currentTabId) {
      notifyTab('DOG_AUTO_SPIN_STOPPED', { stats })
    }

    console.log(`[HOF DogAutoSpin] Stopped. Spins: ${stats.totalSpins}, Bones: ${stats.totalBones}`)

    return stats
  }

  /**
   * Main dog auto-spin loop
   */
  async function runLoop() {
    // Check stop flag before doing anything
    if (shouldStop || !isActive) {
      await finalizeStop()
      return
    }

    // Check max spins limit
    if (config.maxSpins > 0 && stats.totalSpins >= config.maxSpins) {
      console.log('[HOF DogAutoSpin] Max spins reached')
      await stop()
      return
    }

    try {
      // Execute dog spin
      const capturedRequest = self.RequestCapture.getCapturedDogRequest()
      const result = await self.SpinReplay.replaySpin(capturedRequest, currentTabId)

      // Check stop flag immediately after spin
      if (shouldStop || !isActive) {
        await finalizeStop()
        return
      }

      // Process result
      if (result.status === 200 && result.data) {
        const boneAmount = result.data.wheel?.boneAmount || 0
        const currentPoints = result.data.progressBar?.points?.current || 0
        const totalPoints = result.data.progressBar?.points?.total || 20000
        const wonWedgeNumber = result.data.wonWedgeNumber || 0
        const version = result.data.version || 0
        const milestones = result.data.progressBar?.milestones || []

        // Calculate progress
        const progressPercent =
          totalPoints > 0 ? Math.floor((currentPoints / totalPoints) * 100) : 0

        // Find next milestone
        const nextMilestone = milestones.find((m) => m.status === 'NOT_ACHIEVED')

        // Detect level up (version change)
        const previousLevel = stats.currentLevel
        if (previousLevel > 0 && version > previousLevel) {
          console.log(
            '%c[HOF DogAutoSpin] 🎉 LEVEL UP!',
            'background:gold;color:black;font-size:16px',
          )
          // Notify about level up
          if (currentTabId) {
            chrome.tabs
              .sendMessage(currentTabId, {
                type: 'DOG_LEVEL_UP',
                oldLevel: previousLevel,
                newLevel: version,
              })
              .catch(() => {})
          }
        }

        // Update stats
        stats.totalSpins++
        stats.totalBones = boneAmount
        stats.totalPoints = currentPoints
        stats.currentLevel = version
        stats.progressPercent = progressPercent
        stats.nextMilestone = nextMilestone

        // Notify progress
        if (currentTabId) {
          notifyTab('DOG_AUTO_SPIN_PROGRESS', {
            spinNumber: stats.totalSpins,
            wonWedgeNumber: wonWedgeNumber,
            stats: stats,
            progressBar: result.data.progressBar,
          })
        }
      }
    } catch (err) {
      console.error('[HOF DogAutoSpin] Spin error:', err)
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
  self.DogAutoSpin = DogAutoSpin
}
