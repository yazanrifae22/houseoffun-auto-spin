/**
 * House of Fun Helper - Main Spin Stats Display
 * Stats rendering and session complete display for main spin
 */

;(function () {
  'use strict'

  /**
   * Render live stats HTML
   * @param {object} data - Progress data with stats
   * @returns {string} HTML string
   */
  function renderLiveStats(data) {
    const stats = data.stats
    const profit = stats.currentBalance - stats.startBalance
    const profitInfo = window.HofUtils?.formatProfit(profit) || {
      text: profit,
      className: profit >= 0 ? 'profit' : 'loss',
    }

    let html = ''

    // Game info if available
    if (stats.currentGameId) {
      const gameName =
        window.HofUtils?.getGameNameFromLocalStorage(stats.currentGameId) ||
        `Game #${stats.currentGameId}`
      html += `
        <div class="hof-game-info">
          <span class="hof-game-label">🎮 Game</span>
          <span class="hof-game-name">${gameName}</span>
        </div>
      `
    }

    // Main stats
    html += `
      <div class="hof-stat-row">
        <span class="hof-stat-label">🎰 Spins</span>
        <span class="hof-stat-value">${stats.totalSpins}</span>
      </div>
      <div class="hof-stat-row">
        <span class="hof-stat-label">🏆 Total Won</span>
        <span class="hof-stat-value gold">${window.HofUtils?.formatNumber(stats.totalWins) || stats.totalWins}</span>
      </div>
      <div class="hof-stat-row">
        <span class="hof-stat-label">💰 Balance</span>
        <span class="hof-stat-value">${window.HofUtils?.formatNumber(stats.currentBalance) || stats.currentBalance}</span>
      </div>
    `

    // Bonus breakdown if any
    const hasBonuses = (stats.freeSpinBonuses || 0) > 0 || (stats.starSpinBonuses || 0) > 0
    if (hasBonuses) {
      html += `<div class="hof-bonus-box"><div class="hof-bonus-title">🎁 Bonus Breakdown</div>`

      if (stats.freeSpinBonuses > 0) {
        html += `
          <div class="hof-stat-row">
            <span class="hof-stat-label" style="font-size:11px;">💫 Free Spins</span>
            <span class="hof-stat-value pink" style="font-size:11px;">${stats.freeSpinBonuses}× (${stats.freeSpinsPlayed || 0} spins)</span>
          </div>
          <div class="hof-stat-row">
            <span class="hof-stat-label" style="font-size:11px;">└─ Won</span>
            <span class="hof-stat-value pink" style="font-size:11px;">+${window.HofUtils?.formatNumber(stats.freeSpinWins) || 0}</span>
          </div>
        `
      }

      if (stats.starSpinBonuses > 0) {
        html += `
          <div class="hof-stat-row">
            <span class="hof-stat-label" style="font-size:11px;">⭐ Star Spins</span>
            <span class="hof-stat-value gold" style="font-size:11px;">${stats.starSpinBonuses}× (${stats.starSpinsPlayed || 0} spins)</span>
          </div>
          <div class="hof-stat-row">
            <span class="hof-stat-label" style="font-size:11px;">└─ Won</span>
            <span class="hof-stat-value gold" style="font-size:11px;">+${window.HofUtils?.formatNumber(stats.starSpinWins) || 0}</span>
          </div>
        `
      }

      html += `</div>`
    }

    // Total profit with dynamic color
    const profitColor = profit >= 0 ? 'var(--hof-color-profit)' : 'var(--hof-color-loss)'
    html += `
      <div class="hof-profit-section">
        <div class="hof-profit-total">
          <span class="hof-profit-label">💎 TOTAL PROFIT</span>
          <span class="hof-profit-value" style="color:${profitColor}">${profitInfo.text}</span>
        </div>
      </div>
    `

    return html
  }

  /**
   * Render final session stats HTML
   * @param {object} stats - Final session stats
   * @returns {string} HTML string
   */
  function renderFinalStats(stats) {
    const profit = stats.currentBalance - stats.startBalance
    const profitInfo = window.HofUtils?.formatProfit(profit) || {
      text: profit,
      className: profit >= 0 ? 'profit' : 'loss',
      emoji: profit >= 0 ? '📈' : '📉',
    }
    const duration = Math.round((Date.now() - stats.startTime) / 1000)

    let bonusHtml = ''
    if (stats.freeSpinBonuses > 0) {
      bonusHtml += `
        <span class="hof-session-grid-label" style="color:var(--hof-color-pink)">🎁 Free Spins:</span>
        <span class="hof-session-grid-value" style="color:var(--hof-color-pink)">${stats.freeSpinBonuses}× (+${window.HofUtils?.formatNumber(stats.freeSpinWins) || 0})</span>
      `
    }
    if (stats.starSpinBonuses > 0) {
      bonusHtml += `
        <span class="hof-session-grid-label" style="color:var(--hof-color-gold)">⭐ Star Spins:</span>
        <span class="hof-session-grid-value" style="color:var(--hof-color-gold)">${stats.starSpinBonuses}× (+${window.HofUtils?.formatNumber(stats.starSpinWins) || 0})</span>
      `
    }

    return `
      <div class="hof-session-complete">
        <div class="hof-session-title">📊 Session Complete</div>
        <div class="hof-session-grid">
          <span class="hof-session-grid-label">Spins:</span>
          <span class="hof-session-grid-value">${stats.totalSpins}</span>
          <span class="hof-session-grid-label">Duration:</span>
          <span class="hof-session-grid-value">${window.HofUtils?.formatDuration(duration) || duration + 's'}</span>
          <span class="hof-session-grid-label">Won:</span>
          <span class="hof-session-grid-value">${window.HofUtils?.formatNumber(stats.totalWins) || stats.totalWins}</span>
          ${bonusHtml}
        </div>
        <div class="hof-session-profit ${profitInfo.className}">
          ${profitInfo.emoji} ${profitInfo.text}
        </div>
      </div>
    `
  }

  /**
   * Render last spin result
   * @param {number} spinWin - Win amount
   * @returns {string} HTML string
   */
  function renderLastSpin(spinWin) {
    if (spinWin > 0) {
      return `<span style="color:var(--hof-color-gold)">🎉 Won ${window.HofUtils?.formatNumber(spinWin) || spinWin}</span>`
    }
    return `<span style="color:var(--hof-text-muted)">No win</span>`
  }

  /**
   * Render debug lines
   * @param {object} debugInfo - Debug information
   * @returns {string} Plain text debug info
   */
  function renderDebugLines(debugInfo) {
    const lines = [
      `=== Last Spin Detection ===`,
      `Keys: ${debugInfo.gameInfoKeys?.join(', ') || 'N/A'}`,
      ``,
      `Starts: ${debugInfo.starts !== undefined ? debugInfo.starts : 'undefined'}`,
      `StartsToken: ${debugInfo.startsToken || 'N/A'}`,
      ``,
      `Detected: ${debugInfo.detected || 'None'}`,
      `Spins: ${debugInfo.spins || 0}`,
    ]

    if (debugInfo.error) {
      lines.push(``, `ERROR: ${debugInfo.error}`)
    }

    return lines.join('\n')
  }

  // Export to window
  window.HofMainSpinStats = {
    renderLiveStats,
    renderFinalStats,
    renderLastSpin,
    renderDebugLines,
  }
})()
