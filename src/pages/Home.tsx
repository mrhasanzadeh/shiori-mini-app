import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchAnimeList, fetchSchedule } from '../utils/api'
import { useCacheStore } from '../store/cacheStore'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import FeaturedSlider from '../components/FeaturedSlider'

interface Anime {
  id: number
  title: string
  image: string
  episode: string
  isNew: boolean
  description: string
  genres: string[]
}

interface SliderSection {
  id: string
  title: string
  fetchData: () => Promise<Anime[]>
  setCache: (data: Anime[]) => void
}

const Home = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string | null>>({})
  
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
      // Check if we have cached data
      if (featuredAnime.length > 0) {
        return
      }

      try {
        setLoading(prev => ({ ...prev, featured: true }))
        setError(prev => ({ ...prev, featured: null }))
        const data = await fetchAnimeList('latest')
        setFeaturedAnime(data)
      } catch (err) {
        setError(prev => ({ 
          ...prev, 
          featured: 'خطا در بارگذاری انیمه‌های ویژه' 
        }))
        console.error('Failed to load featured anime:', err)
      } finally {
        setLoading(prev => ({ ...prev, featured: false }))
      }
    }

    loadFeaturedAnime()
  }, [])

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
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )
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
                  <div className="relative aspect-[2/3] overflow-hidden">
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
      <FeaturedSlider animeList={featuredAnime} loading={featuredLoading} />
      
      <div className="space-y-8 mt-8 pb-24">
        {sections.map((section) => (
          <div key={section.id} className="space-y-6 px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-100">
                {section.title}
              </h2>
              <div className="flex items-center gap-2 text-primary-500 hover:text-primary-600">
                <Link
                  to={`/anime/${section.id}`}
                  className="text-sm transition-colors duration-200"
                  aria-label="مشاهده همه"
                >
                  مشاهده همه
                </Link>
                <ArrowLeftIcon className="w-4 h-4" />
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