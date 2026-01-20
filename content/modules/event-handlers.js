/**
 * Event Handlers Module
 * Manages all user interactions
 */

const EventHandlers = (() => {
  /**
   * Setup all event listeners
   */
  function setupEventListeners() {
    setupHeaderEvents()
    setupMainViewEvents()
  }

  /**
   * Setup header events (minimize, close)
   */
  function setupHeaderEvents() {
    let minimized = false

    const minimizeBtn = document.getElementById('hof-minimize')
    const closeBtn = document.getElementById('hof-close')
    const content = document.getElementById('hof-content')

    if (minimizeBtn && content) {
      minimizeBtn.addEventListener('click', () => {
        minimized = !minimized
        content.style.display = minimized ? 'none' : 'block'
        minimizeBtn.textContent = minimized ? '+' : '−'
      })
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const panel = window.UIManager.getPanel()
        if (panel) panel.remove()
      })
    }
  }

  /**
   * Setup main view button events
   */
  function setupMainViewEvents() {
    // Start button
    const startBtn = document.getElementById('hof-start-btn')
    if (startBtn) {
      startBtn.addEventListener('click', handleStartAutoSpin)
    }

    // Stop button
    const stopBtn = document.getElementById('hof-stop-btn')
    if (stopBtn) {
      stopBtn.addEventListener('click', handleStopAutoSpin)
    }

    // History button
    const historyBtn = document.getElementById('hof-history-btn')
    if (historyBtn) {
      historyBtn.addEventListener('click', handleShowHistory)
    }

    // Single spin button
    const singleBtn = document.getElementById('hof-single-btn')
    if (singleBtn) {
      singleBtn.addEventListener('click', handleSingleSpin)
    }

    // Clear button
    const clearBtn = document.getElementById('hof-clear-btn')
    if (clearBtn) {
      clearBtn.addEventListener('click', handleClearRequests)
    }
  }

  /**
   * Setup history view events
   */
  function setupHistoryViewEvents() {
    // Back button
    const backBtn = document.getElementById('hof-back-btn')
    if (backBtn) {
      backBtn.addEventListener('click', handleBackToMain)
    }

    // Clear history button
    const clearHistoryBtn = document.getElementById('hof-clear-history')
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', handleClearHistory)
    }
  }

  /**
   * Handle start auto-spin
   */
  async function handleStartAutoSpin() {
    const minDelay = parseFloat(document.getElementById('hof-min-delay')?.value) || 1
    const maxDelay = parseFloat(document.getElementById('hof-max-delay')?.value) || 2
    const maxSpins = parseInt(document.getElementById('hof-max-spins')?.value) || 0
    const stopOnLoss = parseInt(document.getElementById('hof-stop-loss')?.value) || 0

    chrome.runtime.sendMessage({
      type: 'START_AUTO_SPIN',
      config: {
        minDelay: minDelay * 1000,
        maxDelay: maxDelay * 1000,
        maxSpins,
        stopOnLoss,
      },
    })
  }

  /**
   * Handle stop auto-spin
   */
  function handleStopAutoSpin() {
    chrome.runtime.sendMessage({ type: 'STOP_AUTO_SPIN' })
  }

  /**
   * Handle show history
   */
  async function handleShowHistory() {
    window.StateManager.setState({ currentTab: 'history' })

    chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
      const history = response?.history || []
      window.UIManager.renderHistoryView(history)
      setupHistoryViewEvents()
    })
  }

  /**
   * Handle back to main
   */
  function handleBackToMain() {
    window.StateManager.setState({ currentTab: 'main' })
    const state = window.StateManager.getState()
    window.UIManager.renderMainView(state)
    setupMainViewEvents()
  }

  /**
   * Handle single spin
   */
  function handleSingleSpin() {
    chrome.runtime.sendMessage({ type: 'REPLAY_SPIN' }, (response) => {
      if (response?.success && response.data?.status === 200) {
        const wins = response.data.data?.result?.gameInfo?.wins || []
        const win = wins.reduce((sum, w) => sum + (w.win || 0), 0)

        const lastSpinEl = document.getElementById('hof-last-spin')
        if (lastSpinEl) {
          lastSpinEl.innerHTML =
            win > 0
              ? `<span style="color:#ffd700">🎉 Won ${win.toLocaleString()}</span>`
              : `<span style="color:#888">No win</span>`
        }

        window.UIManager.showNotification(
          win > 0 ? `Won ${win.toLocaleString()}!` : 'No win',
          win > 0 ? 'success' : 'info',
        )
      } else {
        window.UIManager.showNotification('Spin failed', 'error')
      }
    })
  }

  /**
   * Handle clear requests
   */
  function handleClearRequests() {
    chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' }, () => {
      window.StateManager.setState({ capturedRequest: null })

      const statusDot = document.getElementById('hof-status-dot')
      const statusText = document.getElementById('hof-status-text')
      const liveStats = document.getElementById('hof-live-stats')
      const lastSpin = document.getElementById('hof-last-spin')

      if (statusDot) statusDot.style.background = '#888'
      if (statusText) statusText.textContent = 'Click SPIN in game to capture new'
      if (liveStats)
        liveStats.innerHTML =
          '<div style="color:#666;text-align:center;">Cleared! Spin in game to capture.</div>'
      if (lastSpin) lastSpin.innerHTML = ''

      window.UIManager.showNotification('🗑️ Spin cleared!', 'warning')
    })
  }

  /**
   * Handle clear history
   */
  function handleClearHistory() {
    chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => {
      window.UIManager.showNotification('History cleared', 'info')
      handleShowHistory() // Refresh view
    })
  }

  return {
    setupEventListeners,
    setupMainViewEvents,
    setupHistoryViewEvents,
  }
})()

// Export
if (typeof window !== 'undefined') {
  window.EventHandlers = EventHandlers
}
