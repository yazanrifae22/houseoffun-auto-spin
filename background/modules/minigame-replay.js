/**
 * Mini-Game Replay Module
 * Handles automatic replay of mini-game "starts" (like Bank of Justice jackpot)
 * Ultra-fast execution: 10 requests/second (50ms delay)
 */

const MiniGameReplay = (() => {
  let isPlaying = false

  /**
   * Detect if spin response contains mini-game trigger
   */
  function detectMiniGame(spinResponse, tabId) {
    console.log('[HOF MiniGame] detectMiniGame called, checking response...')
    console.log('[HOF MiniGame] Has result?', !!spinResponse?.result)
    console.log('[HOF MiniGame] Has gameInfo?', !!spinResponse?.result?.gameInfo)

    if (!spinResponse?.result?.gameInfo) {
      console.log('[HOF MiniGame] No gameInfo found, returning null')
      return null
    }

    const gameInfo = spinResponse.result.gameInfo

    // ULTRA DETAILED LOGGING - Dump ALL gameInfo keys to console
    console.log(
      '%c[HOF MiniGame] === CHECKING FOR BONUSES ===',
      'background:blue;color:white;font-weight:bold',
    )
    console.log('[HOF MiniGame] ALL gameInfo keys:', Object.keys(gameInfo))
    console.log('[HOF MiniGame] gameInfo.starts value:', gameInfo.starts)
    console.log('[HOF MiniGame] gameInfo.startsToken:', gameInfo.startsToken)
    console.log('[HOF MiniGame] Checking bonus field...', {
      hasBonus: !!gameInfo.bonus,
      bonusType: gameInfo.bonus?.type,
    })

    //  Prepare debug info
    const debugInfo = {
      gameInfoKeys: Object.keys(gameInfo),
      starts: gameInfo.starts,
      startsToken: gameInfo.startsToken,
      detected: null,
      spins: 0,
    }

    // Method 1: Check for "starts" field
    console.log('[HOF MiniGame] Checking for STARTS...', {
      hasStarts: !!gameInfo.starts,
      startsValue: gameInfo.starts,
      hasStartsToken: !!gameInfo.startsToken,
      hasToken: !!gameInfo.token,
    })

    if (gameInfo.starts && gameInfo.starts > 0) {
      console.log(
        '%c[HOF MiniGame] ⭐ STARTS DETECTED!',
        'background:#ffd600;color:black;font-weight:bold;padding:4px 8px',
        {
          spins: gameInfo.starts,
          token: gameInfo.startsToken || gameInfo.token,
        },
      )

      debugInfo.detected = 'starts'
      debugInfo.spins = gameInfo.starts
      sendDebugInfo(debugInfo, tabId)

      return {
        type: 'starts',
        spins: gameInfo.starts,
        token: gameInfo.startsToken || gameInfo.token,
        data: gameInfo.startsData || {},
      }
    }

    // Send debug info even if not detected
    sendDebugInfo(debugInfo, tabId)

    // Method 2: Check for active jackpot
    if (gameInfo.jackpots && Array.isArray(gameInfo.jackpots)) {
      const activeJackpot = gameInfo.jackpots.find((j) => j.active || j.triggered)
      if (activeJackpot) {
        return {
          type: 'jackpot',
          spins: activeJackpot.spins || activeJackpot.count || 5,
          token: activeJackpot.token || activeJackpot.id,
          data: activeJackpot,
        }
      }
    }

    // Method 3: Check for miniGame object
    if (gameInfo.miniGame && gameInfo.miniGame.active) {
      return {
        type: 'miniGame',
        spins: gameInfo.miniGame.spins || gameInfo.miniGame.spinsRemaining || 5,
        token: gameInfo.miniGame.token || gameInfo.miniGame.id,
        data: gameInfo.miniGame,
      }
    }

    // Method 4: Check for BOJ specific (Bank of Justice)
    if (gameInfo.boj || gameInfo.bankOfJustice) {
      const boj = gameInfo.boj || gameInfo.bankOfJustice
      return {
        type: 'boj',
        spins: boj.spins || 5,
        token: boj.token,
        data: boj,
      }
    }

    // Method 5: Check for free spins bonus
    console.log(
      '[HOF MiniGame] Checking FREE SPINS - hasBonus:',
      !!gameInfo.bonus,
      'type:',
      gameInfo.bonus?.type,
    )

    if (gameInfo.bonus && gameInfo.bonus.type === 'freeSpins') {
      console.log(
        `%c[HOF MiniGame] 🎁 FREE SPINS BONUS DETECTED!`,
        'background:#ff1744;color:white;font-weight:bold;padding:4px 8px',
      )
      console.log('[HOF MiniGame] Bonus details:', gameInfo.bonus)

      return {
        type: 'freeSpins',
        spins: gameInfo.bonus.init?.spinsAmount || 3,
        token: gameInfo.bonus.bonusToken,
        data: gameInfo.bonus,
      }
    }

    console.log('[HOF MiniGame] No mini-game detected in this response')
    return null
  }

  /**
   * Play mini-game automatically
   * @param {Object} miniGameData - Detected mini-game data
   * @param {string} session - Session ID
   * @param {string} gameId - Game ID
   * @param {Object} capturedRequest - Captured request for replay
   * @param {number} tabId - Tab ID
   * @param {Object} fullResponse - FULL spin response for user info extraction
   */
  async function playMiniGame(miniGameData, session, gameId, capturedRequest, tabId, fullResponse) {
    if (isPlaying) {
      console.log('[HOF MiniGame] Already playing a mini-game')
      return { success: false, error: 'Already playing' }
    }

    isPlaying = true

    const { type, spins: totalSpins, token, data } = miniGameData

    console.log(
      `%c[HOF MiniGame] 🎰 ${type.toUpperCase()} TRIGGERED - ${totalSpins} spins!`,
      'background:#ff9800;color:white;font-weight:bold;padding:4px 8px',
    )

    // Extra logging for free spins to see bonus details
    if (type === 'freeSpins') {
      console.log(`[HOF MiniGame] Free Spins Bonus ID: ${data.id}`)
      console.log(`[HOF MiniGame] Multiplier: ${data.init?.multiplier || 1}x`)
      console.log(`[HOF MiniGame] Token: ${token}`)
    }

    self.Logger?.log('MINIGAME', `${type.toUpperCase()} started: ${totalSpins} spins`, {
      type,
      totalSpins,
      token,
    })

    let totalWin = 0
    let currentSpin = 1
    let spinsRemaining = totalSpins
    const spinResults = [] // Track each spin result for free spins

    try {
      // Extract user info once for all mini-game types
      const {
        session: sessionId,
        userId,
        levelId,
      } = self.EventBonusStream?.extractUserInfo(capturedRequest, fullResponse) || {}

      // Get gameId from captured request
      let gameId = 190 // Default
      try {
        const bodyObj = JSON.parse(capturedRequest.body)
        const params = JSON.parse(bodyObj.params)
        gameId = params.gameId || 190
      } catch (e) {
        console.warn('[HOF MiniGame] Could not extract gameId, using default 190')
      }

      // Call appropriate event stream based on mini-game type
      if (type === 'freeSpins') {
        console.log(
          '%c[HOF MiniGame] 🎰 FREE SPINS DETECTED - Attempting event stream bypass...',
          'background:#ff1744;color:white;font-weight:bold;padding:4px 8px',
        )

        try {
          console.log('[HOF MiniGame] Extracting user info from fullResponse:', {
            hasFullResponse: !!fullResponse,
            hasResult: !!fullResponse?.result,
            hasGameInfo: !!fullResponse?.result?.gameInfo,
          })

          console.log('[HOF MiniGame] Extraction result:', {
            sessionId: !!sessionId,
            userId,
            levelId,
          })

          if (sessionId && userId && levelId) {
            console.log('[HOF MiniGame] ✅ All info available, making event stream calls...')

            // Action 1: Show bonus popup
            const result1 = await self.EventBonusStream?.callBonusEvent(
              1,
              sessionId,
              userId,
              levelId,
              tabId,
            )
            console.log('[HOF MiniGame] Event 1 result:', result1)
            await new Promise((resolve) => setTimeout(resolve, 300))

            // Action 4: Start clicked
            const result2 = await self.EventBonusStream?.callBonusEvent(
              4,
              sessionId,
              userId,
              levelId,
              tabId,
            )
            console.log('[HOF MiniGame] Event 2 result:', result2)
            await new Promise((resolve) => setTimeout(resolve, 500))

            console.log(
              '%c[HOF MiniGame] ✅ Event stream calls completed, starting free spins...',
              'background:#4caf50;color:white;padding:2px 6px',
            )
          } else {
            console.error(
              '%c[HOF MiniGame] ❌ Missing user info - will attempt free spins anyway',
              'background:#f44336;color:white;padding:2px 6px',
            )
            console.error('[HOF MiniGame] Missing values:', {
              sessionId: sessionId || 'MISSING',
              userId: userId || 'MISSING',
              levelId: levelId || 'MISSING',
            })
          }
        } catch (eventError) {
          console.error('[HOF MiniGame] Event stream error (continuing anyway):', eventError)
        }
      } else if (type === 'starts') {
        // STARS mini-game - use game event stream
        console.log(
          '%c[HOF MiniGame] ⭐ STARS DETECTED - Attempting event stream bypass...',
          'background:#ffd600;color:black;font-weight:bold;padding:4px 8px',
        )

        try {
          if (sessionId && userId) {
            console.log('[HOF MiniGame] ✅ User info available, making game event calls...')

            // Game action 1005: Show stars popup
            const result1 = await self.EventBonusStream?.callGameEvent(
              1005,
              sessionId,
              userId,
              gameId,
              tabId,
            )
            console.log('[HOF MiniGame] Game event 1005 result:', result1)
            await new Promise((resolve) => setTimeout(resolve, 300))

            // Game action 32: Start clicked with numSpins
            const result2 = await self.EventBonusStream?.callGameEvent(
              32,
              sessionId,
              userId,
              gameId,
              tabId,
              {
                numSpins: totalSpins,
              },
            )
            console.log('[HOF MiniGame] Game event 32 result:', result2)
            await new Promise((resolve) => setTimeout(resolve, 500))

            console.log(
              '%c[HOF MiniGame] ✅ Game event calls completed, starting stars...',
              'background:#4caf50;color:white;padding:2px 6px',
            )
          } else {
            console.error(
              '%c[HOF MiniGame] ❌ Missing user info - will attempt stars anyway',
              'background:#f44336;color:white;padding:2px 6px',
            )
          }
        } catch (eventError) {
          console.error('[HOF MiniGame] Game event error (continuing anyway):', eventError)
        }
      } else if (type === 'jackpot' || type === 'boj' || type === 'miniGame') {
        // Other mini-games - use generic game event
        console.log(
          `%c[HOF MiniGame] 🎲 ${type.toUpperCase()} DETECTED - Attempting event stream bypass...`,
          'background:#9c27b0;color:white;font-weight:bold;padding:4px 8px',
        )

        try {
          if (sessionId && userId) {
            console.log('[HOF MiniGame] ✅ User info available, making game event calls...')

            // Generic: Show popup (1005) and start (32)
            const result1 = await self.EventBonusStream?.callGameEvent(
              1005,
              sessionId,
              userId,
              gameId,
              tabId,
            )
            await new Promise((resolve) => setTimeout(resolve, 300))

            const result2 = await self.EventBonusStream?.callGameEvent(
              32,
              sessionId,
              userId,
              gameId,
              tabId,
              {
                numSpins: totalSpins,
              },
            )
            await new Promise((resolve) => setTimeout(resolve, 500))

            console.log(
              `%c[HOF MiniGame] ✅ Event calls completed for ${type}...`,
              'background:#4caf50;color:white;padding:2px 6px',
            )
          }
        } catch (eventError) {
          console.error(`[HOF MiniGame] ${type} event error (continuing anyway):`, eventError)
        }
      }

      // Play each mini-game spin (ULTRA FAST - 50ms delay)
      while (spinsRemaining > 0 && isPlaying) {
        console.log(`[HOF MiniGame] Playing spin ${currentSpin}/${totalSpins}...`)

        const result = await sendMiniGameSpin(
          token,
          session,
          gameId,
          capturedRequest,
          tabId,
          type,
          data,
        )

        // Debug recording
        if (self.DebugRecorder?.isActive() && result) {
          self.DebugRecorder.recordHttpResponseBody(
            `minigame-${type}-spin`,
            result.status,
            result.data,
          )
        }

        if (result?.status === 200 && result.data?.result?.gameInfo) {
          const gameInfo = result.data.result.gameInfo

          // Extract win amount (try multiple field names)
          const spinWin =
            gameInfo.miniGameWin ||
            gameInfo.startsWin ||
            gameInfo.jackpotWin ||
            gameInfo.totalWin ||
            gameInfo.win ||
            0

          totalWin += spinWin

          // Track spin result for free spins
          if (type === 'freeSpins') {
            spinResults.push({
              spinNumber: currentSpin,
              win: spinWin,
            })
            console.log(
              `%c[HOF MiniGame] Free Spin ${currentSpin}/${totalSpins}: Won ${spinWin.toLocaleString()}`,
              'background:#4caf50;color:white;padding:2px 6px',
            )
          }

          // Update spins remaining
          spinsRemaining =
            gameInfo.miniGameSpinsRemaining ||
            gameInfo.startsRemaining ||
            gameInfo.spinsRemaining ||
            spinsRemaining - 1

          if (type !== 'freeSpins') {
            console.log(
              `[HOF MiniGame] Spin ${currentSpin}: Won ${spinWin.toLocaleString()}, Total: ${totalWin.toLocaleString()}, Remaining: ${spinsRemaining}`,
            )
          }
        } else {
          console.error('[HOF MiniGame] Invalid spin response:', result)
          spinsRemaining--
        }

        currentSpin++

        // ULTRA FAST: 50ms delay = 20 spins/second (even faster than requested!)
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // Call event stream after mini-game
      await callEventStreamAfter(type, token, session, capturedRequest, tabId)

      console.log(
        `%c[HOF MiniGame] ✅ ${type.toUpperCase()} COMPLETED - Total Win: ${totalWin.toLocaleString()}`,
        'background:#4caf50;color:white;font-weight:bold;padding:4px 8px',
      )

      // Enhanced logging for free spins with detailed breakdown
      if (type === 'freeSpins') {
        console.log(
          `%c[FREE SPINS SUMMARY] 🎁 Got ${totalSpins} Free Spins - Total Won: ${totalWin.toLocaleString()}`,
          'background:#ff1744;color:white;font-weight:bold;padding:4px 8px;font-size:12px',
        )
        console.log(`[FREE SPINS BREAKDOWN]:`)
        spinResults.forEach((result) => {
          console.log(`  Spin ${result.spinNumber}: ${result.win.toLocaleString()}`)
        })

        // Log to main logger with detailed info
        self.Logger?.log(
          'MINIGAME',
          `FREE SPINS: ${totalSpins} spins → Won ${totalWin.toLocaleString()}`,
          {
            type: 'freeSpins',
            spinsAwarded: totalSpins,
            totalWin: totalWin,
            spinBreakdown: spinResults,
            bonusId: data.id,
          },
        )
      } else {
        self.Logger?.log(
          'MINIGAME',
          `${type.toUpperCase()} completed: Won ${totalWin.toLocaleString()}`,
          { type, totalWin, spinsPlayed: currentSpin - 1 },
        )
      }

      return {
        success: true,
        totalWin: totalWin,
        spinsPlayed: currentSpin - 1,
      }
    } catch (error) {
      console.error('[HOF MiniGame] Error:', error)
      self.Logger?.log('ERROR', `Mini-game error: ${error.message}`, { error: error.message })

      return {
        success: false,
        error: error.message,
        totalWin: totalWin,
        spinsPlayed: currentSpin - 1,
      }
    } finally {
      isPlaying = false
    }
  }

  /**
   * Send mini-game spin request
   */
  async function sendMiniGameSpin(token, session, gameId, capturedRequest, tabId, type, data) {
    if (!capturedRequest) {
      throw new Error('No captured request available')
    }

    // Parse original request body
    const originalBody = JSON.parse(capturedRequest.body)
    const params = JSON.parse(originalBody.params)

    // Generate unique ID
    const uniqueId = Date.now().toString() + Math.random().toString().substring(2, 15)

    // Build mini-game spin params (try different structures)
    const miniGameParams = {
      ...params,
      session: session,
      gameId: gameId,
    }

    // Add mini-game specific fields based on type
    if (type === 'starts') {
      miniGameParams.startsToken = token
      miniGameParams.isStartsSpin = true
    } else if (type === 'jackpot') {
      miniGameParams.jackpotToken = token
      miniGameParams.isJackpotSpin = true
    } else if (type === 'miniGame') {
      miniGameParams.miniGameToken = token
      miniGameParams.isMiniGame = true
    } else if (type === 'boj') {
      miniGameParams.bojToken = token
      miniGameParams.isBOJSpin = true
    } else if (type === 'freeSpins') {
      miniGameParams.bonusToken = token
      miniGameParams.isFreeSpinBonus = true
      console.log('[HOF MiniGame] Using bonusToken:', token)
    }

    // Build request body
    const newBody = {
      cmd: 'spin',
      id: uniqueId,
      params: JSON.stringify(miniGameParams),
    }

    const bodyStr = JSON.stringify(newBody, null, 3)

    // Execute the fetch in page context
    return new Promise((resolve) => {
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          world: 'MAIN',
          func: (url, body, headers) => {
            return fetch(url, {
              method: 'POST',
              headers: Object.fromEntries(headers.map((h) => [h.name, h.value])),
              body: body,
            })
              .then((response) => {
                return response.json().then((data) => ({
                  status: response.status,
                  data: data,
                }))
              })
              .catch((error) => ({
                status: 0,
                error: error.message,
              }))
          },
          args: [capturedRequest.url, bodyStr, capturedRequest.headersArray],
        })
        .then((results) => {
          if (results && results[0] && results[0].result) {
            resolve(results[0].result)
          } else {
            resolve({ status: 0, error: 'No result from script execution' })
          }
        })
        .catch((error) => {
          resolve({ status: 0, error: error.message })
        })
    })
  }

  /**
   * Stop mini-game
   */
  function stop() {
    isPlaying = false
    console.log('[HOF MiniGame] Stopped')
  }

  /**
   * Check if mini-game is active
   */
  function isActive() {
    return isPlaying
  }

  /**
   * Send debug info to content script
   */
  function sendDebugInfo(debugInfo, tabId) {
    if (!tabId) return

    try {
      chrome.tabs
        .sendMessage(tabId, {
          type: 'MINIGAME_DEBUG',
          debugInfo: debugInfo,
        })
        .catch((err) => {
          // Silently ignore if content script not ready
        })
    } catch (err) {
      // Ignore
    }
  }

  return {
    detectMiniGame,
    playMiniGame,
    stop,
    isActive,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.MiniGameReplay = MiniGameReplay
}
