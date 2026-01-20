/**
 * State Manager Module
 * Manages UI state for the content script
 */

const StateManager = (() => {
  let state = {
    autoSpinActive: false,
    currentTab: 'main', // 'main' or 'history'
    capturedRequest: null,
    stats: {
      totalSpins: 0,
      totalWins: 0,
      startBalance: 0,
      currentBalance: 0,
      startTime: null,
    },
  }

  const listeners = []

  /**
   * Get current state
   */
  function getState() {
    return { ...state }
  }

  /**
   * Update state and notify listeners
   */
  function setState(updates) {
    state = { ...state, ...updates }
    notifyListeners()
  }

  /**
   * Update nested stats
   */
  function updateStats(statsUpdates) {
    state.stats = { ...state.stats, ...statsUpdates }
    notifyListeners()
  }

  /**
   * Subscribe to state changes
   */
  function subscribe(listener) {
    listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners
   */
  function notifyListeners() {
    listeners.forEach((listener) => {
      try {
        listener(state)
      } catch (err) {
        console.error('[HOF StateManager] Listener error:', err)
      }
    })
  }

  /**
   * Reset state
   */
  function reset() {
    state = {
      autoSpinActive: false,
      currentTab: 'main',
      capturedRequest: null,
      stats: {
        totalSpins: 0,
        totalWins: 0,
        startBalance: 0,
        currentBalance: 0,
        startTime: null,
      },
    }
    notifyListeners()
  }

  return {
    getState,
    setState,
    updateStats,
    subscribe,
    reset,
  }
})()

// Export
if (typeof window !== 'undefined') {
  window.StateManager = StateManager
}
