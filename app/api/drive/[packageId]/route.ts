import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { listFolderFiles } from '@/lib/google-drive'

const CACHE_DURATION_HOURS = 1

export async function GET(
  _req: NextRequest,
  { params }: { params: { packageId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { packageId } = params
    const supabase = getAdminClient()

    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('drive_folder_url, has_no_files')
      .eq('id', packageId)
      .single()

    if (pkgError || !pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    if (pkg.has_no_files || !pkg.drive_folder_url) {
      return NextResponse.json({ files: [] })
    }

    const cacheThreshold = new Date(
      Date.now() - CACHE_DURATION_HOURS * 60 * 60 * 1000
    ).toISOString()

    const { data: cachedFiles } = await supabase
      .from('drive_files')
      .select('*')
      .eq('package_id', packageId)
      .gte('created_at', cacheThreshold)

    if (cachedFiles && cachedFiles.length > 0) {
      return NextResponse.json({ files: cachedFiles, cached: true })
    }

    try {
      const freshFiles = await listFolderFiles(pkg.drive_folder_url)

      await supabase.from('drive_files').delete().eq('package_id', packageId)

      if (freshFiles.length > 0) {
        const toInsert = freshFiles.map((f) => ({
          package_id: packageId,
          drive_file_id: f.drive_file_id,
          name: f.name,
          mime_type: f.mime_type,
          web_view_link: f.web_view_link,
          thumbnail_link: f.thumbnail_link,
        }))

        const { data: inserted } = await supabase
          .from('drive_files')
          .insert(toInsert)
          .select()

        return NextResponse.json({ files: inserted || toInsert, cached: false })
      }

      return NextResponse.json({ files: [] })
    } catch (driveError) {
      console.error('Drive API error:', driveError)
      return NextResponse.json({ files: [], error: 'Could not fetch Drive files' })
    }
  } catch (err) {
    console.error('GET /api/drive/[packageId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
