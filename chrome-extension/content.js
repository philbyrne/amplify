// Amplify — content script
// Injected into all pages. Listens for SHOW_AMPLIFY_POPUP messages from the background
// service worker and renders a dismissable top-right toast.

const POPUP_ID = 'amplify-woo-popup'
const APP_URL  = 'https://amplify-red.vercel.app'

// Each entry: { text, btn }
// {X} = count, {s} = "" or "s" for plural noun (sharable/sharables)
const COPY_LINES = [
  { text: "Time to feed that network! {X} {sharable} ready to go.",  btn: "NOM!" },
  { text: "{X} {sharable} to pounce on!",                            btn: "Pounce!" },
  { text: "That gold jacuzzi isn't going to buy itself!",            btn: "Let's bubble up!" },
  { text: "Pump up the shares!",                                     btn: "Pump it up!" },
  { text: "{X} new {sharable}! Sharing is...",                       btn: "Caring?" },
  { text: "Aww, push it!",                                           btn: "Push it real good!" },
  { text: "{X} new {sharable} to amplify!",                         btn: "LFG!" },
]

function buildCopy(count) {
  const line = COPY_LINES[Math.floor(Math.random() * COPY_LINES.length)]
  const sharable = count === 1 ? 'sharable' : 'sharables'
  const text = line.text.replace(/\{X\}/g, count).replace(/\{sharable\}/g, sharable)
  return { text, btn: line.btn }
}

function injectStyles() {
  if (document.getElementById('amplify-styles')) return
  const style = document.createElement('style')
  style.id = 'amplify-styles'
  style.textContent = `
    #amplify-woo-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      width: 320px;
      background: #161b27;
      border: 1px solid #21293d;
      border-left: 3px solid #f97316;
      border-radius: 14px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #f0f0f4;
      overflow: hidden;
      animation: amplify-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    #amplify-woo-popup.amplify-hiding {
      animation: amplify-slide-out 0.25s ease-in forwards;
    }
    @keyframes amplify-slide-in {
      from { opacity: 0; transform: translateX(24px) scale(0.97); }
      to   { opacity: 1; transform: translateX(0)   scale(1); }
    }
    @keyframes amplify-slide-out {
      from { opacity: 1; transform: translateX(0)   scale(1); }
      to   { opacity: 0; transform: translateX(24px) scale(0.97); }
    }
    #amplify-woo-popup .amp-inner {
      padding: 14px 16px 16px;
    }
    #amplify-woo-popup .amp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    #amplify-woo-popup .amp-logo {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #f97316;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    #amplify-woo-popup .amp-logo-bolt {
      font-size: 15px;
      line-height: 1;
    }
    #amplify-woo-popup .amp-dismiss {
      background: none;
      border: none;
      cursor: pointer;
      color: #6b7280;
      font-size: 16px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 0.12s, background 0.12s;
    }
    #amplify-woo-popup .amp-dismiss:hover {
      color: #f0f0f4;
      background: rgba(255,255,255,0.06);
    }
    #amplify-woo-popup .amp-copy {
      font-size: 13px;
      line-height: 1.5;
      color: #d1d5db;
      margin-bottom: 14px;
    }
    #amplify-woo-popup .amp-cta {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f97316;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: opacity 0.12s;
      letter-spacing: 0.01em;
    }
    #amplify-woo-popup .amp-cta:hover { opacity: 0.88; }
  `
  document.head.appendChild(style)
}

function showPopup(count) {
  // Don't double-show
  if (document.getElementById(POPUP_ID)) return

  injectStyles()

  const { text, btn } = buildCopy(count)

  const popup = document.createElement('div')
  popup.id = POPUP_ID
  popup.innerHTML = `
    <div class="amp-inner">
      <div class="amp-header">
        <div class="amp-logo"><span class="amp-logo-bolt">⚡</span> Amplify</div>
        <button class="amp-dismiss" aria-label="Dismiss">✕</button>
      </div>
      <p class="amp-copy">${text}</p>
      <a class="amp-cta" href="${APP_URL}/feed" target="_blank" rel="noopener">
        ${btn}
      </a>
    </div>
  `

  document.body.appendChild(popup)

  // Dismiss on × click
  popup.querySelector('.amp-dismiss').addEventListener('click', () => dismiss(popup))

  // Dismiss on CTA click (after a tiny delay so the tab opens)
  popup.querySelector('.amp-cta').addEventListener('click', () => {
    setTimeout(() => dismiss(popup), 300)
  })

  // Auto-dismiss after 12 seconds
  const autoTimer = setTimeout(() => dismiss(popup), 12000)
  popup._autoTimer = autoTimer
}

function dismiss(popup) {
  if (!popup || popup._dismissing) return
  popup._dismissing = true
  clearTimeout(popup._autoTimer)
  popup.classList.add('amplify-hiding')
  popup.addEventListener('animationend', () => popup.remove(), { once: true })
}

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_AMPLIFY_POPUP' && typeof msg.count === 'number' && msg.count > 0) {
    showPopup(msg.count)
  }
})

// Listen for share events from the web app and immediately refresh the badge
window.addEventListener('message', (event) => {
  if (event.data?.type === 'AMPLIFY_SHARED') {
    chrome.runtime.sendMessage({ type: 'POLL_NOW' })
  }
})
