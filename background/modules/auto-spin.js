/**
 * Auto-Spin Module
 * Manages automated spinning with proper stop mechanism
 */

const AutoSpin = (() => {
  let isActive = false
  let shouldStop = false
  let currentTimeoutId = null

  let stats = {
    totalSpins: 0,
    totalWins: 0,
    startBalance: 0,
    currentBalance: 0,
    startTime: null,
  }

  let config = {
    minDelay: 10, // 0.01 seconds (10ms)
    maxDelay: 50, // 0.05 seconds (50ms)
    maxSpins: 0,
    stopOnLoss: 0,
  }

  let currentTabId = null

  /**
   * Start auto-spin
   */
  async function start(tabId, userConfig = {}) {
    if (isActive) {
      console.log('[HOF AutoSpin] Already running')
      return
    }

    // Update configuration
    config = {
      minDelay: userConfig.minDelay || 1000,
      maxDelay: userConfig.maxDelay || 2000,
      maxSpins: userConfig.maxSpins || 0,
      stopOnLoss: userConfig.stopOnLoss || 0,
    }

    // Reset state
    isActive = true
    shouldStop = false
    currentTimeoutId = null
    currentTabId = tabId

    stats = {
      totalSpins: 0,
      totalWins: 0,
      startBalance: 0,
      currentBalance: 0,
      startTime: Date.now(),
      // Free spins tracking
      freeSpinBonuses: 0, // Number of free spin bonuses triggered
      freeSpinWins: 0, // Total winnings from free spins
      freeSpinsPlayed: 0, // Total free spins played
      // Star spins tracking
      starSpinBonuses: 0, // Number of star spin bonuses triggered
      starSpinWins: 0, // Total winnings from star spins
      starSpinsPlayed: 0, // Total star spins played
    }

    console.log('%c[HOF AutoSpin] 🚀 STARTED', 'background:blue;color:white;font-size:16px')

    // Notify tab
    if (currentTabId) {
      notifyTab('AUTO_SPIN_STARTED', { config })
    }

    // Start the loop
    runLoop()
  }

  /**
   * Stop auto-spin immediately
   */
  async function stop() {
    if (!isActive) {
      console.log('[HOF AutoSpin] Not running')
      return stats
    }

    console.log('%c[HOF AutoSpin] 🛑 STOPPING', 'background:red;color:white;font-size:16px')

    // Set stop flag
    shouldStop = true

    // Clear any pending timeout immediately
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      currentTimeoutId = null
    }

    // Mark as inactive
    isActive = false

    // Save to history if we did any spins
    if (stats.totalSpins > 0) {
      await self.History.saveSession(stats)
    }

    // Notify tab
    if (currentTabId) {
      notifyTab('AUTO_SPIN_STOPPED', { stats })
    }

    console.log(
      `[HOF AutoSpin] Stopped. Spins: ${stats.totalSpins}, Profit: ${stats.currentBalance - stats.startBalance}`,
    )

    return stats
  }

  /**
   * Play bonus spins automatically using bonusToken
   */
  async function playBonusSpins(bonusToken, expectedSpins, capturedRequest, tabId) {
    if (!capturedRequest) {
      console.error('[HOF AutoSpin] No captured request for bonus play')
      return
    }

    console.log(`[HOF AutoSpin] Starting bonus spins: ${expectedSpins} free spins`)

    // Track bonus stats
    stats.freeSpinBonuses++ // Increment bonus trigger count

    let bonusSpinCount = 0
    let totalBonusWin = 0
    let spinsRemaining = expectedSpins

    // Parse original request to get session and gameId
    const originalBody = JSON.parse(capturedRequest.body)
    const params = JSON.parse(originalBody.params)
    const session = params.session
    const gameId = params.gameId || 190

    // Loop until all bonus spins are done
    while (spinsRemaining > 0 && isActive && !shouldStop) {
      bonusSpinCount++
      stats.freeSpinsPlayed++ // Track total free spins played

      console.log(`[HOF AutoSpin] Bonus spin ${bonusSpinCount}/${expectedSpins}...`)

      try {
        // Call bonus game endpoint
        const result = await sendBonusGameRequest(
          bonusToken,
          session,
          gameId,
          capturedRequest,
          tabId,
        )

        if (result?.status === 200 && result.data?.result?.gameInfo) {
          const gameInfo = result.data.result.gameInfo
          const bonusGamePlay = gameInfo.bonusGamePlay

          if (bonusGamePlay) {
            spinsRemaining = bonusGamePlay.spinsCountdown || 0
            // Fix: Use bonusWin or totalWin, NOT gameWin (which is always 0)
            const spinWin = bonusGamePlay.bonusWin || bonusGamePlay.totalWin || 0
            totalBonusWin += spinWin

            console.log(
              `[HOF AutoSpin] Bonus spin ${bonusSpinCount}: Won ${spinWin.toLocaleString()}, Remaining: ${spinsRemaining}`,
            )

            // Update stats
            stats.totalWins += spinWin
            stats.freeSpinWins += spinWin // Track free spin wins separately

            // Check if ANOTHER bonus was triggered during this bonus spin
            if (
              gameInfo.bonus &&
              gameInfo.bonus.type === 'freeSpins' &&
              gameInfo.bonus.bonusToken
            ) {
              console.log(
                '%c[HOF AutoSpin] 🎁 NEW BONUS triggered during bonus! Will play after current bonus completes.',
                'background:#ff1744;color:white;font-weight:bold;padding:4px',
              )
              // Store the new bonus to play after current
              return {
                spinsPlayed: bonusSpinCount,
                totalWin: totalBonusWin,
                newBonusTriggered: true,
                newBonusToken: gameInfo.bonus.bonusToken,
                newBonusSpins: gameInfo.bonus.init?.spinsAmount || 0,
              }
            }
          } else {
            console.warn('[HOF AutoSpin] No bonusGamePlay in response, assuming bonus ended')
            break
          }
        } else {
          console.error('[HOF AutoSpin] Invalid bonus spin response')
          break
        }
      } catch (err) {
        console.error('[HOF AutoSpin] Bonus spin error:', err)
        break
      }

      // Small delay between bonus spins (same speed as normal spins)
      const delay =
        Math.floor(Math.random() * (config.maxDelay - config.minDelay + 1)) + config.minDelay
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    console.log(
      `[HOF AutoSpin] ✅ Bonus complete: ${bonusSpinCount} spins played, won ${totalBonusWin.toLocaleString()}`,
    )

    self.Logger.log(
      'BONUS',
      `Free spins complete: ${bonusSpinCount} spins, won ${totalBonusWin.toLocaleString()}`,
      {
        spinsPlayed: bonusSpinCount,
        totalWin: totalBonusWin,
      },
    )

    return {
      spinsPlayed: bonusSpinCount,
      totalWin: totalBonusWin,
    }
  }

  /**
   * Send bonus game request (cmd=bonusGame)
   */
  async function sendBonusGameRequest(bonusToken, session, gameId, capturedRequest, tabId) {
    const uniqueId = Date.now().toString() + Math.random().toString().substring(2, 15)

    const bonusParams = {
      bonusToken: bonusToken,
      gameId: gameId,
      session: session,
    }

    const newBody = {
      cmd: 'bonusGame',
      id: uniqueId,
      params: JSON.stringify(bonusParams),
    }

    const bodyStr = JSON.stringify(newBody, null, 3)

    // Execute fetch in page context
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
   * Main auto-spin loop with proper abort mechanism
   */
  async function runLoop() {
    // Check stop flag before doing anything
    if (shouldStop || !isActive) {
      await finalizeStop()
      return
    }

    // Check max spins limit
    if (config.maxSpins > 0 && stats.totalSpins >= config.maxSpins) {
      console.log('[HOF AutoSpin] Max spins reached')
      await stop()
      return
    }

    // Check loss limit
    if (config.stopOnLoss > 0 && stats.startBalance > 0) {
      const currentLoss = stats.startBalance - stats.currentBalance
      if (currentLoss >= config.stopOnLoss) {
        console.log('[HOF AutoSpin] Loss limit reached')
        await stop()
        return
      }
    }

    try {
      // Execute spin
      const capturedRequest = self.RequestCapture.getCapturedRequest()
      const result = await self.SpinReplay.replaySpin(capturedRequest, currentTabId)

      // Check stop flag immediately after spin
      if (shouldStop || !isActive) {
        await finalizeStop()
        return
      }

      // Debug recording - record response body
      if (self.DebugRecorder?.isActive() && result) {
        self.DebugRecorder.recordHttpResponseBody(
          capturedRequest?.url || 'main-spin',
          result.status,
          result.data,
        )
      }

      // Process result
      if (result.status === 200 && result.data?.result) {
        const gameInfo = result.data.result.gameInfo
        const balance = gameInfo?.common?.balance || 0
        const wins = gameInfo?.wins || []
        const pots = gameInfo?.pots || []
        const jackpots = gameInfo?.jackpots || []

        // ** AUTOMATIC BONUS GAME PLAY **
        // Detect if a NEW bonus was just triggered
        const isBonusTriggered = gameInfo.bonus?.type === 'freeSpins'
        const bonusToken = gameInfo.bonus?.bonusToken

        if (isBonusTriggered && bonusToken) {
          console.log(
            '%c[HOF AutoSpin] 🎁 FREE SPINS BONUS TRIGGERED!',
            'background:#ff1744;color:white;font-weight:bold;padding:4px 8px;font-size:16px',
          )

          const spinsAmount = gameInfo.bonus?.init?.spinsAmount || 0

          self.Logger.log(
            'BONUS',
            `🎁 FREE SPINS TRIGGERED - ${spinsAmount} spins! Auto-playing...`,
            {
              bonusType: gameInfo.bonus.type,
              spinsAmount,
              bonusToken: bonusToken.substring(0, 20) + '...',
            },
          )

          try {
            // Play all bonus spins automatically
            let bonusResult = await playBonusSpins(
              bonusToken,
              spinsAmount,
              capturedRequest,
              currentTabId,
            )

            console.log(
              '%c[HOF AutoSpin] ✅ FREE SPINS COMPLETED - Resuming normal spins',
              'background:#4caf50;color:white;font-weight:bold;padding:4px 8px',
            )

            // Check if a new bonus was triggered during the bonus
            while (bonusResult?.newBonusTriggered) {
              console.log(
                '%c[HOF AutoSpin] 🔁 CHAINED BONUS - Starting next bonus...',
                'background:#ff9800;color:white;font-weight:bold;padding:4px 8px',
              )

              // Play the new bonus
              bonusResult = await playBonusSpins(
                bonusResult.newBonusToken,
                bonusResult.newBonusSpins,
                capturedRequest,
                currentTabId,
              )

              console.log(
                '%c[HOF AutoSpin] ✅ CHAINED BONUS COMPLETED',
                'background:#4caf50;color:white;font-weight:bold;padding:4px 8px',
              )
            }
          } catch (err) {
            console.error('[HOF AutoSpin] Bonus play error:', err)
          }

          // Continue with normal auto-spin after bonus
        }

        // ** CONTINUE WITH NORMAL PROCESSING **
        // Log pot progress if any pots exist
        if (pots.length > 0) {
          const activePots = pots.filter((p) => p.total > 0)
          if (activePots.length > 0) {
            const potInfo = activePots
              .map((p) => {
                const progress = p.total > 0 ? `${p.collected}/${p.total}` : 'N/A'
                const percent = p.total > 0 ? Math.floor((p.collected / p.total) * 100) : 0
                const status = p.collected >= p.total ? '✅ FULL!' : `${percent}%`
                return `Pot#${p.id}: ${progress} [${status}]`
              })
              .join(', ')
            self.Logger.log('POT', `Pots: ${potInfo}`, activePots)
          }
        }

        // Log jackpot balances (star jackpots)
        if (jackpots.length > 0 && stats.totalSpins % 50 === 0) {
          // Only log every 50 spins to avoid spam
          const starJackpots = jackpots.filter((j) => j.type.startsWith('star_'))
          if (starJackpots.length > 0) {
            const jpInfo = starJackpots
              .map((j) => {
                const type = j.type.replace('star_', '').toUpperCase()
                const bal = (j.balance / 1000000).toFixed(1) + 'M'
                return `${type}: ${bal}`
              })
              .join(', ')
            self.Logger.log('JACKPOT', `Star Jackpots: ${jpInfo}`, starJackpots)
          }
        }

        let spinWin = 0
        let bonusDetails = {
          hasBonus: false,
          freeSpins: 0,
          scatterWin: 0,
          bonusGame: false,
          features: [],
        }

        // Analyze wins for bonuses
        for (const win of wins) {
          spinWin += win.win || 0

          // Check for free spins
          if (win.freeSpins || win.freespins || win.type === 'freespins') {
            bonusDetails.hasBonus = true
            bonusDetails.freeSpins += win.freeSpins || win.freespins || 0
            bonusDetails.features.push(`🎰 ${win.freeSpins || win.freespins} Free Spins`)
          }

          // Check for scatter wins
          if (win.type === 'scatter' || win.scatter) {
            bonusDetails.hasBonus = true
            bonusDetails.scatterWin += win.win || 0
            bonusDetails.features.push(`⭐ Scatter Win: ${win.win}`)
          }

          // Check for bonus game
          if (win.type === 'bonus' || win.bonusGame || win.bonus) {
            bonusDetails.hasBonus = true
            bonusDetails.bonusGame = true
            bonusDetails.features.push(`🎁 Bonus Game Triggered`)
          }

          // Check for other special types
          if (win.type && !['line', 'scatter', 'bonus', 'freespins'].includes(win.type)) {
            bonusDetails.hasBonus = true
            bonusDetails.features.push(`💎 Special: ${win.type}`)
          }
        }

        // ** DETAILED WIN LOGGING **
        if (wins.length > 0) {
          const winSummary = wins
            .map((w) => {
              if (w.type === 'line' && w.lines) {
                return w.lines.map((l) => `Line${l.id}: ${l.win}`).join(', ')
              } else {
                return `${w.type || 'win'}: ${w.win || 0}`
              }
            })
            .join(' | ')
          self.Logger.log('WIN', `Wins: ${winSummary} = Total: ${spinWin.toLocaleString()}`, {
            spinWin,
            wins,
          })
        } else if (spinWin === 0) {
          self.Logger.log('SPIN', 'No win', { spinWin: 0 })
        }

        // Log bonus information
        if (bonusDetails.hasBonus) {
          self.Logger.log('BONUS', `Bonus! ${bonusDetails.features.join(', ')}`, bonusDetails)
        }

        // Legacy bonus game play support (for old bonusGamePlay with bonusToken)
        if (gameInfo.bonusGamePlay && gameInfo.bonusGamePlay.bonusToken) {
          self.Logger.log(
            'BONUS',
            'Legacy bonus game detected! Starting auto-play...',
            gameInfo.bonusGamePlay,
          )

          try {
            // Call event stream before starting bonus game
            const capturedEventRequest = self.RequestCapture.getCapturedEventRequest()
            if (capturedEventRequest) {
              console.log('[HOF AutoSpin] Calling event stream for bonus game...')
              await self.EventReplay.replayEvent(capturedEventRequest, currentTabId)
              await new Promise((resolve) => setTimeout(resolve, 500))
            }

            // Auto-play the bonus game
            const bonusResult = await self.BonusGameReplay.playBonusGame(
              gameInfo.bonusGamePlay,
              capturedRequest,
              currentTabId,
            )

            if (bonusResult) {
              console.log(
                `[HOF AutoSpin] Bonus game complete: ${bonusResult.totalSpins} spins, won ${bonusResult.totalBonusWin.toLocaleString()}`,
              )
              bonusDetails.features.push(
                `💰 Bonus Won: ${bonusResult.totalBonusWin.toLocaleString()}`,
              )
            }

            // Call event stream after completing bonus game
            if (capturedEventRequest) {
              console.log('[HOF AutoSpin] Calling event stream after bonus game...')
              await self.EventReplay.replayEvent(capturedEventRequest, currentTabId)
            }
          } catch (bonusErr) {
            console.error('[HOF AutoSpin] Bonus game error:', bonusErr)
          }
        }

        // ** DETECT AND PLAY MINI-GAME (STARTS/BOJ/JACKPOT/FREE SPINS) **
        console.log('[HOF AutoSpin] Checking for mini-games in response...')
        console.log('[HOF AutoSpin] Response structure:', {
          hasData: !!result.data,
          hasResult: !!result.data?.result,
          hasGameInfo: !!result.data?.result?.gameInfo,
          hasBonus: !!result.data?.result?.gameInfo?.bonus,
        })

        const miniGameData = self.MiniGameReplay?.detectMiniGame(result.data, currentTabId)
        console.log('[HOF AutoSpin] Detection result:', miniGameData)

        if (miniGameData) {
          self.Logger.log(
            'MINIGAME',
            `🎰 ${miniGameData.type.toUpperCase()} - ${miniGameData.spins} spins!`,
            miniGameData,
          )

          try {
            const miniGameResult = await self.MiniGameReplay.playMiniGame(
              miniGameData,
              currentSession,
              currentGameId,
              capturedRequest,
              currentTabId,
              result.data, // Pass full response for user info extraction
            )

            if (miniGameResult.success) {
              // Enhanced logging and tracking for free spins
              if (miniGameData.type === 'freeSpins') {
                // Track free spins separately
                stats.freeSpinBonuses++ // Increment bonus count
                stats.freeSpinWins += miniGameResult.totalWin // Add free spin winnings
                stats.freeSpinsPlayed += miniGameData.spins // Track total free spins played

                self.Logger.log(
                  'MINIGAME',
                  `🎁 FREE SPINS: ${miniGameData.spins} spins → ${miniGameResult.totalWin.toLocaleString()} won`,
                  {
                    spinsAwarded: miniGameData.spins,
                    totalWin: miniGameResult.totalWin,
                    totalBonuses: stats.freeSpinBonuses,
                    totalFreeSpinWins: stats.freeSpinWins,
                  },
                )
              } else if (miniGameData.type === 'starts') {
                // Track star spins separately
                stats.starSpinBonuses++ // Increment star bonus count
                stats.starSpinWins += miniGameResult.totalWin // Add star spin winnings
                stats.starSpinsPlayed += miniGameData.spins // Track total star spins played

                self.Logger.log(
                  'MINIGAME',
                  `⭐ STAR SPINS: ${miniGameData.spins} spins → ${miniGameResult.totalWin.toLocaleString()} won`,
                  {
                    spinsAwarded: miniGameData.spins,
                    totalWin: miniGameResult.totalWin,
                    totalBonuses: stats.starSpinBonuses,
                    totalStarSpinWins: stats.starSpinWins,
                  },
                )
              } else {
                self.Logger.log('MINIGAME', `✅ Won: ${miniGameResult.totalWin.toLocaleString()}`, {
                  totalWin: miniGameResult.totalWin,
                })
              }

              // Add mini-game win to stats
              stats.wins += miniGameResult.totalWin
              stats.profit = stats.wins - stats.spins * stats.betAmount
            }
          } catch (miniGameErr) {
            console.error('[HOF AutoSpin] Mini-game error:', miniGameErr)
          }
        }

        // Set start balance from first spin
        if (stats.totalSpins === 0) {
          stats.startBalance = balance - spinWin
        }

        // Update stats
        stats.totalSpins++
        stats.totalWins += spinWin
        stats.currentBalance = balance

        // Notify progress (throttled)
        if (currentTabId) {
          notifyTab('AUTO_SPIN_PROGRESS', {
            spinNumber: stats.totalSpins,
            spinWin: spinWin,
            bonusDetails: bonusDetails,
            stats: stats,
          })
        }
      }
    } catch (err) {
      console.error('[HOF AutoSpin] Spin error:', err)
    }

    // Check stop flag before scheduling next iteration
    if (shouldStop || !isActive) {
      await finalizeStop()
      return
    }

    // Schedule next spin with random delay
    const delay =
      Math.floor(Math.random() * (config.maxDelay - config.minDelay + 1)) + config.minDelay

    currentTimeoutId = setTimeout(() => {
      currentTimeoutId = null
      runLoop()
    }, delay)
  }

  /**
   * Finalize stop (cleanup)
   */
  async function finalizeStop() {
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      currentTimeoutId = null
    }
    isActive = false
    shouldStop = false
  }

  /**
   * Notify content script
   */
  function notifyTab(type, data = {}) {
    if (!currentTabId) return

    chrome.tabs.sendMessage(currentTabId, { type, ...data }).catch(() => {
      // Tab might be closed
    })
  }

  /**
   * Get current status
   */
  function getStatus() {
    return {
      isActive,
      stats,
      config,
    }
  }

  return {
    start,
    stop,
    getStatus,
    isActive: () => isActive,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.AutoSpin = AutoSpin
}
