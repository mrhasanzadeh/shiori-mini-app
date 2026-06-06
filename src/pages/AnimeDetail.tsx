import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FavouriteIcon,
  Clock01Icon,
  Video01Icon,
  Building01Icon,
  Calendar01Icon,
  Calendar02Icon,
  LeftToRightListNumberIcon,
} from 'hugeicons-react'
import { useAnime } from '../hooks/useAnime'
import { useTelegramApp } from '../hooks/useTelegramApp'
import * as supa from '../services/supabaseAnime'
import type { GenreItem } from '../services/supabaseAnime'

import malLogo from '../assets/images/mal-logo.png'
import alLogo from '../assets/images/anilist-logo.svg'
import { ExternalLink } from 'lucide-react'

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

interface Anime {
  id: number | string
  title: string
  image: string
  featured_image: string
  format?: string
  description: string
  status: string
  airing_status?: string
  genres: GenreItem[]
  episodes: Episode[]
  subtitle_packs?: SubtitlePack[]
  episodes_count: number
  animeListScore?: number
  averageScore?: number
  studios: string[]
  studio_links?: Array<{ slug: string; name: string }>
  producers: string[]
  season: string
  year?: number
  startDate: string
  endDate: string
  score?: number
}

type TabType = 'info' | 'episodes' | 'similar'

