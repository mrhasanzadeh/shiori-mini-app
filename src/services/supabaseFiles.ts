import { supabase, hasSupabaseConfig } from '../lib/supabase'

export type FileDownloadStat = {
  key: string
  file_name: string | null
  caption: string | null
  file_size: number | null
  downloads: number
  last_accessed: string | null
  created_at: string | null
  is_active: boolean
}

export type GetFilesDownloadStatsParams = {
  page: number
  pageSize: number
  query?: string
  sortBy?: 'downloads' | 'created_at' | 'last_accessed' | 'file_name' | 'key'
  sortDir?: 'asc' | 'desc'
  activeOnly?: boolean
}

export type FilePickerItem = {
  key: string
  file_name: string | null
  caption: string | null
  is_active: boolean
}

export const getFilesDownloadStats = async (
  params: GetFilesDownloadStatsParams
): Promise<{ items: FileDownloadStat[]; total: number }> => {
  if (!hasSupabaseConfig) return { items: [], total: 0 }

  const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1
  const pageSize = Number.isFinite(params.pageSize) && params.pageSize > 0 ? params.pageSize : 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const sortBy = params.sortBy ?? 'downloads'
  const sortDir = params.sortDir ?? 'desc'

  const allowedSort: Record<string, true> = {
    downloads: true,
    created_at: true,
    last_accessed: true,
    file_name: true,
    key: true,
  }

  const orderColumn = allowedSort[sortBy] ? sortBy : 'downloads'

  let q = supabase
    .from('files')
    .select('key, file_name, caption, file_size, downloads, last_accessed, created_at, is_active', {
      count: 'exact',
    })

  if (params.activeOnly) {
    q = q.eq('is_active', true)
  }

  const term = String(params.query ?? '').trim()
  if (term.length > 0) {
    const safe = term.replace(/,/g, ' ')
    q = q.or(`key.ilike.%${safe}%,file_name.ilike.%${safe}%,caption.ilike.%${safe}%`)
  }

  q = q.order(orderColumn, { ascending: sortDir === 'asc' }).range(from, to)

  const { data, error, count } = await q

  if (error) {
    if (import.meta.env.DEV) console.warn('getFilesDownloadStats:', error.message)
    throw new Error(
      `خطا در خواندن جدول files: ${error.message}. ` +
        'اگر در دیتابیس داده دارید ولی چیزی برنمی‌گردد، احتمالاً RLS/Policy اجازه SELECT نمی‌دهد.'
    )
  }

  const items: FileDownloadStat[] = (data || []).map((row: any) => ({
    key: String(row?.key ?? '').trim(),
    file_name: typeof row?.file_name === 'string' ? row.file_name : (row?.file_name ?? null),
    caption: typeof row?.caption === 'string' ? row.caption : (row?.caption ?? null),
    file_size: typeof row?.file_size === 'number' ? row.file_size : (row?.file_size ?? null),
    downloads:
      typeof row?.downloads === 'number' ? row.downloads : Number(row?.downloads ?? 0) || 0,
    last_accessed:
      typeof row?.last_accessed === 'string' ? row.last_accessed : (row?.last_accessed ?? null),
    created_at: typeof row?.created_at === 'string' ? row.created_at : (row?.created_at ?? null),
    is_active:
      typeof row?.is_active === 'boolean' ? row.is_active : Boolean(row?.is_active ?? true),
  }))

  if (import.meta.env.DEV) {
    console.warn('[getFilesDownloadStats]', {
      page,
      pageSize,
      from,
      to,
      sortBy: orderColumn,
      sortDir,
      query: String(params.query ?? '').trim(),
      count,
      items: items.length,
    })
  }

  if (import.meta.env.DEV && items.length === 0 && typeof count === 'number' && count > 0) {
    console.warn(
      `[getFilesDownloadStats] count=${count} but items=[] (page=${page}, pageSize=${pageSize}). ` +
        'احتمالاً range/page خارج از بازه است.'
    )
  }

  if (import.meta.env.DEV && items.length === 0) {
    console.warn(
      '[getFilesDownloadStats] لیست خالی برگشت. اگر در Supabase داده دارید، احتمالاً RLS جلوی خواندن را گرفته.'
    )
  }

  return { items, total: typeof count === 'number' ? count : items.length }
}

export const searchFilesForPicker = async (payload: {
  query: string
  limit: number
  activeOnly?: boolean
}): Promise<FilePickerItem[]> => {
  if (!hasSupabaseConfig) return []

  const limit = Number.isFinite(payload.limit) && payload.limit > 0 ? payload.limit : 20
  const term = String(payload.query ?? '').trim()
  if (!term) return []

  let q = supabase.from('files').select('key, file_name, caption, is_active').limit(limit)

  if (payload.activeOnly) {
    q = q.eq('is_active', true)
  }

  const safe = term.replace(/,/g, ' ')
  q = q
    .or(`key.ilike.%${safe}%,file_name.ilike.%${safe}%,caption.ilike.%${safe}%`)
    .order('created_at', {
      ascending: false,
    })

  const { data, error } = await q
  if (error) {
    if (import.meta.env.DEV) console.warn('searchFilesForPicker:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    key: String(row?.key ?? '').trim(),
    file_name: typeof row?.file_name === 'string' ? row.file_name : (row?.file_name ?? null),
    caption: typeof row?.caption === 'string' ? row.caption : (row?.caption ?? null),
    is_active:
      typeof row?.is_active === 'boolean' ? row.is_active : Boolean(row?.is_active ?? true),
  }))
}
