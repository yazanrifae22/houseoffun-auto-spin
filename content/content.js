/**
 * House of Fun Helper - Content Script
 * Slim orchestrator for modular UI components
 */

;(function () {
  'use strict'

  console.log(
    '%c[HOF] 🎰 House of Fun Helper v3.0 - Modular UI',
    'background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 16px; padding: 8px 16px; border-radius: 8px;',
  )

  // ============================================
  // STATE
  // ============================================
  let autoSpinActive = false
  let dogAutoSpinActive = false
  let currentSpinTab = 'main' // 'main' or 'dog'
  let currentTab = 'main' // 'main', 'history', or 'debug'

  // ============================================
  // INITIALIZATION
  // ============================================

  // Check status on load
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    autoSpinActive = response?.autoSpinActive || false
    dogAutoSpinActive = response?.dogAutoSpinActive || false
    console.log('[HOF] Status on load: main =', autoSpinActive, '| dog =', dogAutoSpinActive)
  })

  // Create panel after short delay
  setTimeout(initializeUI, 2000)

  // ============================================
  // MESSAGE LISTENER
  // ============================================
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      // Main spin messages
      case 'SPIN_CAPTURED':
        window.HofNotifications?.success('✅ Main spin captured!')
        if (currentSpinTab === 'main') window.HofMainSpin?.updateStatusIndicator(true)
        break

      case 'AUTO_SPIN_STARTED':
        autoSpinActive = true
        if (currentSpinTab === 'main') window.HofMainSpin?.updateUIState(true)
        window.HofNotifications?.info('🚀 Main auto-spin started!')
        break

      case 'AUTO_SPIN_PROGRESS':
        if (currentSpinTab === 'main') window.HofMainSpin?.updateProgress(message)
        break

      case 'AUTO_SPIN_STOPPED':
        autoSpinActive = false
        if (currentSpinTab === 'main') {
          window.HofMainSpin?.updateUIState(false)
          window.HofMainSpin?.showFinalStats(message.stats)
        }
        window.HofNotifications?.warning('🛑 Main auto-spin stopped')
        break

      // Dog spin messages
      case 'DOG_SPIN_CAPTURED':
        window.HofNotifications?.success('✅ Dog spin captured!')
        if (currentSpinTab === 'dog') window.HofDogSpin?.updateStatusIndicator(true)
        break

      case 'DOG_AUTO_SPIN_STARTED':
        dogAutoSpinActive = true
        if (currentSpinTab === 'dog') window.HofDogSpin?.updateUIState(true)
        window.HofNotifications?.info('🦴 Dog auto-spin started!')
        break

      case 'DOG_AUTO_SPIN_PROGRESS':
        if (currentSpinTab === 'dog') window.HofDogSpin?.updateProgress(message)
        break

      case 'DOG_AUTO_SPIN_STOPPED':
        dogAutoSpinActive = false
        if (currentSpinTab === 'dog') {
          window.HofDogSpin?.updateUIState(false)
          window.HofDogSpin?.showFinalStats(message.stats)
        }
        window.HofNotifications?.warning('🛑 Dog auto-spin stopped')
        break

      case 'DOG_LEVEL_UP':
        window.HofNotifications?.success(`🎉 LEVEL UP! ${message.oldLevel} → ${message.newLevel}`)
        break

      case 'DOG_REWARDS_CLAIMED':
        window.HofNotifications?.success('🎁 Level rewards claimed!')
        break

      case 'DOG_NEW_LEVEL_STARTED':
        window.HofNotifications?.success(`🌟 New level started! Level ${message.levelData.version}`)
        break

      case 'DEBUG_EVENT':
        if (currentTab === 'debug') window.HofDebug?.addEvent(message.event)
        break

      case 'MINIGAME_DEBUG':
        window.HofMainSpin?.updateDebugPanel(message.debugInfo)
        break

      case 'SHOW_NOTIFICATION':
        window.HofNotifications?.show(message.text, message.style || 'info')
        break
    }
  })

  // ============================================
  // UI INITIALIZATION
  // ============================================
  function initializeUI() {
    window.HofPanel?.create()
    renderCurrentView()
  }

  // ============================================
  // VIEW RENDERING
  // ============================================
  function renderCurrentView() {
    const content = window.HofPanel?.getContentContainer()
    if (!content) return

    // Build tabs
    let html = window.HofTabs?.getHTML(currentTab === 'debug' ? 'debug' : currentSpinTab) || ''

    // Render appropriate view
    if (currentTab === 'main') {
      if (currentSpinTab === 'main') {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
          const hasCaptured = response?.hasCapturedRequest || false
          autoSpinActive = response?.autoSpinActive || false

          content.innerHTML = html + (window.HofMainSpin?.render(hasCaptured, autoSpinActive) || '')

          window.HofMainSpin?.setupHandlers({
            onStartAutoSpin: handleStartAutoSpin,
            onStopAutoSpin: handleStopAutoSpin,
            onShowHistory: () => showHistory('main'),
            onSingleSpin: handleSingleSpin,
            onClearRequests: handleClearRequests,
          })

          window.HofTabs?.setupHandlers(handleTabChange)

          // Restore last progress if available
          const lastProgress = window.HofMainSpin?.getLastProgressData()
          if (lastProgress) window.HofMainSpin?.updateProgress(lastProgress)
        })
        return
      } else {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
          const hasCaptured = response?.hasCapturedDogRequest || false
          dogAutoSpinActive = response?.dogAutoSpinActive || false

          content.innerHTML =
            html + (window.HofDogSpin?.render(hasCaptured, dogAutoSpinActive) || '')

          window.HofDogSpin?.setupHandlers({
            onStartDogAutoSpin: handleStartDogAutoSpin,
            onStopDogAutoSpin: handleStopDogAutoSpin,
            onSingleDogSpin: handleSingleDogSpin,
            onClearDogRequests: handleClearDogRequests,
          })

          window.HofTabs?.setupHandlers(handleTabChange)

          // Restore last progress if available
          const lastProgress = window.HofDogSpin?.getLastProgressData()
          if (lastProgress) window.HofDogSpin?.updateProgress(lastProgress)
        })
        return
      }
    } else if (currentTab === 'debug') {
      content.innerHTML = html + (window.HofDebug?.render(window.HofDebug?.isActive()) || '')
      window.HofDebug?.setupHandlers()
      window.HofTabs?.setupHandlers(handleTabChange)
    } else if (currentTab === 'history') {
      const historyType = currentSpinTab
      chrome.runtime.sendMessage({ type: 'GET_HISTORY', historyType }, (response) => {
        const history = response?.history || []
        content.innerHTML = window.HofHistory?.render(history, historyType) || ''
        window.HofHistory?.setupHandlers({
          onBack: handleBackToMain,
          onClearHistory: () => handleClearHistory(historyType),
        })
      })
      return
    }
  }

  // ============================================
  // TAB HANDLING
  // ============================================
  function handleTabChange(tabId, spinTab) {
    if (tabId === 'debug') {
      currentTab = 'debug'
    } else {
      currentTab = 'main'
      currentSpinTab = spinTab || tabId
    }
    renderCurrentView()
  }

  // ============================================
  // MAIN SPIN HANDLERS
  // ============================================
  function handleStartAutoSpin(config) {
    chrome.runtime.sendMessage({ type: 'START_AUTO_SPIN', config })
  }

  function handleStopAutoSpin() {
    chrome.runtime.sendMessage({ type: 'STOP_AUTO_SPIN' })
  }

  function handleSingleSpin() {
    chrome.runtime.sendMessage({ type: 'REPLAY_SPIN' }, (response) => {
      if (response?.success && response.data?.status === 200) {
        const wins = response.data.data?.result?.gameInfo?.wins || []
        const win = wins.reduce((sum, w) => sum + (w.win || 0), 0)
        window.HofNotifications?.show(
          win > 0 ? `🎉 Won ${window.HofUtils?.formatNumber(win)}!` : 'No win',
          win > 0 ? 'success' : 'info',
        )
      } else {
        window.HofNotifications?.error('Spin failed')
      }
    })
  }

  function handleClearRequests() {
    chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' }, () => {
      window.HofMainSpin?.updateStatusIndicator(false)
      const liveStats = document.getElementById('hof-live-stats')
      if (liveStats)
        liveStats.innerHTML =
          '<div style="color:var(--hof-text-muted);text-align:center;">Cleared! Spin in game to capture.</div>'
      window.HofNotifications?.warning('🗑️ Spin cleared!')
    })
  }

  // ============================================
  // DOG SPIN HANDLERS
  // ============================================
  function handleStartDogAutoSpin(config) {
    chrome.runtime.sendMessage({ type: 'START_DOG_AUTO_SPIN', config })
  }

  function handleStopDogAutoSpin() {
    chrome.runtime.sendMessage({ type: 'STOP_DOG_AUTO_SPIN' })
  }

  function handleSingleDogSpin() {
    chrome.runtime.sendMessage({ type: 'REPLAY_DOG_SPIN' }, (response) => {
      if (response?.success && response.data?.status === 200) {
        const bones = response.data.data?.wheel?.boneAmount || 0
        window.HofNotifications?.success(`🦴 Got ${bones} bones!`)
      }
    })
  }

  function handleClearDogRequests() {
    chrome.runtime.sendMessage({ type: 'CLEAR_DOG_REQUESTS' }, () => {
      window.HofDogSpin?.updateStatusIndicator(false)
      const liveStats = document.getElementById('hof-dog-live-stats')
      if (liveStats)
        liveStats.innerHTML =
          '<div style="color:var(--hof-text-muted);text-align:center;">Cleared! Spin dog wheel to capture.</div>'
      window.HofNotifications?.warning('🗑️ Dog spin cleared!')
    })
  }

  // ============================================
  // HISTORY HANDLERS
  // ============================================
  function showHistory(type) {
    currentTab = 'history'
    renderCurrentView()
  }

  function handleBackToMain() {
    currentTab = 'main'
    renderCurrentView()
  }

  function handleClearHistory(historyType) {
    chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY', historyType }, () => {
      window.HofNotifications?.info('History cleared')
      renderCurrentView()
    })
  }

  // ============================================
  // DEBUG STATS UPDATER
  // ============================================
  setInterval(() => {
    if (currentTab === 'debug' && window.HofDebug?.isActive()) {
      window.HofDebug?.updateDebugStats()
    }
  }, 1000)
})()
