/**
 * House of Fun Helper - Debug Tracking
 * DOM tracking and console interception for debug view
 */

;(function () {
  'use strict'

  let domObserver = null
  let originalConsole = {}

  /**
   * Start DOM mutation tracking
   */
  function startDomTracking() {
    if (domObserver) return

    domObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.closest('#hof-panel')) return
        if (mutation.target.tagName === 'SCRIPT' || mutation.target.tagName === 'STYLE') return

        chrome.runtime.sendMessage({
          type: 'DEBUG_DOM_MUTATION',
          data: {
            type: mutation.type,
            target: getElementPath(mutation.target),
            addedNodes: mutation.addedNodes.length,
            removedNodes: mutation.removedNodes.length,
            attributeName: mutation.attributeName,
            oldValue: mutation.oldValue,
          },
        })
      })
    })

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: false,
    })
  }

  /**
   * Stop DOM mutation tracking
   */
  function stopDomTracking() {
    if (domObserver) {
      domObserver.disconnect()
      domObserver = null
    }
  }

  /**
   * Get CSS selector path for element
   */
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

  /**
   * Intercept console methods
   */
  function interceptConsole() {
    if (originalConsole.log) return

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
  }

  /**
   * Send console log to background
   */
  function sendConsoleLog(level, args) {
    const message = args
      .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
      .join(' ')
      .substring(0, 500)

    chrome.runtime.sendMessage({
      type: 'DEBUG_CONSOLE',
      data: { level, message, stack: new Error().stack },
    })
  }

  /**
   * Get icon for event category
   */
  function getEventIcon(category) {
    const icons = { http: '🌐', dom: '📄', console: '💬', ui: '🎮', system: '⚙️' }
    return icons[category] || '📌'
  }

  /**
   * Get color for event category
   */
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

  /**
   * Get summary text for event
   */
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

  /**
   * Render single debug event HTML
   */
  function renderEventHTML(event) {
    const icon = getEventIcon(event.category)
    const color = getEventColor(event.category)
    const summary = getEventSummary(event)

    return `
      <div class="hof-debug-event" style="border-left-color:${color};" onclick="this.querySelector('.hof-debug-event-body').style.display = this.querySelector('.hof-debug-event-body').style.display === 'none' ? 'block' : 'none'">
        <div class="hof-debug-event-header">
          <span>${icon}</span>
          <span class="hof-debug-event-time">${event.relativeTime}</span>
          <span class="hof-debug-event-type" style="color:${color}">${event.type}</span>
          <span class="hof-debug-event-summary">${summary}</span>
          <span style="color:var(--hof-text-muted);font-size:10px;">▼</span>
        </div>
        <div class="hof-debug-event-body">
          <pre>${JSON.stringify(event.data, null, 2)}</pre>
        </div>
      </div>
    `
  }

  // Export to window
  window.HofDebugTracking = {
    startDomTracking,
    stopDomTracking,
    interceptConsole,
    getEventIcon,
    getEventColor,
    getEventSummary,
    renderEventHTML,
  }
})()
