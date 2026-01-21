/**
 * Debug Recorder Module
 * Records all game events, HTTP requests, DOM changes, and console logs for debugging
 */

const DebugRecorder = (() => {
  const MAX_EVENTS = 5000 // Circular buffer limit
  const DOM_THROTTLE_MS = 100 // Throttle DOM mutations

  let isRecording = false
  let sessionId = null
  let sessionStartTime = null
  let events = []
  let eventIdCounter = 0
  let domThrottle = null

  /**
   * Start a new debug recording session
   */
  function startSession() {
    if (isRecording) {
      console.log('[Debug] Session already active')
      return {
        success: false,
        error: 'Session already active',
      }
    }

    sessionId = generateSessionId()
    sessionStartTime = Date.now()
    events = []
    eventIdCounter = 0
    isRecording = true

    console.log(
      `%c[Debug] 🐛 SESSION STARTED`,
      'background:#9c27b0;color:white;font-weight:bold;padding:4px 8px',
    )

    recordEvent('SESSION', {
      action: 'started',
      sessionId: sessionId,
    })

    return {
      success: true,
      sessionId: sessionId,
    }
  }

  /**
   * Stop the current recording session
   */
  function stopSession() {
    if (!isRecording) {
      console.log('[Debug] No active session')
      return {
        success: false,
        error: 'No active session',
      }
    }

    recordEvent('SESSION', {
      action: 'stopped',
      duration: Date.now() - sessionStartTime,
      totalEvents: events.length,
    })

    isRecording = false

    console.log(
      `%c[Debug] 🛑 SESSION STOPPED - ${events.length} events recorded`,
      'background:#f44336;color:white;font-weight:bold;padding:4px 8px',
    )

    return {
      success: true,
      eventCount: events.length,
      duration: Date.now() - sessionStartTime,
    }
  }

  /**
   * Record a new event
   */
  function recordEvent(type, data, category = null) {
    if (!isRecording && type !== 'SESSION') {
      return
    }

    const timestamp = Date.now()
    const relativeTime = formatRelativeTime(timestamp - sessionStartTime)

    const event = {
      id: `evt-${String(++eventIdCounter).padStart(6, '0')}`,
      timestamp: timestamp,
      timestampISO: new Date(timestamp).toISOString(),
      relativeTime: relativeTime,
      type: type,
      category: category || getCategoryFromType(type),
      data: sanitizeData(data),
      metadata: {
        sessionId: sessionId,
        eventCount: events.length + 1,
        memoryUsage: getMemoryUsage(),
      },
    }

    // Circular buffer - remove oldest event if at limit
    if (events.length >= MAX_EVENTS) {
      events.shift()
    }

    events.push(event)

    // Notify content script in real-time
    notifyContentScript(event)

    return event
  }

  /**
   * Record HTTP request
   */
  function recordHttpRequest(details) {
    if (!isRecording) return

    recordEvent(
      'HTTP_REQUEST',
      {
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        type: details.type,
        requestBody: details.requestBody,
        initiator: details.initiator,
      },
      'http',
    )
  }

  /**
   * Record HTTP response
   */
  function recordHttpResponse(details) {
    if (!isRecording) return

    recordEvent(
      'HTTP_RESPONSE',
      {
        requestId: details.requestId,
        url: details.url,
        statusCode: details.statusCode,
        statusLine: details.statusLine,
        responseHeaders: details.responseHeaders,
        fromCache: details.fromCache,
      },
      'http',
    )
  }

  /**
   * Record HTTP response with body (called from spin replay)
   */
  function recordHttpResponseBody(url, statusCode, responseData) {
    if (!isRecording) return

    console.log(
      `%c[Debug] 📦 Recording response body: ${url} (${statusCode})`,
      'background:#9c27b0;color:white;padding:2px 6px',
    )

    recordEvent(
      'HTTP_RESPONSE_BODY',
      {
        url: url,
        statusCode: statusCode,
        responseData: responseData,
        dataSize: JSON.stringify(responseData).length,
      },
      'http',
    )
  }

  /**
   * Record DOM mutation (throttled)
   */
  function recordDomMutation(data) {
    if (!isRecording) return

    if (domThrottle) return

    domThrottle = setTimeout(() => {
      recordEvent('DOM_MUTATION', data, 'dom')
      domThrottle = null
    }, DOM_THROTTLE_MS)
  }

  /**
   * Record console log
   */
  function recordConsoleLog(level, message, stack) {
    if (!isRecording) return

    recordEvent(
      'CONSOLE_LOG',
      {
        level: level,
        message: message,
        stack: stack,
      },
      'console',
    )
  }

  /**
   * Record UI event
   */
  function recordUiEvent(eventType, data) {
    if (!isRecording) return

    recordEvent(eventType, data, 'ui')
  }

  /**
   * Get all events (with optional filter)
   */
  function getEvents(filter = null) {
    if (!filter) return events

    return events.filter((event) => {
      if (filter.type) return event.type === filter.type
      if (filter.category) return event.category === filter.category
      if (filter.since) return event.timestamp >= filter.since
      return true
    })
  }

  /**
   * Export complete session as JSON
   */
  function exportSession() {
    const sessionData = {
      session: {
        id: sessionId,
        startTime: new Date(sessionStartTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - sessionStartTime,
        eventCount: events.length,
        extensionVersion: chrome.runtime.getManifest().version,
      },
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
      events: events,
      stats: getStats(),
    }

    return sessionData
  }

  /**
   * Clear all events
   */
  function clearSession() {
    events = []
    eventIdCounter = 0
    console.log('[Debug] Session cleared')
  }

  /**
   * Get session statistics
   */
  function getStats() {
    const stats = {
      total: events.length,
    }

    events.forEach((event) => {
      stats[event.category] = (stats[event.category] || 0) + 1
    })

    return stats
  }

  /**
   * Check if currently recording
   */
  function isActive() {
    return isRecording
  }

  /**
   * Get current session info
   */
  function getSessionInfo() {
    return {
      isRecording: isRecording,
      sessionId: sessionId,
      startTime: sessionStartTime,
      eventCount: events.length,
      duration: isRecording ? Date.now() - sessionStartTime : 0,
    }
  }

  // ===== Helper Functions =====

  function generateSessionId() {
    return 'session-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9)
  }

  function formatRelativeTime(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    const h = String(hours).padStart(2, '0')
    const m = String(minutes % 60).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    const millis = String(ms % 1000).padStart(3, '0')

    return `${h}:${m}:${s}.${millis}`
  }

  function getCategoryFromType(type) {
    if (type.startsWith('HTTP_')) return 'http'
    if (type.startsWith('DOM_')) return 'dom'
    if (type.startsWith('CONSOLE_')) return 'console'
    if (type.startsWith('AUTO_SPIN') || type.startsWith('DOG_')) return 'ui'
    if (type === 'SESSION') return 'system'
    return 'other'
  }

  function sanitizeData(data) {
    // Deep clone and remove circular references
    try {
      return JSON.parse(JSON.stringify(data))
    } catch (e) {
      return { error: 'Could not serialize data', type: typeof data }
    }
  }

  function getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize
    }
    return 0
  }

  function notifyContentScript(event) {
    // Send real-time event to content script
    chrome.tabs.query({ url: '*://*.houseoffun.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            type: 'DEBUG_EVENT',
            event: event,
          })
          .catch(() => {
            // Tab might not have content script loaded
          })
      })
    })
  }

  return {
    startSession,
    stopSession,
    recordEvent,
    recordHttpRequest,
    recordHttpResponse,
    recordHttpResponseBody,
    recordDomMutation,
    recordConsoleLog,
    recordUiEvent,
    getEvents,
    exportSession,
    clearSession,
    getStats,
    isActive,
    getSessionInfo,
  }
})()

// Export for service worker
if (typeof self !== 'undefined') {
  self.DebugRecorder = DebugRecorder
}
