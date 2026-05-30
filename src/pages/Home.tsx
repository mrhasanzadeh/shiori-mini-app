import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchAnimeCards } from '../utils/api'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import { ArrowLeft01Icon } from 'hugeicons-react'
import type { GenreItem } from '../services/supabaseAnime'
// Removed full-screen FeaturedSlider in favor of compact hero card on Home
type Anime = {
  id: number | string
  title: string
  image: string
  featuredImage?: string
  description?: string
  status?: string
  genres?: GenreItem[]
  episodes?: number
  isNew?: boolean
  isFeatured?: boolean
  episode?: string
  averageScore?: number
  season?: string
  year?: number
}

interface SliderSection {
  id: string
  title: string
  fetchData: () => Promise<Anime[]>
  setCache: (data: Anime[]) => void
}

// Skeleton Card Component
const SkeletonCard = () => (
  <div className="card animate-pulse">
    <div className="relative aspect-[2/3] overflow-hidden bg-muted rounded-lg" />
    <div className="mt-3">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2 mt-2" />
    </div>
  </div>
)

// Skeleton Slider Component
const SkeletonSlider = () => (
  <div className="relative">
    <Swiper modules={[FreeMode]} spaceBetween={16} slidesPerView="auto" freeMode={true}>
      {[...Array(5)].map((_, index) => (
        <SwiperSlide key={index} className="!w-40">
          <SkeletonCard />
        </SwiperSlide>
      ))}
    </Swiper>
  </div>
)

