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

/** Whitespace-separated terms; each must appear somewhere in key / file_name / caption. */
const splitFileSearchTokens = (query: string): string[] => {
  return String(query ?? '')
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/,/g, ' ').trim())
    .filter((t) => t.length > 0)
}

const escapeIlikePattern = (token: string): string => {
  return token.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

const fileSearchOrFilter = (token: string): string => {
  const safe = escapeIlikePattern(token)
  return `key.ilike.%${safe}%,file_name.ilike.%${safe}%,caption.ilike.%${safe}%`
}

type FileSearchQuery = {
  or: (filter: string) => FileSearchQuery
  ilike: (column: string, pattern: string) => FileSearchQuery
}

const applyFileSearchFilters = <T extends FileSearchQuery>(
  q: T,
  query: string,
  opts?: { fileNameOnly?: boolean }
): T => {
  const tokens = splitFileSearchTokens(query)
  for (const token of tokens) {
    if (opts?.fileNameOnly) {
      q = q.ilike('file_name', `%${escapeIlikePattern(token)}%`) as T
    } else {
      q = q.or(fileSearchOrFilter(token)) as T
    }
  }
  return q
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
    q = applyFileSearchFilters(q, term)
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

export type FilesDownloadOverview = {
  totalFiles: number
  totalDownloads: number
  activeFiles: number
  inactiveFiles: number
  topFiles: FileDownloadStat[]
}

export const getFilesDownloadOverview = async (): Promise<FilesDownloadOverview> => {
  if (!hasSupabaseConfig) {
    return { totalFiles: 0, totalDownloads: 0, activeFiles: 0, inactiveFiles: 0, topFiles: [] }
  }

  const { count: totalFilesCount, error: countError } = await supabase
    .from('files')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    if (import.meta.env.DEV) console.warn('getFilesDownloadOverview count:', countError.message)
    throw new Error(`خطا در شمارش فایل‌ها: ${countError.message}`)
  }

  const totalFiles = typeof totalFilesCount === 'number' ? totalFilesCount : 0

  let totalDownloads = 0
  let activeFiles = 0
  const pageSize = 1000
  let from = 0

  while (from < totalFiles) {
    const { data, error } = await supabase
      .from('files')
      .select('downloads, is_active')
      .range(from, from + pageSize - 1)

    if (error) {
      if (import.meta.env.DEV) console.warn('getFilesDownloadOverview summary:', error.message)
      throw new Error(`خطا در خواندن خلاصه آمار: ${error.message}`)
    }

    const batch = data || []
    for (const row of batch) {
      const d = typeof row?.downloads === 'number' ? row.downloads : Number(row?.downloads ?? 0) || 0
      totalDownloads += d
      if (row?.is_active) activeFiles += 1
    }

    if (batch.length < pageSize) break
    from += pageSize
  }

  const { data: topData, error: topError } = await supabase
    .from('files')
    .select('key, file_name, caption, file_size, downloads, last_accessed, created_at, is_active')
    .order('downloads', { ascending: false })
    .limit(10)

  if (topError) {
    if (import.meta.env.DEV) console.warn('getFilesDownloadOverview top:', topError.message)
    throw new Error(`خطا در خواندن پردانلودترین فایل‌ها: ${topError.message}`)
  }

  const topFiles: FileDownloadStat[] = (topData || []).map((row: any) => ({
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

  return {
    totalFiles,
    totalDownloads,
    activeFiles,
    inactiveFiles: totalFiles - activeFiles,
    topFiles,
  }
}

const mapFilePickerRows = (data: unknown): FilePickerItem[] =>
  ((data as any[]) || []).map((row: any) => ({
    key: String(row?.key ?? '').trim(),
    file_name: typeof row?.file_name === 'string' ? row.file_name : (row?.file_name ?? null),
    caption: typeof row?.caption === 'string' ? row.caption : (row?.caption ?? null),
    is_active:
      typeof row?.is_active === 'boolean' ? row.is_active : Boolean(row?.is_active ?? true),
  }))

export const searchFilesForPicker = async (payload: {
  query: string
  matchAnyTerms?: string[]
  limit: number
  activeOnly?: boolean
}): Promise<FilePickerItem[]> => {
  if (!hasSupabaseConfig) return []

  const limit = Number.isFinite(payload.limit) && payload.limit > 0 ? payload.limit : 20
  const query = String(payload.query ?? '').trim()
  const extraTerms = [
    ...new Set(
      (payload.matchAnyTerms ?? []).map((t) => String(t ?? '').trim()).filter(Boolean)
    ),
  ]

  if (!query && extraTerms.length === 0) return []

  const fetchMatches = async (searchText: string, fileNameOnly: boolean) => {
    let q = supabase.from('files').select('key, file_name, caption, is_active').limit(limit)

    if (payload.activeOnly) {
      q = q.eq('is_active', true)
    }

    q = applyFileSearchFilters(q, searchText, { fileNameOnly })
    q = q.order('created_at', { ascending: false })

    const { data, error } = await q
    if (error) {
      if (import.meta.env.DEV) console.warn('searchFilesForPicker:', error.message)
      return [] as FilePickerItem[]
    }

    return mapFilePickerRows(data)
  }

  const byKey = new Map<string, FilePickerItem>()

  const addRows = (rows: FilePickerItem[]) => {
    for (const row of rows) {
      if (!byKey.has(row.key)) byKey.set(row.key, row)
      if (byKey.size >= limit) break
    }
  }

  if (query) {
    addRows(await fetchMatches(query, true))
  }

  for (const term of extraTerms) {
    if (byKey.size >= limit) break
    addRows(await fetchMatches(term, true))
  }

  return [...byKey.values()].slice(0, limit)
}
