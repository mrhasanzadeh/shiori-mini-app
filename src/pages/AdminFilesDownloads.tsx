import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Download,
  FileStack,
  HardDrive,
  Search,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import * as filesService from '../services/supabaseFiles'

const BAR_FILL = '#6366f1'

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
  return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
}

const formatNumber = (n: number) => n.toLocaleString('fa-IR')

type SortKey = NonNullable<filesService.GetFilesDownloadStatsParams['sortBy']>

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'downloads', label: 'بیشترین دانلود' },
  { key: 'last_accessed', label: 'آخرین دسترسی' },
  { key: 'file_name', label: 'نام فایل' },
  { key: 'created_at', label: 'تاریخ ایجاد' },
]

const AdminFilesDownloads = () => {
  const [loading, setLoading] = useState(true)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('downloads')
  const [sortDir, setSortDir] =
    useState<filesService.GetFilesDownloadStatsParams['sortDir']>('desc')

  const [page, setPage] = useState(1)
  const pageSize = 15

  const [items, setItems] = useState<filesService.FileDownloadStat[]>([])
  const [total, setTotal] = useState(0)
  const [overview, setOverview] = useState<filesService.FilesDownloadOverview | null>(null)

  const totalPages = useMemo(() => {
    const t = Math.max(0, total)
    return Math.max(1, Math.ceil(t / pageSize))
  }, [total, pageSize])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, sortBy, sortDir])

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const loadOverview = async () => {
    try {
      setOverviewLoading(true)
      const data = await filesService.getFilesDownloadOverview()
      setOverview(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در دریافت خلاصه آمار'
      setError(msg)
      setOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }

  const loadList = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await filesService.getFilesDownloadStats({
        page,
        pageSize,
        query: debouncedQuery,
        sortBy,
        sortDir,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در دریافت لیست فایل‌ها'
      setError(msg)
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortDir, debouncedQuery])

  const onToggleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(col)
    setSortDir(col === 'file_name' ? 'asc' : 'desc')
  }

  const maxDownloadsOnPage = useMemo(() => {
    return Math.max(1, ...items.map((it) => it.downloads))
  }, [items])

  const maxTopDownloads = useMemo(() => {
    return Math.max(1, ...(overview?.topFiles ?? []).map((f) => f.downloads))
  }, [overview?.topFiles])

  const activePercent = useMemo(() => {
    if (!overview || overview.totalFiles === 0) return 0
    return Math.round((overview.activeFiles / overview.totalFiles) * 100)
  }, [overview])

  const avgDownloads = overview && overview.totalFiles > 0
    ? Math.round(overview.totalDownloads / overview.totalFiles)
    : 0

  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl space-y-6 text-start">
      <header className="space-y-1">
        <Link
          to="/admin"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowRight className="h-4 w-4 shrink-0" />
          داشبورد
        </Link>
        <h1 className="text-foreground flex items-center gap-2 text-xl font-bold">
          <Download className="h-5 w-5 shrink-0 text-primary-400" />
          آمار دانلود فایل‌ها
        </h1>
        <p className="text-muted-foreground text-sm">
          نمای کلی دانلودها، پرطرفدارترین فایل‌ها و جزئیات هر فایل
        </p>
      </header>

      {error ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="کل فایل‌ها"
          value={overview?.totalFiles ?? 0}
          icon={FileStack}
          loading={overviewLoading}
        />
        <StatCard
          label="مجموع دانلودها"
          value={overview?.totalDownloads ?? 0}
          icon={TrendingUp}
          loading={overviewLoading}
          accent="primary"
        />
        <StatCard
          label="میانگین دانلود"
          value={avgDownloads}
          icon={Download}
          loading={overviewLoading}
        />
        <StatCard
          label="فایل فعال"
          value={overview?.activeFiles ?? 0}
          icon={HardDrive}
          loading={overviewLoading}
          suffix={overview ? ` / ${formatNumber(overview.totalFiles)}` : undefined}
          accent="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">۱۰ فایل پردانلود</CardTitle>
            <p className="text-muted-foreground text-xs">نمای کلی — مستقل از جستجوی پایین</p>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <p className="text-muted-foreground py-16 text-center text-sm">در حال بارگذاری نمودار...</p>
            ) : (overview?.topFiles ?? []).length === 0 ? (
              <p className="text-muted-foreground py-16 text-center text-sm">داده‌ای برای نمایش نیست</p>
            ) : (
              <TopDownloadsBars files={overview!.topFiles} maxDownloads={maxTopDownloads} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">وضعیت فایل‌ها</CardTitle>
            <p className="text-muted-foreground text-xs">نمای کلی — مستقل از جستجو</p>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <p className="text-muted-foreground py-16 text-center text-sm">در حال بارگذاری...</p>
            ) : !overview || overview.totalFiles === 0 ? (
              <p className="text-muted-foreground py-16 text-center text-sm">داده‌ای نیست</p>
            ) : (
              <FileStatusBreakdown overview={overview} activePercent={activePercent} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در نام، کلید یا کپشن..."
              className="pe-9"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {loading
              ? '…'
              : debouncedQuery
                ? `${formatNumber(total)} نتیجه (فیلترشده)`
                : `${formatNumber(total)} فایل`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sortOptions.map((opt) => {
            const active = sortBy === opt.key
            return (
              <Button
                key={opt.key}
                type="button"
                size="sm"
                variant={active ? 'default' : 'secondary'}
                className="gap-1"
                onClick={() => onToggleSort(opt.key)}
              >
                {opt.label}
                {active ? (
                  sortDir === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )
                ) : null}
              </Button>
            )
          })}
        </div>

        {loading ? (
          <p className="text-muted-foreground py-12 text-center text-sm">در حال بارگذاری لیست...</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="text-foreground font-medium">فایلی پیدا نشد</p>
            <p className="text-muted-foreground mt-1 text-sm">فیلتر جستجو را تغییر دهید.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const pct = Math.round((it.downloads / maxDownloadsOnPage) * 100)
              return (
                <div
                  key={it.key}
                  className="rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-foreground line-clamp-1 text-sm font-semibold">
                          {it.file_name || it.key}
                        </p>
                        <Badge variant={it.is_active ? 'success' : 'secondary'}>
                          {it.is_active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </div>
                      {it.caption ? (
                        <p className="text-muted-foreground line-clamp-1 text-xs">{it.caption}</p>
                      ) : null}
                      <p className="text-muted-foreground font-mono text-[11px] line-clamp-1 text-end" dir="ltr">
                        {it.key}
                      </p>
                    </div>
                    <div className="text-start sm:text-end">
                      <p className="text-foreground text-lg font-bold tabular-nums">
                        {formatNumber(it.downloads)}
                      </p>
                      <p className="text-muted-foreground text-xs">دانلود</p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-primary-500/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span>حجم: {formatBytes(it.file_size)}</span>
                      <span>ایجاد: {formatDateTime(it.created_at)}</span>
                      <span>آخرین دسترسی: {formatDateTime(it.last_accessed)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-muted-foreground text-xs">
              صفحه {formatNumber(page)} از {formatNumber(totalPages)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                بعدی
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const TopDownloadsBars = ({
  files,
  maxDownloads,
}: {
  files: filesService.FileDownloadStat[]
  maxDownloads: number
}) => (
  <div className="space-y-3">
    {files.map((f) => {
      const label = f.file_name || f.key
      const pct = Math.round((f.downloads / maxDownloads) * 100)
      return (
        <div key={f.key}>
          <div className="mb-1.5 flex items-start justify-between gap-3 text-xs">
            <span className="text-foreground min-w-0 flex-1 font-medium leading-relaxed">
              {label}
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatNumber(f.downloads)}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: BAR_FILL }}
            />
          </div>
        </div>
      )
    })}
  </div>
)

const FileStatusBreakdown = ({
  overview,
  activePercent,
}: {
  overview: filesService.FilesDownloadOverview
  activePercent: number
}) => {
  const inactivePercent = 100 - activePercent

  return (
    <div className="space-y-5">
      <div className="flex h-3 overflow-hidden rounded-full">
        {overview.activeFiles > 0 ? (
          <div
            className="bg-green-400"
            style={{ width: `${activePercent}%` }}
            title={`فعال: ${formatNumber(overview.activeFiles)}`}
          />
        ) : null}
        {overview.inactiveFiles > 0 ? (
          <div
            className="bg-muted-foreground/35"
            style={{ width: `${inactivePercent}%` }}
            title={`غیرفعال: ${formatNumber(overview.inactiveFiles)}`}
          />
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/20 px-3 py-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-green-300">{activePercent}٪</p>
          <p className="text-muted-foreground mt-1 text-xs">
            فعال · {formatNumber(overview.activeFiles)}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{inactivePercent}٪</p>
          <p className="text-muted-foreground mt-1 text-xs">
            غیرفعال · {formatNumber(overview.inactiveFiles)}
          </p>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  loading,
  accent,
  suffix,
}: {
  label: string
  value: number
  icon: typeof Download
  loading?: boolean
  accent?: 'primary' | 'success'
  suffix?: string
}) => (
  <div className="rounded-xl border bg-card px-4 py-3">
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <p
      className={cn(
        'mt-1 text-2xl font-bold tabular-nums',
        accent === 'primary' && 'text-primary-300',
        accent === 'success' && 'text-green-300'
      )}
    >
      {loading ? '…' : formatNumber(value)}
      {!loading && suffix ? (
        <span className="text-muted-foreground text-sm font-normal">{suffix}</span>
      ) : null}
    </p>
  </div>
)

export default AdminFilesDownloads
