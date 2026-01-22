/**
 * House of Fun Helper - Notifications Module
 * Toast notification system
 */

;(function () {
  'use strict'

  const NOTIFICATION_DURATION = 3000
  const FADE_DURATION = 300

  /**
   * Show a toast notification
   * @param {string} text - Notification message
   * @param {string} type - Type: 'success', 'warning', 'error', 'info'
   */
  function showNotification(text, type = 'info') {
    const notif = document.createElement('div')
    notif.className = `hof-notification ${type}`
    notif.textContent = text
    document.body.appendChild(notif)

    // Auto-dismiss
    setTimeout(() => {
      notif.style.opacity = '0'
      notif.style.transition = `opacity ${FADE_DURATION}ms ease`
      setTimeout(() => notif.remove(), FADE_DURATION)
    }, NOTIFICATION_DURATION)
  }

  // Export to window
  window.HofNotifications = {
    show: showNotification,
    success: (text) => showNotification(text, 'success'),
    warning: (text) => showNotification(text, 'warning'),
    error: (text) => showNotification(text, 'error'),
    info: (text) => showNotification(text, 'info'),
  }
})()
