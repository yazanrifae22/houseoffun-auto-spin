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
  let currentTab = 'main' // 'main' or 'history'

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

  function updateProgress(data) {
    const el = document.getElementById('hof-live-stats')
    if (!el) return

    const profit = data.stats.currentBalance - data.stats.startBalance

    el.innerHTML = `
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
    `

    // Update last spin
    const lastSpin = document.getElementById('hof-last-spin')
    if (lastSpin && data.spinWin !== undefined) {
      lastSpin.innerHTML =
        data.spinWin > 0
          ? `<span style="color:#ffd700">🎉 Won ${data.spinWin.toLocaleString()}</span>`
          : `<span style="color:#888">No win</span>`
    }
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
    const minDelay = parseFloat(document.getElementById('hof-min-delay')?.value) || 1
    const maxDelay = parseFloat(document.getElementById('hof-max-delay')?.value) || 2
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

  function showHistory() {
    currentTab = 'history'
    const content = document.getElementById('hof-content')
    if (!content) return

    chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
      const history = response?.history || []

      let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-weight:bold;">📜 Session History</span>
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
        chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' })
        showHistory()
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
      </div>
    `

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
              <input type="number" id="hof-min-delay" value="1" min="0.5" max="60" step="0.5" class="hof-input">
              <span style="color:#666">-</span>
              <input type="number" id="hof-max-delay" value="2" min="0.5" max="60" step="0.5" class="hof-input">
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

    content.innerHTML = html

    // Add tab switcher event listeners
    document.getElementById('hof-tab-main')?.addEventListener('click', () => {
      currentSpinTab = 'main'
      createPanelContent()
    })

    document.getElementById('hof-tab-dog')?.addEventListener('click', () => {
      currentSpinTab = 'dog'
      createPanelContent()
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
})()
