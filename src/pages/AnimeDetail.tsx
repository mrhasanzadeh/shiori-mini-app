import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AnimePrefetchLink from '../components/AnimePrefetchLink'
import FavoriteAnimeEditor from '../components/FavoriteAnimeEditor'
import {
  FavouriteIcon,
  Clock01Icon,
  Video01Icon,
  Building01Icon,
  Calendar01Icon,
  Calendar02Icon,
  LeftToRightListNumberIcon,
  Download01Icon,
  UserIcon,
  Share08Icon,
} from 'hugeicons-react'
import { ExternalLink, Lock } from 'lucide-react'
import { useAnime } from '../hooks/useAnime'
import { useTelegramApp } from '../hooks/useTelegramApp'
import {
  useAnimeDetailQuery,
  useAnimeFavoriteCountQuery,
  useExternalScoresQuery,
  useSimilarAnimeQuery,
  useTranslatorLinksQuery,
} from '../hooks/queries/useAnimeQueries'
import { prefetchAnimeDetail, prefetchSimilarAnime } from '../hooks/queries/prefetch'
import { formatAnilistPercent } from '../services/externalScores'
import { formatUserListSaveError } from '../services/userListErrors'
import type { GenreItem } from '../services/supabaseAnime'
import {
  buildAnilistUrl,
  buildAnimeMiniAppLink,
  buildImdbUrl,
  buildMalUrl,
  parseAnimeDetailTab,
} from '../utils/externalLinks'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import malLogo from '../assets/images/mal-logo.png'
import alLogo from '../assets/images/anilist-logo.svg'
import imdbLogo from '../assets/images/imdb-logo.svg'

interface Episode {
  id: string | number
  number: number
  title: string
  download_link?: string
  subtitle_link?: string
}

interface SubtitlePack {
  id: string | number
  title?: string
  subtitle_link?: string
}

interface EpisodePack {
  title?: string | null
  download_link?: string | null
}

interface Anime {
  id: number | string
  title: string
  title_romaji?: string | null
  image: string
  featured_image: string
  format?: string
  description: string
  status: string
  airing_status?: string
  genres: GenreItem[]
  episodes: Episode[]
  subtitle_packs?: SubtitlePack[]
  episode_pack?: EpisodePack | null
  episodes_count: number
  averageScore?: number
  animeListScore?: number
  malScore?: number
  imdbScore?: number
  shioriScore?: number
  anilist_id?: number
  mal_id?: number
  imdb_id?: string
  studios: string[]
  studio_links?: Array<{ slug: string; name: string }>
  producers: string[]
  season: string
  year?: number
  startDate: string
  endDate: string
  score?: number
  series?: {
    series_id: string
    title: string
    members: Array<{
      id: string | number
      title: string
      image?: string
      sort_order: number
      label_fa: string | null
    }>
  } | null
}

type TabType = 'info' | 'episodes' | 'similar'
type DownloadTabType = 'episodes' | 'subtitle_packs' | 'translators'

const MAIN_TABS: { id: TabType; label: string }[] = [
  { id: 'info', label: 'اطلاعات' },
  { id: 'episodes', label: 'دانلود' },
  { id: 'similar', label: 'مشابه' },
]

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

const translateStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    RELEASING: 'در حال پخش',
    FINISHED: 'پایان یافته',
    NOT_YET_RELEASED: 'منتشر نشده',
    CANCELLED: 'لغو شده',
    HIATUS: 'متوقف شده',
  }
  return statusMap[status] || status
}

const translateSeason = (season: string) => {
  const seasonMap: Record<string, string> = {
    WINTER: 'زمستان',
    SPRING: 'بهار',
    SUMMER: 'تابستان',
    FALL: 'پاییز',
  }
  return seasonMap[String(season || '').toUpperCase()] || season
}

const translateFormat = (format?: string) => {
  const key = String(format ?? '')
    .trim()
    .toUpperCase()
  const map: Record<string, string> = {
    TV: 'سریالی',
    MOVIE: 'سینمایی',
    SPECIAL: 'قسمت ویژه',
    ONA: 'ONA',
    'ONA (CHINESE)': 'دونگهوا',
  }
  return map[key] || (format ?? '—')
}

const genreLabel = (g: GenreItem) => g.name_fa || g.name_en || g.slug

