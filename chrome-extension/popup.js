// ── State ──────────────────────────────────────────────────────────────────
let moments = []
let countdownTimers = []

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  showScreen('loading')

  // Get cached state from background
  const state = await msg('GET_STATE')

  if (!state.authed) {
    showScreen('auth')
    return
  }

  // Show cached data immediately so the popup feels instant
  if (state.moments.length > 0) {
    moments = state.moments
    renderMoments()
    showScreen('main')
  }

  // Always fetch fresh data every time the popup opens — ensures dismissed
  // and shared moments are never shown stale regardless of when last polled
  setRefreshSpinning(true)
  await msg('POLL_NOW')
  const fresh = await msg('GET_STATE')
  moments = fresh.moments || []
  renderMoments()
  setRefreshSpinning(false)
  showScreen('main')
})

// ── Button handlers ────────────────────────────────────────────────────────
document.getElementById('connect-btn').addEventListener('click', () => {
  msg('OPEN_AUTH')
  window.close()
})

document.getElementById('refresh-btn').addEventListener('click', async () => {
  setRefreshSpinning(true)
  await msg('POLL_NOW')
  const state = await msg('GET_STATE')
  moments = state.moments || []
  renderMoments()
  setRefreshSpinning(false)
})

document.getElementById('signout-btn').addEventListener('click', async () => {
  await msg('SIGN_OUT')
  moments = []
  showScreen('auth')
})

// ── Render ─────────────────────────────────────────────────────────────────
function renderMoments() {
  // Clear existing countdown timers
  countdownTimers.forEach(clearInterval)
  countdownTimers = []

  const list = document.getElementById('moments-list')
  const countEl = document.getElementById('active-count')
  const updatedEl = document.getElementById('last-updated')

  const active = moments.filter(
    (m) => m.is_active && new Date(m.expires_at) > new Date()
  )

  countEl.textContent = active.length === 0
    ? 'No active moments'
    : `${active.length} active moment${active.length === 1 ? '' : 's'}`

  updatedEl.textContent = 'Just updated'

  if (active.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚡</div>
        <div class="empty-title">All quiet for now</div>
        <p class="empty-sub">New sharing moments will appear here when they go live. High-priority ones will trigger a notification.</p>
      </div>`
    return
  }

  // Sort: priority 3 first, then by soonest expiry
  const sorted = [...active].sort((a, b) => {
    const pa = a.parsed_content?.priority ?? 1
    const pb = b.parsed_content?.priority ?? 1
    if (pb !== pa) return pb - pa
    return new Date(a.expires_at) - new Date(b.expires_at)
  })

  list.innerHTML = sorted.map((m) => momentCard(m)).join('')

  // Wire share buttons
  list.querySelectorAll('.share-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const momentId = e.currentTarget.dataset.id
      msg('OPEN_SHARE', { momentId })
    })
  })

  // Start live countdowns
  sorted.forEach((m) => {
    const el = document.getElementById(`cd-${m.id}`)
    if (!el) return
    const timer = setInterval(() => {
      const { text, cls, isWoo } = countdownFor(m.expires_at)
      el.textContent = text
      el.className = `countdown ${cls}`
      const woo = document.getElementById(`woo-${m.id}`)
      if (woo) woo.style.display = isWoo ? 'inline' : 'none'
    }, 1000)
    countdownTimers.push(timer)
  })
}

function avatarStack(sharers) {
  if (!sharers || sharers.length === 0) return ''
  const shown = sharers.slice(0, 4)
  const html = shown.map(s => {
    if (s.avatar_url) {
      return `<img class="avatar" src="${escHtml(s.avatar_url)}" alt="${escHtml(s.name || '')}" />`
    }
    const initial = (s.name || '?')[0].toUpperCase()
    return `<div class="avatar-initials">${initial}</div>`
  }).join('')
  return `<div class="avatar-stack">${html}</div>`
}

function momentCard(m) {
  const priority = m.parsed_content?.priority ?? 1
  const shareCount = m.share_count ?? 0
  const sharers = m.sharers || []
  const { text: cdText, cls: cdCls, isWoo } = countdownFor(m.expires_at)

  const bolts = Array.from({ length: priority })
    .map((_, i) => `<span class="b" style="left:${i * 5}px">⚡</span>`)
    .join('')

  const shareCountText = shareCount === 0
    ? 'Be the first to share'
    : `${shareCount} teammate${shareCount === 1 ? '' : 's'} shared`

  return `
    <div class="moment-card priority-${priority}">
      <div class="card-top">
        <div class="card-bolts">${bolts}</div>
        <div class="card-title">${escHtml(m.title)}</div>
      </div>
      <div class="card-meta">
        <div class="card-meta-left">
          <div class="countdown-row">
            <span class="countdown-label">WOO</span>
            <span class="countdown ${cdCls}" id="cd-${m.id}">${cdText}</span>
            <span class="woo-badge" id="woo-${m.id}" style="display:${isWoo ? 'inline' : 'none'}">Urgent</span>
          </div>
          <div class="shares-row">
            ${avatarStack(sharers)}
            <span>${escHtml(shareCountText)}</span>
          </div>
        </div>
        <button class="share-btn" data-id="${m.id}">Share →</button>
      </div>
    </div>`
}

// ── Countdown ──────────────────────────────────────────────────────────────
function countdownFor(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { text: 'Expired', cls: 'urgent', isWoo: false }

  const days    = Math.floor(diff / 86400000)
  const hours   = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  const isWoo    = diff < 48 * 3600000   // < 48h = urgent
  const isSoon   = diff < 5 * 86400000   // < 5d  = amber

  let text
  if (days > 0) {
    text = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  } else {
    text = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  }

  return {
    text,
    cls: isWoo ? 'urgent' : isSoon ? 'soon' : 'ok',
    isWoo,
  }
}

function pad(n) { return String(n).padStart(2, '0') }

// ── Helpers ────────────────────────────────────────────────────────────────
function showScreen(name) {
  document.getElementById('auth-screen').classList.toggle('hidden', name !== 'auth')
  document.getElementById('main-screen').classList.toggle('hidden', name !== 'main')
  document.getElementById('loading-screen').classList.toggle('hidden', name !== 'loading')
}

function setRefreshSpinning(on) {
  document.getElementById('refresh-btn').classList.toggle('spinning', on)
}

function msg(type, extra = {}) {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage({ type, ...extra }, resolve)
  )
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
