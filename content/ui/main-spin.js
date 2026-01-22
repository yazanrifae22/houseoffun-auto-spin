/**
 * House of Fun Helper - Main Spin View
 * Main spin tab content and handlers (uses main-spin-stats.js for rendering)
 */

;(function () {
  'use strict'

  // State
  let autoSpinActive = false
  let lastProgressData = null

  /**
   * Render main spin view
   * @param {boolean} hasCapturedRequest - Whether a spin has been captured
   * @param {boolean} isActive - Whether auto-spin is active
   * @returns {string} HTML string
   */
  function render(hasCapturedRequest = false, isActive = false) {
    autoSpinActive = isActive

    return `
      <!-- Status Indicator -->
      <div class="hof-status">
        <div id="hof-status-dot" class="hof-status-dot ${hasCapturedRequest ? 'active' : ''}"></div>
        <span id="hof-status-text" class="hof-status-text">
          ${hasCapturedRequest ? '✅ Ready to spin!' : 'Click SPIN in game to capture'}
        </span>
      </div>

      <!-- Settings -->
      <div class="hof-settings">
        <div class="hof-setting-row">
          <span class="hof-setting-label">⏱️ Delay (sec)</span>
          <div class="hof-input-group">
            <input type="number" id="hof-min-delay" value="0.01" min="0.01" max="60" step="0.01" class="hof-input">
            <span class="hof-input-separator">—</span>
            <input type="number" id="hof-max-delay" value="0.05" min="0.01" max="60" step="0.01" class="hof-input">
          </div>
        </div>
        <div class="hof-setting-row">
          <span class="hof-setting-label">🔢 Max spins (0=∞)</span>
          <input type="number" id="hof-max-spins" value="0" min="0" class="hof-input" style="width:70px;">
        </div>
        <div class="hof-setting-row">
          <span class="hof-setting-label">🛑 Stop on loss</span>
          <input type="number" id="hof-stop-loss" value="0" min="0" class="hof-input" style="width:70px;">
        </div>
      </div>

      <!-- Control Buttons -->
      <button id="hof-start-btn" class="hof-btn hof-btn-start" style="display:${autoSpinActive ? 'none' : 'flex'}">
        <span>▶️</span> START AUTO-SPIN
      </button>
      <button id="hof-stop-btn" class="hof-btn hof-btn-stop" style="display:${autoSpinActive ? 'flex' : 'none'}">
        <span>⏹️</span> STOP
      </button>

      <!-- Live Stats -->
      <div id="hof-live-stats" class="hof-stats-box">
        <div style="color:var(--hof-text-muted);text-align:center;">Stats will appear here</div>
      </div>

      <!-- Last Spin -->
      <div id="hof-last-spin" class="hof-last-spin"></div>

      <!-- Bottom Actions -->
      <div class="hof-btn-group">
        <button id="hof-history-btn" class="hof-btn-secondary">📜 History</button>
        <button id="hof-single-btn" class="hof-btn-secondary">🎰 Single</button>
        <button id="hof-clear-btn" class="hof-btn-secondary" style="color:var(--hof-color-loss);">🗑️ Clear</button>
      </div>
    `
  }

  /**
   * Setup event handlers for main spin view
   */
  function setupHandlers(callbacks = {}) {
    const { onStartAutoSpin, onStopAutoSpin, onShowHistory, onSingleSpin, onClearRequests } =
      callbacks

    document.getElementById('hof-start-btn')?.addEventListener('click', () => {
      const minDelay = parseFloat(document.getElementById('hof-min-delay')?.value) || 0.01
      const maxDelay = parseFloat(document.getElementById('hof-max-delay')?.value) || 0.05
      const maxSpins = parseInt(document.getElementById('hof-max-spins')?.value) || 0
      const stopOnLoss = parseInt(document.getElementById('hof-stop-loss')?.value) || 0
      if (typeof onStartAutoSpin === 'function') {
        onStartAutoSpin({
          minDelay: minDelay * 1000,
          maxDelay: maxDelay * 1000,
          maxSpins,
          stopOnLoss,
        })
      }
    })

    document.getElementById('hof-stop-btn')?.addEventListener('click', () => {
      if (typeof onStopAutoSpin === 'function') onStopAutoSpin()
    })

    document.getElementById('hof-history-btn')?.addEventListener('click', () => {
      if (typeof onShowHistory === 'function') onShowHistory()
    })

    document.getElementById('hof-single-btn')?.addEventListener('click', () => {
      if (typeof onSingleSpin === 'function') onSingleSpin()
    })

    document.getElementById('hof-clear-btn')?.addEventListener('click', () => {
      if (typeof onClearRequests === 'function') onClearRequests()
    })
  }

  /**
   * Update live stats display
   */
  function updateProgress(data) {
    lastProgressData = data
    const el = document.getElementById('hof-live-stats')
    if (!el) return

    el.innerHTML = window.HofMainSpinStats?.renderLiveStats(data) || ''

    // Update last spin
    if (data.spinWin !== undefined) {
      const lastSpinEl = document.getElementById('hof-last-spin')
      if (lastSpinEl) {
        lastSpinEl.innerHTML = window.HofMainSpinStats?.renderLastSpin(data.spinWin) || ''
      }
    }

    // Setup copy button
    document.getElementById('hof-copy-debug')?.addEventListener('click', () => {
      const content = document.getElementById('hof-debug-content')
      if (content) {
        navigator.clipboard.writeText(content.textContent)
        window.HofNotifications?.success('✅ Debug info copied!')
      }
    })
  }

  /**
   * Update debug panel with detection info
   */
  function updateDebugPanel(debugInfo) {
    const content = document.getElementById('hof-debug-content')
    if (!content) return
    content.textContent = window.HofMainSpinStats?.renderDebugLines(debugInfo) || ''
  }

  /**
   * Show final stats after session complete
   */
  function showFinalStats(stats) {
    const el = document.getElementById('hof-live-stats')
    if (!el) return
    el.innerHTML = window.HofMainSpinStats?.renderFinalStats(stats) || ''
  }

  /**
   * Update UI state (start/stop buttons)
   */
  function updateUIState(isActive) {
    autoSpinActive = isActive
    const startBtn = document.getElementById('hof-start-btn')
    const stopBtn = document.getElementById('hof-stop-btn')
    if (startBtn) startBtn.style.display = isActive ? 'none' : 'flex'
    if (stopBtn) stopBtn.style.display = isActive ? 'flex' : 'none'
  }

  /**
   * Update status indicator
   */
  function updateStatusIndicator(hasSpin) {
    const dot = document.getElementById('hof-status-dot')
    const text = document.getElementById('hof-status-text')
    if (dot) dot.classList.toggle('active', hasSpin)
    if (text) text.textContent = hasSpin ? '✅ Ready to spin!' : 'Click SPIN in game to capture'
  }

  /**
   * Get last progress data (for restoring state)
   */
  function getLastProgressData() {
    return lastProgressData
  }

  // Export to window
  window.HofMainSpin = {
    render,
    setupHandlers,
    updateProgress,
    updateDebugPanel,
    showFinalStats,
    updateUIState,
    updateStatusIndicator,
    getLastProgressData,
  }
})()
