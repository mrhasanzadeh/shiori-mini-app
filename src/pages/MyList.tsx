import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import { Edit02Icon, FavouriteIcon, Search01Icon, StarIcon } from 'hugeicons-react'
import FavoriteAnimeEditor from '../components/FavoriteAnimeEditor'
import { useUserAnimeList } from '../hooks/useUserAnimeList'
import { useAppAuth } from '../hooks/useAppAuth'
import { Button } from '@/components/ui/button'
import AnimePrefetchLink from '../components/AnimePrefetchLink'
import { BidiText } from '../components/BidiText'
import { useFavoriteAnimeDetailsQueries } from '../hooks/queries/useAnimeQueries'
import emptyListImage from '../assets/images/frieren-03.webp'
import type { GenreItem } from '../types/catalog'
import type { FavoriteProgress } from '../store/animeStore'
import { animeDetailPath } from '../lib/animePaths'
import { formatUserListSaveError } from '../services/userListErrors'
import { cn } from '@/lib/utils'

type FavoriteAnime = {
  id: number | string
  slug?: string | null
  title: string
  image: string
  episodesCount: number
  genres: GenreItem[]
}

type ViewMode = 'grid' | 'list'

const VIEW_STORAGE_KEY = 'my_list_view'

const readStoredView = (): ViewMode => {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored === 'grid' || stored === 'list') return stored
  } catch {
    // ignore
  }
  return 'grid'
}

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

const genreLabel = (g: GenreItem) => g.name_fa || g.name_en || g.slug

const getWatchPercent = (progress: FavoriteProgress, maxEpisodes: number) =>
  Math.min(100, Math.round((progress.episodesWatched / maxEpisodes) * 100))

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

const SkeletonGrid = () => (
  <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
    ))}
  </div>
)

const SkeletonList = () => (
  <div className="space-y-2 px-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="animate-pulse flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3">
        <div className="h-16 w-11 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-1.5 bg-muted rounded w-full" />
        </div>
      </div>
    ))}
  </div>
)

const EditProgressButton = ({
  title,
  onClick,
  className,
  overlay = false,
}: {
  title: string
  onClick: () => void
  className?: string
  overlay?: boolean
}) => (
  <button
    type="button"
    className={cn(
      'shrink-0 rounded-lg border border-border/80 bg-background/85 text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-foreground',
      overlay ? 'absolute top-2 right-2 z-10 p-1.5' : 'p-1.5',
      className
    )}
    aria-label={`ویرایش پیشرفت ${title}`}
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }}
  >
    <Edit02Icon className="w-3.5 h-3.5" />
  </button>
)

