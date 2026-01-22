/**
 * Event Bonus Stream Module
 * Handles event stream calls for bonus game triggers to bypass UI
 */

const EventBonusStream = (() => {
  /**
   * Generate UUID v4
   */
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * Call event stream for bonus game popup
   * @param {number} actionId - 1 for show popup, 4 for start clicked
   * @param {string} session - Session ID
   * @param {number} userId - User ID
   * @param {number} levelId - User level
   * @param {number} tabId - Tab ID
   */
  async function callBonusEvent(actionId, session, userId, levelId, tabId) {
    const url = 'https://hof-dsa.playtika.com/client-event-stream/authenticated/events'

    const payload = {
      action_id: actionId,
      app_version: '5.6.030',
      entity_id: 129,
      extra: JSON.stringify({
        name: 'GameBOJ_JapckpotPopups_CGameBOJ_MiniGamePopUpStart',
      }),
      level_id: levelId,
      platform_id: 18,
      sid: session,
      time_stamp: Math.floor(Date.now() / 1000),
      type: 'eventEntityImpression',
      uid: userId,
      uuid: generateUUID().replace(/-/g, ''),
    }

    console.log(`[EventBonusStream] Calling event action_id ${actionId}...`)

    // Get captured event request for headers
    const capturedEventRequest = self.RequestCapture?.getCapturedEventRequest()
    const headersArray = capturedEventRequest?.headersArray || []

    // Execute in page context
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: executeFetchInPage,
      args: [url, JSON.stringify(payload) + '\n', headersArray],
    })

    const result = results[0]?.result
    if (result?.error) {
      console.error(`[EventBonusStream] Error on action_id ${actionId}:`, result.error)
      return { success: false, error: result.error }
    }

    console.log(`[EventBonusStream] Action ${actionId} completed:`, result?.data)
    return { success: true, data: result }
  }

  /**
   * Call game event stream for mini-games (stars, etc.)
   * @param {number} gameActionId - Game action ID (1005 for trigger, 32 for start, etc.)
   * @param {string} session - Session ID
   * @param {number} userId - User ID
   * @param {number} gameId - Game ID (e.g., 190)
   * @param {number} tabId - Tab ID
   * @param {object} extraData - Optional extra data (e.g., {numSpins: 437})
   */
  async function callGameEvent(gameActionId, session, userId, gameId, tabId, extraData = null) {
    const url = 'https://hof-dsa.playtika.com/client-event-stream/authenticated/events'

    const payload = {
      app_version: '5.6.030',
      game_action_id: gameActionId,
      game_id: gameId,
      platform_id: 18,
      sid: session,
      time_stamp: Math.floor(Date.now() / 1000),
      type: 'eventGame',
      uid: userId,
      uuid: generateUUID().replace(/-/g, ''),
    }

    // Add extra data if provided
    if (extraData) {
      payload.extra = JSON.stringify(extraData) + '\n'
    }

    console.log(`[EventBonusStream] Calling game event action_id ${gameActionId}...`)

    // Get captured event request for headers
    const capturedEventRequest = self.RequestCapture?.getCapturedEventRequest()
    const headersArray = capturedEventRequest?.headersArray || []

    // Execute in page context
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: executeFetchInPage,
      args: [url, JSON.stringify(payload) + '\n', headersArray],
    })

    const result = results[0]?.result
    if (result?.error) {
      console.error(`[EventBonusStream] Error on game action ${gameActionId}:`, result.error)
      return { success: false, error: result.error }
    }

    console.log(`[EventBonusStream] Game action ${gameActionId} completed:`, result?.data)
    return { success: true, data: result }
  }

  /**
   * Function to be injected and executed in page context
   */
  async function executeFetchInPage(url, body, headersArray) {
    const headers = {}

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

    // Add required headers
    headers['content-type'] = 'application/json'
    headers['request_id'] =
      Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)

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
   * Extract user info from game response or captured request
   * FIX: Return null on validation failure instead of invalid data
   * @param {Object} capturedRequest - The captured spin request
   * @param {Object} fullResponse - The FULL spin response (result.data from auto-spin)
   * @returns {Object|null} User info object or null if extraction/validation fails
   */
  function extractUserInfo(capturedRequest, fullResponse) {
    let session = ''
    let userId = 0
    let levelId = 0

    console.log('[EventBonusStream] Extracting user info...')
    console.log('[EventBonusStream] fullResponse structure:', {
      hasResult: !!fullResponse?.result,
      hasGameInfo: !!fullResponse?.result?.gameInfo,
      hasPlayer: !!fullResponse?.result?.gameInfo?.player,
    })

    // Extract session from captured request
    if (capturedRequest) {
      try {
        const bodyObj = JSON.parse(capturedRequest.body)
        const params = JSON.parse(bodyObj.params)
        session = params.session || ''
        console.log('[EventBonusStream] Session from request:', session ? '✓' : '✗')
      } catch (e) {
        console.error('[EventBonusStream] Failed to parse session from request:', e.message)
        return null // FIX: Return null instead of continuing with empty session
      }
    } else {
      console.error('[EventBonusStream] No captured request provided')
      return null // FIX: Return null if no request
    }

    // Extract userId and levelId from full response
    if (fullResponse?.result?.gameInfo) {
      try {
        const gameInfo = fullResponse.result.gameInfo

        // Try different possible locations for userId
        userId =
          parseInt(gameInfo.uid) ||
          parseInt(gameInfo.userId) ||
          parseInt(gameInfo.player?.uid) ||
          parseInt(gameInfo.player?.userId) ||
          0

        // Try different possible locations for levelId
        levelId =
          parseInt(gameInfo.levelId) ||
          parseInt(gameInfo.level_id) ||
          parseInt(gameInfo.level) ||
          parseInt(gameInfo.player?.level) ||
          parseInt(gameInfo.player?.levelId) ||
          0

        console.log('[EventBonusStream] Extracted:', { userId, levelId, session: '***' })
      } catch (e) {
        console.error('[EventBonusStream] Error extracting user info:', e.message)
        return null // FIX: Return null on parsing error
      }
    } else {
      console.error('[EventBonusStream] fullResponse missing result.gameInfo structure')
      return null // FIX: Return null if structure is invalid
    }

    // FIX: Validate extracted data
    const isValidSession = typeof session === 'string' && session.length > 0
    const isValidUserId = typeof userId === 'number' && userId > 0 && !isNaN(userId)
    const isValidLevelId = typeof levelId === 'number' && levelId > 0 && !isNaN(levelId)

    if (isValidSession && isValidUserId && isValidLevelId) {
      console.log(`[EventBonusStream] ✅ Successfully extracted and validated all info`)
      return { session, userId, levelId }
    } else {
      console.error(
        `[EventBonusStream] ❌ Validation failed:`,
        {
          session: isValidSession ? 'valid' : `invalid (${typeof session}, length: ${session.length})`,
          userId: isValidUserId ? 'valid' : `invalid (${userId})`,
          levelId: isValidLevelId ? 'valid' : `invalid (${levelId})`,
        },
      )
      return null // FIX: Return null instead of invalid data
    }
  }

  return {
    callBonusEvent,
    callGameEvent,
    extractUserInfo,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.EventBonusStream = EventBonusStream
}
