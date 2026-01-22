/**
 * House of Fun Helper - Utility Functions
 * Shared helpers used across UI modules
 */

;(function () {
  'use strict'

  // Cache for game names to avoid repeated localStorage lookups
  const gameNameCache = new Map()

  /**
   * Get game name from localStorage using gameId (with caching)
   * @param {string|number} gameId - The game ID to look up
   * @returns {string} The game name or a fallback
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
        gameNameCache.set(gameId, gameName)
        return gameName
      }

      const parsed = JSON.parse(rawData)
      const games = parsed.content?.games || parsed.games || []

      let foundGame = null
      if (Array.isArray(games)) {
        foundGame = games.find((g) => g.gameId == gameId)
      } else {
        foundGame = Object.values(games).find((g) => g.gameId == gameId)
      }

      if (foundGame) {
        gameName = foundGame.name || foundGame.description || `Game #${gameId}`
      }
    } catch (e) {
      console.warn('[HOF UI] Error fetching game name:', e)
    }

    gameNameCache.set(gameId, gameName)
    return gameName
  }

  /**
   * Format a number with locale-aware separators
   * @param {number} num - Number to format
   * @returns {string} Formatted number string
   */
  function formatNumber(num) {
    if (num === null || num === undefined) return '0'
    return Number(num).toLocaleString()
  }

  /**
   * Format profit with sign and color class
   * @param {number} profit - Profit value
   * @returns {object} Object with formatted text and class name
   */
  function formatProfit(profit) {
    const isPositive = profit >= 0
    return {
      text: `${isPositive ? '+' : ''}${formatNumber(profit)}`,
      className: isPositive ? 'profit' : 'loss',
      emoji: isPositive ? '📈' : '📉',
    }
  }

  /**
   * Format duration in seconds to readable string
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins < 60) return `${mins}m ${secs}s`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  /**
   * Format time as HH:MM:SS
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted time
   */
  function formatTime(ms) {
    const hours = Math.floor(ms / 3600000)
    const mins = Math.floor((ms % 3600000) / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Safely query an element by ID
   * @param {string} id - Element ID
   * @returns {HTMLElement|null}
   */
  function $(id) {
    return document.getElementById(id)
  }

  /**
   * Create an element with properties
   * @param {string} tag - HTML tag name
   * @param {object} props - Properties to set
   * @param {string|HTMLElement[]} children - Child content
   * @returns {HTMLElement}
   */
  function createElement(tag, props = {}, children = null) {
    const el = document.createElement(tag)

    Object.entries(props).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value)
      } else if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), value)
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value)
      } else {
        el.setAttribute(key, value)
      }
    })

    if (children) {
      if (typeof children === 'string') {
        el.innerHTML = children
      } else if (Array.isArray(children)) {
        children.forEach((child) => {
          if (child) el.appendChild(child)
        })
      }
    }

    return el
  }

  /**
   * Debounce function calls
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in ms
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timeoutId
    return function (...args) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn.apply(this, args), delay)
    }
  }

  /**
   * Throttle function calls
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Minimum time between calls in ms
   * @returns {Function}
   */
  function throttle(fn, limit) {
    let inThrottle
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  // Export to window
  window.HofUtils = {
    getGameNameFromLocalStorage,
    formatNumber,
    formatProfit,
    formatDuration,
    formatTime,
    $,
    createElement,
    debounce,
    throttle,
  }
})()