const toJalaliDate = (value?: string) => {
  if (!value) return 'نامشخص'

  const raw = String(value).trim()
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!match) return toPersianNumber(raw)

  const gy = Number(match[1])
  const gm = Number(match[2])
  const gd = Number(match[3])
  if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd))
    return toPersianNumber(raw)

  if (gy < 1700) {
    const pad2 = (n: number) => String(n).padStart(2, '0')
    return toPersianNumber(`${gy}/${pad2(gm)}/${pad2(gd)}`)
  }

  const g2j = (y: number, m: number, d: number) => {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    let jy = y <= 1600 ? 0 : 979
    y -= y <= 1600 ? 621 : 1600
    const gy2 = m > 2 ? y + 1 : y
    let days =
      365 * y +
      Math.floor((gy2 + 3) / 4) -
      Math.floor((gy2 + 99) / 100) +
      Math.floor((gy2 + 399) / 400) -
      80 +
      d +
      g_d_m[m - 1]
    jy += 33 * Math.floor(days / 12053)
    days %= 12053
    jy += 4 * Math.floor(days / 1461)
    days %= 1461
    if (days > 365) {
      jy += Math.floor((days - 1) / 365)
      days = (days - 1) % 365
    }
    const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
    return { jy, jm, jd }
  }

  const { jy, jm, jd } = g2j(gy, gm, gd)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return toPersianNumber(`${jy}/${pad2(jm)}/${pad2(jd)}`)
}

const DetailSkeleton = () => (
  <div className="pb-24 animate-pulse">
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-52 bg-muted" />
      <div className="relative z-10 pt-24 px-4 pb-2 flex flex-col items-center">
        <div className="w-32 aspect-[2/3] rounded-2xl bg-muted border-4 border-background" />
        <div className="h-6 w-56 bg-muted rounded mt-4" />
        <div className="flex gap-2 mt-3">
          <div className="h-6 w-16 bg-muted rounded-md" />
          <div className="h-6 w-16 bg-muted rounded-md" />
          <div className="h-6 w-16 bg-muted rounded-md" />
        </div>
      </div>
    </div>
    <div className="mx-4 mt-5 grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-muted" />
      ))}
    </div>
    <div className="mx-4 mt-4 h-24 rounded-xl bg-muted" />
    <div className="mx-4 mt-5 h-10 rounded-xl bg-muted" />
    <div className="mx-4 mt-4 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-muted" />
      ))}
    </div>
  </div>
)

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-xl border border-border bg-card/60 py-3 px-2 text-center">
    <p className="text-base font-bold text-foreground">{value}</p>
    <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
  </div>
)

