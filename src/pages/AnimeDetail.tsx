import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FavouriteIcon, 
  Clock01Icon,
  Video01Icon,
  Building01Icon,
  Calendar01Icon,
  Calendar02Icon,
} from 'hugeicons-react'
import { useAnime } from '../hooks/useAnime'
import { useTelegramApp } from '../hooks/useTelegramApp'
import type { GenreItem } from '../services/supabaseAnime'

import malLogo from '../assets/images/mal-logo.png'
import alLogo from '../assets/images/anilist-logo.svg'

interface Episode {
  id: string | number
  season_number?: number
  number: number
  title: string
  download_link?: string
  subtitle_link?: string
}

interface SubtitlePack {
  id: string | number
  season_number?: number
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
  producers: string[]
  season: string
  year?: number
  startDate: string
  endDate: string
  score?: number;
}

type TabType = 'info' | 'episodes'
type EpisodeSubTab = 'episodes' | 'subtitles'

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { loadAnimeById, toggleFavorite, isFavorite } = useAnime()
  const { showAlert } = useTelegramApp()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number>(1)
  const [episodeSubTab, setEpisodeSubTab] = useState<EpisodeSubTab>('episodes')

  // Reset active tab when anime ID changes
  useEffect(() => {
    setActiveTab('info')
    setSelectedSeason(1)
    setEpisodeSubTab('episodes')
  }, [id])

  const isDonghua = String(anime?.format ?? '').trim().toUpperCase() === 'ONA (CHINESE)'
  const isMovie = String(anime?.format ?? '').trim().toUpperCase() === 'MOVIE'

  const toPersianNumber = (num: number | string): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/[0-9]/g, (w) => persianDigits[+w]);
  };

  const trangrayStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'RELEASING': 'در حال پخش',
      'FINISHED': 'پایان یافته',
      'NOT_YET_RELEASED': 'هنوز پخش نشده',
      'CANCELLED': 'لغو شده',
      'HIATUS': 'متوقف شده'
    };
    return statusMap[status] || status;
  };

  const translateSeason = (season: string): string => {
    switch (season) {
      case 'WINTER': return 'زمستان'
      case 'SPRING': return 'بهار'
      case 'SUMMER': return 'تابستان'
      case 'FALL': return 'پاییز'
      default: return season
    }
  }

  const toJalaliDate = (value?: string) => {
    if (!value) return 'نامشخص'

    const raw = String(value).trim()
    const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (!match) return toPersianNumber(raw)

    const gy = Number(match[1])
    const gm = Number(match[2])
    const gd = Number(match[3])
    if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd)) return toPersianNumber(raw)

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
      const jd = 1 + (days < 186 ? (days % 31) : ((days - 186) % 30))
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

          const seasons = Array.from(
            new Set((nextAnime.episodes || []).map((e) => (typeof e.season_number === 'number' ? e.season_number : 1)))
          ).sort((a, b) => a - b)

          setSelectedSeason(seasons[0] ?? 1)
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

  const handleFavorite = () => {
    if (!anime) return
    toggleFavorite(anime.id)
    showAlert(isFavorite(anime.id) ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error || !anime) {
    return (
      <div className="text-center text-red-500 p-4">
        {error || 'انیمه مورد نظر یافت نشد'}
      </div>
    )
  }

  // Truncate description if needed
  const shouldTruncate = anime.description.length > 150
  const truncatedDescription = shouldTruncate && !showFullDescription
    ? `${anime.description.substring(0, 150)}...`
    : anime.description

  const seasons = Array.from(
    new Set((anime.episodes || []).map((e) => (typeof e.season_number === 'number' ? e.season_number : 1)))
  ).sort((a, b) => a - b)

  const isFinished = String(anime.airing_status ?? anime.status ?? '')
    .trim()
    .toUpperCase() === 'FINISHED'

  const filteredEpisodes = (anime.episodes || []).filter(
    (episode) => (typeof episode.season_number === 'number' ? episode.season_number : 1) === selectedSeason
  )

  return (
    <div className="bg-gray-950 min-h-screen pb-20">
      {/* Header */}
      <div className="relative">
        {/* Banner image */}
        <div className="h-64 overflow-hidden absolute top-0 w-full">
          <img 
            src={anime.featured_image} 
            alt="" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950"></div>
        </div>
        
        {/* Anime info overlay */}
        <div className="container pt-24 mx-auto px-4">
          <div className="flex flex-col items-center relative z-10">
            {/* Anime poster */}
            <div className="w-40 rounded-xl overflow-hidden border-2 border-white/10 shadow-inner">
              <img 
                src={anime.image} 
                alt={anime.title} 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Basic info */}
            <div className="flex-1 mt-4">
              <h1 className="text-xl text-center font-semibold text-white line-clamp-4">{anime.title}</h1>
              
              {/* Genres pills */}
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {anime.genres.map((genre) => (
                  <button
                    key={genre.slug}
                    type="button"
                    className="px-2 py-0.5 bg-gray-800/80 rounded-full text-xs text-gray-300"
                    onClick={() => navigate(`/search?genre=${encodeURIComponent(genre.name_fa || genre.name_en || genre.slug)}`)}
                  >
                    {genre.name_fa || genre.name_en || genre.slug}
                  </button>
                ))}
              </div>
              
              {/* Rating and action buttons in a single row */}
              <div className="flex items-center justify-center mt-3 gap-2">
                  <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-1 pe-2 py-1">
                    <img src={malLogo} className="w-6 h-6 rounded" alt="" />
                    <span className="text-sm text-white font-medium">
                      {typeof anime.animeListScore === 'number' ? toPersianNumber(anime.animeListScore.toFixed(1)) : '8.24'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-1 pe-2 py-1">
                    <img src={alLogo} className="w-6 h-6 rounded" alt="" />
                    <span className="text-sm text-white font-medium">
                      {typeof anime.animeListScore === 'number' ? toPersianNumber(anime.animeListScore.toFixed(1)) : '8.24'}
                    </span>
                  </div>
                {/* Action buttons in a connected container */}
                <div className="flex bg-gray-800/60 rounded-full">
                  <button 
                    onClick={handleFavorite}
                    className="p-2 rounded-full hover:bg-gray-700/70"
                    aria-label={isFavorite(anime.id) ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                  >
                    {isFavorite(anime.id) ? (
                      <FavouriteIcon className="w-5 h-5 text-red-500 fill-red-500" />
                    ) : (
                      <FavouriteIcon className="w-5 h-5 text-white" />
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
          <p className="text-gray-400 text-sm text-center">
            {truncatedDescription}
          </p>
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
        <div className="border-b border-gray-700">
          <div className="flex">
            <button
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'info' ? 'text-primary-400 border-b border-primary-500' : 'text-gray-400'
              }`}
              onClick={() => setActiveTab('info')}
            >
              اطلاعات
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'episodes' ? 'text-primary-500 border-b border-primary-500' : 'text-gray-400'
              }`}
              onClick={() => setActiveTab('episodes')}
            >
              قسمت‌ها
            </button>
            <button
              className="py-2 px-4 text-sm font-medium text-gray-500"
              onClick={() => {}}
              aria-disabled={true}>
              آثار مشابه <span className="px-2 py-0.5 text-xs mr-1 font-light bg-white/20 text-white rounded-full">به‌زودی</span>
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className='mt-4'>
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex justify-between items-center pb-4 border-b border-b-gray-800">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Clock01Icon className="w-5 h-5 text-primary-400" />
                    نوع
                  </span>
                  <span className="text-white text-sm">{trangrayStatus(anime.status)}</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-b-gray-800">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Video01Icon className="w-5 h-5 text-primary-400" />
                    تعداد قسمت‌ها
                  </span>
                  <span className="text-white text-sm">{toPersianNumber(anime.episodes_count)} قسمت</span>
                </div>

                <div className="flex justify-between items-center py-4 border-b border-b-gray-800">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Building01Icon className="w-5 h-5 text-primary-400" />
                    استودیو
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {anime.studios?.map((studio, index) => (
                      <span key={studio} className="text-white text-sm">
                        {studio}{index < anime.studios.length - 1 ? '، ' : ''}
                      </span>
                    )) || <span className="text-white  text-sm">نامشخص</span>}
                  </div>
                </div>

                {!isDonghua && (
                  <div className="flex justify-between items-center py-4 border-b border-b-gray-800">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      <Calendar01Icon className="w-5 h-5 text-primary-400" />
                      فصل پخش
                    </span>
                    {anime.season && typeof anime.year === 'number' ? (
                      <button
                        type="button"
                        className="text-sm text-primary-300 font-medium"
                        onClick={() => {
                          const seasonKey = String(anime.season).toUpperCase()
                          navigate(`/search?year=${anime.year}&season=${encodeURIComponent(seasonKey)}`)
                        }}
                      >
                        {translateSeason(String(anime.season).toUpperCase())} {toPersianNumber(anime.year)}
                      </button>
                    ) : (
                      <span className="text-white text-sm">{anime.season || 'نامشخص'}</span>
                    )}
                  </div>
                )}

                <div className={`flex justify-between items-center py-4 ${isMovie ? '' : 'border-b border-b-gray-800'}`}>
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Calendar01Icon className="w-5 h-5 text-primary-400" />
                    {isMovie ? 'تاریخ اکران' : 'تاریخ شروع'}
                  </span>
                  <span className="text-white text-sm">{toJalaliDate(anime.startDate)}</span>
                </div>

                {!isMovie && (
                  <div className="flex justify-between items-center py-4">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      <Calendar02Icon className="w-5 h-5 text-primary-400" />
                      تاریخ پایان
                    </span>
                    <span className="text-white text-sm">
                      {anime.status === 'RELEASING' ? 'در حال پخش' : anime.status === 'NOT_YET_RELEASED' ? 'هنوز پخش نشده' : toJalaliDate(anime.endDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Episodes Tab */}
          {activeTab === 'episodes' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center gap-2">
                {seasons.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {seasons.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSeason(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                          selectedSeason === s ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-300'
                        }`}
                        aria-pressed={selectedSeason === s}
                      >
                        فصل {toPersianNumber(s)}
                      </button>
                    ))}
                  </div>
                )}

                {isFinished && (
                  <div className="flex gap-1 pb-2">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                        episodeSubTab === 'episodes' ? 'bg-white/10 text-white' : 'text-gray-300'
                      }`}
                      onClick={() => setEpisodeSubTab('episodes')}
                      aria-pressed={episodeSubTab === 'episodes'}
                    >
                      قسمت‌ها
                    </button>
                     <button
                      type="button"
                      className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                        episodeSubTab === 'subtitles' ? 'bg-white/10 text-white' : 'text-gray-300'
                      }`}
                      onClick={() => setEpisodeSubTab('subtitles')}
                      aria-pressed={episodeSubTab === 'subtitles'}
                    >
                      زیرنویس
                    </button>
                  </div>
                )}
              </div>

              {episodeSubTab === 'episodes' && (
                <>
                  {filteredEpisodes.map((episode) => (
                    <div
                      key={episode.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-md"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-white">
                          قسمت {toPersianNumber(episode.number)}
                          {episode.season_number && seasons.length > 1 && (
                            <span className="text-xs text-gray-400 ms-2">
                              فصل {toPersianNumber(episode.season_number)}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">زیرنویس چسبیده | 1080p x265</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          className="py-2 px-3 rounded-lg bg-white/5"
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

                      {!isFinished && (
                          <button
                          className="py-2 px-3 rounded-lg bg-white/5"
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
                  ))}
                </>
              )}

              {episodeSubTab === 'subtitles' && (
                <>
                  {(anime.subtitle_packs || [])
                    .filter(
                      (p) => (typeof p.season_number === 'number' ? p.season_number : 1) === selectedSeason
                    )
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-md">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-white">{p.title || 'زیرنویس پک‌شده'}</span>
                          <span className="text-xs text-gray-400">زیرنویس کامل فصل {toPersianNumber(selectedSeason)}</span>
                        </div>
                        <button
                          className="py-2 px-3 rounded-lg bg-white/5"
                          aria-label="دانلود زیرنویس پک‌شده"
                          onClick={() => {
                            if (!p.subtitle_link) {
                              showAlert('لینک زیرنویس پک‌شده موجود نیست')
                              return
                            }
                            window.open(String(p.subtitle_link), '_blank')
                          }}
                        >
                          دانلود
                        </button>
                      </div>
                    ))}

                  {(anime.subtitle_packs || []).filter(
                    (p) => (typeof p.season_number === 'number' ? p.season_number : 1) === selectedSeason
                  ).length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-4">
                      زیرنویس پک‌شده‌ای برای این فصل ثبت نشده
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnimeDetail