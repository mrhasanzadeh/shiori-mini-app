import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Film,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  Star,
} from 'lucide-react'
import * as supa from '../services/supabaseAnime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type FilterKey = 'all' | 'has-episodes' | 'no-episodes' | 'featured'
type ViewMode = 'list' | 'grid'

const VIEW_STORAGE_KEY = 'admin_anime_list_view'

const readStoredView = (): ViewMode => {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored === 'grid' || stored === 'list') return stored
  } catch {
    // ignore
  }
  return 'list'
}

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'has-episodes', label: 'دارای قسمت' },
  { key: 'no-episodes', label: 'بدون قسمت' },
  { key: 'featured', label: 'ویژه' },
]

const formatLabel = (format?: string) => {
  const v = String(format ?? '').trim()
  return v || '—'
}

const AnimeListRow = ({
  anime,
  hasEpisodes,
}: {
  anime: supa.AnimeCard
  hasEpisodes: boolean
}) => {
  const href = `/admin/anime/${encodeURIComponent(String(anime.id))}`

  return (
    <Link
      to={href}
      className="hover:bg-muted/40 group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors"
    >
      <div className="bg-muted relative h-14 w-10 shrink-0 overflow-hidden rounded-md border">
        {anime.image ? (
          <img
            src={anime.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <Film className="h-4 w-4 opacity-50" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-foreground line-clamp-1 text-sm font-semibold">{anime.title}</span>
          {anime.isFeatured ? (
            <Badge variant="default" className="gap-1 border-primary-400/30 bg-primary-600/25">
              <Star className="h-3 w-3" />
              ویژه
            </Badge>
          ) : null}
          {!hasEpisodes ? (
            <Badge variant="secondary" className="gap-1 border-amber-500/30 bg-amber-500/15 text-amber-200">
              <AlertCircle className="h-3 w-3" />
              بدون قسمت
            </Badge>
          ) : null}
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-mono">{formatLabel(anime.format)}</span>
          {anime.year ? <span>{anime.year}</span> : null}
          {anime.studio ? <span className="line-clamp-1">{anime.studio}</span> : null}
          {typeof anime.episodes_count === 'number' ? (
            <span>{anime.episodes_count} قسمت</span>
          ) : null}
        </div>
      </div>

      <ChevronLeft className="text-muted-foreground h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
    </Link>
  )
}

const AnimeGridCard = ({
  anime,
  hasEpisodes,
}: {
  anime: supa.AnimeCard
  hasEpisodes: boolean
}) => {
  const href = `/admin/anime/${encodeURIComponent(String(anime.id))}`

  return (
    <Link
      to={href}
      className="hover:border-primary-400/40 group overflow-hidden rounded-xl border bg-card shadow-sm transition-colors"
    >
      <div className="bg-muted relative aspect-[3/4]">
        {anime.image ? (
          <img
            src={anime.image}
            alt={anime.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <Film className="h-8 w-8 opacity-40" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1 p-2">
          {anime.isFeatured ? (
            <Badge variant="default" className="gap-1 border-primary-400/30 bg-primary-600/80 backdrop-blur-sm">
              <Star className="h-3 w-3" />
              ویژه
            </Badge>
          ) : null}
          {!hasEpisodes ? (
            <Badge variant="secondary" className="gap-1 border-amber-500/40 bg-amber-600/90 text-white backdrop-blur-sm">
              <AlertCircle className="h-3 w-3" />
              بدون قسمت
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <p className="text-foreground line-clamp-2 text-sm font-semibold leading-snug">{anime.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-[10px]">
            {formatLabel(anime.format)}
          </Badge>
          {anime.year ? (
            <span className="text-muted-foreground text-xs">{anime.year}</span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

const AdminAnimeList = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<ViewMode>(() => readStoredView())

  const onViewChange = (mode: ViewMode) => {
    setView(mode)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode)
    } catch {
      // ignore
    }
  }
  const [list, setList] = useState<supa.AnimeCard[]>([])
  const [animeIdsWithEpisodes, setAnimeIdsWithEpisodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await supa.getAllAnime()
        setList(data)
        const withEpisodes = await supa.getAnimeIdsWithAnyEpisodes(data.map((x) => x.id))
        setAnimeIdsWithEpisodes(withEpisodes)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در دریافت لیست انیمه‌ها'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const stats = useMemo(() => {
    const withEpisodes = list.filter((a) => animeIdsWithEpisodes.has(String(a.id))).length
    return {
      total: list.length,
      withEpisodes,
      withoutEpisodes: list.length - withEpisodes,
      featured: list.filter((a) => a.isFeatured).length,
    }
  }, [list, animeIdsWithEpisodes])

  const filtered = useMemo(() => {
    let items = list
    const term = q.trim().toLowerCase()

    if (term) {
      items = items.filter((a) =>
        String(a.title ?? '')
          .toLowerCase()
          .includes(term)
      )
    }

    if (filter === 'has-episodes') {
      items = items.filter((a) => animeIdsWithEpisodes.has(String(a.id)))
    } else if (filter === 'no-episodes') {
      items = items.filter((a) => !animeIdsWithEpisodes.has(String(a.id)))
    } else if (filter === 'featured') {
      items = items.filter((a) => a.isFeatured)
    }

    return items
  }, [q, list, filter, animeIdsWithEpisodes])

  const hasActiveFilters = q.trim().length > 0 || filter !== 'all'

  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl space-y-6 text-start">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/admin"
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowRight className="h-4 w-4 shrink-0" />
            داشبورد
          </Link>
          <h1 className="text-foreground flex items-center gap-2 text-xl font-bold">
            <Film className="h-5 w-5 shrink-0 text-primary-400" />
            انیمه‌ها
          </h1>
          <p className="text-muted-foreground text-sm">
            مرور، جستجو و ویرایش کاتالوگ انیمه
          </p>
        </div>
        <Button asChild size="lg" className="gap-1.5 shrink-0">
          <Link to="/admin/anime/new">
            <Plus className="h-4 w-4 shrink-0" />
            افزودن انیمه
          </Link>
        </Button>
      </header>

      {!loading && !error ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="کل انیمه‌ها" value={stats.total} />
          <StatCard label="دارای قسمت" value={stats.withEpisodes} accent="success" />
          <StatCard
            label="بدون قسمت"
            value={stats.withoutEpisodes}
            accent={stats.withoutEpisodes > 0 ? 'warn' : undefined}
          />
          <StatCard label="ویژه" value={stats.featured} icon={Sparkles} />
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در عنوان..."
              className="pe-9"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border p-1">
            <ViewToggleButton active={view === 'list'} onClick={() => onViewChange('list')} label="لیست">
              <List className="h-4 w-4" />
            </ViewToggleButton>
            <ViewToggleButton active={view === 'grid'} onClick={() => onViewChange('grid')} label="گرید">
              <LayoutGrid className="h-4 w-4" />
            </ViewToggleButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f.key}
              type="button"
              size="sm"
              variant={filter === f.key ? 'default' : 'secondary'}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-16 text-center text-sm">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasAnime={list.length > 0}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setQ('')
            setFilter('all')
          }}
        />
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {filtered.length.toLocaleString('fa-IR')} مورد
            {hasActiveFilters ? ` از ${list.length.toLocaleString('fa-IR')}` : ''}
          </p>

          {view === 'list' ? (
            <div className="space-y-2">
              {filtered.map((a) => (
                <AnimeListRow
                  key={String(a.id)}
                  anime={a}
                  hasEpisodes={animeIdsWithEpisodes.has(String(a.id))}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((a) => (
                <AnimeGridCard
                  key={String(a.id)}
                  anime={a}
                  hasEpisodes={animeIdsWithEpisodes.has(String(a.id))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const StatCard = ({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string
  value: number
  accent?: 'success' | 'warn'
  icon?: typeof Sparkles
}) => (
  <div
    className={cn(
      'rounded-xl border bg-card px-4 py-3',
      accent === 'warn' && value > 0 && 'border-amber-500/30 bg-amber-500/5'
    )}
  >
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </div>
    <p
      className={cn(
        'mt-1 text-2xl font-bold tabular-nums',
        accent === 'success' && 'text-green-300',
        accent === 'warn' && value > 0 && 'text-amber-300'
      )}
    >
      {value.toLocaleString('fa-IR')}
    </p>
  </div>
)

const ViewToggleButton = ({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) => (
  <Button
    type="button"
    size="sm"
    variant={active ? 'secondary' : 'ghost'}
    className="gap-1.5"
    onClick={onClick}
    aria-label={label}
    aria-pressed={active}
  >
    {children}
    <span className="hidden sm:inline">{label}</span>
  </Button>
)

const EmptyState = ({
  hasAnime,
  hasActiveFilters,
  onClearFilters,
}: {
  hasAnime: boolean
  hasActiveFilters: boolean
  onClearFilters: () => void
}) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
    <Film className="text-muted-foreground h-12 w-12 opacity-50" />
    <div className="space-y-1">
      <p className="text-foreground font-medium">
        {hasAnime ? 'نتیجه‌ای پیدا نشد' : 'هنوز انیمه‌ای ثبت نشده'}
      </p>
      <p className="text-muted-foreground max-w-sm text-sm">
        {hasAnime
          ? 'فیلتر یا عبارت جستجو را تغییر دهید.'
          : 'اولین انیمه را اضافه کنید تا کاتالوگ شروع شود.'}
      </p>
    </div>
    {hasActiveFilters ? (
      <Button type="button" variant="secondary" onClick={onClearFilters}>
        پاک کردن فیلترها
      </Button>
    ) : !hasAnime ? (
      <Button asChild>
        <Link to="/admin/anime/new">
          <Plus className="h-4 w-4 shrink-0" />
          افزودن انیمه
        </Link>
      </Button>
    ) : null}
  </div>
)

export default AdminAnimeList
