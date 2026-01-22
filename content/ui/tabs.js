/**
 * House of Fun Helper - Tabs Module
 * Tab navigation component
 */

;(function () {
  'use strict'

  const TABS = [
    { id: 'main', label: '🎰 Main Spin', spinTab: 'main' },
    { id: 'dog', label: '🦴 Dog Spin', spinTab: 'dog' },
    { id: 'debug', label: '🐛 Debug', spinTab: null },
  ]

  /**
   * Render tabs into a container
   * @param {string} activeTabId - Currently active tab ID
   * @param {Function} onTabChange - Callback when tab changes
   * @returns {string} HTML string for tabs
   */
  function renderTabs(activeTabId, onTabChange) {
    const container = document.createElement('div')
    container.className = 'hof-tabs'

    TABS.forEach((tab) => {
      const tabEl = document.createElement('button')
      tabEl.className = `hof-tab ${activeTabId === tab.id ? 'active' : ''}`
      tabEl.textContent = tab.label
      tabEl.dataset.tabId = tab.id

      tabEl.addEventListener('click', () => {
        if (typeof onTabChange === 'function') {
          onTabChange(tab.id, tab.spinTab)
        }
      })

      container.appendChild(tabEl)
    })

    return container
  }

  /**
   * Get tab HTML string
   * @param {string} activeTabId - Currently active tab ID
   * @returns {string} HTML string
   */
  function getTabsHTML(activeTabId) {
    return `
      <div class="hof-tabs">
        ${TABS.map(
          (tab) => `
          <button class="hof-tab ${activeTabId === tab.id ? 'active' : ''}" data-tab-id="${tab.id}">
            ${tab.label}
          </button>
        `,
        ).join('')}
      </div>
    `
  }

  /**
   * Setup tab click handlers
   * @param {Function} onTabChange - Callback (tabId, spinTab) => void
   */
  function setupTabHandlers(onTabChange) {
    const tabs = document.querySelectorAll('#hof-panel .hof-tab')
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tabId
        const tabConfig = TABS.find((t) => t.id === tabId)
        if (tabConfig && typeof onTabChange === 'function') {
          onTabChange(tabId, tabConfig.spinTab)
        }
      })
    })
  }

  /**
   * Update active tab visual state
   * @param {string} activeTabId - Active tab ID
   */
  function updateActiveTab(activeTabId) {
    const tabs = document.querySelectorAll('#hof-panel .hof-tab')
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tabId === activeTabId)
    })
  }

  // Export to window
  window.HofTabs = {
    render: renderTabs,
    getHTML: getTabsHTML,
    setupHandlers: setupTabHandlers,
    updateActive: updateActiveTab,
    TABS,
  }
})()
