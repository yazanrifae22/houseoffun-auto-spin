/**
 * UI Manager Module
 * Handles all DOM creation and updates
 */

const UIManager = (() => {
  let panelElement = null
  let contentElement = null

  const STYLES = `
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

  /**
   * Initialize UI with styles
   */
  function init() {
    injectStyles()
  }

  /**
   * Inject CSS styles
   */
  function injectStyles() {
    const style = document.createElement('style')
    style.textContent = STYLES
    document.head.appendChild(style)
  }

  /**
   * Create main panel
   */
  function createPanel() {
    // Remove existing panel if any
    const existing = document.getElementById('hof-panel')
    if (existing) existing.remove()

    panelElement = document.createElement('div')
    panelElement.id = 'hof-panel'
    panelElement.innerHTML = `
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

    document.body.appendChild(panelElement)
    contentElement = document.getElementById('hof-content')

    return panelElement
  }

  /**
   * Render main view
   */
  function renderMainView(state) {
    if (!contentElement) return

    contentElement.innerHTML = `
      <!-- Status Indicator -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div id="hof-status-dot" style="width:10px;height:10px;border-radius:50%;background:${state.capturedRequest ? '#00c853' : '#888'};"></div>
        <span id="hof-status-text" style="color:#aaa;font-size:12px;">${state.capturedRequest ? '✅ Ready to spin!' : 'Click SPIN in game to capture'}</span>
      </div>
      
      <!-- Settings -->
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
      
      <!-- Control Buttons -->
      <button id="hof-start-btn" class="hof-btn-primary hof-btn-start" style="display:${state.autoSpinActive ? 'none' : 'flex'}">
        <span>▶️</span> START AUTO-SPIN
      </button>
      <button id="hof-stop-btn" class="hof-btn-primary hof-btn-stop" style="display:${state.autoSpinActive ? 'flex' : 'none'}">
        <span>⏹️</span> STOP
      </button>
      
      <!-- Live Stats -->
      <div id="hof-live-stats" class="hof-stats-box">
        <div style="color:#666;text-align:center;">Stats will appear here</div>
      </div>
      
      <!-- Last Spin -->
      <div id="hof-last-spin" style="text-align:center;font-size:12px;margin-top:8px;"></div>
      
      <!-- Bottom Actions -->
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="hof-history-btn" class="hof-btn-secondary">📜 History</button>
        <button id="hof-single-btn" class="hof-btn-secondary">🎰 Single</button>
        <button id="hof-clear-btn" class="hof-btn-secondary" style="color:#ff6b6b;">🗑️ Clear</button>
      </div>
    `
  }

  /**
   * Render history view
   */
  function renderHistoryView(history) {
    if (!contentElement) return

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
      history.forEach((session) => {
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

    contentElement.innerHTML = html
  }

  /**
   * Update live stats (throttled)
   */
  let lastStatsUpdate = 0
  function updateLiveStats(stats, lastWin = null) {
    // Throttle updates to max 10 per second
    const now = Date.now()
    if (now - lastStatsUpdate < 100) return
    lastStatsUpdate = now

    const el = document.getElementById('hof-live-stats')
    if (!el) return

    const profit = stats.currentBalance - stats.startBalance

    // Safety check for bonus stats (handle undefined)
    const freeSpinBonuses = stats.freeSpinBonuses || 0
    const freeSpinsPlayed = stats.freeSpinsPlayed || 0
    const freeSpinWins = stats.freeSpinWins || 0
    const starSpinBonuses = stats.starSpinBonuses || 0
    const starSpinsPlayed = stats.starSpinsPlayed || 0
    const starSpinWins = stats.starSpinWins || 0

    // Calculate total profit (profit from spins + bonus wins)
    const totalProfit = profit + freeSpinWins + starSpinWins

    el.innerHTML = `
      <!-- Main Stats -->
      <div class="hof-stat-row">
        <span>🎰 Spins</span>
        <span class="hof-stat-value">${stats.totalSpins}</span>
      </div>
      <div class="hof-stat-row">
        <span>🏆 Total Won</span>
        <span class="hof-stat-value" style="color:#ffd700">${stats.totalWins.toLocaleString()}</span>
      </div>
      <div class="hof-stat-row">
        <span>💰 Balance</span>
        <span class="hof-stat-value">${stats.currentBalance.toLocaleString()}</span>
      </div>
      
      <!-- Profit Section -->
      <div style="border-top:1px solid rgba(255,255,255,0.15);margin:8px 0;padding-top:8px;">
        <div class="hof-stat-row">
          <span>${profit >= 0 ? '📈' : '📉'} Spin Profit</span>
          <span class="hof-stat-value" style="color:${profit >= 0 ? '#00ff88' : '#ff6b6b'}">${profit >= 0 ? '+' : ''}${profit.toLocaleString()}</span>
        </div>

        <!-- Bonus Stats Section (Always Visible) -->
        <div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:8px;margin:8px 0;">
          <div style="color:#aaa;font-size:11px;margin-bottom:6px;font-weight:600;">🎁 BONUS WINS</div>
          
          <div class="hof-stat-row">
            <span style="font-size:11px;">💫 Free Spins</span>
            <span style="color:${freeSpinBonuses > 0 ? '#ff79c6' : '#666'};font-size:11px;">${freeSpinBonuses} × (${freeSpinsPlayed} spins)</span>
          </div>
          <div class="hof-stat-row">
            <span style="font-size:11px;">└─ Won</span>
            <span style="color:${freeSpinWins > 0 ? '#ff79c6' : '#666'};font-size:11px;">+${freeSpinWins.toLocaleString()}</span>
          </div>

          <div class="hof-stat-row" style="margin-top:4px;">
            <span style="font-size:11px;">⭐ Star Spins</span>
            <span style="color:${starSpinBonuses > 0 ? '#ffd700' : '#666'};font-size:11px;">${starSpinBonuses} × (${starSpinsPlayed} spins)</span>
          </div>
          <div class="hof-stat-row">
            <span style="font-size:11px;">└─ Won</span>
            <span style="color:${starSpinWins > 0 ? '#ffd700' : '#666'};font-size:11px;">+${starSpinWins.toLocaleString()}</span>
          </div>
        </div>

        <!-- Total Profit (Highlighted) -->
        <div class="hof-stat-row" style="border-top:2px solid rgba(255,255,255,0.2);padding-top:8px;margin-top:4px;">
          <span style="font-weight:700;font-size:13px;">💎 TOTAL PROFIT</span>
          <span class="hof-stat-value" style="color:${totalProfit >= 0 ? '#00ff88' : '#ff6b6b'};font-weight:700;font-size:15px;">${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()}</span>
        </div>
      </div>
    `

    // Update last spin if provided
    if (lastWin !== null) {
      const lastSpinEl = document.getElementById('hof-last-spin')
      if (lastSpinEl) {
        lastSpinEl.innerHTML =
          lastWin > 0
            ? `<span style="color:#ffd700">🎉 Won ${lastWin.toLocaleString()}</span>`
            : `<span style="color:#888">No win</span>`
      }
    }
  }

  /**
   * Show final stats
   */
  function showFinalStats(stats) {
    const el = document.getElementById('hof-live-stats')
    if (!el) return

    const profit = stats.currentBalance - stats.startBalance
    const duration = Math.round((Date.now() - stats.startTime) / 1000)

    // Safety checks for bonus stats
    const freeSpinBonuses = stats.freeSpinBonuses || 0
    const freeSpinWins = stats.freeSpinWins || 0
    const starSpinBonuses = stats.starSpinBonuses || 0
    const starSpinWins = stats.starSpinWins || 0

    // Calculate total profit including bonuses
    const totalProfit = profit + freeSpinWins + starSpinWins

    el.innerHTML = `
      <div style="text-align:center;padding:10px;">
        <div style="font-size:16px;font-weight:bold;margin-bottom:10px;">📊 Session Complete</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;">
          <div>Spins:</div><div style="text-align:right">${stats.totalSpins}</div>
          <div>Duration:</div><div style="text-align:right">${duration}s</div>
          <div>Won:</div><div style="text-align:right">${stats.totalWins.toLocaleString()}</div>
          ${
            freeSpinBonuses > 0
              ? `
          <div style="color:#ff79c6">🎁 Free Bonus:</div><div style="text-align:right;color:#ff79c6">${freeSpinBonuses}× (+${freeSpinWins.toLocaleString()})</div>
          `
              : ''
          }
          ${
            starSpinBonuses > 0
              ? `
          <div style="color:#ffd700">⭐ Star Bonus:</div><div style="text-align:right;color:#ffd700">${starSpinBonuses}× (+${starSpinWins.toLocaleString()})</div>
          `
              : ''
          }
        </div>
        <div style="margin-top:12px;font-size:18px;font-weight:bold;color:${totalProfit >= 0 ? '#00ff88' : '#ff6b6b'}">
          ${totalProfit >= 0 ? '📈 +' : '📉 '}${totalProfit.toLocaleString()}
        </div>
      </div>
    `
  }

  /**
   * Show notification
   */
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

  /**
   * Get panel element
   */
  function getPanel() {
    return panelElement
  }

  return {
    init,
    createPanel,
    renderMainView,
    renderHistoryView,
    updateLiveStats,
    showFinalStats,
    showNotification,
    getPanel,
  }
})()

// Export
if (typeof window !== 'undefined') {
  window.UIManager = UIManager
}
