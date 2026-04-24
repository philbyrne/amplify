export function generateUtmCode(
  userId: string,
  packageId: string,
  platform: string
): string {
  const shortUser = userId.slice(0, 8)
  const shortPkg = packageId.slice(0, 8)
  return `amp_${platform}_${shortUser}_${shortPkg}_${Date.now()}`
}

export function buildShareUrl(originalUrl: string, utmCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const shareUrl = originalUrl || `${base}/`
  try {
    const url = new URL(shareUrl)
    url.searchParams.set('utm_source', 'amplify')
    url.searchParams.set('utm_medium', 'social')
    url.searchParams.set('utm_campaign', 'employee_advocacy')
    url.searchParams.set('utm_content', utmCode)
    return url.toString()
  } catch {
    return shareUrl
  }
}

export function buildLinkedInShareUrl(copy: string, url?: string): string {
  const params = new URLSearchParams()
  if (url) params.set('url', url)
  params.set('summary', copy)
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`
}

export function buildXShareUrl(copy: string): string {
  const params = new URLSearchParams()
  params.set('text', copy)
  return `https://twitter.com/intent/tweet?${params.toString()}`
}
