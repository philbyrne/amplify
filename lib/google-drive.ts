import { google } from 'googleapis'
import type { DriveFile } from './types'

function getAuth() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')

  const credentials = JSON.parse(serviceAccountJson)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
}

export function extractFolderId(folderUrl: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = folderUrl.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function listFolderFiles(
  folderUrl: string
): Promise<Omit<DriveFile, 'id' | 'package_id'>[]> {
  const folderId = extractFolderId(folderUrl)
  if (!folderId) throw new Error('Invalid Google Drive folder URL')

  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,webViewLink,thumbnailLink)',
    pageSize: 50,
  })

  return (response.data.files || []).map((f) => ({
    drive_file_id: f.id!,
    name: f.name!,
    mime_type: f.mimeType || null,
    web_view_link: f.webViewLink || null,
    thumbnail_link: f.thumbnailLink || null,
  }))
}
