/**
 * Dog Auto-Spin Module
 * Manages automated dog wheel spinning with proper stop mechanism
 */

const DogAutoSpin = (() => {
  let isActive = false
  let shouldStop = false
  let currentTimeoutId = null
  let lastClaimedLevel = 0 // Track last claimed level to avoid duplicate claims

  let stats = {
    totalSpins: 0,
    totalBones: 0,
    totalPoints: 0,
    currentLevel: 0,
    progressPercent: 0,
    nextMilestone: null,
    startTime: null,
  }

  let config = {
    minDelay: 1000,
    maxDelay: 2000,
    maxSpins: 0,
  }

  let currentTabId = null

  /**
   * Start dog auto-spin
   */
  async function start(tabId, userConfig = {}) {
    if (isActive) {
      console.log('[HOF DogAutoSpin] Already running')
      return
    }

    // Update configuration
    config = {
      minDelay: userConfig.minDelay || 1000,
      maxDelay: userConfig.maxDelay || 2000,
      maxSpins: userConfig.maxSpins || 0,
    }

    // Reset state
    isActive = true
    shouldStop = false
    currentTimeoutId = null
    currentTabId = tabId
    lastClaimedLevel = 0 // Reset claimed level tracker

    stats = {
      totalSpins: 0,
      totalBones: 0,
      totalPoints: 0,
      startTime: Date.now(),
    }

    console.log('%c[HOF DogAutoSpin] 🦴 STARTED', 'background:blue;color:white;font-size:16px')

    // Notify tab
    if (currentTabId) {
      notifyTab('DOG_AUTO_SPIN_STARTED', { config })
    }

    // Start the loop
    runLoop()
  }

  /**
   * Stop dog auto-spin immediately
   */
  async function stop() {
    if (!isActive) {
      console.log('[HOF DogAutoSpin] Not running')
      return stats
    }

    console.log('%c[HOF DogAutoSpin] 🛑 STOPPING', 'background:red;color:white;font-size:16px')

    // Set stop flag
    shouldStop = true

    // Clear any pending timeout immediately
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      currentTimeoutId = null
    }

    // Mark as inactive
    isActive = false

    // Notify tab
    if (currentTabId) {
      notifyTab('DOG_AUTO_SPIN_STOPPED', { stats })
    }

    console.log(`[HOF DogAutoSpin] Stopped. Spins: ${stats.totalSpins}, Bones: ${stats.totalBones}`)

    return stats
  }

  /**
   * Main dog auto-spin loop
   */
  async function runLoop() {
    // Check stop flag before doing anything
    if (shouldStop || !isActive) {
      await finalizeStop()
      return
    }

    // Check max spins limit
    if (config.maxSpins > 0 && stats.totalSpins >= config.maxSpins) {
      console.log('[HOF DogAutoSpin] Max spins reached')
      await stop()
      return
    }

    try {
      // Execute dog spin
      const capturedRequest = self.RequestCapture.getCapturedDogRequest()
      const result = await self.SpinReplay.replaySpin(capturedRequest, currentTabId)

      // Check stop flag immediately after spin
      if (shouldStop || !isActive) {
        await finalizeStop()
        return
      }

      // Debug recording - record response body
      if (self.DebugRecorder?.isActive() && result) {
        self.DebugRecorder.recordHttpResponseBody(
          capturedRequest?.url || 'dog-spin',
          result.status,
          result.data,
        )
      }

      // Process result
      if (result.status === 200 && result.data) {
        const boneAmount = result.data.wheel?.boneAmount || 0
        const currentPoints = result.data.progressBar?.points?.current || 0
        const totalPoints = result.data.progressBar?.points?.total || 20000
        const wonWedgeNumber = result.data.wonWedgeNumber || 0
        const version = result.data.version || 0
        const milestones = result.data.progressBar?.milestones || []

        // Calculate progress
        const progressPercent =
          totalPoints > 0 ? Math.floor((currentPoints / totalPoints) * 100) : 0

        // Find next milestone
        const nextMilestone = milestones.find((m) => m.status === 'NOT_ACHIEVED')

        // Detect level up (version change)
        const previousLevel = stats.currentLevel
        if (previousLevel > 0 && version > previousLevel) {
          console.log(
            '%c[HOF DogAutoSpin] 🎉 LEVEL UP!',
            'background:gold;color:black;font-size:16px',
          )
          // Notify about level up
          if (currentTabId) {
            chrome.tabs
              .sendMessage(currentTabId, {
                type: 'DOG_LEVEL_UP',
                oldLevel: previousLevel,
                newLevel: version,
              })
              .catch(() => {})
          }
        }

        // Update stats
        stats.totalSpins++
        stats.totalBones = boneAmount
        stats.totalPoints = currentPoints
        stats.currentLevel = version
        stats.progressPercent = progressPercent
        stats.nextMilestone = nextMilestone

        // Check if level completed (100% progress) - auto claim rewards
        // Only claim if we haven't claimed for this level yet
        if (progressPercent >= 100 && version !== lastClaimedLevel) {
          console.log(
            '%c[HOF DogAutoSpin] 🎁 LEVEL COMPLETE! Claiming rewards...',
            'background:gold;color:black;font-size:14px',
          )
          lastClaimedLevel = version // Mark this level as claimed
          await claimLevelRewards(currentTabId)

          // Wait a moment for server to process
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Do an immediate extra spin to get fresh state
          console.log('[HOF DogAutoSpin] Getting fresh state after reward claim...')
          const freshResult = await self.SpinReplay.replaySpin(capturedRequest, currentTabId)

          if (freshResult.status === 200 && freshResult.data) {
            // Update with fresh data
            const newBones = freshResult.data.wheel?.boneAmount || 0
            const newPoints = freshResult.data.progressBar?.points?.current || 0
            const newTotal = freshResult.data.progressBar?.points?.total || 20000
            const newVersion = freshResult.data.version || 0
            const newProgress = newTotal > 0 ? Math.floor((newPoints / newTotal) * 100) : 0
            const newMilestones = freshResult.data.progressBar?.milestones || []
            const newNextMilestone = newMilestones.find((m) => m.status === 'NOT_ACHIEVED')

            stats.totalBones = newBones
            stats.totalPoints = newPoints
            stats.currentLevel = newVersion
            stats.progressPercent = newProgress
            stats.nextMilestone = newNextMilestone
            stats.totalSpins++ // Count the refresh spin

            console.log(
              `[HOF DogAutoSpin] Fresh state: Level ${newVersion}, Progress ${newProgress}%`,
            )

            // Notify with fresh data
            if (currentTabId) {
              notifyTab('DOG_AUTO_SPIN_PROGRESS', {
                spinNumber: stats.totalSpins,
                wonWedgeNumber: freshResult.data.wonWedgeNumber || 0,
                stats: stats,
                progressBar: freshResult.data.progressBar,
              })
            }
          }
        }

        // Notify progress (if we didn't just claim rewards)
        if (progressPercent < 100 || version === lastClaimedLevel) {
          if (currentTabId) {
            notifyTab('DOG_AUTO_SPIN_PROGRESS', {
              spinNumber: stats.totalSpins,
              wonWedgeNumber: wonWedgeNumber,
              stats: stats,
              progressBar: result.data.progressBar,
            })
          }
        }
      }
    } catch (err) {
      console.error('[HOF DogAutoSpin] Spin error:', err)
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
   * Claim level rewards when progress reaches 100%
   * FIX: Added retry logic with exponential backoff
   */
  async function claimLevelRewards(tabId) {
    const MAX_RETRIES = 3
    const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff: 1s, 2s, 4s

    try {
      const capturedDogRequest = self.RequestCapture.getCapturedDogRequest()
      if (!capturedDogRequest) {
        console.log('[HOF DogAutoSpin] No captured request for rewards')
        return
      }

      // Build rewards endpoint URL
      const rewardsUrl =
        'https://hof-dsa.playtika.com/hof-bestie-service/public/v1/game/level/rewards'

      // Extract headers from captured request
      const headersArray = capturedDogRequest.headersArray.filter((h) => {
        const lowerName = h.name.toLowerCase()
        return (
          !lowerName.startsWith(':') &&
          lowerName !== 'content-length' &&
          lowerName !== 'content-type'
        )
      })

      // Add content-type
      headersArray.push({ name: 'content-type', value: 'application/json' })

      // Retry loop for rewards claim
      let lastError = null
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(
              `[HOF DogAutoSpin] Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${RETRY_DELAYS[attempt - 1]}ms`,
            )
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt - 1]))
          }

          // Execute rewards claim in page context
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: async (url, headersArray) => {
              const headers = {}
              for (const h of headersArray) {
                headers[h.name] = h.value
              }

              const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: '{}',
              })

              const data = await response.json()
              return { status: response.status, data }
            },
            args: [rewardsUrl, headersArray],
          })

          if (results?.[0]?.result) {
            const result = results[0].result

            // Check for non-200 status
            if (result.status !== 200) {
              throw new Error(`Rewards claim failed with status ${result.status}`)
            }

            console.log('[HOF DogAutoSpin] ✅ Rewards claimed:', result)

            // Check if we need to open new level
            if (result.data?.nextAction === 'OPEN_NEW_LEVEL') {
              console.log('[HOF DogAutoSpin] 🎯 Opening new level...')

              // Call /game/start to initialize new level (with retry)
              const startUrl =
                'https://hof-dsa.playtika.com/hof-bestie-service/public/v1/game/start'

              for (let startAttempt = 0; startAttempt < MAX_RETRIES; startAttempt++) {
                try {
                  if (startAttempt > 0) {
                    console.log(`[HOF DogAutoSpin] Start retry ${startAttempt + 1}/${MAX_RETRIES}`)
                    await new Promise((resolve) =>
                      setTimeout(resolve, RETRY_DELAYS[startAttempt - 1]),
                    )
                  }

                  const startResults = await chrome.scripting.executeScript({
                    target: { tabId },
                    world: 'MAIN',
                    func: async (url, headersArray) => {
                      const headers = {}
                      for (const h of headersArray) {
                        headers[h.name] = h.value
                      }

                      const response = await fetch(url, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ isFirstPlay: false }),
                      })

                      const data = await response.json()
                      return { status: response.status, data }
                    },
                    args: [startUrl, headersArray],
                  })

                  if (startResults?.[0]?.result?.data) {
                    const startData = startResults[0].result.data
                    console.log(
                      '[HOF DogAutoSpin] ✅ New level opened! Version:',
                      startData.version,
                    )

                    // Notify UI with new level data
                    if (tabId) {
                      chrome.tabs
                        .sendMessage(tabId, {
                          type: 'DOG_NEW_LEVEL_STARTED',
                          levelData: startData,
                        })
                        .catch(() => {})
                    }
                    break // Success, exit retry loop
                  } else {
                    throw new Error('No data from game/start')
                  }
                } catch (startErr) {
                  if (startAttempt === MAX_RETRIES - 1) {
                    // Final attempt failed
                    console.error(
                      '[HOF DogAutoSpin] ❌ Failed to open new level after retries:',
                      startErr,
                    )
                    // Notify user of failure
                    if (tabId) {
                      chrome.tabs
                        .sendMessage(tabId, {
                          type: 'DOG_LEVEL_START_FAILED',
                          error: startErr.message,
                        })
                        .catch(() => {})
                    }
                  }
                }
              }
            }

            // Notify UI that rewards were claimed
            if (tabId) {
              chrome.tabs
                .sendMessage(tabId, {
                  type: 'DOG_REWARDS_CLAIMED',
                  result: result.data,
                })
                .catch(() => {})
            }

            // Success! Exit retry loop
            return
          } else {
            throw new Error('No result from rewards claim script execution')
          }
        } catch (err) {
          lastError = err
          console.error(`[HOF DogAutoSpin] Attempt ${attempt + 1} failed:`, err.message)

          // If this is the last attempt, throw the error
          if (attempt === MAX_RETRIES - 1) {
            throw err
          }
          // Otherwise continue to next retry
        }
      }
    } catch (err) {
      console.error('[HOF DogAutoSpin] ❌ Rewards claim failed after all retries:', err)

      // Notify user of permanent failure
      if (tabId) {
        chrome.tabs
          .sendMessage(tabId, {
            type: 'DOG_REWARDS_CLAIM_FAILED',
            error: err.message,
            shouldStop: true, // Suggest stopping auto-spin
          })
          .catch(() => {})
      }
    }
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
  self.DogAutoSpin = DogAutoSpin
}