type DownloadTabType = 'episodes' | 'subtitle_packs' | 'translators'

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { loadAnimeById, toggleFavorite, isFavorite } = useAnime()
  const { showAlert } = useTelegramApp()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [downloadTab, setDownloadTab] = useState<DownloadTabType>('episodes')
  const [showFullDescription, setShowFullDescription] = useState(false)

  const [translatorLinks, setTranslatorLinks] = useState<supa.TranslatorAnimeLink[]>([])
  const [similarAnime, setSimilarAnime] = useState<Array<{ id: number | string; title: string; image: string }>>([])
  const [similarLoading, setSimilarLoading] = useState(false)

  // Reset active tab when anime ID changes
  useEffect(() => {
    setActiveTab('info')
    setDownloadTab('episodes')
    setSimilarAnime([])
  }, [id])

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

  const toPersianNumber = (num: number | string): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
  }

  const trangrayStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      RELEASING: 'در حال پخش',
      FINISHED: 'پایان یافته',
      NOT_YET_RELEASED: 'هنوز پخش نشده',
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
    }
    return map[key] || (format ?? '')
  }

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

  useEffect(() => {
    const fetchAnime = async () => {
      if (!id) return

      try {
        setLoading(true)
        const data = await loadAnimeById(id!)
        if (data) {
          const nextAnime = data as Anime
          setAnime(nextAnime)

          try {
            const links = await supa.getTranslatorLinksByAnimeId(nextAnime.id)
            setTranslatorLinks(links)
          } catch (e) {
            setTranslatorLinks([])
          }
        } else {
          setError('انیمه مورد نظر یافت نشد')
        }
      } catch (err) {
        setError('خطا در بارگذاری اطلاعات انیمه')
      } finally {
        setLoading(false)
      }
    }

    fetchAnime()
  }, [id])

  useEffect(() => {
    if (activeTab !== 'similar' || !anime) return

    let cancelled = false
    const loadSimilar = async () => {
      try {
        setSimilarLoading(true)
        const slugs = (anime.genres || []).map((g) => g.slug).filter(Boolean)
        const cards = await supa.getSimilarAnimeCards(anime.id, slugs, 12)
        if (!cancelled) {
          setSimilarAnime(cards.map((c) => ({ id: c.id, title: c.title, image: c.image })))
        }
      } catch {
        if (!cancelled) setSimilarAnime([])
      } finally {
        if (!cancelled) setSimilarLoading(false)
      }
    }

    loadSimilar()
    return () => {
      cancelled = true
    }
  }, [activeTab, anime?.id])

  const displayScore =
    typeof anime?.averageScore === 'number'
      ? anime.averageScore
      : typeof anime?.animeListScore === 'number'
        ? anime.animeListScore
        : null

  const scoreLabel =
    displayScore !== null ? toPersianNumber(displayScore.toFixed(1)) : '—'

  const handleFavorite = () => {
    if (!anime) return
    toggleFavorite(anime.id)
    showAlert(isFavorite(anime.id) ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error || !anime) {
    return <div className="text-center text-red-500 p-4">{error || 'انیمه مورد نظر یافت نشد'}</div>
  }

  // Truncate description if needed
  const shouldTruncate = anime.description.length > 150
  const truncatedDescription =
    shouldTruncate && !showFullDescription
      ? `${anime.description.substring(0, 150)}...`
      : anime.description

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      {/* Header */}
      <div className="relative">
        {/* Banner image */}
        <div className="h-64 overflow-hidden absolute top-0 w-full">
          <img
            src={anime.featured_image}
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
        </div>

        {/* Anime info overlay */}
        <div className="container pt-24 mx-auto px-4">
          <div className="flex flex-col items-center relative z-10">
            {/* Anime poster */}
            <div className="w-40 rounded-xl overflow-hidden border-2 border-border shadow-inner">
              <img src={anime.image} alt={anime.title} className="w-full h-full object-cover" />
            </div>
            {/* Basic info */}
            <div className="flex-1 mt-4">
              <h1 className="text-xl text-center font-semibold text-foreground line-clamp-4">
                {anime.title}
              </h1>

              {/* Genres pills */}
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {anime.genres.map((genre) => (
                  <button
                    key={genre.slug}
                    type="button"
                    className="px-2 py-0.5 bg-muted/30 border border-border rounded-full text-xs text-muted-foreground"
                    onClick={() =>
                      navigate(`/search?genre=${encodeURIComponent(genre.slug)}`)
                    }
                  >
                    {genre.name_fa || genre.name_en || genre.slug}
                  </button>
                ))}
              </div>

              {/* Rating and action buttons in a single row */}
              <div className="flex items-center justify-center mt-3 gap-2">
                <div className="flex items-center gap-2 bg-card/60 rounded-lg px-1 pe-2 py-1">
                  <img src={malLogo} className="w-6 h-6 rounded" alt="" />
                  <span className="text-sm text-foreground font-medium">{scoreLabel}</span>
                </div>
                <div className="flex items-center gap-2 bg-card/60 rounded-lg px-1 pe-2 py-1">
                  <img src={alLogo} className="w-6 h-6 rounded" alt="" />
                  <span className="text-sm text-foreground font-medium">{scoreLabel}</span>
                </div>
                {/* Action buttons in a connected container */}
                <div className="flex bg-card/60 rounded-full">
                  <button
                    onClick={handleFavorite}
                    className="p-2 rounded-full hover:bg-muted/40"
                    aria-label={
                      isFavorite(anime.id) ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'
                    }
                  >
                    {isFavorite(anime.id) ? (
                      <FavouriteIcon className="w-5 h-5 text-red-500 fill-red-500" />
                    ) : (
                      <FavouriteIcon className="w-5 h-5 text-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2 mx-auto px-4 mt-4">
        <p className="text-muted-foreground text-sm text-center">{truncatedDescription}</p>
        {shouldTruncate && (
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="mt-1 text-primary-400 text-xs"
          >
            {showFullDescription ? 'نمایش کمتر' : 'نمایش بیشتر'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 mt-4">
        <div className="border-b border-border">
          <div className="flex">
            <button
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'info'
                  ? 'text-primary-400 border-b border-primary-500'
                  : 'text-muted-foreground hover:bg-muted/30'
              }`}
              onClick={() => setActiveTab('info')}
            >
              اطلاعات
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'episodes'
                  ? 'text-primary-400 border-b border-primary-500'
                  : 'text-muted-foreground hover:bg-muted/30'
              }`}
              onClick={() => setActiveTab('episodes')}
            >
              بخش دانلود
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'similar'
                  ? 'text-primary-400 border-b border-primary-500'
                  : 'text-muted-foreground hover:bg-muted/30'
              }`}
              onClick={() => setActiveTab('similar')}
            >
              آثار مشابه
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex justify-between items-center pb-4 border-b border-b-border">
                  <span className="text-muted-foreground text-sm flex items-center gap-2">
                    <Video01Icon className="w-5 h-5 text-primary-400" />
                    نوع
                  </span>
                  <span className="text-foreground text-sm">{translateFormat(anime.format)}</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-b-border">
                  <span className="text-muted-foreground text-sm flex items-center gap-2">
                    <LeftToRightListNumberIcon className="w-5 h-5 text-primary-400" />
                    تعداد قسمت‌ها
                  </span>
                  <span className="text-foreground text-sm">
                    {toPersianNumber(anime.episodes_count)} قسمت
                  </span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-b-border">
                  <span className="text-muted-foreground text-sm flex items-center gap-2">
                    <Clock01Icon className="w-5 h-5 text-primary-400" />
                    وضعیت
                  </span>
                  <span className="text-foreground text-sm">{trangrayStatus(anime.status)}</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-b-border">
                  <span className="text-muted-foreground text-sm flex items-center gap-2">
                    <Building01Icon className="w-5 h-5 text-primary-400" />
                    استودیو
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(anime.studio_links) && anime.studio_links.length > 0 ? (
                      anime.studio_links.map((s, index) => (
                        <button
                          key={s.slug || `${s.name}-${index}`}
                          type="button"
                          className="text-sm text-primary-300 font-medium"
                          onClick={() => {
                            if (!s.slug) return
                            navigate(`/studios/${encodeURIComponent(String(s.slug))}`)
                          }}
                        >
                          {s.name || s.slug}
                          {index < anime.studio_links!.length - 1 ? '، ' : ''}
                        </button>
                      ))
                    ) : Array.isArray(anime.studios) && anime.studios.length > 0 ? (
                      anime.studios.map((studio, index) => (
                        <span key={`${studio}-${index}`} className="text-foreground text-sm">
                          {studio}
                          {index < anime.studios.length - 1 ? '، ' : ''}
                        </span>
                      ))
                    ) : (
                      <span className="text-foreground text-sm">نامشخص</span>
                    )}
                  </div>
                </div>

                {!isDonghua && (
                  <div className="flex justify-between items-center py-4 border-b border-b-border">
                    <span className="text-muted-foreground text-sm flex items-center gap-2">
                      <Calendar01Icon className="w-5 h-5 text-primary-400" />
                      فصل پخش
                    </span>
                    {anime.season && typeof anime.year === 'number' ? (
                      <button
                        type="button"
                        className="text-sm text-primary-300 font-medium"
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
                      <span className="text-foreground text-sm">{anime.season || 'نامشخص'}</span>
                    )}
                  </div>
                )}

                <div
                  className={`flex justify-between items-center py-4 ${isMovie ? '' : 'border-b border-b-border'}`}
                >
                  <span className="text-muted-foreground text-sm flex items-center gap-2">
                    <Calendar02Icon className="w-5 h-5 text-primary-400" />
                    {isMovie ? 'تاریخ اکران' : 'تاریخ شروع'}
                  </span>
                  <span className="text-foreground text-sm">{toJalaliDate(anime.startDate)}</span>
                </div>

                {!isMovie && (
                  <div className="flex justify-between items-center py-4">
                    <span className="text-muted-foreground text-sm flex items-center gap-2">
                      <Calendar02Icon className="w-5 h-5 text-primary-400" />
                      تاریخ پایان
                    </span>
                    <span className="text-foreground text-sm">{toJalaliDate(anime.endDate)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Episodes Tab */}
          {activeTab === 'episodes' && (
            <div className="space-y-2">
              <div className={`grid mb-4 ${showSubtitlePacksTab ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <button
                  type="button"
                  className={`py-2 text-sm font-medium rounded-md ${
                    downloadTab === 'episodes'
                      ? 'bg-primary-500/30 border border-primary-400/40'
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => setDownloadTab('episodes')}
                >
                  قسمت‌ها
                </button>

                {showSubtitlePacksTab && (
                  <button
                    type="button"
                    className={`py-2 text-sm font-medium rounded-md ${
                      downloadTab === 'subtitle_packs'
                        ? 'bg-primary-500/30 border border-primary-400/40'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => setDownloadTab('subtitle_packs')}
                  >
                    زیرنویس
                  </button>
                )}

                <button
                  type="button"
                  className={`py-2 text-sm font-medium rounded-md ${
                    downloadTab === 'translators'
                      ? 'bg-primary-500/30 border border-primary-400/40'
                      : 'text-muted-foreground '
                  }`}
                  onClick={() => setDownloadTab('translators')}
                >
                  مترجم
                </button>
              </div>

              {downloadTab === 'episodes' && (
                <>
                  {episodesForList.length === 0 ? (
                    <div className="text-sm text-muted-foreground">قسمتی ثبت نشده</div>
                  ) : (
                    episodesForList.map((episode) => (
                      <div
                        key={episode.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-foreground">
                            قسمت {toPersianNumber(episode.number)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            زیرنویس چسبیده | 1080p x265
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="py-1 px-3 rounded-md bg-muted border hover:bg-muted/50"
                            aria-label={`دانلود قسمت ${toPersianNumber(episode.number)}`}
                            onClick={() => {
                              if (!episode.download_link) {
                                showAlert('لینک دانلود برای این قسمت موجود نیست')
                                return
                              }
                              window.open(String(episode.download_link), '_blank')
                            }}
                          >
                            دانلود
                          </button>

                          {(!isFinished || isMovie) && (
                            <button
                              className="py-1 px-3 rounded-md bg-muted hover:bg-muted/50 border"
                              aria-label={`دانلود زیرنویس قسمت ${toPersianNumber(episode.number)}`}
                              onClick={() => {
                                if (!episode.subtitle_link) {
                                  showAlert('زیرنویس برای این قسمت موجود نیست')
                                  return
                                }
                                window.open(String(episode.subtitle_link), '_blank')
                              }}
                            >
                              زیرنویس
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {downloadTab === 'subtitle_packs' && (
                <div className="space-y-2">
                  {Array.isArray(anime?.subtitle_packs) && anime.subtitle_packs.length > 0 ? (
                    anime.subtitle_packs.map((p) => (
                      <div
                        key={String(p.id)}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="text-sm text-foreground font-medium line-clamp-1">
                            {p.title || 'پک زیرنویس'}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            زیرنویس کامل {p.title || '---'}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="py-1 px-3 rounded-md bg-muted border hover:bg-muted/50"
                          onClick={() => {
                            if (!p.subtitle_link) {
                              showAlert('لینک پک زیرنویس موجود نیست')
                              return
                            }
                            window.open(String(p.subtitle_link), '_blank')
                          }}
                        >
                          دانلود
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">پک زیرنویس ثبت نشده</div>
                  )}
                </div>
              )}

              {downloadTab === 'translators' && (
                <div className="space-y-2">
                  {translatorLinks.length === 0 ? (
                    <div className="text-sm text-muted-foreground">مترجمی ثبت نشده</div>
                  ) : (
                    translatorLinks.map((l) => (
                      <Link
                        key={String(l.id)}
                        to={`/translators/${encodeURIComponent(String(l.translator.slug))}`}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border border-border">
                            {l.translator.avatar_url ? (
                              <img
                                src={String(l.translator.avatar_url)}
                                alt={l.translator.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="text-sm text-foreground font-medium line-clamp-1">
                              {l.translator.name}
                            </div>
                            {l.role ? (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {l.role}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <ExternalLink className="h-4 w-4" />
                          <span>مشاهده</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'similar' && (
            <div className="space-y-3 pb-4">
              {similarLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                </div>
              ) : similarAnime.length > 0 ? (
                <div className="grid grid-cols-3 gap-x-2 gap-y-4">
                  {similarAnime.map((item) => (
                    <Link
                      key={item.id}
                      to={`/anime/${item.id}`}
                      className="block"
                      aria-label={`مشاهده ${item.title}`}
                    >
                      <div className="card">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border-2 border-border">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover absolute inset-0"
                            loading="lazy"
                          />
                        </div>
                        <div className="mt-2 text-center">
                          <h3 className="text-xs font-medium line-clamp-2 text-foreground">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {anime.genres.length > 0
                    ? 'انیمه مشابهی در کاتالوگ شیوری پیدا نشد.'
                    : 'ژانری برای پیشنهاد آثار مشابه ثبت نشده.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnimeDetail
