/**
 * Request Capture Module
 * Handles interception and capture of spin requests
 */

const RequestCapture = (() => {
  const pendingBodies = {}
  let capturedSpinRequest = null
  let capturedDogSpinRequest = null

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
    const data = await chrome.storage.local.get(['hof_spin_request', 'hof_dog_spin_request'])
    if (data.hof_spin_request) {
      capturedSpinRequest = data.hof_spin_request
    }
    if (data.hof_dog_spin_request) {
      capturedDogSpinRequest = data.hof_dog_spin_request
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
    }

    // Cleanup
    delete pendingBodies[details.requestId]
  }

  /**
   * Handle request completion - cleanup
   */
  function handleCompleted(details) {
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

  return {
    init,
    getCapturedRequest,
    getCapturedDogRequest,
    clearCapturedRequest,
    clearCapturedDogRequest,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.RequestCapture = RequestCapture
}
