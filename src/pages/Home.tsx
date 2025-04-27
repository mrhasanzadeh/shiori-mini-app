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

interface ScheduleAnime {
  id: number;
  title: string;
  image: string;
  time: string;
  episode: string;
}

const Home = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string | null>>({})
  const [featuredAnime, setFeaturedAnime] = useState<Anime[]>([])
  const [featuredLoading, setFeaturedLoading] = useState(true)
  const [schedule, setSchedule] = useState<Record<string, ScheduleAnime[]>>({})
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [activeDay, setActiveDay] = useState('')
  
  const { 
    getAnimeBySection,
    setLatestAnime,
    setPopularAnime,
    setNewEpisodes,
    setMovies
  } = useCacheStore()

  useEffect(() => {
    const loadFeaturedAnime = async () => {
      try {
        setFeaturedLoading(true)
        const data = await fetchAnimeList('latest')
        setFeaturedAnime(data)
      } catch (err) {
        console.error('Failed to load featured anime:', err)
      } finally {
        setFeaturedLoading(false)
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

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setScheduleLoading(true)
        const data = await fetchSchedule()
        setSchedule(data)
        // Set active day to current day or first available day
        const today = new Date().toLocaleDateString('fa-IR', { weekday: 'long' })
        setActiveDay(Object.keys(data).includes(today) ? today : Object.keys(data)[0])
      } catch (err) {
        console.error('Failed to load schedule:', err)
      } finally {
        setScheduleLoading(false)
      }
    }

    loadSchedule()
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
            <SwiperSlide key={anime.id} className="!w-48">
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
                    <h3 className="font-medium line-clamp-1 text-gray-100">
                      {anime.title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
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

        {/* Weekly Schedule */}
        <div className="card mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-100">برنامه پخش هفتگی</h2>
            <Link 
              to="/schedule" 
              className="text-primary-500 text-sm"
              aria-label="مشاهده برنامه پخش هفتگی"
            >
              مشاهده همه
            </Link>
          </div>

          {scheduleLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Days Tabs */}
              <div className="flex justify-between overflow-x-auto pb-2 -mx-4 px-2">
                {Object.keys(schedule).map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`p-2 rounded-lg text-sm whitespace-nowrap ${
                      activeDay === day
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-400'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Anime List for Active Day */}
              <div className="space-y-2">
                {schedule[activeDay]?.map((anime) => (
                  <Link
                    key={anime.id}
                    to={`/anime/${anime.id}`}
                    className="flex bg-gray-950 gap-4 p-2 rounded-lg"
                  >
                    <img
                      src={anime.image}
                      alt={anime.title}
                      className="w-12 h-16 object-cover rounded"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0 mt-1">
                      <h3 className="font-medium text text-gray-100 line-clamp-1">
                        {anime.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-primary-500">
                          {anime.episode}
                        </span>
                        &nbsp;|&nbsp;
                        <span className="text-sm text-gray-400">
                          {anime.time}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home 