/**
 * Bonus Game Replay Module
 * Handles automatic playing of bonus games (star jackpots, etc.)
 */

const BonusGameReplay = (() => {
  /**
   * Generate unique 32-digit ID for bonus game request
   */
  function generateUniqueId() {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 10)).join('')
  }

  /**
   * Play a bonus game automatically until completion
   * @param {Object} bonusGameData - Initial bonus game data from spin response
   * @param {string} capturedRequest - The captured main spin request for headers/session
   * @param {number} tabId - Tab ID
   * @returns {Object} Final bonus game results
   */
  async function playBonusGame(bonusGameData, capturedRequest, tabId) {
    if (!bonusGameData || !bonusGameData.bonusToken) {
      console.error('[HOF BonusGame] No bonusToken found')
      return null
    }

    const bonusToken = bonusGameData.bonusToken
    const totalSpins = bonusGameData.spinsAmount || 0
    let currentSpin = 0
    let totalBonusWin = 0

    console.log(
      `%c[HOF BonusGame] 🎁 BONUS GAME TRIGGERED! Token: ${bonusToken.substring(0, 20)}...`,
      'background:purple;color:white;font-weight:bold;font-size:14px;padding:4px 8px',
    )
    console.log(`[HOF BonusGame] Total spins to play: ${totalSpins}`)

    // Parse session and gameId from captured request
    let session = ''
    let gameId = 190 // Default

    try {
      const bodyObj = JSON.parse(capturedRequest.body)
      const params = JSON.parse(bodyObj.params)
      session = params.session || ''
      gameId = params.gameId || 190
    } catch (e) {
      console.error('[HOF BonusGame] Failed to parse session:', e)
    }

    // Play bonus spins until countdown reaches 0
    let spinsCountdown = totalSpins
    while (spinsCountdown > 0) {
      currentSpin++

      try {
        console.log(`[HOF BonusGame] Playing bonus spin ${currentSpin}/${totalSpins}...`)

        const result = await sendBonusGameSpin(bonusToken, session, gameId, capturedRequest, tabId)

        // Debug recording - record bonus response body
        if (self.DebugRecorder?.isActive() && result) {
          self.DebugRecorder.recordHttpResponseBody('bonus-game-spin', result.status, result.data)
        }

        if (result?.status === 200 && result.data?.result?.gameInfo?.bonusGamePlay) {
          const bgp = result.data.result.gameInfo.bonusGamePlay
          spinsCountdown = bgp.spinsCountdown || 0
          const spinWin = bgp.bonusWin || 0
          totalBonusWin = bgp.totalWin || 0

          console.log(
            `[HOF BonusGame] Spin ${currentSpin}: Won ${spinWin.toLocaleString()}, Total: ${totalBonusWin.toLocaleString()}, Remaining: ${spinsCountdown}`,
          )
        } else {
          console.error('[HOF BonusGame] Invalid response, stopping')
          break
        }

        // Small delay between bonus spins
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (err) {
        console.error(`[HOF BonusGame] Error on spin ${currentSpin}:`, err)
        break
      }
    }

    console.log(
      `%c[HOF BonusGame] ✅ BONUS COMPLETE! Total Won: ${totalBonusWin.toLocaleString()}`,
      'background:gold;color:black;font-weight:bold;font-size:14px;padding:4px 8px',
    )

    return {
      totalSpins: currentSpin,
      totalBonusWin: totalBonusWin,
    }
  }

  /**
   * Send a single bonus game spin request
   */
  async function sendBonusGameSpin(bonusToken, session, gameId, capturedRequest, tabId) {
    const url = capturedRequest.url
    const headersArray = JSON.parse(JSON.stringify(capturedRequest.headersArray))

    // Create bonus game request body
    const bonusGameBody = {
      cmd: 'bonusGame',
      id: generateUniqueId(),
      params: JSON.stringify({
        bonusToken: bonusToken,
        gameId: gameId,
        session: session,
      }),
    }

    const bodyStr = JSON.stringify(bonusGameBody)

    // Execute in page context
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: executeFetchInPage,
      args: [url, bodyStr, headersArray],
    })

    const result = results[0]?.result
    if (result?.error) {
      throw new Error(result.error)
    }

    return result
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
    playBonusGame,
    generateUniqueId,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.BonusGameReplay = BonusGameReplay
}