const FavoriteGridCard = ({
  anime,
  onEdit,
}: {
  anime: FavoriteAnime
  progress: FavoriteProgress
  onEdit: () => void
}) => {
  const genres = anime.genres.slice(0, 3)
  const maxEpisodes = Math.max(anime.episodesCount, 1)

  return (
    <div className="relative">
      <AnimePrefetchLink
        animeId={anime.id}
        to={animeDetailPath(anime)}
        className="group block active:scale-[0.98] transition-transform"
        aria-label={`مشاهده ${anime.title}`}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
          <img
            src={anime.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-2.5 pt-10">
            <BidiText as="h3" className="text-xs font-semibold text-left text-white line-clamp-1 leading-2">
              {anime.title}
            </BidiText>
            {genres.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1 justify-end">
                {genres.map((g) => (
                  <span
                    key={g.slug}
                    className="text-[9px] leading-none px-1 py-0.5 rounded-md bg-white/15 text-white/90 border border-white/10 max-w-full truncate"
                  >
                    {genreLabel(g)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-white/60 tabular-nums">
                {toPersianNumber(maxEpisodes)} قسمت
              </p>
            )}
          </div>
        </div>
      </AnimePrefetchLink>

      <EditProgressButton title={anime.title} onClick={onEdit} overlay />
    </div>
  )
}

const FavoriteListRow = ({
  anime,
  progress,
  onEdit,
}: {
  anime: FavoriteAnime
  progress: FavoriteProgress
  onEdit: () => void
}) => {
  const genres = anime.genres.slice(0, 3)
  const maxEpisodes = Math.max(anime.episodesCount, 1)
  const watchPercent = getWatchPercent(progress, maxEpisodes)
  const hasProgress = progress.episodesWatched > 0 || progress.userRating != null

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card/60 p-2">
      <div className="relative h-full w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        <img src={anime.image} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <AnimePrefetchLink
          animeId={anime.id}
          to={animeDetailPath(anime)}
          className="block active:scale-[0.99] transition-transform"
          aria-label={`مشاهده ${anime.title}`}
        >
          <BidiText as="p" className="text-sm font-semibold text-foreground line-clamp-1 leading-6">
            {anime.title}
          </BidiText>
        </AnimePrefetchLink>

        <div className="flex items-center justify-between gap-2">
          <AnimePrefetchLink
            animeId={anime.id}
            to={animeDetailPath(anime)}
            className="min-w-0 flex-1 active:scale-[0.99] transition-transform"
          >
            {genres.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {genres.map((g) => (
                  <span
                    key={g.slug}
                    className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
                  >
                    {genreLabel(g)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {progress.episodesWatched > 0
                  ? `${toPersianNumber(progress.episodesWatched)}/${toPersianNumber(maxEpisodes)} قسمت`
                  : `${toPersianNumber(maxEpisodes)} قسمت`}
              </p>
            )}
          </AnimePrefetchLink>

          <Button
            type="button"
            size="xs"
            variant="secondary"
            className="h-6 shrink-0 gap-1 px-2 text-[10px]"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onEdit()
            }}
          >
            <Edit02Icon className="h-3 w-3" />
            ویرایش
          </Button>
        </div>

        <AnimePrefetchLink
          animeId={anime.id}
          to={animeDetailPath(anime)}
          className="block space-y-1.5 active:scale-[0.99] transition-transform"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {progress.episodesWatched > 0 && genres.length > 0 && (
              <span className="tabular-nums">
                {toPersianNumber(progress.episodesWatched)}/{toPersianNumber(maxEpisodes)} قسمت
              </span>
            )}
            {progress.userRating != null && (
              <span className="inline-flex items-center gap-0.5 text-amber-300 tabular-nums">
                <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                {toPersianNumber(progress.userRating)}
              </span>
            )}
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            {hasProgress && (
              <div
                className="h-full rounded-full bg-primary-400 transition-all duration-300"
                style={{ width: `${watchPercent}%` }}
              />
            )}
          </div>
        </AnimePrefetchLink>
      </div>
    </div>
  )
}

const MyList = () => {
  const { showAlert, isReady, inTelegram, isAuthenticated } = useAppAuth()
  const {
    favoriteAnime,
    getProgress,
    saveProgress,
    toggleFavorite,
    isSaving,
    stats,
  } = useUserAnimeList()

  const [editingAnime, setEditingAnime] = useState<FavoriteAnime | null>(null)
  const [view, setView] = useState<ViewMode>(() => readStoredView())

  const detailQueries = useFavoriteAnimeDetailsQueries(favoriteAnime)

  const loading =
    favoriteAnime.length > 0 && detailQueries.some((query) => query.isLoading || query.isFetching)
  const hasError = detailQueries.some((query) => query.isError)

  const items = useMemo((): FavoriteAnime[] => {
    return detailQueries
      .map((query) => query.data)
      .filter((details): details is NonNullable<typeof details> => details != null)
      .map((details) => ({
        id: details.id,
        slug: details.slug ?? null,
        title: details.title,
        image: details.image,
        episodesCount:
          typeof details.episodes_count === 'number' && details.episodes_count > 0
            ? details.episodes_count
            : details.episodes.length,
        genres: details.genres ?? [],
      }))
  }, [detailQueries])

  const retry = () => {
    detailQueries.forEach((query) => {
      void query.refetch()
    })
  }

  const isEmpty = !loading && !hasError && favoriteAnime.length === 0

  const onViewChange = (mode: ViewMode) => {
    setView(mode)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode)
    } catch {
      // ignore
    }
  }

  const handleSave = async (progress: { episodesWatched: number; userRating: number | null }) => {
    if (!editingAnime) return
    try {
      await saveProgress(editingAnime.id, progress)
      setEditingAnime(null)
      showAlert('ذخیره شد')
    } catch (e) {
      showAlert(formatUserListSaveError(e))
    }
  }

  const handleRemove = () => {
    if (!editingAnime) return
    toggleFavorite(editingAnime.id)
    setEditingAnime(null)
    showAlert('از علاقه‌مندی‌ها حذف شد')
  }

  const needsWebLogin = !inTelegram && !isAuthenticated

  if (!isReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pb-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-400/30 border-t-primary-400" />
      </div>
    )
  }

  if (needsWebLogin) {
    return (
      <div className="pb-24">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FavouriteIcon className="w-5 h-5 text-red-500 shrink-0" />
            علاقه‌مندی‌ها
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 text-center">
          <img src={emptyListImage} alt="" className="w-44 mb-5 opacity-90" />
          <h2 className="text-base font-semibold text-foreground mb-2">
            اول وارد حساب کاربری‌ات شو <small className="text-xs">＞﹏＜</small>
          </h2>
          <p className="text-sm text-muted-foreground leading-7 max-w-xs mb-6">
            انیمه‌های موردعلاقه‌ات را این‌جا جمع کن،
            <br />
            پیشرفت تماشا را ثبت کن و هر بار از همان‌جا ادامه بده.
          </p>
          <Button
            asChild
            type="button"
            size="lg"
            className="bg-primary-500 text-white font-bold rounded-lg px-8 py-3 hover:bg-primary-500/90"
          >
            <Link to="/profile">ورود به حساب کاربری</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FavouriteIcon className="w-5 h-5 text-red-500 shrink-0" />
              علاقه‌مندی‌ها
            </h1>
            {!isEmpty && !loading && (
              <p className="text-xs text-muted-foreground mt-1">
                {toPersianNumber(stats.animeCount)} انیمه
                {stats.episodesWatched > 0
                  ? ` · ${toPersianNumber(stats.episodesWatched)} قسمت دیده‌شده`
                  : ''}
              </p>
            )}
          </div>

          {!isEmpty && (
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                <ViewToggleButton
                  active={view === 'grid'}
                  onClick={() => onViewChange('grid')}
                  label="گرید"
                >
                  <LayoutGrid className="h-4 w-4" />
                </ViewToggleButton>
                <ViewToggleButton
                  active={view === 'list'}
                  onClick={() => onViewChange('list')}
                  label="لیست"
                >
                  <List className="h-4 w-4" />
                </ViewToggleButton>
              </div>
                <Button asChild type="button" size="sm" variant="outline" className="gap-1.5 w-10 h-10">
                  <Link to="/search">
                    <Search01Icon className="h-5 w-5" />
                    <span className="hidden sm:inline">جستجو</span>
                  </Link>
                </Button>
            </div>
          )}
        </div>
      </div>

      {loading && (view === 'grid' ? <SkeletonGrid /> : <SkeletonList />)}

      {hasError && (
        <div className="px-4 py-12 text-center space-y-3">
          <p className="text-red-500 text-sm">خطا در بارگذاری علاقه‌مندی‌ها</p>
          <Button type="button" variant="secondary" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 text-center">
          <img src={emptyListImage} alt="" className="w-44 mb-5 opacity-90" />
          <h2 className="text-base font-semibold text-foreground mb-2">
            لیست علاقه‌مندی‌هات خالیه <small className="text-xs">＞﹏＜</small>
          </h2>
          <p className="text-sm text-muted-foreground leading-7 max-w-xs mb-6">
            در صفحهٔ جزئیات هر انیمه، با زدن دکمهی
            <br />
            قلب انیمه رو این‌جا ذخیره کن.
          </p>
          <Button
            asChild
            type="button"
            size="lg"
            className="bg-primary-500 text-white font-bold rounded-lg px-6 py-3 hover:bg-primary-500/90"
          >
            <Link to="/search">مرور انیمه‌ها</Link>
          </Button>
        </div>
      )}

      {!loading && !hasError && items.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-4 pt-2">
          {items.map((anime) => (
            <FavoriteGridCard
              key={anime.id}
              anime={anime}
              progress={getProgress(anime.id)}
              onEdit={() => setEditingAnime(anime)}
            />
          ))}
        </div>
      )}

      {!loading && !hasError && items.length > 0 && view === 'list' && (
        <div className="space-y-2 px-4 pt-2">
          {items.map((anime) => (
            <FavoriteListRow
              key={anime.id}
              anime={anime}
              progress={getProgress(anime.id)}
              onEdit={() => setEditingAnime(anime)}
            />
          ))}
        </div>
      )}

      {editingAnime && (
        <FavoriteAnimeEditor
          open={Boolean(editingAnime)}
          onOpenChange={(open) => {
            if (!open) setEditingAnime(null)
          }}
          title={editingAnime.title}
          image={editingAnime.image}
          episodesCount={editingAnime.episodesCount}
          progress={getProgress(editingAnime.id)}
          saving={isSaving}
          onSave={handleSave}
          onRemove={handleRemove}
        />
      )}
    </div>
  )
}

export default MyList
