/**
 * House of Fun Helper - Content Script
 * Simplified version with inline modules for reliability
 */

;(function () {
  'use strict'

  console.log(
    '%c[HOF] 🎰 House of Fun Helper v2.0 - Fixed',
    'background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 16px; padding: 8px 16px; border-radius: 8px;',
  )

  let autoSpinActive = false
  let dogAutoSpinActive = false
  let currentSpinTab = 'main' // 'main' or 'dog'
  let currentTab = 'main' // 'main', 'history', or 'debug'

  // Debug state
  let debugActive = false
  let debugEvents = []
  let debugFilters = {
    http: true,
    dom: true,
    console: true,
    ui: true,
    system: true,
  }

  // Persistent state for UI switching
  let lastMainProgressData = null
  let lastDogProgressData = null

  // Check status on load
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    autoSpinActive = response?.autoSpinActive || false
    dogAutoSpinActive = response?.dogAutoSpinActive || false
    console.log('[HOF] Status on load: main =', autoSpinActive, '| dog =', dogAutoSpinActive)
  })

  setTimeout(createPanel, 2000)

  // Message listener
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      // Main spin messages
      case 'SPIN_CAPTURED':
        showNotification('✅ Main spin captured!', 'success')
        if (currentSpinTab === 'main') updateStatusIndicator(true)
        break
      case 'AUTO_SPIN_STARTED':
        autoSpinActive = true
        if (currentSpinTab === 'main') updateUI()
        showNotification('🚀 Main auto-spin started!', 'info')
        break
      case 'AUTO_SPIN_PROGRESS':
        lastMainProgressData = message
        if (currentSpinTab === 'main') updateProgress(message)
        break
      case 'AUTO_SPIN_STOPPED':
        autoSpinActive = false
        if (currentSpinTab === 'main') {
          updateUI()
          showFinalStats(message.stats)
        }
        showNotification('🛑 Main auto-spin stopped', 'warning')
        break

      // Dog spin messages
      case 'DOG_SPIN_CAPTURED':
        showNotification('✅ Dog spin captured!', 'success')
        if (currentSpinTab === 'dog') updateDogStatusIndicator(true)
        break
      case 'DOG_AUTO_SPIN_STARTED':
        dogAutoSpinActive = true
        if (currentSpinTab === 'dog') updateDogUI()
        showNotification('🦴 Dog auto-spin started!', 'info')
        break
      case 'DOG_AUTO_SPIN_PROGRESS':
        lastDogProgressData = message
        if (currentSpinTab === 'dog') updateDogProgress(message)
        break
      case 'DOG_AUTO_SPIN_STOPPED':
        dogAutoSpinActive = false
        if (currentSpinTab === 'dog') {
          updateDogUI()
          showDogFinalStats(message.stats)
        }
        showNotification('🛑 Dog auto-spin stopped', 'warning')
        break

      case 'DOG_LEVEL_UP':
        showNotification(`🎉 LEVEL UP! ${message.oldLevel} → ${message.newLevel}`, 'success')
        break

      case 'DOG_REWARDS_CLAIMED':
        showNotification('🎁 Level rewards claimed!', 'success')
        break

      case 'DOG_NEW_LEVEL_STARTED':
        showNotification(`🌟 New level started! Level ${message.levelData.version}`, 'success')
        break

      case 'DEBUG_EVENT':
        if (currentTab === 'debug') {
          addDebugEvent(message.event)
        }
        break

      case 'MINIGAME_DEBUG':
        // Update debug panel with detection info
        updateDebugPanel(message.debugInfo)
        break

      case 'SHOW_NOTIFICATION':
        showNotification(message.text, message.style || 'info')
        break
    }
  })

  function showNotification(text, type = 'info') {
    const colors = {
      success: '#00c853',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
    }

    const notif = document.createElement('div')
    notif.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 2147483647;
      background: ${colors[type]}; color: white; padding: 12px 20px;
      border-radius: 8px; font-family: 'Segoe UI', sans-serif; font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); animation: slideIn 0.3s ease;
    `
    notif.textContent = text
    document.body.appendChild(notif)

    setTimeout(() => {
      notif.style.opacity = '0'
      notif.style.transition = 'opacity 0.3s'
      setTimeout(() => notif.remove(), 300)
    }, 3000)
  }

  function updateStatusIndicator(hasSpin) {
    const indicator = document.getElementById('hof-status-dot')
    if (indicator) {
      indicator.style.background = hasSpin ? '#00c853' : '#888'
    }
  }

  // Cache for game names to avoid repeated localStorage lookups
  const gameNameCache = new Map()

  /**
   * Get game name from localStorage using gameId (with caching)
   */
  function getGameNameFromLocalStorage(gameId) {
    if (!gameId) return 'Unknown Game'

    // Check cache first
    if (gameNameCache.has(gameId)) {
      return gameNameCache.get(gameId)
    }

    let gameName = `Game #${gameId}`

    try {
      const rawData = localStorage.getItem('CRequestSGCSGame')
      if (!rawData) {
        console.log('[HOF Helper] CRequestSGCSGame not found in localStorage')
        gameNameCache.set(gameId, gameName)
        return gameName
      }

      const parsed = JSON.parse(rawData)
      // Check for games in top level or inside content (User confirmed logic: parsed.content.games)
      const games = parsed.content?.games || parsed.games || []

      console.log('[HOF Helper] LocalStorage Lookup:', {
        gameId,
        hasGames: games.length > 0,
        gamesCount: games.length,
      })

      // Handle both array format and object/key-value
      let foundGame = null

      if (Array.isArray(games)) {
        foundGame = games.find((g) => g.gameId == gameId)
      } else {
        // Fallback if structure is object with keys
        foundGame = Object.values(games).find((g) => g.gameId == gameId)
      }

      if (foundGame) {
        console.log('[HOF Helper] Found game:', foundGame.name || foundGame.description)
        gameName = foundGame.name || foundGame.description || `Game #${gameId}`
      } else {
        console.log('[HOF Helper] Game ID not found in list')
      }
    } catch (e) {
      console.warn('[HOF Helper] Error fetching game name:', e)
    }

    // Cache the result
    gameNameCache.set(gameId, gameName)
    return gameName
  }

  function updateProgress(data) {
    const el = document.getElementById('hof-live-stats')
    if (!el) return

    const profit = data.stats.currentBalance - data.stats.startBalance

    // Free spin statistics (if available)
    let freeSpinHtml = ''
    if (data.stats.freeSpinBonuses > 0 || data.stats.freeSpinsPlayed > 0) {
      freeSpinHtml = `
        <div style="background:rgba(76,175,80,0.15);border:1px solid #4caf50;border-radius:6px;padding:8px;margin-top:8px;">
          <div style="font-weight:bold;color:#4caf50;margin-bottom:4px;">🎰 Free Spins</div>
          <div style="font-size:11px;color:#00c853;">✓ Triggered: ${data.stats.freeSpinBonuses || 0}x</div>
          <div style="font-size:11px;color:#00c853;">🎯 Total Spins: ${data.stats.freeSpinsPlayed || 0}</div>
          <div style="font-size:11px;color:#ffd700;">💰 Won: ${(data.stats.freeSpinWins || 0).toLocaleString()}</div>
        </div>
      `
    }

    // Star spin statistics (if available)
    let starSpinHtml = ''
    if (data.stats.starSpinBonuses > 0 || data.stats.starSpinsPlayed > 0) {
      starSpinHtml = `
        <div style="background:rgba(255,214,0,0.15);border:1px solid #ffd600;border-radius:6px;padding:8px;margin-top:8px;">
          <div style="font-weight:bold;color:#ffd600;margin-bottom:4px;">⭐ Star Spins</div>
          <div style="font-size:11px;color:#ffeb3b;">✓ Triggered: ${data.stats.starSpinBonuses || 0}x</div>
          <div style="font-size:11px;color:#ffeb3b;">🎯 Total Spins: ${data.stats.starSpinsPlayed || 0}</div>
          <div style="font-size:11px;color:#ffd700;">💰 Won: ${(data.stats.starSpinWins || 0).toLocaleString()}</div>
        </div>
      `
    }

    el.innerHTML = `
      <div class="hof-stat-row" style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <span>🎮 Game</span>
        <span class="hof-stat-value" style="color:#fff;max-width:150px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">
          ${getGameNameFromLocalStorage(data.stats.currentGameId)}
        </span>
      </div>
      <div class="hof-stat-row">
        <span>🎰 Spins</span>
        <span class="hof-stat-value">${data.stats.totalSpins}</span>
      </div>
      <div class="hof-stat-row">
        <span>🏆 Total Won</span>
        <span class="hof-stat-value" style="color:#ffd700">${data.stats.totalWins.toLocaleString()}</span>
      </div>
      <div class="hof-stat-row">
        <span>💰 Balance</span>
        <span class="hof-stat-value">${data.stats.currentBalance.toLocaleString()}</span>
      </div>
      <div class="hof-stat-row">
        <span>${profit >= 0 ? '📈' : '📉'} Profit</span>
        <span class="hof-stat-value" style="color:${profit >= 0 ? '#00ff88' : '#ff6b6b'}">${profit >= 0 ? '+' : ''}${profit.toLocaleString()}</span>
      </div>
      ${freeSpinHtml}
      ${starSpinHtml}
      
      <!-- Debug Panel -->
      <div id="hof-debug-panel" style="background:rgba(33,150,243,0.1);border:1px solid #2196f3;border-radius:6px;padding:8px;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-weight:bold;color:#2196f3;font-size:11px;">🔍 Detection Debug</div>
          <button id="hof-copy-debug" style="background:#2196f3;color:white;border:none;border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;">Copy</button>
        </div>
        <div id="hof-debug-content" style="font-size:10px;color:#64b5f6;font-family:monospace;max-height:100px;overflow-y:auto;">Waiting for spin data...</div>
      </div>
    `

    // Update last spin
    const lastSpin = document.getElementById('hof-last-spin')
    if (lastSpin && data.spinWin !== undefined) {
      lastSpin.innerHTML =
        data.spinWin > 0
          ? `<span style="color:#ffd700">🎉 Won ${data.spinWin.toLocaleString()}</span>`
          : `<span style="color:#888">No win</span>`
    }

    // Setup copy debug button
    const copyBtn = document.getElementById('hof-copy-debug')
    if (copyBtn) {
      copyBtn.onclick = () => {
        const debugContent = document.getElementById('hof-debug-content')
        if (debugContent) {
          navigator.clipboard.writeText(debugContent.textContent)
          showNotification('✅ Debug info copied!', 'success')
        }
      }
    }
  }

  // Store latest debug info
  let latestDebugInfo = null

  function updateDebugPanel(debugInfo) {
    latestDebugInfo = debugInfo
    const panel = document.getElementById('hof-debug-panel')
    const content = document.getElementById('hof-debug-content')

    if (!panel || !content) return

    // Format debug info for display
    const lines = [
      `=== Last Spin Detection ===`,
      `Keys: ${debugInfo.gameInfoKeys?.join(', ') || 'N/A'}`,
      ``,
      `Starts: ${debugInfo.starts !== undefined ? debugInfo.starts : 'undefined'}`,
      `StartsToken: ${debugInfo.startsToken || 'N/A'}`,
      ``,
      `Detected: ${debugInfo.detected || 'None'}`,
      `Spins: ${debugInfo.spins || 0}`,
    ]

    if (debugInfo.error) {
      lines.push(``, `ERROR: ${debugInfo.error}`)
    }

    content.textContent = lines.join('\n')
  }

  function showFinalStats(stats) {
    const profit = stats.currentBalance - stats.startBalance
    const duration = Math.round((Date.now() - stats.startTime) / 1000)

    const el = document.getElementById('hof-live-stats')
    if (el) {
      el.innerHTML = `
        <div style="text-align:center;padding:10px;">
          <div style="font-size:16px;font-weight:bold;margin-bottom:10px;">📊 Session Complete</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;">
            <div>Spins:</div><div style="text-align:right">${stats.totalSpins}</div>
            <div>Duration:</div><div style="text-align:right">${duration}s</div>
            <div>Start:</div><div style="text-align:right">${stats.startBalance.toLocaleString()}</div>
            <div>End:</div><div style="text-align:right">${stats.currentBalance.toLocaleString()}</div>
          </div>
          <div style="margin-top:12px;font-size:18px;font-weight:bold;color:${profit >= 0 ? '#00ff88' : '#ff6b6b'}">
            ${profit >= 0 ? '📈 +' : '📉 '}${profit.toLocaleString()}
          </div>
        </div>
      `
    }
  }

  function updateUI() {
    const startBtn = document.getElementById('hof-start-btn')
    const stopBtn = document.getElementById('hof-stop-btn')

    if (startBtn) startBtn.style.display = autoSpinActive ? 'none' : 'flex'
    if (stopBtn) stopBtn.style.display = autoSpinActive ? 'flex' : 'none'
  }

  async function startAutoSpin() {
    const minDelay = parseFloat(document.getElementById('hof-min-delay')?.value) || 0.01
    const maxDelay = parseFloat(document.getElementById('hof-max-delay')?.value) || 0.05
    const maxSpins = parseInt(document.getElementById('hof-max-spins')?.value) || 0
    const stopOnLoss = parseInt(document.getElementById('hof-stop-loss')?.value) || 0

    chrome.runtime.sendMessage({
      type: 'START_AUTO_SPIN',
      config: {
        minDelay: minDelay * 1000,
        maxDelay: maxDelay * 1000,
        maxSpins,
        stopOnLoss,
      },
    })
  }

  function stopAutoSpin() {
    chrome.runtime.sendMessage({ type: 'STOP_AUTO_SPIN' })
  }

  // Dog spin functions
  async function startDogAutoSpin() {
    const minDelay = parseFloat(document.getElementById('hof-dog-min-delay')?.value) || 1
    const maxDelay = parseFloat(document.getElementById('hof-dog-max-delay')?.value) || 2
    const maxSpins = parseInt(document.getElementById('hof-dog-max-spins')?.value) || 0

    chrome.runtime.sendMessage({
      type: 'START_DOG_AUTO_SPIN',
      config: {
        minDelay: minDelay * 1000,
        maxDelay: maxDelay * 1000,
        maxSpins,
      },
    })
  }

  function stopDogAutoSpin() {
    chrome.runtime.sendMessage({ type: 'STOP_DOG_AUTO_SPIN' })
  }

  function updateDogStatusIndicator(hasSpin) {
    const indicator = document.getElementById('hof-dog-status-dot')
    if (indicator) {
      indicator.style.background = hasSpin ? '#00c853' : '#888'
    }
  }

  function updateDogUI() {
    const startBtn = document.getElementById('hof-dog-start-btn')
    const stopBtn = document.getElementById('hof-dog-stop-btn')

    if (startBtn) startBtn.style.display = dogAutoSpinActive ? 'none' : 'flex'
    if (stopBtn) stopBtn.style.display = dogAutoSpinActive ? 'flex' : 'none'
  }

  function updateDogProgress(data) {
    const el = document.getElementById('hof-dog-live-stats')
    if (!el) return

    const milestone = data.stats.nextMilestone
    const milestoneText = milestone
      ? `${milestone.effortPercent}% - ${milestone.type}`
      : 'MAX LEVEL'

    el.innerHTML = `
      <div class="hof-stat-row">
        <span>🦴 Spins</span>
        <span class="hof-stat-value">${data.stats.totalSpins}</span>
      </div>
      <div class="hof-stat-row">
        <span>⭐ Level</span>
        <span class="hof-stat-value" style="color:#ffd700">${data.stats.currentLevel || '-'}</span>
      </div>
      <div class="hof-stat-row">
        <span>💰 Bones</span>
        <span class="hof-stat-value">${data.stats.totalBones.toLocaleString()}</span>
      </div>
      <div class="hof-stat-row">
        <span>📈 Progress</span>
        <span class="hof-stat-value" style="color:#4ecdc4">${data.stats.progressPercent}%</span>
      </div>
      <div class="hof-stat-row">
        <span>🎯 Next</span>
        <span class="hof-stat-value" style="font-size:10px">${milestoneText}</span>
      </div>
      <div class="hof-stat-row">
        <span>🎁 Last Win</span>
        <span class="hof-stat-value">#${data.wonWedgeNumber || '-'}</span>
      </div>
    `
  }

  function showDogFinalStats(stats) {
    const el = document.getElementById('hof-dog-live-stats')
    if (!el) return

    const duration = Math.round((Date.now() - stats.startTime) / 1000)

    el.innerHTML = `
      <div style="text-align:center;padding:10px;">
        <div style="font-size:16px;font-weight:bold;margin-bottom:10px;">🦴 Session Complete</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;">
          <div>Spins:</div><div style="text-align:right">${stats.totalSpins}</div>
          <div>Level:</div><div style="text-align:right">⭐ ${stats.currentLevel || '-'}</div>
          <div>Duration:</div><div style="text-align:right">${duration}s</div>
          <div>Bones:</div><div style="text-align:right">${stats.totalBones.toLocaleString()}</div>
          <div>Progress:</div><div style="text-align:right">${stats.progressPercent}%</div>
        </div>
        <div style="margin-top:12px;font-size:18px;font-weight:bold;color:#00ff88">
          🎉 Done!
        </div>
      </div>
    `
  }

  function showHistory(type = 'main') {
    currentTab = 'history'
    const content = document.getElementById('hof-content')
    if (!content) return

    const historyType = currentSpinTab // Use current spin tab to determine history type
    chrome.runtime.sendMessage({ type: 'GET_HISTORY', historyType: historyType }, (response) => {
      const history = response?.history || []

      const historyTitle = historyType === 'dog' ? '🦴 Dog Spin History' : '🎰 Main Spin History'
      let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-weight:bold;">${historyTitle}</span>
          <button id="hof-back-btn" class="hof-icon-btn">← Back</button>
        </div>
      `

      if (history.length === 0) {
        html += '<div style="color:#888;text-align:center;padding:20px;">No history yet</div>'
      } else {
        html += '<div style="max-height:300px;overflow-y:auto;">'
        history.forEach((session, i) => {
          const date = new Date(session.date)
          const profitColor = session.profit >= 0 ? '#00ff88' : '#ff6b6b'
          html += `
            <div class="hof-history-item">
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#888;font-size:10px;">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
                <span style="color:${profitColor};font-weight:bold;">${session.profit >= 0 ? '+' : ''}${session.profit.toLocaleString()}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;">
                <span>${session.spins} spins</span>
                <span>Won: ${session.totalWins.toLocaleString()}</span>
              </div>
            </div>
          `
        })
        html += '</div>'
        html += `
          <button id="hof-clear-history" style="width:100%;margin-top:10px;padding:8px;background:#ff4444;color:white;border:none;border-radius:6px;cursor:pointer;">
            🗑️ Clear History
          </button>
        `
      }

      content.innerHTML = html

      document.getElementById('hof-back-btn')?.addEventListener('click', showMain)
      document.getElementById('hof-clear-history')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY', historyType: historyType })
        showHistory(historyType)
      })
    })
  }

  function showMain() {
    currentTab = 'main'
    createPanelContent()
  }

  function createPanelContent() {
    const content = document.getElementById('hof-content')
    if (!content) return

    // Tab switcher + content based on current tab
    let html = `
      <!-- Tab Switcher -->
      <div style="display:flex;gap:4px;margin-bottom:12px;">
        <button id="hof-tab-main" class="hof-tab-btn ${currentSpinTab === 'main' ? 'active' : ''}" style="flex:1;padding:8px;background:${currentSpinTab === 'main' ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.05)'};border:1px solid ${currentSpinTab === 'main' ? '#667eea' : 'rgba(255,255,255,0.1)'};border-radius:6px;color:${currentSpinTab === 'main' ? '#fff' : '#aaa'};cursor:pointer;font-size:12px;font-weight:${currentSpinTab === 'main' ? '600' : '400'};">
          🎰 Main Spin
        </button>
        <button id="hof-tab-dog" class="hof-tab-btn ${currentSpinTab === 'dog' ? 'active' : ''}" style="flex:1;padding:8px;background:${currentSpinTab === 'dog' ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.05)'};border:1px solid ${currentSpinTab === 'dog' ? '#667eea' : 'rgba(255,255,255,0.1)'};border-radius:6px;color:${currentSpinTab === 'dog' ? '#fff' : '#aaa'};cursor:pointer;font-size:12px;font-weight:${currentSpinTab === 'dog' ? '600' : '400'};">
          🦴 Dog Spin
        </button>
        <button id="hof-tab-debug" class="hof-tab-btn ${currentTab === 'debug' ? 'active' : ''}" style="flex:1;padding:8px;background:${currentTab === 'debug' ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.05)'};border:1px solid ${currentTab === 'debug' ? '#667eea' : 'rgba(255,255,255,0.1)'};border-radius:6px;color:${currentTab === 'debug' ? '#fff' : '#aaa'};cursor:pointer;font-size:12px;font-weight:${currentTab === 'debug' ? '600' : '400'};">
          🐛 Debug
        </button>
      </div>
    `

    // Show main/dog spin content when in main tab
    if (currentTab === 'main') {
      if (currentSpinTab === 'main') {
        html += `
          <!-- Main Spin Content -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <div id="hof-status-dot" style="width:10px;height:10px;border-radius:50%;background:#888;"></div>
            <span id="hof-status-text" style="color:#aaa;font-size:12px;">Click SPIN in game to capture</span>
          </div>
          
          <div class="hof-settings">
            <div class="hof-setting-row">
              <label>⏱️ Delay (sec)</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="number" id="hof-min-delay" value="0.01" min="0.01" max="60" step="0.01" class="hof-input">
                <span style="color:#666">-</span>
                <input type="number" id="hof-max-delay" value="0.05" min="0.01" max="60" step="0.01" class="hof-input">
              </div>
            </div>
            <div class="hof-setting-row">
              <label>🔢 Max spins (0=∞)</label>
              <input type="number" id="hof-max-spins" value="0" min="0" class="hof-input" style="width:70px;">
            </div>
            <div class="hof-setting-row">
              <label>🛑 Stop on loss</label>
              <input type="number" id="hof-stop-loss" value="0" min="0" class="hof-input" style="width:70px;">
            </div>
          </div>
          
          <button id="hof-start-btn" class="hof-btn-primary hof-btn-start">
            <span>▶️</span> START AUTO-SPIN
          </button>
          <button id="hof-stop-btn" class="hof-btn-primary hof-btn-stop" style="display:none;">
            <span>⏹️</span> STOP
          </button>
          
          <div id="hof-live-stats" class="hof-stats-box">
            <div style="color:#666;text-align:center;">Stats will appear here</div>
          </div>
          
          <div id="hof-last-spin" style="text-align:center;font-size:12px;margin-top:8px;"></div>
          
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button id="hof-history-btn" class="hof-btn-secondary">📜 History</button>
            <button id="hof-single-btn" class="hof-btn-secondary">🎰 Single</button>
            <button id="hof-clear-btn" class="hof-btn-secondary" style="color:#ff6b6b;">🗑️ Clear</button>
          </div>
        `
      } else {
        // Dog Spin Content
        html += `
          <!-- Dog Spin Content -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <div id="hof-dog-status-dot" style="width:10px;height:10px;border-radius:50%;background:#888;"></div>
            <span id="hof-dog-status-text" style="color:#aaa;font-size:12px;">Click Dog Wheel to capture</span>
          </div>
          
          <div class="hof-settings">
            <div class="hof-setting-row">
              <label>⏱️ Delay (sec)</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="number" id="hof-dog-min-delay" value="1" min="0.5" max="60" step="0.5" class="hof-input">
                <span style="color:#666">-</span>
                <input type="number" id="hof-dog-max-delay" value="2" min="0.5" max="60" step="0.5" class="hof-input">
              </div>
            </div>
            <div class="hof-setting-row">
              <label>🔢 Max spins (0=∞)</label>
              <input type="number" id="hof-dog-max-spins" value="0" min="0" class="hof-input" style="width:70px;">
            </div>
          </div>
          
          <button id="hof-dog-start-btn" class="hof-btn-primary hof-btn-start">
            <span>▶️</span> START DOG AUTO-SPIN
          </button>
          <button id="hof-dog-stop-btn" class="hof-btn-primary hof-btn-stop" style="display:none;">
            <span>⏹️</span> STOP
          </button>
          
          <div id="hof-dog-live-stats" class="hof-stats-box">
            <div style="color:#666;text-align:center;">Dog stats will appear here</div>
          </div>
          
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button id="hof-dog-single-btn" class="hof-btn-secondary">🦴 Single</button>
            <button id="hof-dog-clear-btn" class="hof-btn-secondary" style="color:#ff6b6b;">🗑️ Clear</button>
          </div>
        `
      }
    } else if (currentTab === 'debug') {
      // Debug Tab Content
      html += `
        <!-- Debug Tab Content -->
        <div class="debug-section">
          <!-- Controls -->
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <button id="debug-start" class="hof-btn-secondary" style="flex:1;background:#00c853;color:white;display:${debugActive ? 'none' : 'flex'};">
              ▶️ Start
            </button>
            <button id="debug-stop" class="hof-btn-secondary" style="flex:1;background:#f44336;color:white;display:${debugActive ? 'flex' : 'none'};">
              ⏹️ Stop
            </button>
            <button id="debug-download" class="hof-btn-secondary" style="flex:1;">
              💾 Download
            </button>
            <button id="debug-clear" class="hof-btn-secondary" style="flex:1;">
              🗑️ Clear
            </button>
          </div>

          <!-- Stats -->
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;font-size:11px;">
            <span id="debug-event-count">0 events</span>
            <span id="debug-session-time">00:00:00</span>
            <span id="debug-memory">0 KB</span>
          </div>

          <!-- Filters -->
          <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
            <label style="font-size:10px;display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" id="filter-http" checked style="cursor:pointer;"> HTTP
            </label>
            <label style="font-size:10px;display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" id="filter-dom" checked style="cursor:pointer;"> DOM
            </label>
            <label style="font-size:10px;display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" id="filter-console" checked style="cursor:pointer;"> Console
            </label>
            <label style="font-size:10px;display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" id="filter-ui" checked style="cursor:pointer;"> UI
            </label>
            <label style="font-size:10px;display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" id="filter-system" checked style="cursor:pointer;"> System
            </label>
          </div>

          <!-- Event List -->
          <div id="debug-events" style="max-height:400px;overflow-y:auto;background:rgba(0,0,0,0.3);border-radius:6px;padding:4px;">
            <div style="color:#666;text-align:center;padding:20px;font-size:12px;">
              ${debugActive ? 'Waiting for events...' : 'Click Start to begin recording'}
            </div>
          </div>
        </div>
      `
    }

    content.innerHTML = html

    // Restore preserved stats when switching back to a tab
    if (currentSpinTab === 'main' && lastMainProgressData) {
      updateProgress(lastMainProgressData)
    }
    if (currentSpinTab === 'dog' && lastDogProgressData) {
      updateDogProgress(lastDogProgressData)
    }

    // Add tab switcher event listeners
    document.getElementById('hof-tab-main')?.addEventListener('click', () => {
      currentSpinTab = 'main'
      currentTab = 'main'
      createPanelContent()
    })

    document.getElementById('hof-tab-dog')?.addEventListener('click', () => {
      currentSpinTab = 'dog'
      currentTab = 'main'
      createPanelContent()
    })

    document.getElementById('hof-tab-debug')?.addEventListener('click', () => {
      currentTab = 'debug'
      createPanelContent()
      setupDebugTab()
    })

    // Main Spin Event Listeners
    if (currentSpinTab === 'main') {
      document.getElementById('hof-start-btn')?.addEventListener('click', startAutoSpin)
      document.getElementById('hof-stop-btn')?.addEventListener('click', stopAutoSpin)
      document.getElementById('hof-history-btn')?.addEventListener('click', showHistory)
      document.getElementById('hof-single-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'REPLAY_SPIN' }, (response) => {
          if (response?.success && response.data?.status === 200) {
            const wins = response.data.data?.result?.gameInfo?.wins || []
            const win = wins.reduce((sum, w) => sum + (w.win || 0), 0)
            const lastSpin = document.getElementById('hof-last-spin')
            if (lastSpin) {
              lastSpin.innerHTML =
                win > 0
                  ? `<span style="color:#ffd700">🎉 Won ${win.toLocaleString()}</span>`
                  : `<span style="color:#888">No win</span>`
            }
          }
        })
      })

      document.getElementById('hof-clear-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' }, () => {
          updateStatusIndicator(false)
          document.getElementById('hof-status-text').textContent =
            'Click SPIN in game to capture new'
          document.getElementById('hof-live-stats').innerHTML =
            '<div style="color:#666;text-align:center;">Cleared! Spin in game to capture.</div>'
          document.getElementById('hof-last-spin').innerHTML = ''
          showNotification('🗑️ Spin cleared!', 'warning')
        })
      })

      // Check status for main
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response?.hasCapturedRequest) {
          updateStatusIndicator(true)
          document.getElementById('hof-status-text').textContent = '✅ Ready to spin!'
        }
        autoSpinActive = response?.autoSpinActive || false
        updateUI()
      })
    } else {
      // Dog Spin Event Listeners
      document.getElementById('hof-dog-start-btn')?.addEventListener('click', startDogAutoSpin)
      document.getElementById('hof-dog-stop-btn')?.addEventListener('click', stopDogAutoSpin)

      document.getElementById('hof-dog-single-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'REPLAY_DOG_SPIN' }, (response) => {
          if (response?.success && response.data?.status === 200) {
            const bones = response.data.data?.wheel?.boneAmount || 0
            showNotification(`🦴 Got ${bones} bones!`, 'success')
          }
        })
      })

      document.getElementById('hof-dog-clear-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_DOG_REQUESTS' }, () => {
          updateDogStatusIndicator(false)
          document.getElementById('hof-dog-status-text').textContent =
            'Click Dog Wheel to capture new'
          document.getElementById('hof-dog-live-stats').innerHTML =
            '<div style="color:#666;text-align:center;">Cleared! Spin dog wheel to capture.</div>'
          showNotification('🗑️ Dog spin cleared!', 'warning')
        })
      })

      // Check status for dog
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response?.hasCapturedDogRequest) {
          updateDogStatusIndicator(true)
          document.getElementById('hof-dog-status-text').textContent = '✅ Ready to spin!'
        }
        dogAutoSpinActive = response?.dogAutoSpinActive || false
        updateDogUI()
      })
    }
  }

  function createPanel() {
    const existing = document.getElementById('hof-panel')
    if (existing) existing.remove()

    const panel = document.createElement('div')
    panel.id = 'hof-panel'
    panel.innerHTML = `
      <div class="hof-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">🎰</span>
          <span class="hof-title">HOF Helper</span>
        </div>
        <div style="display:flex;gap:8px;">
          <span id="hof-minimize" class="hof-header-btn">−</span>
          <span id="hof-close" class="hof-header-btn">✕</span>
        </div>
      </div>
      <div id="hof-content"></div>
    `

    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      
      #hof-panel {
        position: fixed !important;
        bottom: 20px !important;
        left: 20px !important;
        background: linear-gradient(160deg, #1e1e2f 0%, #15152a 100%) !important;
        color: #e0e0e0 !important;
        padding: 0 !important;
        border-radius: 16px !important;
        font-family: 'Segoe UI', -apple-system, sans-serif !important;
        font-size: 13px !important;
        z-index: 2147483647 !important;
        width: 300px !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1) !important;
        overflow: hidden;
      }
      #hof-panel .hof-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px 16px;
        background: linear-gradient(90deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2));
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      #hof-panel .hof-title { font-weight: 600; font-size: 15px; color: #fff; }
      #hof-panel .hof-header-btn { 
        cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
        border-radius: 6px; background: rgba(255,255,255,0.1); font-size: 14px; color: #888;
      }
      #hof-panel .hof-header-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
      #hof-panel #hof-content { padding: 16px; }
      #hof-panel .hof-settings { margin-bottom: 16px; }
      #hof-panel .hof-setting-row { 
        display: flex; justify-content: space-between; align-items: center; 
        padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      #hof-panel .hof-setting-row label { color: #aaa; font-size: 12px; }
      #hof-panel .hof-input {
        width: 50px; padding: 6px 8px; background: rgba(255,255,255,0.08); 
        border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; 
        color: #fff; text-align: center; font-size: 13px;
      }
      #hof-panel .hof-input:focus { outline: none; border-color: #667eea; }
      #hof-panel .hof-btn-primary {
        width: 100%; padding: 14px; border: none; border-radius: 10px; cursor: pointer;
        font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: transform 0.1s, box-shadow 0.1s;
      }
      #hof-panel .hof-btn-primary:hover { transform: translateY(-1px); }
      #hof-panel .hof-btn-primary:active { transform: translateY(1px); }
      #hof-panel .hof-btn-start { background: linear-gradient(135deg, #00c853, #00a844); color: white; box-shadow: 0 4px 15px rgba(0,200,83,0.3); }
      #hof-panel .hof-btn-stop { background: linear-gradient(135deg, #f44336, #d32f2f); color: white; box-shadow: 0 4px 15px rgba(244,67,54,0.3); }
      #hof-panel .hof-stats-box {
        background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px; margin-top: 12px;
      }
      #hof-panel .hof-stat-row { display: flex; justify-content: space-between; padding: 6px 0; }
      #hof-panel .hof-stat-value { font-weight: 600; color: #4ecdc4; }
      #hof-panel .hof-btn-secondary {
        flex: 1; padding: 10px; background: rgba(255,255,255,0.08); color: #aaa;
        border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; font-size: 12px;
      }
      #hof-panel .hof-btn-secondary:hover { background: rgba(255,255,255,0.15); color: #fff; }
      #hof-panel .hof-icon-btn {
        padding: 6px 12px; background: rgba(255,255,255,0.1); color: #aaa;
        border: none; border-radius: 6px; cursor: pointer; font-size: 11px;
      }
      #hof-panel .hof-icon-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
      #hof-panel .hof-history-item {
        background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; margin-bottom: 8px;
      }
    `

    document.head.appendChild(style)
    document.body.appendChild(panel)

    // Setup content
    createPanelContent()

    // Header events
    let minimized = false
    document.getElementById('hof-minimize')?.addEventListener('click', () => {
      const content = document.getElementById('hof-content')
      minimized = !minimized
      content.style.display = minimized ? 'none' : 'block'
      document.getElementById('hof-minimize').textContent = minimized ? '+' : '−'
    })
    document.getElementById('hof-close')?.addEventListener('click', () => panel.remove())
  }

  // ===== Debug Functions =====

  function setupDebugTab() {
    // Control buttons
    document.getElementById('debug-start')?.addEventListener('click', startDebug)
    document.getElementById('debug-stop')?.addEventListener('click', stopDebug)
    document.getElementById('debug-download')?.addEventListener('click', downloadDebugSession)
    document.getElementById('debug-clear')?.addEventListener('click', clearDebugEvents)

    // Filters
    document.getElementById('filter-http')?.addEventListener('change', (e) => {
      debugFilters.http = e.target.checked
      renderDebugEvents()
    })
    document.getElementById('filter-dom')?.addEventListener('change', (e) => {
      debugFilters.dom = e.target.checked
      renderDebugEvents()
    })
    document.getElementById('filter-console')?.addEventListener('change', (e) => {
      debugFilters.console = e.target.checked
      renderDebugEvents()
    })
    document.getElementById('filter-ui')?.addEventListener('change', (e) => {
      debugFilters.ui = e.target.checked
      renderDebugEvents()
    })
    document.getElementById('filter-system')?.addEventListener('change', (e) => {
      debugFilters.system = e.target.checked
      renderDebugEvents()
    })

    // Request initial status
    chrome.runtime.sendMessage({ type: 'DEBUG_GET_STATUS' }, (response) => {
      if (response?.isRecording) {
        debugActive = true
        updateDebugUI()
      }
    })
  }

  function startDebug() {
    chrome.runtime.sendMessage({ type: 'DEBUG_START_SESSION' }, (response) => {
      if (response?.success) {
        debugActive = true
        debugEvents = []
        updateDebugUI()
        showNotification('🐛 Debug recording started!', 'success')

        // Start DOM tracking
        startDomTracking()

        // Start console intercept
        interceptConsole()
      }
    })
  }

  function stopDebug() {
    chrome.runtime.sendMessage({ type: 'DEBUG_STOP_SESSION' }, (response) => {
      if (response?.success) {
        debugActive = false
        updateDebugUI()
        showNotification(`🛑 Debug stopped - ${response.eventCount} events recorded`, 'warning')

        // Stop DOM tracking
        stopDomTracking()
      }
    })
  }

  function downloadDebugSession() {
    chrome.runtime.sendMessage({ type: 'DEBUG_EXPORT_SESSION' }, (response) => {
      if (response?.success && response.data) {
        const jsonStr = JSON.stringify(response.data, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hof-debug-${response.data.session.id}.json`
        a.click()
        URL.revokeObjectURL(url)
        showNotification('💾 Debug session downloaded!', 'success')
      }
    })
  }

  function clearDebugEvents() {
    chrome.runtime.sendMessage({ type: 'DEBUG_CLEAR_SESSION' }, () => {
      debugEvents = []
      renderDebugEvents()
      showNotification('🗑️ Debug events cleared!', 'warning')
    })
  }

  function addDebugEvent(event) {
    debugEvents.push(event)

    // Keep only last 1000 events in UI (backend has 5000)
    if (debugEvents.length > 1000) {
      debugEvents.shift()
    }

    renderDebugEvents()
    updateDebugStats()
  }

  function renderDebugEvents() {
    const container = document.getElementById('debug-events')
    if (!container) return

    const filteredEvents = debugEvents.filter((event) => {
      return debugFilters[event.category]
    })

    if (filteredEvents.length === 0) {
      container.innerHTML =
        '<div style="color:#666;text-align:center;padding:20px;font-size:12px;">No events to display</div>'
      return
    }

    // Build HTML for events (newest first)
    let html = ''
    const reversed = [...filteredEvents].reverse()

    reversed.forEach((event, index) => {
      const icon = getEventIcon(event.type, event.category)
      const color = getEventColor(event.category)

      html += `
        <div class="debug-event" style="margin-bottom:4px;border-left:3px solid ${color};background:rgba(255,255,255,0.02);padding:6px;border-radius:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
            <div style="display:flex;align-items:center;gap:6px;flex:1;font-size:11px;">
              <span>${icon}</span>
              <span style="color:#888;font-family:monospace;font-size:10px;min-width:85px;">${event.relativeTime}</span>
              <span style="color:${color};font-weight:600;">${event.type}</span>
              <span style="color:#aaa;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${getEventSummary(event)}</span>
            </div>
            <span style="color:#666;font-size:10px;">▼</span>
          </div>
          <div style="display:none;margin-top:6px;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px;font-size:10px;font-family:monospace;overflow-x:auto;max-height:200px;overflow-y:auto;">
            <pre style="margin:0;color:#aaa;white-space:pre-wrap;word-wrap:break-word;">${JSON.stringify(event.data, null, 2)}</pre>
          </div>
        </div>
      `
    })

    container.innerHTML = html

    // Auto-scroll to bottom (newest events)
    container.scrollTop = container.scrollHeight
  }

  function updateDebugUI() {
    const startBtn = document.getElementById('debug-start')
    const stopBtn = document.getElementById('debug-stop')

    if (startBtn) startBtn.style.display = debugActive ? 'none' : 'flex'
    if (stopBtn) stopBtn.style.display = debugActive ? 'flex' : 'none'

    renderDebugEvents()
  }

  function updateDebugStats() {
    const eventCount = document.getElementById('debug-event-count')
    const sessionTime = document.getElementById('debug-session-time')
    const memory = document.getElementById('debug-memory')

    if (eventCount) eventCount.textContent = `${debugEvents.length} events`

    // Request stats from background
    chrome.runtime.sendMessage({ type: 'DEBUG_GET_STATUS' }, (response) => {
      if (response) {
        const duration = response.duration || 0
        const hours = Math.floor(duration / 3600000)
        const mins = Math.floor((duration % 3600000) / 60000)
        const secs = Math.floor((duration % 60000) / 1000)

        if (sessionTime) {
          sessionTime.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        }

        if (memory && response.eventCount) {
          // Rough estimate: 500 bytes per event
          const kb = Math.round((response.eventCount * 500) / 1024)
          memory.textContent = `${kb} KB`
        }
      }
    })
  }

  function getEventIcon(type, category) {
    if (category === 'http') return '🌐'
    if (category === 'dom') return '📄'
    if (category === 'console') return '💬'
    if (category === 'ui') return '🎮'
    if (category === 'system') return '⚙️'
    return '📌'
  }

  function getEventColor(category) {
    const colors = {
      http: '#2196f3',
      dom: '#ff9800',
      console: '#9c27b0',
      ui: '#4caf50',
      system: '#607d8b',
    }
    return colors[category] || '#888'
  }

  function getEventSummary(event) {
    if (event.type === 'HTTP_REQUEST') {
      const url = event.data.url || ''
      const path = url.split('/').pop() || url
      return `${event.data.method} ${path.substring(0, 40)}`
    }
    if (event.type === 'HTTP_RESPONSE') {
      return `${event.data.statusCode} ${event.data.statusLine || ''}`
    }
    if (event.type === 'HTTP_RESPONSE_BODY') {
      const kb = Math.round((event.data.dataSize || 0) / 1024)
      return `${event.data.statusCode} - ${event.data.url} (${kb} KB)`
    }
    if (event.type === 'CONSOLE_LOG') {
      return event.data.message?.substring(0, 60) || ''
    }
    if (event.type === 'DOM_MUTATION') {
      return `${event.data.type} on ${event.data.target?.substring(0, 40) || 'element'}`
    }
    return JSON.stringify(event.data).substring(0, 60)
  }

  // DOM Tracking
  let domObserver = null

  function startDomTracking() {
    if (domObserver) return

    domObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Filter out own UI and irrelevant changes
        if (mutation.target.closest('#hof-panel')) return
        if (mutation.target.tagName === 'SCRIPT' || mutation.target.tagName === 'STYLE') return

        const data = {
          type: mutation.type,
          target: getElementPath(mutation.target),
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length,
          attributeName: mutation.attributeName,
          oldValue: mutation.oldValue,
        }

        chrome.runtime.sendMessage({
          type: 'DEBUG_DOM_MUTATION',
          data: data,
        })
      })
    })

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: false, // Too noisy
    })

    console.log('[Debug] DOM tracking started')
  }

  function stopDomTracking() {
    if (domObserver) {
      domObserver.disconnect()
      domObserver = null
      console.log('[Debug] DOM tracking stopped')
    }
  }

  function getElementPath(element) {
    if (!element || element === document.body) return 'body'

    const path = []
    let current = element
    let depth = 0

    while (current && current !== document.body && depth < 5) {
      let selector = current.tagName?.toLowerCase() || 'unknown'
      if (current.id) {
        selector += `#${current.id}`
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className
          .split(' ')
          .filter((c) => c)
          .slice(0, 2)
        if (classes.length) selector += `.${classes.join('.')}`
      }
      path.unshift(selector)
      current = current.parentElement
      depth++
    }

    return path.join(' > ')
  }

  // Console Intercept
  let originalConsole = {}

  function interceptConsole() {
    if (originalConsole.log) return // Already intercepted

    originalConsole.log = console.log
    originalConsole.warn = console.warn
    originalConsole.error = console.error

    console.log = function (...args) {
      sendConsoleLog('log', args)
      originalConsole.log.apply(console, args)
    }

    console.warn = function (...args) {
      sendConsoleLog('warn', args)
      originalConsole.warn.apply(console, args)
    }

    console.error = function (...args) {
      sendConsoleLog('error', args)
      originalConsole.error.apply(console, args)
    }

    console.log('[Debug] Console intercept started')
  }

  function sendConsoleLog(level, args) {
    const message = args
      .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
      .join(' ')
      .substring(0, 500) // Limit length

    chrome.runtime.sendMessage({
      type: 'DEBUG_CONSOLE',
      data: {
        level: level,
        message: message,
        stack: new Error().stack,
      },
    })
  }

  // Update stats periodically when debug is active
  setInterval(() => {
    if (debugActive && currentTab === 'debug') {
      updateDebugStats()
    }
  }, 1000)
})()
