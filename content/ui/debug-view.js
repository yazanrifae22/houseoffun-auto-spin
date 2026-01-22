/**
 * House of Fun Helper - Debug View
 * Debug tab content and handlers (uses debug-tracking.js for tracking)
 */

;(function () {
  'use strict'

  // State
  let debugActive = false
  let debugEvents = []
  let debugFilters = { http: true, dom: true, console: true, ui: true, system: true }

  /**
   * Render debug view
   * @param {boolean} isRecording - Whether debug is currently recording
   * @returns {string} HTML string
   */
  function render(isRecording = false) {
    debugActive = isRecording

    return `
      <!-- Debug Controls -->
      <div class="hof-debug-controls">
        <button id="debug-start" class="hof-btn-secondary" style="background:var(--hof-accent-success);color:white;display:${debugActive ? 'none' : 'flex'};">
          ▶️ Start
        </button>
        <button id="debug-stop" class="hof-btn-secondary" style="background:var(--hof-accent-danger);color:white;display:${debugActive ? 'flex' : 'none'};">
          ⏹️ Stop
        </button>
        <button id="debug-download" class="hof-btn-secondary">💾 Download</button>
        <button id="debug-clear" class="hof-btn-secondary">🗑️ Clear</button>
      </div>

      <!-- Stats -->
      <div class="hof-debug-stats">
        <span id="debug-event-count">0 events</span>
        <span id="debug-session-time">00:00:00</span>
        <span id="debug-memory">0 KB</span>
      </div>

      <!-- Filters -->
      <div class="hof-debug-filters">
        <label class="hof-debug-filter"><input type="checkbox" id="filter-http" checked> HTTP</label>
        <label class="hof-debug-filter"><input type="checkbox" id="filter-dom" checked> DOM</label>
        <label class="hof-debug-filter"><input type="checkbox" id="filter-console" checked> Console</label>
        <label class="hof-debug-filter"><input type="checkbox" id="filter-ui" checked> UI</label>
        <label class="hof-debug-filter"><input type="checkbox" id="filter-system" checked> System</label>
      </div>

      <!-- Event List -->
      <div id="debug-events" class="hof-debug-events">
        <div class="hof-debug-empty">
          ${debugActive ? 'Waiting for events...' : 'Click Start to begin recording'}
        </div>
      </div>
    `
  }

  /**
   * Setup event handlers for debug view
   */
  function setupHandlers() {
    document.getElementById('debug-start')?.addEventListener('click', startDebug)
    document.getElementById('debug-stop')?.addEventListener('click', stopDebug)
    document.getElementById('debug-download')?.addEventListener('click', downloadDebugSession)
    document.getElementById('debug-clear')?.addEventListener('click', clearDebugEvents)

    // Filters
    ;['http', 'dom', 'console', 'ui', 'system'].forEach((filter) => {
      document.getElementById(`filter-${filter}`)?.addEventListener('change', (e) => {
        debugFilters[filter] = e.target.checked
        renderDebugEvents()
      })
    })

    // Request initial status
    chrome.runtime.sendMessage({ type: 'DEBUG_GET_STATUS' }, (response) => {
      if (response?.isRecording) {
        debugActive = true
        updateDebugUI()
      }
    })
  }

  /**
   * Start debug recording
   */
  function startDebug() {
    chrome.runtime.sendMessage({ type: 'DEBUG_START_SESSION' }, (response) => {
      if (response?.success) {
        debugActive = true
        debugEvents = []
        updateDebugUI()
        window.HofNotifications?.success('🐛 Debug recording started!')
        window.HofDebugTracking?.startDomTracking()
        window.HofDebugTracking?.interceptConsole()
      }
    })
  }

  /**
   * Stop debug recording
   */
  function stopDebug() {
    chrome.runtime.sendMessage({ type: 'DEBUG_STOP_SESSION' }, (response) => {
      if (response?.success) {
        debugActive = false
        updateDebugUI()
        window.HofNotifications?.warning(
          `🛑 Debug stopped - ${response.eventCount} events recorded`,
        )
        window.HofDebugTracking?.stopDomTracking()
      }
    })
  }

  /**
   * Download debug session
   */
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
        window.HofNotifications?.success('💾 Debug session downloaded!')
      }
    })
  }

  /**
   * Clear debug events
   */
  function clearDebugEvents() {
    chrome.runtime.sendMessage({ type: 'DEBUG_CLEAR_SESSION' }, () => {
      debugEvents = []
      renderDebugEvents()
      window.HofNotifications?.warning('🗑️ Debug events cleared!')
    })
  }

  /**
   * Add a debug event
   */
  function addEvent(event) {
    debugEvents.push(event)
    if (debugEvents.length > 1000) debugEvents.shift()
    renderDebugEvents()
    updateDebugStats()
  }

  /**
   * Render debug events list
   */
  function renderDebugEvents() {
    const container = document.getElementById('debug-events')
    if (!container) return

    const filteredEvents = debugEvents.filter((event) => debugFilters[event.category])

    if (filteredEvents.length === 0) {
      container.innerHTML = `<div class="hof-debug-empty">No events to display</div>`
      return
    }

    const reversed = [...filteredEvents].reverse()
    container.innerHTML = reversed
      .map((e) => window.HofDebugTracking?.renderEventHTML(e) || '')
      .join('')
  }

  /**
   * Update debug UI state
   */
  function updateDebugUI() {
    const startBtn = document.getElementById('debug-start')
    const stopBtn = document.getElementById('debug-stop')
    if (startBtn) startBtn.style.display = debugActive ? 'none' : 'flex'
    if (stopBtn) stopBtn.style.display = debugActive ? 'flex' : 'none'
    renderDebugEvents()
  }

  /**
   * Update debug stats display
   */
  function updateDebugStats() {
    const eventCount = document.getElementById('debug-event-count')
    if (eventCount) eventCount.textContent = `${debugEvents.length} events`

    chrome.runtime.sendMessage({ type: 'DEBUG_GET_STATUS' }, (response) => {
      if (response) {
        const sessionTime = document.getElementById('debug-session-time')
        const memory = document.getElementById('debug-memory')
        if (sessionTime && response.duration) {
          sessionTime.textContent = window.HofUtils?.formatTime(response.duration) || '00:00:00'
        }
        if (memory && response.eventCount) {
          const kb = Math.round((response.eventCount * 500) / 1024)
          memory.textContent = `${kb} KB`
        }
      }
    })
  }

  // Export to window
  window.HofDebug = {
    render,
    setupHandlers,
    addEvent,
    updateDebugStats,
    isActive: () => debugActive,
  }
})()
