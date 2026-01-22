/**
 * Spin Replay Module
 * Handles replaying captured spin requests
 */

const SpinReplay = (() => {
  // Use shared utility from FetchHelpers
  const generateUniqueId = () =>
    self.FetchHelpers?.generateUniqueId() ||
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 10)).join('')

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

  // Use shared executeFetchInPage from FetchHelpers (injected function)
  const executeFetchInPage = self.FetchHelpers?.executeFetchInPage

  return {
    replaySpin,
    generateUniqueId,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.SpinReplay = SpinReplay
}