const Home = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string | null>>({})
  const [sectionData, setSectionData] = useState<Record<string, Anime[]>>({})
  const [selectedType, setSelectedType] = useState<'anime' | 'movie' | 'donghua'>('anime')

  const [featuredAnime, setFeaturedAnime] = useState<Anime[]>([])
  const featuredLoading = loading['featured'] || false

  useEffect(() => {
    const loadFeaturedAnime = async () => {
      try {
        setLoading((prev) => ({ ...prev, featured: true }))
        setError((prev) => ({ ...prev, featured: null }))

        // Map tabs to existing API sections. Donghua currently proxies to popular.
        const sectionKey =
          selectedType === 'movie' ? 'movies' : selectedType === 'donghua' ? 'donghua' : 'latest'
        const data = await fetchAnimeCards(sectionKey)
        const featuredOnly = data.filter((a) => Boolean(a.isFeatured))
        setFeaturedAnime(featuredOnly)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطا در بارگذاری پیشنهاد ویژه'
        setError((prev) => ({
          ...prev,
          featured: message,
        }))
        console.error('Failed to load featured anime:', err)
      } finally {
        setLoading((prev) => ({ ...prev, featured: false }))
      }
    }

    loadFeaturedAnime()
  }, [selectedType])

  // Build dynamic current season/year title (prefer cache from schedule)
  const toPersianNumber = (num: number | string): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
  }

  const translateSeason = (season: string): string => {
    switch (season) {
      case 'WINTER':
        return 'زمستان'
      case 'SPRING':
        return 'بهار'
      case 'SUMMER':
        return 'تابستان'
      case 'FALL':
        return 'پاییز'
      default:
        return season
    }
  }

  const scheduleInfo = { currentSeason: '', currentYear: new Date().getFullYear() }
  const fallbackSeason = (() => {
    const month = new Date().getMonth()
    if (month >= 0 && month < 3) return 'WINTER'
    if (month >= 3 && month < 6) return 'SPRING'
    if (month >= 6 && month < 9) return 'SUMMER'
    return 'FALL'
  })()
  const currentSeasonFa = translateSeason(scheduleInfo.currentSeason || fallbackSeason)
  const currentYearFa = toPersianNumber(
    (scheduleInfo.currentYear || new Date().getFullYear()).toString()
  )
  const currentSeasonKey = (scheduleInfo.currentSeason || fallbackSeason).toUpperCase()
  const currentYearNumber = scheduleInfo.currentYear || new Date().getFullYear()

  const sections: SliderSection[] = [
    {
      id: 'latest',
      title: ` ${currentSeasonFa} ${currentYearFa}`,
      fetchData: () => fetchAnimeCards('latest') as Promise<Anime[]>,
      setCache: () => {},
    },
    {
      id: 'popular',
      title: 'محبوب‌ترین‌ها',
      fetchData: () => fetchAnimeCards('popular') as Promise<Anime[]>,
      setCache: () => {},
    },
    {
      id: 'donghua',
      title: 'دونگهوا',
      fetchData: () => fetchAnimeCards('donghua') as Promise<Anime[]>,
      setCache: () => {},
    },
    {
      id: 'movies',
      title: 'انیمه‌های سینمایی',
      fetchData: () => fetchAnimeCards('movies') as Promise<Anime[]>,
      setCache: () => {},
    },
  ]

  useEffect(() => {
    const loadAnime = async (section: SliderSection) => {
      try {
        setLoading((prev) => ({ ...prev, [section.id]: true }))
        setError((prev) => ({ ...prev, [section.id]: null }))
        const data = await section.fetchData()
        setSectionData((prev) => ({ ...prev, [section.id]: data }))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطا در بارگذاری لیست انیمه‌ها'
        setError((prev) => ({
          ...prev,
          [section.id]: message,
        }))
        console.error('Failed to load anime list:', err)
      } finally {
        setLoading((prev) => ({ ...prev, [section.id]: false }))
      }
    }

    sections.forEach((section) => loadAnime(section))
  }, [])

  const renderSlider = (section: SliderSection) => {
    const rawList = sectionData[section.id] || []
    const animeList =
      section.id === 'latest'
        ? rawList.filter(
            (a) =>
              typeof a.year === 'number' &&
              a.year === currentYearNumber &&
              String(a.season ?? '').toUpperCase() === currentSeasonKey
          )
        : rawList
    const isLoading = loading[section.id]
    const hasError = error[section.id]

    if (isLoading && animeList.length === 0) {
      return <SkeletonSlider />
    }

    if (hasError && animeList.length === 0) {
      return <div className="text-center text-red-500 p-4">{hasError}</div>
    }

    if (!isLoading && !hasError && animeList.length === 0) {
      return (
        <div className="text-center text-muted-foreground p-4 text-sm">
          <p>انیمه‌ای لود نشد.</p>
          <p className="mt-2 text-xs max-w-xs mx-auto">
            اگر در Supabase داده دارید، در SQL Editor این را اجرا کنید: Enable RLS و سپس policy با
            نام Allow public read برای SELECT روی جدول anime.
          </p>
        </div>
      )
    }

    return (
      <div className="relative">
        <Swiper modules={[FreeMode]} spaceBetween={8} slidesPerView="auto" freeMode={true}>
          {animeList.map((anime) => (
            <SwiperSlide key={anime.id} className="!w-40">
              <Link
                to={`/anime/${anime.id}`}
                className="block"
                aria-label={`مشاهده ${anime.title}`}
              >
                <div className="card">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border-2 border-input/80 border-b-input/40">
                    <img
                      src={anime.image}
                      alt={anime.title}
                      className="w-full h-full object-cover absolute inset-0"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="text-sm font-medium line-clamp-2 text-foreground">
                      {anime.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-[2px]">زیرنویس چسبیده | 1080p</p>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    )
  }

  return (
    <div>
      {/* Top Tabs: Anime - Movie - Donghua */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl w-full mx-auto border border-border bg-card/30 backdrop-blur-xl shadow-lg">
          {[
            { id: 'anime', label: 'انیمه' },
            { id: 'movie', label: 'انیمه سینمایی' },
            { id: 'donghua', label: 'دونگهوا' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as 'anime' | 'movie' | 'donghua')}
              className={`flex-1 text-center text-sm border border-transparent p-2 rounded-lg transition-all ${
                selectedType === (tab.id as 'anime' | 'movie' | 'donghua')
                  ? 'bg-card text-foreground font-medium shadow-md border !border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
              aria-pressed={selectedType === (tab.id as 'anime' | 'movie' | 'donghua')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Hero Carousel with peeking prev/next slides */}
      <div className="mt-4">
        {featuredLoading ? (
          <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-muted animate-pulse" />
        ) : featuredAnime.length > 0 ? (
          <Swiper
            modules={[Autoplay]}
            centeredSlides={true}
            loop={true}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
            spaceBetween={12}
            slidesPerView={1.2}
            breakpoints={{
              480: { slidesPerView: 1.15 },
              640: { slidesPerView: 1.22 },
              768: { slidesPerView: 1.3 },
            }}
            className="h-56"
          >
            {featuredAnime.slice(0, 8).map((anime) => (
              <SwiperSlide key={anime.id} className="!h-full">
                <Link to={`/anime/${anime.id}`} className="block group h-full">
                  <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-lg border-2 border-input/80 border-b-input/40">
                    <img
                      src={anime.featuredImage || anime.image}
                      alt={anime.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    <div className="absolute h-1/2 -bottom-1 left-0 right-0 bg-gradient-to-t from-background to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
                      <h2 className="font-bold text-foreground line-clamp-1 text-left">
                        {anime.title}
                      </h2>
                      <div className="flex justify-end items-center gap-1 mb-2">
                        {(anime.genres || []).slice(0, 4).map((g) => (
                          <span
                            key={g.slug}
                            className="px-2 py-0.5 text-xs rounded-md bg-black/50 text-foreground border border-border"
                          >
                            {g.name_fa || g.name_en || g.slug}
                          </span>
                        ))}
                      </div>
                      {/* <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{anime.description}</p> */}
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-muted" />
        )}
      </div>

      <div className="space-y-8 mt-8 pb-24">
        {sections.map((section) => (
          <div key={section.id} className="space-y-6 px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              <div className="flex items-center gap-2 text-primary-400">
                <Link
                  to="/search"
                  className="text-sm transition-colors duration-200"
                  aria-label="مشاهده همه"
                >
                  مشاهده همه
                </Link>
                <ArrowLeft01Icon className="w-4 h-4" />
              </div>
            </div>
            {renderSlider(section)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Home
