/**
 * House of Fun Helper - Dog Spin View
 * Dog spin tab content and handlers
 */

;(function () {
  'use strict'

  // State
  let dogAutoSpinActive = false
  let lastDogProgressData = null

  /**
   * Render dog spin view
   * @param {boolean} hasCapturedRequest - Whether a dog spin has been captured
   * @param {boolean} isActive - Whether dog auto-spin is active
   * @returns {string} HTML string
   */
  function render(hasCapturedRequest = false, isActive = false) {
    dogAutoSpinActive = isActive

    return `
      <!-- Status Indicator -->
      <div class="hof-status">
        <div id="hof-dog-status-dot" class="hof-status-dot ${hasCapturedRequest ? 'active' : ''}"></div>
        <span id="hof-dog-status-text" class="hof-status-text">
          ${hasCapturedRequest ? '✅ Ready to spin!' : 'Click Dog Wheel to capture'}
        </span>
      </div>

      <!-- Settings -->
      <div class="hof-settings">
        <div class="hof-setting-row">
          <span class="hof-setting-label">⏱️ Delay (sec)</span>
          <div class="hof-input-group">
            <input type="number" id="hof-dog-min-delay" value="1" min="0.5" max="60" step="0.5" class="hof-input">
            <span class="hof-input-separator">—</span>
            <input type="number" id="hof-dog-max-delay" value="2" min="0.5" max="60" step="0.5" class="hof-input">
          </div>
        </div>
        <div class="hof-setting-row">
          <span class="hof-setting-label">🔢 Max spins (0=∞)</span>
          <input type="number" id="hof-dog-max-spins" value="0" min="0" class="hof-input" style="width:70px;">
        </div>
      </div>

      <!-- Control Buttons -->
      <button id="hof-dog-start-btn" class="hof-btn hof-btn-start" style="display:${dogAutoSpinActive ? 'none' : 'flex'}">
        <span>▶️</span> START DOG AUTO-SPIN
      </button>
      <button id="hof-dog-stop-btn" class="hof-btn hof-btn-stop" style="display:${dogAutoSpinActive ? 'flex' : 'none'}">
        <span>⏹️</span> STOP
      </button>

      <!-- Live Stats -->
      <div id="hof-dog-live-stats" class="hof-stats-box">
        <div style="color:var(--hof-text-muted);text-align:center;">Dog stats will appear here</div>
      </div>

      <!-- Bottom Actions -->
      <div class="hof-btn-group">
        <button id="hof-dog-single-btn" class="hof-btn-secondary">🦴 Single</button>
        <button id="hof-dog-clear-btn" class="hof-btn-secondary" style="color:var(--hof-color-loss);">🗑️ Clear</button>
      </div>
    `
  }

  /**
   * Setup event handlers for dog spin view
   * @param {object} callbacks - Callback functions
   */
  function setupHandlers(callbacks = {}) {
    const { onStartDogAutoSpin, onStopDogAutoSpin, onSingleDogSpin, onClearDogRequests } = callbacks

    document.getElementById('hof-dog-start-btn')?.addEventListener('click', () => {
      const minDelay = parseFloat(document.getElementById('hof-dog-min-delay')?.value) || 1
      const maxDelay = parseFloat(document.getElementById('hof-dog-max-delay')?.value) || 2
      const maxSpins = parseInt(document.getElementById('hof-dog-max-spins')?.value) || 0

      if (typeof onStartDogAutoSpin === 'function') {
        onStartDogAutoSpin({ minDelay: minDelay * 1000, maxDelay: maxDelay * 1000, maxSpins })
      }
    })

    document.getElementById('hof-dog-stop-btn')?.addEventListener('click', () => {
      if (typeof onStopDogAutoSpin === 'function') onStopDogAutoSpin()
    })

    document.getElementById('hof-dog-single-btn')?.addEventListener('click', () => {
      if (typeof onSingleDogSpin === 'function') onSingleDogSpin()
    })

    document.getElementById('hof-dog-clear-btn')?.addEventListener('click', () => {
      if (typeof onClearDogRequests === 'function') onClearDogRequests()
    })
  }

  /**
   * Update dog progress display
   * @param {object} data - Progress data with stats
   */
  function updateProgress(data) {
    lastDogProgressData = data
    const el = document.getElementById('hof-dog-live-stats')
    if (!el) return

    const stats = data.stats
    const milestone = stats.nextMilestone
    const milestoneText = milestone
      ? `${milestone.effortPercent}% - ${milestone.type}`
      : 'MAX LEVEL'

    el.innerHTML = `
      <div class="hof-stat-row">
        <span class="hof-stat-label">🦴 Spins</span>
        <span class="hof-stat-value">${stats.totalSpins}</span>
      </div>
      <div class="hof-stat-row">
        <span class="hof-stat-label">⭐ Level</span>
        <span class="hof-stat-value gold">${stats.currentLevel || '-'}</span>
      </div>
      <div class="hof-stat-row">
        <span class="hof-stat-label">💰 Bones</span>
        <span class="hof-stat-value">${window.HofUtils?.formatNumber(stats.totalBones) || stats.totalBones}</span>
      </div>
      <div class="hof-stat-row">
        <span class="hof-stat-label">📈 Progress</span>
        <span class="hof-stat-value" style="color:var(--hof-color-cyan);">${stats.progressPercent}%</span>
      </div>
      <div class="hof-stat-row">
        <span class="hof-stat-label">🎯 Next</span>
        <span class="hof-stat-value" style="font-size:10px;">${milestoneText}</span>
      </div>
      <div class="hof-stat-row">
        <span class="hof-stat-label">🎁 Last Win</span>
        <span class="hof-stat-value">#${data.wonWedgeNumber || '-'}</span>
      </div>
    `
  }

  /**
   * Show final stats after dog session complete
   * @param {object} stats - Final session stats
   */
  function showFinalStats(stats) {
    const el = document.getElementById('hof-dog-live-stats')
    if (!el) return

    const duration = Math.round((Date.now() - stats.startTime) / 1000)

    el.innerHTML = `
      <div class="hof-session-complete">
        <div class="hof-session-title">🦴 Session Complete</div>
        <div class="hof-session-grid">
          <span class="hof-session-grid-label">Spins:</span>
          <span class="hof-session-grid-value">${stats.totalSpins}</span>
          <span class="hof-session-grid-label">Level:</span>
          <span class="hof-session-grid-value" style="color:var(--hof-color-gold)">⭐ ${stats.currentLevel || '-'}</span>
          <span class="hof-session-grid-label">Duration:</span>
          <span class="hof-session-grid-value">${window.HofUtils?.formatDuration(duration) || duration + 's'}</span>
          <span class="hof-session-grid-label">Bones:</span>
          <span class="hof-session-grid-value">${window.HofUtils?.formatNumber(stats.totalBones) || stats.totalBones}</span>
          <span class="hof-session-grid-label">Progress:</span>
          <span class="hof-session-grid-value">${stats.progressPercent}%</span>
        </div>
        <div class="hof-session-profit profit">
          🎉 Done!
        </div>
      </div>
    `
  }

  /**
   * Update UI state (start/stop buttons)
   * @param {boolean} isActive - Whether dog auto-spin is active
   */
  function updateUIState(isActive) {
    dogAutoSpinActive = isActive
    const startBtn = document.getElementById('hof-dog-start-btn')
    const stopBtn = document.getElementById('hof-dog-stop-btn')
    if (startBtn) startBtn.style.display = isActive ? 'none' : 'flex'
    if (stopBtn) stopBtn.style.display = isActive ? 'flex' : 'none'
  }

  /**
   * Update status indicator
   * @param {boolean} hasSpin - Whether a dog spin is captured
   */
  function updateStatusIndicator(hasSpin) {
    const dot = document.getElementById('hof-dog-status-dot')
    const text = document.getElementById('hof-dog-status-text')
    if (dot) dot.classList.toggle('active', hasSpin)
    if (text) text.textContent = hasSpin ? '✅ Ready to spin!' : 'Click Dog Wheel to capture new'
  }

  /**
   * Get last progress data (for restoring state)
   */
  function getLastProgressData() {
    return lastDogProgressData
  }

  // Export to window
  window.HofDogSpin = {
    render,
    setupHandlers,
    updateProgress,
    showFinalStats,
    updateUIState,
    updateStatusIndicator,
    getLastProgressData,
  }
})()
