const APP_URL      = 'https://amplify-red.vercel.app'
const POLL_ALARM   = 'pollMoments'
const POLL_MINUTES = 1  // Chrome alarm minimum — keeps badge & list fresh

// ── Setup ──────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES })
  pollMoments()
})

chrome.runtime.onStartup.addListener(() => {
  pollMoments()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) pollMoments()
})

// ── Auth: watch for token in URL after extension-auth page loads ───────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  try {
    const url = new URL(tab.url)
    if (
      url.origin === APP_URL &&
      url.pathname === '/extension-auth' &&
      url.searchParams.has('token')
    ) {
      const token = url.searchParams.get('token')
      if (token) {
        await chrome.storage.sync.set({ authToken: token })
        chrome.tabs.remove(tabId)
        await pollMoments()
      }
    }
  } catch { /* malformed URL — ignore */ }
})

// ── Polling ────────────────────────────────────────────────────────────────
async function pollMoments() {
  const { authToken } = await chrome.storage.sync.get('authToken')
  if (!authToken) return

  try {
    const res = await fetch(`${APP_URL}/api/moments?view=active`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    if (res.status === 401) {
      await chrome.storage.sync.remove('authToken')
      await chrome.storage.local.remove(['cachedMoments', 'seenMomentIds'])
      chrome.action.setBadgeText({ text: '' })
      return
    }
    if (!res.ok) return

    const moments = await res.json()
    if (!Array.isArray(moments)) return

    const now = Date.now()

    // ── Track new moments ──────────────────────────────────────────────────
    const { seenMomentIds = [] } = await chrome.storage.local.get('seenMomentIds')

    const currentIds = moments.map((m) => m.id)
    const brandNewIds = currentIds.filter((id) => !seenMomentIds.includes(id))

    await chrome.storage.local.set({
      cachedMoments: moments,
      seenMomentIds: [...new Set([...seenMomentIds, ...currentIds])],
      lastFetch: now,
    })

    // Badge count
    chrome.action.setBadgeText({ text: moments.length > 0 ? String(moments.length) : '' })
    chrome.action.setBadgeBackgroundColor({ color: '#f97316' })

    // ── Chrome notifications for all new moments ──────────────────────────
    for (const m of moments.filter((m) => brandNewIds.includes(m.id))) {
      const priority = m.parsed_content?.priority ?? 1
      chrome.notifications.create(m.id, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: priority === 3 ? '🔥 High-Priority Sharing Moment!' : priority === 2 ? '⚡ New Sharing Moment' : '💡 New Sharing Moment',
        message: m.title,
        priority: priority === 3 ? 2 : priority === 2 ? 1 : 0,
        requireInteraction: priority === 3,
        buttons: [{ title: 'Share Now →' }],
      })
    }

    // ── In-page popup triggers ─────────────────────────────────────────────
    const shouldShowForNewMoments = brandNewIds.length > 0
    const shouldShowForMonday    = await checkMondayTrigger()

    if (shouldShowForNewMoments || shouldShowForMonday) {
      await sendPopupToActiveTab(moments.length)
    }
  } catch (err) {
    console.error('[Amplify] Poll error', err)
  }
}

// ── Monday weekly trigger ──────────────────────────────────────────────────
async function checkMondayTrigger() {
  const today = new Date()
  if (today.getDay() !== 1) return false   // not Monday

  const weekKey = getMondayWeekKey(today)
  const { lastMondayPopupWeek } = await chrome.storage.local.get('lastMondayPopupWeek')
  if (lastMondayPopupWeek === weekKey) return false  // already shown this Monday

  await chrome.storage.local.set({ lastMondayPopupWeek: weekKey })
  return true
}

function getMondayWeekKey(date) {
  // ISO week: year + week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo}`
}

// ── Send in-page popup to the current active tab ───────────────────────────
async function sendPopupToActiveTab(count) {
  if (count <= 0) return
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue
      // Only inject into real web pages (not chrome:// or extension pages)
      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) continue
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_AMPLIFY_POPUP', count })
      } catch {
        // Content script not yet loaded on this tab — use scripting API as fallback
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          })
          await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_AMPLIFY_POPUP', count })
        } catch { /* give up gracefully */ }
      }
    }
  } catch (err) {
    console.error('[Amplify] sendPopupToActiveTab error', err)
  }
}

// ── Notifications ──────────────────────────────────────────────────────────
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: `${APP_URL}/feed?moment=${notificationId}` })
  chrome.notifications.clear(notificationId)
})
chrome.notifications.onButtonClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: `${APP_URL}/feed?moment=${notificationId}` })
  chrome.notifications.clear(notificationId)
})

// ── Message bus (popup ↔ background) ──────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'GET_STATE': {
      Promise.all([
        chrome.storage.sync.get('authToken'),
        chrome.storage.local.get(['cachedMoments', 'lastFetch']),
      ]).then(([sync, local]) => {
        sendResponse({
          authed: !!sync.authToken,
          moments: local.cachedMoments || [],
          lastFetch: local.lastFetch || null,
        })
      })
      return true
    }
    case 'POLL_NOW': {
      pollMoments().then(() => sendResponse({ ok: true }))
      return true
    }
    case 'OPEN_SHARE': {
      chrome.tabs.create({ url: `${APP_URL}/feed?moment=${msg.momentId}` })
      sendResponse({ ok: true })
      break
    }
    case 'OPEN_AUTH': {
      chrome.tabs.create({ url: `${APP_URL}/extension-auth` })
      sendResponse({ ok: true })
      break
    }
    case 'SIGN_OUT': {
      Promise.all([
        chrome.storage.sync.remove('authToken'),
        chrome.storage.local.remove([
          'cachedMoments', 'seenMomentIds', 'lastFetch', 'lastMondayPopupWeek',
        ]),
      ]).then(() => {
        chrome.action.setBadgeText({ text: '' })
        sendResponse({ ok: true })
      })
      return true
    }
    default:
      sendResponse({ ok: false, error: 'unknown message' })
  }
})
