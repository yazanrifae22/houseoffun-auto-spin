/**
 * House of Fun Helper - Panel Module
 * Creates and manages the main panel container
 */

;(function () {
  'use strict'

  let panelElement = null
  let isMinimized = false

  /**
   * Inject the CSS stylesheets
   */
  function injectStyles() {
    // Check if already injected
    if (document.getElementById('hof-styles')) return

    // Inject base styles
    const link1 = document.createElement('link')
    link1.id = 'hof-styles'
    link1.rel = 'stylesheet'
    link1.href = chrome.runtime.getURL('content/ui/styles.css')
    document.head.appendChild(link1)

    // Inject component styles
    const link2 = document.createElement('link')
    link2.id = 'hof-styles-components'
    link2.rel = 'stylesheet'
    link2.href = chrome.runtime.getURL('content/ui/styles-components.css')
    document.head.appendChild(link2)
  }

  /**
   * Create the main panel
   * @returns {HTMLElement} The panel element
   */
  function createPanel() {
    // Remove existing panel if any
    const existing = document.getElementById('hof-panel')
    if (existing) existing.remove()

    // Inject styles first
    injectStyles()

    // Create panel container
    panelElement = document.createElement('div')
    panelElement.id = 'hof-panel'

    panelElement.innerHTML = `
      <div class="hof-header">
        <div class="hof-header-left">
          <span class="hof-logo">🎰</span>
          <span class="hof-title">HOF Helper</span>
        </div>
        <div class="hof-header-actions">
          <span id="hof-minimize" class="hof-header-btn" title="Minimize">−</span>
          <span id="hof-close" class="hof-header-btn" title="Close">✕</span>
        </div>
      </div>
      <div id="hof-content" class="hof-content"></div>
    `

    document.body.appendChild(panelElement)

    // Setup header events
    setupHeaderEvents()

    return panelElement
  }

  /**
   * Setup header button events
   */
  function setupHeaderEvents() {
    const minimizeBtn = document.getElementById('hof-minimize')
    const closeBtn = document.getElementById('hof-close')
    const content = document.getElementById('hof-content')

    if (minimizeBtn && content) {
      minimizeBtn.addEventListener('click', () => {
        isMinimized = !isMinimized
        content.style.display = isMinimized ? 'none' : 'block'
        minimizeBtn.textContent = isMinimized ? '+' : '−'
        minimizeBtn.title = isMinimized ? 'Expand' : 'Minimize'
      })
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (panelElement) {
          panelElement.remove()
          panelElement = null
        }
      })
    }
  }

  /**
   * Get the content container
   * @returns {HTMLElement|null}
   */
  function getContentContainer() {
    return document.getElementById('hof-content')
  }

  /**
   * Get the panel element
   * @returns {HTMLElement|null}
   */
  function getPanel() {
    return panelElement
  }

  /**
   * Check if panel exists
   * @returns {boolean}
   */
  function exists() {
    return !!document.getElementById('hof-panel')
  }

  /**
   * Remove the panel
   */
  function remove() {
    if (panelElement) {
      panelElement.remove()
      panelElement = null
    }
  }

  // Export to window
  window.HofPanel = {
    create: createPanel,
    getContentContainer,
    getPanel,
    exists,
    remove,
    injectStyles,
  }
})()
