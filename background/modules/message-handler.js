/**
 * Message Handler Module
 * Routes messages between content scripts and background modules
 */

const MessageHandler = (() => {
  /**
   * Initialize message listener
   */
  function init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleMessage(message, sender, sendResponse)
      return true // Keep channel open for async responses
    })
  }

  /**
   * Handle incoming messages
   */
  async function handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_SPIN_REQUEST':
          await handleGetSpinRequest(sendResponse)
          break

        case 'REPLAY_SPIN':
          await handleReplaySpin(sender, sendResponse)
          break

        case 'START_AUTO_SPIN':
          await handleStartAutoSpin(sender, message, sendResponse)
          break

        case 'STOP_AUTO_SPIN':
          await handleStopAutoSpin(sendResponse)
          break

        // Dog spin handlers
        case 'GET_DOG_SPIN_REQUEST':
          await handleGetDogSpinRequest(sendResponse)
          break

        case 'REPLAY_DOG_SPIN':
          await handleReplayDogSpin(sender, sendResponse)
          break

        case 'START_DOG_AUTO_SPIN':
          await handleStartDogAutoSpin(sender, message, sendResponse)
          break

        case 'STOP_DOG_AUTO_SPIN':
          await handleStopDogAutoSpin(sendResponse)
          break

        case 'GET_STATUS':
          handleGetStatus(sendResponse)
          break

        case 'GET_HISTORY':
          await handleGetHistory(message, sendResponse)
          break

        case 'CLEAR_HISTORY':
          await handleClearHistory(message, sendResponse)
          break

        case 'CLEAR_REQUESTS':
          await handleClearRequests(sendResponse)
          break

        case 'CLEAR_DOG_REQUESTS':
          await handleClearDogRequests(sendResponse)
          break

        // Debug handlers
        case 'DEBUG_START_SESSION':
          handleDebugStartSession(sendResponse)
          break

        case 'DEBUG_STOP_SESSION':
          handleDebugStopSession(sendResponse)
          break

        case 'DEBUG_GET_STATUS':
          handleDebugGetStatus(sendResponse)
          break

        case 'DEBUG_EXPORT_SESSION':
          handleDebugExportSession(sendResponse)
          break

        case 'DEBUG_CLEAR_SESSION':
          handleDebugClearSession(sendResponse)
          break

        case 'DEBUG_DOM_MUTATION':
          handleDebugDomMutation(message, sendResponse)
          break

        case 'DEBUG_CONSOLE':
          handleDebugConsole(message, sendResponse)
          break

        case 'DEBUG_UI_EVENT':
          handleDebugUiEvent(message, sendResponse)
          break

        default:
          sendResponse({ success: false, error: 'Unknown message type' })
      }
    } catch (error) {
      console.error('[HOF MessageHandler] Error:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  /**
   * Get spin request
   */
  async function handleGetSpinRequest(sendResponse) {
    const capturedRequest = self.RequestCapture.getCapturedRequest()
    const autoSpinStatus = self.AutoSpin.getStatus()

    sendResponse({
      success: true,
      data: capturedRequest,
      autoSpinActive: autoSpinStatus.isActive,
      stats: autoSpinStatus.stats,
    })
  }

  /**
   * Replay single spin
   */
  async function handleReplaySpin(sender, sendResponse) {
    try {
      const capturedRequest = self.RequestCapture.getCapturedRequest()
      const result = await self.SpinReplay.replaySpin(capturedRequest, sender.tab?.id)
      sendResponse({ success: true, data: result })
    } catch (err) {
      sendResponse({ success: false, error: err.message })
    }
  }

  /**
   * Start auto-spin
   */
  async function handleStartAutoSpin(sender, message, sendResponse) {
    await self.AutoSpin.start(sender.tab?.id, message.config)
    sendResponse({ success: true })
  }

  /**
   * Stop auto-spin
   */
  async function handleStopAutoSpin(sendResponse) {
    const stats = await self.AutoSpin.stop()
    sendResponse({ success: true, stats })
  }

  /**
   * Get current status (both main and dog)
   */
  function handleGetStatus(sendResponse) {
    const autoSpinStatus = self.AutoSpin.getStatus()
    const dogAutoSpinStatus = self.DogAutoSpin.getStatus()
    const hasCapturedRequest = !!self.RequestCapture.getCapturedRequest()
    const hasCapturedDogRequest = !!self.RequestCapture.getCapturedDogRequest()

    sendResponse({
      autoSpinActive: autoSpinStatus.isActive,
      stats: autoSpinStatus.stats,
      hasCapturedRequest,
      dogAutoSpinActive: dogAutoSpinStatus.isActive,
      dogStats: dogAutoSpinStatus.stats,
      hasCapturedDogRequest,
    })
  }

  /**
   * Get dog spin request
   */
  async function handleGetDogSpinRequest(sendResponse) {
    const capturedRequest = self.RequestCapture.getCapturedDogRequest()
    const dogAutoSpinStatus = self.DogAutoSpin.getStatus()

    sendResponse({
      success: true,
      data: capturedRequest,
      dogAutoSpinActive: dogAutoSpinStatus.isActive,
      dogStats: dogAutoSpinStatus.stats,
    })
  }

  /**
   * Replay single dog spin
   */
  async function handleReplayDogSpin(sender, sendResponse) {
    try {
      const capturedRequest = self.RequestCapture.getCapturedDogRequest()
      const result = await self.SpinReplay.replaySpin(capturedRequest, sender.tab?.id)
      sendResponse({ success: true, data: result })
    } catch (err) {
      sendResponse({ success: false, error: err.message })
    }
  }

  /**
   * Start dog auto-spin
   */
  async function handleStartDogAutoSpin(sender, message, sendResponse) {
    await self.DogAutoSpin.start(sender.tab?.id, message.config)
    sendResponse({ success: true })
  }

  /**
   * Stop dog auto-spin
   */
  async function handleStopDogAutoSpin(sendResponse) {
    const stats = await self.DogAutoSpin.stop()
    sendResponse({ success: true, stats })
  }

  /**
   * Clear captured dog requests
   */
  async function handleClearDogRequests(sendResponse) {
    await self.RequestCapture.clearCapturedDogRequest()
    sendResponse({ success: true })
  }

  /**
   * Get history
   */
  async function handleGetHistory(message, sendResponse) {
    const historyType = message.historyType || 'main'
    const history = await self.History.getHistory(historyType)
    sendResponse({ success: true, history })
  }

  /**
   * Clear history
   */
  async function handleClearHistory(message, sendResponse) {
    const historyType = message.historyType || 'main'
    await self.History.clearHistory(historyType)
    sendResponse({ success: true })
  }

  /**
   * Clear captured main requests
   */
  async function handleClearRequests(sendResponse) {
    await self.RequestCapture.clearCapturedRequest()
    sendResponse({ success: true })
  }

  /**
   * Debug - Start session
   */
  function handleDebugStartSession(sendResponse) {
    const result = self.DebugRecorder.startSession()
    sendResponse(result)
  }

  /**
   * Debug - Stop session
   */
  function handleDebugStopSession(sendResponse) {
    const result = self.DebugRecorder.stopSession()
    sendResponse(result)
  }

  /**
   * Debug - Get status
   */
  function handleDebugGetStatus(sendResponse) {
    const info = self.DebugRecorder.getSessionInfo()
    const stats = self.DebugRecorder.getStats()
    sendResponse({
      success: true,
      ...info,
      stats: stats,
    })
  }

  /**
   * Debug - Export session
   */
  function handleDebugExportSession(sendResponse) {
    const sessionData = self.DebugRecorder.exportSession()
    sendResponse({
      success: true,
      data: sessionData,
    })
  }

  /**
   * Debug - Clear session
   */
  function handleDebugClearSession(sendResponse) {
    self.DebugRecorder.clearSession()
    sendResponse({ success: true })
  }

  /**
   * Debug - DOM mutation
   */
  function handleDebugDomMutation(message, sendResponse) {
    self.DebugRecorder.recordDomMutation(message.data)
    sendResponse({ success: true })
  }

  /**
   * Debug - Console log
   */
  function handleDebugConsole(message, sendResponse) {
    self.DebugRecorder.recordConsoleLog(
      message.data.level,
      message.data.message,
      message.data.stack,
    )
    sendResponse({ success: true })
  }

  /**
   * Debug - UI event
   */
  function handleDebugUiEvent(message, sendResponse) {
    self.DebugRecorder.recordUiEvent(message.eventType, message.data)
    sendResponse({ success: true })
  }

  return {
    init,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.MessageHandler = MessageHandler
}
