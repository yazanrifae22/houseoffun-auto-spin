/**
 * Fetch Helpers Module
 * Shared utilities for HTTP requests across all modules
 */

const FetchHelpers = (() => {
  // Headers to skip (browser-controlled)
  const SKIP_HEADERS = [
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

  /**
   * Build headers object from array, filtering browser-controlled headers
   */
  function buildHeaders(headersArray) {
    const headers = {}
    for (const h of headersArray) {
      if (!SKIP_HEADERS.includes(h.name.toLowerCase())) {
        headers[h.name] = h.value
      }
    }
    return headers
  }

  /**
   * Execute fetch in page context (MAIN world)
   * This function is injected and runs in the page to access cookies/session
   */
  async function executeFetchInPage(url, body, headersArray) {
    const headers = {}

    // Skip browser-controlled headers
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

  /**
   * Generate unique ID with specified length
   * @param {number} length - Length of ID (default 32)
   * @returns {string} Random numeric ID
   */
  function generateUniqueId(length = 32) {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
  }

  return {
    executeFetchInPage,
    generateUniqueId,
    buildHeaders,
    SKIP_HEADERS,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.FetchHelpers = FetchHelpers
}
