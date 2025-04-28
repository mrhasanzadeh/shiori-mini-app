import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSchedule } from '../utils/api'
import { useCacheStore } from '../store/cacheStore'

interface Anime {
  id: number
  title: string
  image: string
  episode: string
  time: string
  airingAt: number
}

interface Schedule {
  [key: string]: Anime[]
}

const Schedule = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState('شنبه')
  
  const { setSchedule, getSchedule } = useCacheStore()
  const cachedSchedule = getSchedule()

  useEffect(() => {
    const loadSchedule = async () => {
      // Check if we have cached data
      if (Object.keys(cachedSchedule).length > 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await fetchSchedule()
        setSchedule(data)
      } catch (err) {
        setError('خطا در بارگذاری برنامه پخش')
        console.error('Failed to load schedule:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
  }, [])

  if (loading && Object.keys(cachedSchedule).length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error && Object.keys(cachedSchedule).length === 0) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    )
  }

  const days = Object.keys(cachedSchedule)

  return (
    <div className="card mx-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium text-gray-100">برنامه پخش هفتگی</h1>
      </div>

      <div className="space-y-4">
        {/* Days Tabs */}
        <div className="flex justify-between overflow-x-auto pb-2 -mx-4 px-2">
          {days.map((day) => (
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
          {cachedSchedule[activeDay]?.map((anime) => (
            <Link
              key={anime.id}
              to={`/anime/${anime.id}`}
              className="flex bg-gray-900 gap-4 p-2 rounded-lg"
            >
              <img
                src={anime.image}
                alt={anime.title}
                className="w-12 h-16 object-cover rounded"
                loading="lazy"
              />
              <div className="flex-1 min-w-0 mt-1">
                <h2 className="font-medium text text-gray-100 line-clamp-1">
                  {anime.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-primary-400">
                    {anime.episode}
                  </span>
                  <span className="text-sm text-gray-400">
                    ساعت: {anime.time}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Schedule 