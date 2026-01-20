/**
 * Spin Replay Module
 * Handles replaying captured spin requests
 */

const SpinReplay = (() => {
  /**
   * Generate unique 32-digit ID for spin request
   */
  function generateUniqueId() {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 10)).join('')
  }

  /**
   * Replay a spin request in the page context
   */
  async function replaySpin(capturedRequest, tabId = null) {
    if (!capturedRequest) {
      throw new Error('No spin request captured')
    }

    // Get tab ID if not provided
    if (!tabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      tabId = tabs[0]?.id
      if (!tabId) {
        throw new Error('No active tab found')
      }
    }

    // Prepare request with new unique ID
    const url = capturedRequest.url
    const bodyObj = JSON.parse(capturedRequest.body)
    bodyObj.id = generateUniqueId()
    const newBody = JSON.stringify(bodyObj)
    const headersArray = JSON.parse(JSON.stringify(capturedRequest.headersArray))

    // Execute fetch in page context
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: executeFetchInPage,
      args: [url, newBody, headersArray],
    })

    const result = results[0]?.result
    if (result?.error) {
      throw new Error(result.error)
    }

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
    replaySpin,
    generateUniqueId,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.SpinReplay = SpinReplay
}