const ScoreChip = ({
  value,
  logo,
  logoAlt,
  fallbackLabel,
  loading = false,
  href,
  onOpenLink,
}: {
  value: string
  logo?: string
  logoAlt?: string
  fallbackLabel?: string
  loading?: boolean
  href?: string
  onOpenLink?: (url: string) => void
}) => {
  const inner = (
    <>
      {logo ? (
        <img src={logo} className="w-5 h-5 rounded shrink-0" alt={logoAlt ?? ''} />
      ) : (
        <span className="text-[10px] font-bold text-yellow-500 leading-none shrink-0">
          {fallbackLabel ?? '—'}
        </span>
      )}
      {loading ? (
        <span className="h-4 w-9 rounded-md bg-muted animate-pulse" aria-hidden />
      ) : (
        <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
      )}
    </>
  )

  const className = cn(
    'flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-2 py-1.5 transition-colors',
    href && !loading && 'hover:bg-muted/40 active:scale-[0.98] cursor-pointer'
  )

  if (href && onOpenLink && !loading) {
    return (
      <button
        type="button"
        className={className}
        aria-label={`${logoAlt ?? 'امتیاز'} در سایت مرجع`}
        onClick={() => onOpenLink(href)}
      >
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}

const FavoriteStatCard = ({
  active,
  favoriteCount,
  favoriteCountLoading,
  onClick,
}: {
  active: boolean
  favoriteCount?: number
  favoriteCountLoading?: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'rounded-xl border py-3 px-2 text-center transition-colors',
      active
        ? 'border-red-500/35 bg-red-500/10 hover:bg-red-500/15'
        : 'border-border bg-card/60 hover:bg-muted/40'
    )}
    aria-label={active ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
  >
    <FavouriteIcon
      className={cn(
        'w-5 h-5 mx-auto',
        active ? 'text-red-500 fill-red-500' : 'text-muted-foreground'
      )}
    />
    <p className="text-[11px] text-muted-foreground mt-1.5">
      {active ? 'در لیست من' : 'علاقه‌مندی'}
    </p>
    {favoriteCountLoading ? (
      <span className="mt-1 inline-block h-3 w-10 rounded bg-muted animate-pulse" aria-hidden />
    ) : typeof favoriteCount === 'number' ? (
      <p className="text-[10px] text-muted-foreground/80 mt-1 tabular-nums">
        {toPersianNumber(favoriteCount)} علاقه‌مند
      </p>
    ) : null}
  </button>
)

const posterStatusClass = (status: string) => {
  switch (status) {
    case 'RELEASING':
      return 'bg-green-500/90 text-white'
    case 'FINISHED':
      return 'bg-slate-600/90 text-white'
    case 'NOT_YET_RELEASED':
      return 'bg-amber-500/90 text-white'
    case 'HIATUS':
      return 'bg-orange-500/90 text-white'
    case 'CANCELLED':
      return 'bg-red-600/90 text-white'
    default:
      return 'bg-muted/90 text-foreground border border-border'
  }
}

const SegmentedTabs = <T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
  className?: string
}) => (
  <div className={cn('relative flex rounded-xl border border-border bg-muted/20 p-0', className)}>
    {tabs.map((tab) => {
      const isActive = active === tab.id
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={isActive}
          className={cn(
            'relative flex-1 py-2.5 rounded-xl text-sm transition-all duration-200',
            isActive
              ? 'text-primary-400 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {isActive && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-xl bg-primary-400/15 border border-primary-400/35 shadow-sm shadow-primary-400/10"
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      )
    })}
  </div>
)

const SeriesSeasonSwitcher = ({
  series,
  currentAnimeId,
  onSelect,
}: {
  series: NonNullable<Anime['series']>
  currentAnimeId: string | number
  onSelect: (id: string | number) => void
}) => {
  const currentIndex = series.members.findIndex(
    (member) => String(member.id) === String(currentAnimeId)
  )
  const progressLabel =
    currentIndex >= 0
      ? `${toPersianNumber(currentIndex + 1)} از ${toPersianNumber(series.members.length)}`
      : null

  return (
    <div className="mx-4 mt-4">
      <div className="relative overflow-hidden rounded-2xl border border-primary-400/15 bg-gradient-to-br from-primary-500/[0.12] via-card/90 to-card/70 p-3.5 shadow-[0_8px_30px_-12px_rgba(99,102,241,0.35)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -left-6 h-28 w-28 rounded-full bg-primary-400/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 -right-4 h-24 w-24 rounded-full bg-primary-300/10 blur-2xl"
        />

        <div className="relative mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {series.title || 'فصل‌های سری'}
            </p>
            <p className="text-[11px] text-muted-foreground">دسترسی سریع به سایر فصل‌های انیمه</p>
          </div>
          {progressLabel ? (
            <span className="shrink-0 rounded-full border border-primary-400/20 bg-primary-400/10 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-primary-300">
              {progressLabel}
            </span>
          ) : null}
        </div>

        <div className="relative -mx-0.5 flex gap-3 overflow-x-auto px-0.5 pb-1 scrollbar-none snap-x snap-mandatory">
          {series.members.map((member) => {
            const isActive = String(member.id) === String(currentAnimeId)
            const label = member.label_fa || `فصل ${toPersianNumber(member.sort_order)}`

            return (
              <button
                key={String(member.id)}
                type="button"
                onClick={() => !isActive && onSelect(member.id)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`${label}: ${member.title}`}
                className={cn(
                  'group shrink-0 snap-start text-right transition-all duration-300',
                  isActive ? 'scale-100' : 'scale-[0.94] opacity-75 hover:scale-[0.97] hover:opacity-100'
                )}
              >
                <div
                  className={cn(
                    'relative aspect-[2/3] w-[5.25rem] overflow-hidden rounded-xl border-2 transition-all duration-300',
                    isActive
                      ? 'border-primary-400 shadow-lg shadow-primary-400/30 ring-2 ring-primary-400/25'
                      : 'border-border/70 group-hover:border-primary-400/35'
                  )}
                >
                  {member.image ? (
                    <img
                      src={member.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <Video01Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10" />
                  {isActive ? (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]" />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <p className="truncate text-[10px] font-bold leading-none text-white">{label}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const InfoRow = ({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) => (
  <div className="flex items-start justify-between gap-3 px-4 py-3.5">
    <span className="text-muted-foreground text-sm flex items-center gap-2 shrink-0">
      {icon}
      {label}
    </span>
    <div className="text-foreground text-sm text-left min-w-0">{children}</div>
  </div>
)

const EmptyBlock = ({
  message,
  hint,
  action,
  icon,
}: {
  message: string
  hint?: string
  action?: { label: string; onClick: () => void }
  icon?: ReactNode
}) => (
  <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-12 px-6 text-center space-y-3">
    {icon ?? (
      <Download01Icon className="w-10 h-10 mx-auto text-muted-foreground/35" aria-hidden />
    )}
    <p className="text-sm text-muted-foreground">{message}</p>
    {hint ? <p className="text-xs text-muted-foreground/75 leading-6">{hint}</p> : null}
    {action ? (
      <Button type="button" size="sm" variant="secondary" onClick={action.onClick}>
        {action.label}
      </Button>
    ) : null}
  </div>
)

const SimilarPosterCard = ({
  id,
  title,
  image,
}: {
  id: number | string
  title: string
  image: string
}) => (
  <AnimePrefetchLink
    animeId={id}
    to={`/anime/${id}`}
    className="group block active:scale-[0.98] transition-transform"
    aria-label={`مشاهده ${title}`}
  >
    <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
      <img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-2 pt-10">
        <h3 className="text-xs font-semibold text-white line-clamp-2 leading-5">{title}</h3>
      </div>
    </div>
  </AnimePrefetchLink>
)

const EPISODE_DOWNLOAD_QUALITIES = [
  { id: '480p', label: '480p', available: false },
  { id: '720p', label: '720p', available: false },
  { id: '1080p', label: '1080p', available: true },
] as const

const EpisodeDownloadCard = ({
  episode,
  showSubtitleButton,
  onDownload1080,
  onSubtitle,
  onLockedQuality,
}: {
  episode: Episode
  showSubtitleButton: boolean
  onDownload1080: () => void
  onSubtitle: () => void
  onLockedQuality: (quality: string) => void
}) => (
  <div className="overflow-hidden rounded-xl border border-border bg-card/60">
    <div className="flex items-start justify-between gap-3 px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          قسمت {toPersianNumber(episode.number)}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">زیرنویس چسبیده · x265</p>
      </div>
      {showSubtitleButton ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={onSubtitle}
        >
          زیرنویس
        </Button>
      ) : null}
    </div>

    <div className="grid grid-cols-3 gap-1.5 border-t border-border/60 bg-muted/10 p-2">
      {EPISODE_DOWNLOAD_QUALITIES.map((quality) => {
        const isAvailable = quality.available

        return (
          <button
            key={quality.id}
            type="button"
            aria-disabled={!isAvailable}
            aria-label={
              isAvailable
                ? `دانلود قسمت ${episode.number} با کیفیت ${quality.label}`
                : `کیفیت ${quality.label} فعلاً در دسترس نیست`
            }
            className={cn(
              'flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors',
              isAvailable
                ? 'border-primary-400/35 bg-primary-400/10 text-primary-200 hover:bg-primary-400/15 active:scale-[0.98]'
                : 'cursor-not-allowed border-border/60 bg-muted/20 text-muted-foreground opacity-70'
            )}
            onClick={() => {
              if (isAvailable) {
                onDownload1080()
                return
              }
              onLockedQuality(quality.label)
            }}
          >
            {isAvailable ? (
              <Download01Icon className="h-4 w-4 shrink-0" />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            )}
            <span className="text-xs font-semibold tabular-nums">{quality.label}</span>
          </button>
        )
      })}
    </div>
  </div>
)

const EpisodePackDownloadCard = ({
  pack,
  onDownload,
}: {
  pack: EpisodePack
  onDownload: () => void
}) => (
  <div className="episode-pack-card-wrap">
    <div className="episode-pack-card-inner flex items-center justify-between gap-3 bg-card p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground line-clamp-1">
          {pack.title?.trim() || 'دانلود تمام قسمت‌ها'}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          پک یک‌جا · زیرنویس چسبیده · 1080p x265
        </p>
      </div>
      <Button type="button" size="sm" className="shrink-0 gap-1 font-semibold" onClick={onDownload}>
        <Download01Icon className="w-3.5 h-3.5" />
        دانلود
      </Button>
    </div>
  </div>
)

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toggleFavorite, isFavorite, getProgress, saveProgress, isSavingProgress } = useAnime()
  const { showAlert, openLink, shareUrl } = useTelegramApp()

  const {
    data: animeData,
    isLoading,
    isError,
    refetch,
  } = useAnimeDetailQuery(id)

  const { data: favoriteCount, isLoading: favoriteCountLoading } = useAnimeFavoriteCountQuery(id)

  const anime = (animeData ?? null) as Anime | null

  const { data: translatorLinks = [] } = useTranslatorLinksQuery(anime?.id)

  const externalIds = useMemo(
    () => ({
      anilist_id: anime?.anilist_id,
      mal_id: anime?.mal_id,
      imdb_id: anime?.imdb_id,
    }),
    [anime?.anilist_id, anime?.mal_id, anime?.imdb_id]
  )

  const needsLiveAnilist =
    Boolean(anime?.anilist_id && anime.anilist_id > 0) &&
    !(typeof anime?.averageScore === 'number' && Number.isFinite(anime.averageScore))

  const needsLiveMal =
    Boolean(anime?.mal_id && anime.mal_id > 0) &&
    !(typeof anime?.malScore === 'number' && Number.isFinite(anime.malScore))

  const needsLiveImdb =
    Boolean(anime?.imdb_id && String(anime.imdb_id).trim()) &&
    !(typeof anime?.imdbScore === 'number' && Number.isFinite(anime.imdbScore))

  const needsLiveScores = needsLiveAnilist || needsLiveMal || needsLiveImdb

  const {
    data: liveScores,
    isFetching: liveScoresFetching,
  } = useExternalScoresQuery(externalIds, Boolean(anime) && needsLiveScores)

  const [activeTab, setActiveTab] = useState<TabType>(() =>
    parseAnimeDetailTab(searchParams.get('tab'))
  )
  const [downloadTab, setDownloadTab] = useState<DownloadTabType>('episodes')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [progressEditorOpen, setProgressEditorOpen] = useState(false)

  const genreSlugs = useMemo(
    () => (anime?.genres || []).map((g) => g.slug).filter(Boolean),
    [anime?.genres]
  )

  const { data: similarCards = [], isLoading: similarLoading } = useSimilarAnimeQuery(
    anime?.id,
    genreSlugs,
    activeTab === 'similar' && Boolean(anime)
  )

  const similarAnime = useMemo(
    () => similarCards.map((c) => ({ id: c.id, title: c.title, image: c.image })),
    [similarCards]
  )

  const loading = isLoading && !anime
  const error = isError ? 'خطا در بارگذاری اطلاعات انیمه' : null

  const handleMainTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tab === 'info') next.delete('tab')
        else next.set('tab', tab)
        return next
      },
      { replace: true }
    )
  }

  useEffect(() => {
    setActiveTab(parseAnimeDetailTab(searchParams.get('tab')))
  }, [id, searchParams])

  useEffect(() => {
    setDownloadTab('episodes')
    setShowFullDescription(false)
  }, [id])

  useEffect(() => {
    if (activeTab === 'similar' && anime?.id && genreSlugs.length > 0) {
      prefetchSimilarAnime(anime.id, genreSlugs)
    }
  }, [activeTab, anime?.id, genreSlugs])

  useEffect(() => {
    similarCards.slice(0, 3).forEach((card) => prefetchAnimeDetail(card.id))
  }, [similarCards])

  const isFinished =
    String(anime?.airing_status ?? anime?.status ?? '')
      .trim()
      .toUpperCase() === 'FINISHED'

  const showSubtitlePacksTab =
    Boolean(isFinished) && Array.isArray(anime?.subtitle_packs) && anime.subtitle_packs.length > 0

  useEffect(() => {
    if (downloadTab === 'subtitle_packs' && !showSubtitlePacksTab) setDownloadTab('episodes')
  }, [downloadTab, showSubtitlePacksTab])

  const isDonghua =
    String(anime?.format ?? '')
      .trim()
      .toUpperCase() === 'ONA (CHINESE)'
  const isMovie =
    String(anime?.format ?? '')
      .trim()
      .toUpperCase() === 'MOVIE'

  const anilistScoreLabel = (() => {
    if (typeof anime?.averageScore === 'number' && Number.isFinite(anime.averageScore)) {
      return formatAnilistPercent(anime.averageScore, toPersianNumber)
    }
    if (
      typeof liveScores?.anilistScore === 'number' &&
      Number.isFinite(liveScores.anilistScore) &&
      liveScores.anilistScore > 0
    ) {
      return `${toPersianNumber(Math.round(liveScores.anilistScore))}٪`
    }
    return '—'
  })()

  const resolvedMalScore =
    liveScores?.malScore ?? (typeof anime?.malScore === 'number' ? anime.malScore : null)

  const resolvedImdbScore =
    liveScores?.imdbScore ?? (typeof anime?.imdbScore === 'number' ? anime.imdbScore : null)

  const malScoreLabel =
    resolvedMalScore !== null ? toPersianNumber(resolvedMalScore.toFixed(1)) : '—'

  const imdbScoreLabel =
    resolvedImdbScore !== null ? toPersianNumber(resolvedImdbScore.toFixed(1)) : '—'

  const malChipLoading = needsLiveMal && liveScoresFetching && resolvedMalScore === null
  const anilistChipLoading =
    needsLiveAnilist && liveScoresFetching && anilistScoreLabel === '—'
  const imdbChipLoading = needsLiveImdb && liveScoresFetching && resolvedImdbScore === null

  const handleShare = () => {
    if (!anime || !id) return
    const link = buildAnimeMiniAppLink(id, activeTab)
    shareUrl(link, `${anime.title} — شیوری`)
  }

  /** امتیاز شیوری — میانگین امتیاز کاربران */
  const shioriScoreLabel =
    typeof anime?.shioriScore === 'number' && Number.isFinite(anime.shioriScore)
      ? toPersianNumber(anime.shioriScore.toFixed(1))
      : '—'

  const statusKey = String(anime?.airing_status ?? anime?.status ?? '')
    .trim()
    .toUpperCase()

  const handleFavorite = () => {
    if (!anime) return
    const wasFavorite = isFavorite(anime.id)
    toggleFavorite(anime.id)
    if (wasFavorite) {
      showAlert('از علاقه‌مندی‌ها حذف شد')
      setProgressEditorOpen(false)
    } else {
      showAlert('به علاقه‌مندی‌ها اضافه شد')
      setProgressEditorOpen(true)
    }
  }

  const handleSaveProgress = async (progress: {
    episodesWatched: number
    userRating: number | null
  }) => {
    if (!anime) return
    try {
      await saveProgress(anime.id, progress)
      setProgressEditorOpen(false)
      showAlert('پیشرفت و امتیاز ذخیره شد')
    } catch (e) {
      showAlert(formatUserListSaveError(e))
    }
  }

  const episodesForList = useMemo(() => {
    if (!anime) return []
    return (anime.episodes || []).slice().sort((a, b) => {
      const ea = typeof a.number === 'number' ? a.number : 0
      const eb = typeof b.number === 'number' ? b.number : 0
      if (ea !== eb) return ea - eb
      return String(a.id).localeCompare(String(b.id))
    })
  }, [anime])

  const episodePackLink = useMemo(
    () => anime?.episode_pack?.download_link?.trim() || null,
    [anime?.episode_pack?.download_link]
  )

  const downloadTabs = useMemo(() => {
    const tabs: { id: DownloadTabType; label: string }[] = [
      { id: 'episodes', label: 'قسمت‌ها' },
    ]
    if (showSubtitlePacksTab) tabs.push({ id: 'subtitle_packs', label: 'زیرنویس' })
    tabs.push({ id: 'translators', label: 'مترجم' })
    return tabs
  }, [showSubtitlePacksTab])

  if (loading) return <DetailSkeleton />

  if (error || !anime) {
    return (
      <div className="px-4 py-16 text-center space-y-3 pb-24">
        <p className="text-red-500 text-sm">{error || 'انیمه مورد نظر یافت نشد'}</p>
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    )
  }

  const coverImage = anime.featured_image || anime.image
  const description = anime.description?.trim() || 'توضیحاتی ثبت نشده.'
  const shouldTruncate = description.length > 180
  const truncatedDescription =
    shouldTruncate && !showFullDescription ? `${description.substring(0, 180)}…` : description

  const favoriteActive = isFavorite(anime.id)

  return (
    <div className="pb-24 bg-background text-foreground">
      {/* Hero — هم‌سبک TranslatorProfile */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-52 overflow-hidden">
          {coverImage ? (
            <img src={coverImage} alt="" className="w-full h-full object-cover opacity-45" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/30 to-background" />
        </div>

        <div className="relative z-10 pt-24 px-4 pb-2 flex flex-col items-center">
          <div className="relative">
            <div className="w-32 aspect-[2/3] rounded-2xl overflow-hidden border-4 border-background bg-muted shadow-lg ring-2 ring-primary-400/25">
              <img src={anime.image} alt={anime.title} className="w-full h-full object-cover" />
            </div>
            {statusKey && (
              <span
                className={cn(
                  'absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm',
                  posterStatusClass(statusKey)
                )}
              >
                {translateStatus(statusKey)}
              </span>
            )}
          </div>

          <div className="relative w-full mt-3 px-10">
            <h1 className="text-lg font-bold text-foreground text-center line-clamp-3 leading-7">
              {anime.title}
            </h1>
            {anime.title_romaji ? (
              <p
                className="text-muted-foreground text-center text-sm leading-5 line-clamp-2"
                dir="ltr"
              >
                {anime.title_romaji}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleShare}
              className="absolute left-0 top-0 p-2 rounded-xl border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="اشتراک‌گذاری در تلگرام"
            >
              <Share08Icon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted/80 border border-border text-muted-foreground">
              {translateFormat(anime.format)}
            </span>
            {anime.genres.slice(0, 4).map((genre) => (
              <button
                key={genre.slug}
                type="button"
                className="text-[10px] px-2 py-0.5 rounded-md bg-primary-500/15 border border-primary-400/25 text-primary-300 hover:bg-primary-500/25 transition-colors"
                onClick={() =>
                  navigate(
                    `/search?genre=${encodeURIComponent(genre.slug)}&label=${encodeURIComponent(genreLabel(genre))}`
                  )
                }
              >
                {genreLabel(genre)}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <ScoreChip
              logo={malLogo}
              logoAlt="MyAnimeList"
              value={malScoreLabel}
              loading={malChipLoading}
              href={anime.mal_id ? buildMalUrl(anime.mal_id) : undefined}
              onOpenLink={openLink}
            />
            <ScoreChip
              logo={alLogo}
              logoAlt="AniList"
              value={anilistScoreLabel}
              loading={anilistChipLoading}
              href={anime.anilist_id ? buildAnilistUrl(anime.anilist_id) : undefined}
              onOpenLink={openLink}
            />
            <ScoreChip
              logo={imdbLogo}
              logoAlt="IMDb"
              value={imdbScoreLabel}
              loading={imdbChipLoading}
              href={anime.imdb_id ? buildImdbUrl(anime.imdb_id) : undefined}
              onOpenLink={openLink}
            />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mx-4 mt-5 grid grid-cols-3 gap-2">
        <StatCard value={shioriScoreLabel} label="امتیاز شیوری" />
        <StatCard
          value={toPersianNumber(anime.episodes_count || episodesForList.length)}
          label="قسمت"
        />
        <FavoriteStatCard
          active={favoriteActive}
          favoriteCount={favoriteCount}
          favoriteCountLoading={favoriteCountLoading}
          onClick={handleFavorite}
        />
      </div>

      {(anime.series?.members?.length ?? 0) > 1 && (
        <SeriesSeasonSwitcher
          series={anime.series!}
          currentAnimeId={anime.id}
          onSelect={(memberId) => navigate(`/anime/${encodeURIComponent(String(memberId))}`)}
        />
      )}

      {favoriteActive && (
        <div className="mx-4 mt-2 text-center">
          <button
            type="button"
            onClick={() => setProgressEditorOpen(true)}
            className="text-xs font-medium text-primary-400 hover:text-primary-300"
          >
            ویرایش پیشرفت و امتیاز من
          </button>
        </div>
      )}

      <FavoriteAnimeEditor
        open={progressEditorOpen && favoriteActive}
        onOpenChange={setProgressEditorOpen}
        title={anime.title}
        image={anime.image}
        episodesCount={anime.episodes_count || episodesForList.length}
        progress={getProgress(anime.id)}
        saving={isSavingProgress}
        onSave={handleSaveProgress}
        onRemove={() => {
          toggleFavorite(anime.id)
          setProgressEditorOpen(false)
          showAlert('از علاقه‌مندی‌ها حذف شد')
        }}
      />

      {/* Synopsis */}
      <div className="mx-4 mt-4 rounded-xl border border-border bg-card/60 p-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">خلاصه داستان</h2>
        <p className="text-sm text-muted-foreground leading-6 whitespace-pre-wrap">
          {truncatedDescription}
        </p>
        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="mt-2 text-primary-400 text-xs font-medium"
          >
            {showFullDescription ? 'نمایش کمتر' : 'نمایش بیشتر'}
          </button>
        )}
      </div>

      {/* Main tabs — sticky زیر هدر، استایل مثل Home */}
      <div className="sticky top-14 z-30 px-4 pt-5 pb-2 bg-background/90 backdrop-blur-md border-b border-border/50">
        <SegmentedTabs tabs={MAIN_TABS} active={activeTab} onChange={handleMainTabChange} />
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {activeTab === 'info' && (
          <div className="rounded-xl border border-border bg-card/60 divide-y divide-border overflow-hidden">
            <InfoRow
              icon={<Video01Icon className="w-4 h-4 text-primary-400 shrink-0" />}
              label="نوع"
            >
              {translateFormat(anime.format)}
            </InfoRow>
            <InfoRow
              icon={<LeftToRightListNumberIcon className="w-4 h-4 text-primary-400 shrink-0" />}
              label="تعداد قسمت‌ها"
            >
              {toPersianNumber(anime.episodes_count)} قسمت
            </InfoRow>
            <InfoRow
              icon={<Clock01Icon className="w-4 h-4 text-primary-400 shrink-0" />}
              label="وضعیت"
            >
              {translateStatus(anime.status)}
            </InfoRow>
            <InfoRow
              icon={<Building01Icon className="w-4 h-4 text-primary-400 shrink-0" />}
              label="استودیو"
            >
              {Array.isArray(anime.studio_links) && anime.studio_links.length > 0 ? (
                <div className="flex flex-wrap gap-x-1 justify-end">
                  {anime.studio_links.map((s, index) => (
                    <span key={s.slug || `${s.name}-${index}`}>
                      <button
                        type="button"
                        className="text-primary-300 font-medium hover:underline"
                        onClick={() => {
                          if (!s.slug) return
                          const studioName = s.name || s.slug
                          navigate(
                            `/studios/${encodeURIComponent(String(s.slug))}?name=${encodeURIComponent(studioName)}`
                          )
                        }}
                      >
                        {s.name || s.slug}
                      </button>
                      {index < anime.studio_links!.length - 1 ? '، ' : ''}
                    </span>
                  ))}
                </div>
              ) : Array.isArray(anime.studios) && anime.studios.length > 0 ? (
                anime.studios.join('، ')
              ) : (
                'نامشخص'
              )}
            </InfoRow>

            {!isDonghua && (
              <InfoRow
                icon={<Calendar01Icon className="w-4 h-4 text-primary-400 shrink-0" />}
                label="فصل پخش"
              >
                {anime.season && typeof anime.year === 'number' ? (
                  <button
                    type="button"
                    className="text-primary-300 font-medium hover:underline"
                    onClick={() => {
                      const seasonKey = String(anime.season).toUpperCase()
                      navigate(
                        `/search?year=${anime.year}&season=${encodeURIComponent(seasonKey)}`
                      )
                    }}
                  >
                    {translateSeason(String(anime.season).toUpperCase())}{' '}
                    {toPersianNumber(anime.year)}
                  </button>
                ) : (
                  anime.season || 'نامشخص'
                )}
              </InfoRow>
            )}

            <InfoRow
              icon={<Calendar02Icon className="w-4 h-4 text-primary-400 shrink-0" />}
              label={isMovie ? 'تاریخ اکران' : 'تاریخ شروع'}
            >
              {toJalaliDate(anime.startDate)}
            </InfoRow>

            {!isMovie && (
              <InfoRow
                icon={<Calendar02Icon className="w-4 h-4 text-primary-400 shrink-0" />}
                label="تاریخ پایان"
              >
                {toJalaliDate(anime.endDate)}
              </InfoRow>
            )}
          </div>
        )}

        {activeTab === 'episodes' && (
          <div className="space-y-4">
            <SegmentedTabs tabs={downloadTabs} active={downloadTab} onChange={setDownloadTab} />

            {downloadTab === 'episodes' &&
              (episodesForList.length === 0 && !episodePackLink ? (
                <EmptyBlock
                  message={
                    statusKey === 'RELEASING'
                      ? 'هنوز قسمتی برای دانلود ثبت نشده'
                      : 'فایل دانلودی برای این انیمه ثبت نشده'
                  }
                  hint={
                    statusKey === 'RELEASING'
                      ? 'با انتشار قسمت‌های جدید، لینک‌ها اینجا قرار می‌گیرند.'
                      : translatorLinks.length > 0
                        ? 'می‌توانید از تب مترجم، اطلاعات تیم ترجمه را ببینید.'
                        : undefined
                  }
                  action={
                    translatorLinks.length > 0
                      ? {
                          label: 'مشاهده مترجم‌ها',
                          onClick: () => setDownloadTab('translators'),
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="space-y-2">
                  {episodePackLink && anime.episode_pack ? (
                    <EpisodePackDownloadCard
                      pack={anime.episode_pack}
                      onDownload={() => window.open(episodePackLink, '_blank')}
                    />
                  ) : null}
                  {episodesForList.length === 0 && episodePackLink ? (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      لینک تک‌تک قسمت‌ها هنوز ثبت نشده.
                    </p>
                  ) : null}
                  {episodesForList.map((episode) => (
                    <EpisodeDownloadCard
                      key={episode.id}
                      episode={episode}
                      showSubtitleButton={!isFinished || isMovie}
                      onDownload1080={() => {
                        const link =
                          episode.download_link ||
                          `https://t.me/ShioriUploadBot?start=get_${episode.id}`
                        window.open(String(link), '_blank')
                      }}
                      onSubtitle={() => {
                        if (!episode.subtitle_link) {
                          showAlert('زیرنویس برای این قسمت موجود نیست')
                          return
                        }
                        window.open(String(episode.subtitle_link), '_blank')
                      }}
                      onLockedQuality={(quality) => {
                        showAlert(`دانلود ${quality} هنوز فعال نشده`)
                      }}
                    />
                  ))}
                </div>
              ))}

            {downloadTab === 'subtitle_packs' &&
              (Array.isArray(anime.subtitle_packs) && anime.subtitle_packs.length > 0 ? (
                <div className="space-y-2">
                  {anime.subtitle_packs.map((p) => (
                    <div
                      key={String(p.id)}
                      className="rounded-xl border border-border bg-card/60 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {p.title || 'پک زیرنویس'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          زیرنویس کامل
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="shrink-0 gap-1"
                        onClick={() => {
                          if (!p.subtitle_link) {
                            showAlert('لینک پک زیرنویس موجود نیست')
                            return
                          }
                          window.open(String(p.subtitle_link), '_blank')
                        }}
                      >
                        <Download01Icon className="w-3.5 h-3.5" />
                        دانلود
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBlock message="پک زیرنویس ثبت نشده" />
              ))}

            {downloadTab === 'translators' &&
              (translatorLinks.length === 0 ? (
                <EmptyBlock message="مترجمی ثبت نشده" />
              ) : (
                <div className="space-y-2">
                  {translatorLinks.map((l) => (
                    <Link
                      key={String(l.id)}
                      to={`/translators/${encodeURIComponent(String(l.translator.slug))}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted border border-border shrink-0">
                          {l.translator.avatar_url ? (
                            <img
                              src={String(l.translator.avatar_url)}
                              alt={l.translator.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">
                            {l.translator.name}
                          </p>
                          {l.role ? (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {l.role}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              ))}
          </div>
        )}

        {activeTab === 'similar' && (
          <div className="space-y-3 pb-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-foreground">آثار مشابه</h2>
              <span className="text-xs text-muted-foreground">
                {similarLoading
                  ? '…'
                  : similarAnime.length > 0
                    ? `${toPersianNumber(similarAnime.length)} عنوان`
                    : 'خالی'}
              </span>
            </div>

            {similarLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : similarAnime.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {similarAnime.map((item) => (
                  <SimilarPosterCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    image={item.image}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock
                message={
                  anime.genres.length > 0
                    ? 'انیمه مشابهی در کاتالوگ شیوری پیدا نشد.'
                    : 'ژانری برای پیشنهاد آثار مشابه ثبت نشده.'
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AnimeDetail
