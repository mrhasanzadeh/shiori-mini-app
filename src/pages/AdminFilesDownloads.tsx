import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowDown, ArrowUp } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import * as filesService from '../services/supabaseFiles'

const formatBytes = (value: number | null) => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  if (n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  const dp = i === 0 ? 0 : v < 10 ? 2 : 1
  return `${v.toFixed(dp)} ${units[i]}`
}

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fa-IR')
}

const AdminFilesDownloads = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] =
    useState<filesService.GetFilesDownloadStatsParams['sortBy']>('downloads')
  const [sortDir, setSortDir] =
    useState<filesService.GetFilesDownloadStatsParams['sortDir']>('desc')

  const [page, setPage] = useState(1)
  const pageSize = 20

  const [items, setItems] = useState<filesService.FileDownloadStat[]>([])
  const [total, setTotal] = useState(0)

  const totalPages = useMemo(() => {
    const t = Math.max(0, total)
    return Math.max(1, Math.ceil(t / pageSize))
  }, [total, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const reload = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await filesService.getFilesDownloadStats({
        page,
        pageSize,
        query,
        sortBy,
        sortDir,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در دریافت آمار دانلود'
      setError(msg)
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortDir])

  const onSearch = async () => {
    setPage(1)
    await reload()
  }

  const onToggleSort = (col: filesService.GetFilesDownloadStatsParams['sortBy']) => {
    setPage(1)
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(col)
    setSortDir('desc')
  }

  const SortIcon = ({ col }: { col: filesService.GetFilesDownloadStatsParams['sortBy'] }) => {
    if (sortBy !== col) return null
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-xl font-bold">آمار دانلود فایل‌ها</h1>
          <p className="text-muted-foreground">لیستی از آمار دانلود فایل‌ها</p>
        </div>
      </div>

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Input
              className="w-1/3"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="کلید / نام فایل / کپشن"
            />
            <Button type="button" variant="secondary" onClick={onSearch} disabled={loading}>
              جستجو
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-2 text-muted-foreground text-sm">در حال بارگذاری...</div>
        ) : items.length === 0 ? (
          <div className="mt-2 text-muted-foreground text-sm">چیزی پیدا نشد</div>
        ) : (
          <div className="overflow-hidden border rounded-md">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-right h-10 text-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleSort('file_name')}
                    >
                      نام فایل
                      <span className="mr-1 inline-flex">
                        <SortIcon col="file_name" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right h-10 text-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleSort('key')}
                    >
                      کلید
                      <span className="mr-1 inline-flex">
                        <SortIcon col="key" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right h-10 text-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleSort('downloads')}
                    >
                      دانلودها
                      <span className="mr-1 inline-flex">
                        <SortIcon col="downloads" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right h-10">حجم</TableHead>
                  <TableHead className="text-right h-10">فعال</TableHead>
                  <TableHead className="text-right h-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleSort('created_at')}
                    >
                      ایجاد
                      <span className="mr-1 inline-flex">
                        <SortIcon col="created_at" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right h-10 text-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleSort('last_accessed')}
                    >
                      آخرین دسترسی
                      <span className="mr-1 inline-flex">
                        <SortIcon col="last_accessed" />
                      </span>
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.key} className="h-10">
                    <TableCell className="text-right p-0 px-4">
                      <div className="text-foreground text-sm font-semibold line-clamp-1">
                        {it.file_name || it.key}
                      </div>
                      {it.caption ? (
                        <div className="text-muted-foreground text-xs mt-1 line-clamp-1">
                          {it.caption}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-0 px-4">
                      <div className="break-all line-clamp-2">{it.key}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-0 px-4">
                      {it.downloads}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-0 px-4">
                      {formatBytes(it.file_size)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-0 px-4">
                      {it.is_active ? 'yes' : 'no'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-0 px-4">
                      {formatDateTime(it.created_at)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-0 px-4">
                      {formatDateTime(it.last_accessed)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">مجموع: {total}</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              قبلی
            </Button>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {page} / {totalPages}
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminFilesDownloads
