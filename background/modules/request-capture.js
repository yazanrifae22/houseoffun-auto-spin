/**
 * Request Capture Module
 * Handles interception and capture of spin requests
 */

const RequestCapture = (() => {
  const pendingBodies = {}
  let capturedSpinRequest = null
  let capturedDogSpinRequest = null
  let capturedEventRequest = null

  /**
   * Initialize request capture listeners
   */
  function init() {
    chrome.webRequest.onBeforeRequest.addListener(
      handleBeforeRequest,
      { urls: ['*://*.playtika.com/*'] },
      ['requestBody'],
    )

    chrome.webRequest.onBeforeSendHeaders.addListener(
      handleBeforeSendHeaders,
      { urls: ['*://*.playtika.com/*'] },
      ['requestHeaders', 'extraHeaders'],
    )

    chrome.webRequest.onCompleted.addListener(handleCompleted, { urls: ['*://*.playtika.com/*'] })

    // Load existing requests from storage
    loadFromStorage()
  }

  /**
   * Load captured requests from storage
   */
  async function loadFromStorage() {
    const data = await chrome.storage.local.get([
      'hof_spin_request',
      'hof_dog_spin_request',
      'hof_event_request',
    ])
    if (data.hof_spin_request) {
      capturedSpinRequest = data.hof_spin_request
    }
    if (data.hof_dog_spin_request) {
      capturedDogSpinRequest = data.hof_dog_spin_request
    }
    if (data.hof_event_request) {
      capturedEventRequest = data.hof_event_request
    }
  }

  /**
   * Handle before request - capture body
   */
  function handleBeforeRequest(details) {
    if (details.method !== 'POST' || !details.url.includes('playtika.com')) {
      return
    }

    let bodyStr = ''
    if (details.requestBody?.raw) {
      const decoder = new TextDecoder('utf-8')
      for (const part of details.requestBody.raw) {
        if (part.bytes) {
          bodyStr += decoder.decode(part.bytes)
        }
      }
    }

    // Check if this is a main spin request
    if (bodyStr.includes('"cmd"') && bodyStr.includes('"spin"')) {
      pendingBodies[details.requestId] = {
        url: details.url,
        body: bodyStr,
        tabId: details.tabId,
        type: 'main',
      }
    }
    // Check if this is a dog spin request
    else if (details.url.includes('hof-bestie-service/public/v1/game/wheel/spin')) {
      pendingBodies[details.requestId] = {
        url: details.url,
        body: bodyStr,
        tabId: details.tabId,
        type: 'dog',
      }
    }
    // Check if this is an event stream request
    else if (details.url.includes('client-event-stream/authenticated/events')) {
      pendingBodies[details.requestId] = {
        url: details.url,
        body: bodyStr,
        tabId: details.tabId,
        type: 'event',
      }
    }
  }

  /**
   * Handle before send headers - capture headers and combine with body
   */
  function handleBeforeSendHeaders(details) {
    const pending = pendingBodies[details.requestId]
    if (!pending) return

    const headersArray = (details.requestHeaders || []).map((h) => ({
      name: h.name,
      value: h.value,
    }))

    const captureData = {
      url: pending.url,
      body: pending.body,
      headersArray: headersArray,
      tabId: pending.tabId,
      timestamp: Date.now(),
    }

    // Debug recording - record request
    if (self.DebugRecorder?.isActive()) {
      self.DebugRecorder.recordHttpRequest({
        requestId: details.requestId,
        url: pending.url,
        method: details.method,
        type: pending.type,
        requestBody: pending.body,
        headers: headersArray,
        initiator: details.initiator,
      })
    }

    if (pending.type === 'main') {
      console.log('%c[HOF] 🎰 MAIN SPIN CAPTURED!', 'background:green;color:white;font-size:14px')
      capturedSpinRequest = captureData
      chrome.storage.local.set({ hof_spin_request: capturedSpinRequest })

      if (pending.tabId > 0) {
        chrome.tabs.sendMessage(pending.tabId, { type: 'SPIN_CAPTURED' }).catch(() => {})
      }
    } else if (pending.type === 'dog') {
      console.log('%c[HOF] 🦴 DOG SPIN CAPTURED!', 'background:blue;color:white;font-size:14px')
      capturedDogSpinRequest = captureData
      chrome.storage.local.set({ hof_dog_spin_request: capturedDogSpinRequest })

      if (pending.tabId > 0) {
        chrome.tabs.sendMessage(pending.tabId, { type: 'DOG_SPIN_CAPTURED' }).catch(() => {})
      }
    } else if (pending.type === 'event') {
      console.log(
        '%c[HOF] ⭐ EVENT STREAM CAPTURED!',
        'background:purple;color:white;font-size:14px',
      )
      capturedEventRequest = captureData
      chrome.storage.local.set({ hof_event_request: capturedEventRequest })
    }

    // Cleanup
    delete pendingBodies[details.requestId]
  }

  /**
   * Handle request completion - cleanup
   */
  function handleCompleted(details) {
    // Debug recording - record response
    if (self.DebugRecorder?.isActive()) {
      self.DebugRecorder.recordHttpResponse({
        requestId: details.requestId,
        url: details.url,
        statusCode: details.statusCode,
        statusLine: details.statusLine,
        responseHeaders: details.responseHeaders,
        fromCache: details.fromCache,
      })
    }

    delete pendingBodies[details.requestId]
  }

  /**
   * Get current captured main request
   */
  function getCapturedRequest() {
    return capturedSpinRequest
  }

  /**
   * Get current captured dog request
   */
  function getCapturedDogRequest() {
    return capturedDogSpinRequest
  }

  /**
   * Clear captured main request
   */
  async function clearCapturedRequest() {
    capturedSpinRequest = null
    await chrome.storage.local.remove(['hof_spin_request'])
  }

  /**
   * Clear captured dog request
   */
  async function clearCapturedDogRequest() {
    capturedDogSpinRequest = null
    await chrome.storage.local.remove(['hof_dog_spin_request'])
  }

  /**
   * Get current captured event request
   */
  function getCapturedEventRequest() {
    return capturedEventRequest
  }

  /**
   * Clear captured event request
   */
  async function clearCapturedEventRequest() {
    capturedEventRequest = null
    await chrome.storage.local.remove(['hof_event_request'])
  }

  return {
    init,
    getCapturedRequest,
    getCapturedDogRequest,
    getCapturedEventRequest,
    clearCapturedRequest,
    clearCapturedDogRequest,
    clearCapturedEventRequest,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.RequestCapture = RequestCapture
}
