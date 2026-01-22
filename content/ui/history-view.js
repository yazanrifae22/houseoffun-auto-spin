/**
 * House of Fun Helper - History View
 * Session history display
 */

;(function () {
  'use strict'

  /**
   * Render history view
   * @param {Array} history - Array of session history items
   * @param {string} historyType - 'main' or 'dog'
   * @returns {string} HTML string
   */
  function render(history = [], historyType = 'main') {
    const title = historyType === 'dog' ? '🦴 Dog Spin History' : '🎰 Main Spin History'

    let html = `
      <div class="hof-history-header">
        <span class="hof-history-title">${title}</span>
        <button id="hof-back-btn" class="hof-btn-icon">← Back</button>
      </div>
    `

    if (history.length === 0) {
      html += `
        <div class="hof-history-empty">
          <div style="font-size:32px;margin-bottom:12px;">📭</div>
          <div>No history yet</div>
        </div>
      `
    } else {
      html += `<div class="hof-history-list">`

      history.forEach((session) => {
        const date = new Date(session.date)
        const profitClass = session.profit >= 0 ? 'profit' : 'loss'
        const profitSign = session.profit >= 0 ? '+' : ''

        html += `
          <div class="hof-history-item">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="hof-history-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
              <span class="hof-history-profit ${profitClass}">${profitSign}${window.HofUtils?.formatNumber(session.profit) || session.profit}</span>
            </div>
            <div class="hof-history-details">
              <span>${session.spins} spins</span>
              <span>Won: ${window.HofUtils?.formatNumber(session.totalWins) || session.totalWins}</span>
            </div>
          </div>
        `
      })

      html += `</div>`
      html += `
        <button id="hof-clear-history" class="hof-btn hof-btn-danger">
          🗑️ Clear History
        </button>
      `
    }

    return html
  }

  /**
   * Setup event handlers for history view
   * @param {object} callbacks - Callback functions
   */
  function setupHandlers(callbacks = {}) {
    const { onBack, onClearHistory } = callbacks

    document.getElementById('hof-back-btn')?.addEventListener('click', () => {
      if (typeof onBack === 'function') onBack()
    })

    document.getElementById('hof-clear-history')?.addEventListener('click', () => {
      if (typeof onClearHistory === 'function') onClearHistory()
    })
  }

  // Export to window
  window.HofHistory = {
    render,
    setupHandlers,
  }
})()
