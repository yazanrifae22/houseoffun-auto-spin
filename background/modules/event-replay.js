/**
 * Event Replay Module
 * Handles replaying captured event stream requests for claiming bonuses
 */

const EventReplay = (() => {
  /**
   * Generate unique request ID for event request
   */
  function generateRequestId() {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }

  /**
   * Replay an event request in the page context
   */
  async function replayEvent(capturedEventRequest, tabId = null) {
    if (!capturedEventRequest) {
      console.log('[HOF EventReplay] No event request captured, skipping')
      return { skipped: true }
    }

    // Get tab ID if not provided
    if (!tabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      tabId = tabs[0]?.id
      if (!tabId) {
        throw new Error('No active tab found')
      }
    }

    // Prepare request with new request ID
    const url = capturedEventRequest.url
    const bodyStr = capturedEventRequest.body || '[]'
    const headersArray = JSON.parse(JSON.stringify(capturedEventRequest.headersArray))

    // Update request_id header if it exists
    const requestIdHeader = headersArray.find((h) => h.name.toLowerCase() === 'request_id')
    if (requestIdHeader) {
      requestIdHeader.value = generateRequestId()
    }

    console.log('[HOF EventReplay] Calling event stream...')

    // Execute fetch in page context
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: executeFetchInPage,
      args: [url, bodyStr, headersArray],
    })

    const result = results[0]?.result
    if (result?.error) {
      console.error('[HOF EventReplay] Error:', result.error)
      return result
    }

    console.log('[HOF EventReplay] ✅ Event called successfully')
    return result
  }

  /**
   * Function to be injected and executed in page context
   * This runs in the MAIN world and has access to cookies/session
   */
  async function executeFetchInPage(url, body, headersArray) {
    const headers = {}

    // Headers to skip (browser-controlled)
    const skipHeaders = [
      'host',
      'connection',
      'content-length',
      'accept-encoding',
      'sec-fetch-dest',
      'sec-fetch-mode',
      'sec-fetch-site',
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform',
    ]

    // Build headers object
    for (const h of headersArray) {
      if (!skipHeaders.includes(h.name.toLowerCase())) {
        headers[h.name] = h.value
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
        credentials: 'include',
      })

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        data = text
      }

      return { status: response.status, data }
    } catch (err) {
      return { error: err.message }
    }
  }

  return {
    replayEvent,
    generateRequestId,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.EventReplay = EventReplay
}
