/**
 * Message Handler Module (Content Script)
 * Handles messages from background worker
 */

const MessageHandlerContent = (() => {
  /**
   * Initialize message listener
   */
  function init() {
    chrome.runtime.onMessage.addListener((message) => {
      handleMessage(message)
    })
  }

  /**
   * Handle incoming messages
   */
  function handleMessage(message) {
    switch (message.type) {
      case 'SPIN_CAPTURED':
        handleSpinCaptured()
        break

      case 'AUTO_SPIN_STARTED':
        handleAutoSpinStarted()
        break

      case 'AUTO_SPIN_PROGRESS':
        handleAutoSpinProgress(message)
        break

      case 'AUTO_SPIN_STOPPED':
        handleAutoSpinStopped(message)
        break

      default:
        console.log('[HOF Content] Unknown message:', message.type)
    }
  }

  /**
   * Handle spin captured
   */
  function handleSpinCaptured() {
    window.StateManager.setState({ capturedRequest: true })
    window.UIManager.showNotification('✅ Spin captured!', 'success')

    const statusDot = document.getElementById('hof-status-dot')
    const statusText = document.getElementById('hof-status-text')

    if (statusDot) statusDot.style.background = '#00c853'
    if (statusText) statusText.textContent = '✅ Ready to spin!'
  }

  /**
   * Handle auto-spin started
   */
  function handleAutoSpinStarted() {
    window.StateManager.setState({ autoSpinActive: true })

    const startBtn = document.getElementById('hof-start-btn')
    const stopBtn = document.getElementById('hof-stop-btn')

    if (startBtn) startBtn.style.display = 'none'
    if (stopBtn) stopBtn.style.display = 'flex'

    window.UIManager.showNotification('🚀 Auto-spin started!', 'info')
  }

  /**
   * Handle auto-spin progress
   */
  function handleAutoSpinProgress(message) {
    window.StateManager.updateStats(message.stats)
    window.UIManager.updateLiveStats(message.stats, message.spinWin)
  }

  /**
   * Handle auto-spin stopped
   */
  function handleAutoSpinStopped(message) {
    window.StateManager.setState({ autoSpinActive: false })

    const startBtn = document.getElementById('hof-start-btn')
    const stopBtn = document.getElementById('hof-stop-btn')

    if (startBtn) startBtn.style.display = 'flex'
    if (stopBtn) stopBtn.style.display = 'none'

    window.UIManager.showFinalStats(message.stats)
    window.UIManager.showNotification('🛑 Auto-spin stopped', 'warning')
  }

  return {
    init,
  }
})()

// Export
if (typeof window !== 'undefined') {
  window.MessageHandlerContent = MessageHandlerContent
}
