import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchAnimeList } from '../utils/api'
import { useCacheStore } from '../store/cacheStore'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import { ArrowLeft01Icon } from 'hugeicons-react'
// Removed full-screen FeaturedSlider in favor of compact hero card on Home
import { Anime } from "../store/cacheStore"

interface SliderSection {
  id: string
  title: string
  fetchData: () => Promise<Anime[]>
  setCache: (data: Anime[]) => void
}

// Skeleton Card Component
const SkeletonCard = () => (
  <div className="card animate-pulse">
    <div className="relative aspect-[2/3] overflow-hidden bg-gray-800 rounded-lg" />
    <div className="mt-3">
      <div className="h-4 bg-gray-800 rounded w-3/4" />
      <div className="h-3 bg-gray-800 rounded w-1/2 mt-2" />
    </div>
  </div>
)

// Skeleton Slider Component
const SkeletonSlider = () => (
  <div className="relative">
    <Swiper
      modules={[FreeMode]}
      spaceBetween={16}
      slidesPerView="auto"
      freeMode={true}
    >
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
  const [selectedType, setSelectedType] = useState<'anime' | 'movie' | 'donghua'>('anime')
  
  const { 
    getAnimeBySection,
    setLatestAnime,
    setPopularAnime,
    setNewEpisodes,
    setMovies,
    setFeaturedAnime
  } = useCacheStore()

  const featuredAnime = getAnimeBySection('featured')
  const featuredLoading = loading['featured'] || false

  useEffect(() => {
    const loadFeaturedAnime = async () => {
      try {
        setLoading(prev => ({ ...prev, featured: true }))
        setError(prev => ({ ...prev, featured: null }))

        // Map tabs to existing API sections. Donghua currently proxies to popular.
        const sectionKey = selectedType === 'movie' ? 'movies' : selectedType === 'donghua' ? 'popular' : 'latest'
        const data = await fetchAnimeList(sectionKey)
        setFeaturedAnime(data)
      } catch (err) {
        setError(prev => ({ 
          ...prev, 
          featured: 'خطا در بارگذاری پیشنهاد ویژه' 
        }))
        console.error('Failed to load featured anime:', err)
      } finally {
        setLoading(prev => ({ ...prev, featured: false }))
      }
    }

    loadFeaturedAnime()
  }, [selectedType])

  const sections: SliderSection[] = [
    { 
      id: 'latest', 
      title: 'بهار ۲۰۲۵',
      fetchData: () => fetchAnimeList('latest'),
      setCache: setLatestAnime
    },
    { 
      id: 'popular', 
      title: 'محبوب‌ترین‌ها',
      fetchData: () => fetchAnimeList('popular'),
      setCache: setPopularAnime
    },
    { 
      id: 'episodes', 
      title: 'قسمت‌های جدید',
      fetchData: () => fetchAnimeList('episodes'),
      setCache: setNewEpisodes
    },
    { 
      id: 'movies', 
      title: 'انیمه‌های سینمایی',
      fetchData: () => fetchAnimeList('movies'),
      setCache: setMovies
    }
  ]

  useEffect(() => {
    const loadAnime = async (section: SliderSection) => {
      // Check if we have cached data
      const cachedData = getAnimeBySection(section.id)
      if (cachedData.length > 0) {
        return
      }

      try {
        setLoading(prev => ({ ...prev, [section.id]: true }))
        setError(prev => ({ ...prev, [section.id]: null }))
        const data = await section.fetchData()
        section.setCache(data)
      } catch (err) {
        setError(prev => ({ 
          ...prev, 
          [section.id]: 'خطا در بارگذاری لیست انیمه‌ها' 
        }))
        console.error('Failed to load anime list:', err)
      } finally {
        setLoading(prev => ({ ...prev, [section.id]: false }))
      }
    }

    sections.forEach(section => loadAnime(section))
  }, [])

  const renderSlider = (section: SliderSection) => {
    const animeList = getAnimeBySection(section.id)
    const isLoading = loading[section.id]
    const hasError = error[section.id]

    if (isLoading && animeList.length === 0) {
      return <SkeletonSlider />
    }

    if (hasError && animeList.length === 0) {
      return (
        <div className="text-center text-red-500 p-4">
          {hasError}
        </div>
      )
    }

    return (
      <div className="relative">
        <Swiper
          modules={[FreeMode]}
          spaceBetween={16}
          slidesPerView="auto"
          freeMode={true}
        >
          {animeList.map((anime) => (
            <SwiperSlide key={anime.id} className="!w-40">
              <Link
                to={`/anime/${anime.id}`}
                className="block"
                aria-label={`مشاهده ${anime.title}`}
              >
                <div className="card">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border-2 border-t-white/10 border-r-white/10 border-l-white/10 border-b-white/5">
                    <img
                      src={anime.image}
                      alt={anime.title}
                      className="w-full h-full object-cover absolute inset-0"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-medium line-clamp-1 text-gray-100">
                      {anime.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-[2px]">
                      زیرنویس چسبیده | 1080p
                    </p>
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
        <div className="flex items-center gap-2 p-1 rounded-xl w-full mx-auto border border-white/10 bg-gray-900/40 backdrop-blur-xl shadow-lg">
          {[
            { id: 'anime', label: 'انیمه' },
            { id: 'movie', label: 'انیمه سینمایی' },
            { id: 'donghua', label: 'دونگهوا' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as 'anime' | 'movie' | 'donghua')}
              className={`flex-1 text-center text-sm border border-transparent px-2 py-2 rounded-lg transition-all ${
                selectedType === (tab.id as 'anime' | 'movie' | 'donghua')
                  ? 'bg-gray-900 text-white font-medium shadow-md border !border-white/20'
                  : 'text-gray-200 hover:text-white hover:bg-white/5'
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
          <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-gray-900 animate-pulse" />
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
                  <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-lg border-2 border-t-white/10 border-r-white/10 border-l-white/10 border-b-white/5">
                    <img
                      src={anime.image}
                      alt={anime.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute h-1/2 -bottom-1 left-0 right-0 bg-gradient-to-t from-gray-950 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
                      <h2 className="text-lg font-bold text-white line-clamp-1 mb-1">{anime.title}</h2>
                      <div className="flex items-center gap-1 mb-2">
                        {(anime.genres || []).slice(0, 2).map((g) => (
                          <span key={g} className="px-2 py-0.5 text-xs rounded-md bg-gray-800/80 text-gray-100 border border-white/10">
                            {g}
                          </span>
                        ))}
                        <span className="px-2 py-0.5 text-xs rounded-md bg-gray-800/80 text-gray-100 border border-white/10">زیرنویس چسبیده</span>
                      </div>
                      {/* <p className="text-gray-300 text-sm mt-1 line-clamp-2">{anime.description}</p> */}
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-gray-800" />
        )}
      </div>

      <div className="space-y-8 mt-8 pb-24">
        {sections.map((section) => (
          <div key={section.id} className="space-y-6 px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-100">
                {section.title}
              </h2>
              <div className="flex items-center gap-2 text-primary-400">
                <Link
                  to={`/anime/${section.id}`}
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