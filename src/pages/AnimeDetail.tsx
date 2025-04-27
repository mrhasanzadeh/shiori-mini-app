import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PlayIcon, ArrowDownTrayIcon, HeartIcon } from '@heroicons/react/24/outline'
import { useAnime } from '../hooks/useAnime'
import { useTelegramApp } from '../hooks/useTelegramApp'

interface Episode {
  id: number
  number: number
  title: string
}

interface Anime {
  id: number
  title: string
  image: string
  description: string
  status: string
  genres: string[]
  episodes: Episode[]
}

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { loadAnimeById, toggleFavorite, isFavorite } = useAnime()
  const { showAlert } = useTelegramApp()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnime = async () => {
      if (!id) return
      try {
        setLoading(true)
        const data = await loadAnimeById(parseInt(id))
        if (data) {
          setAnime(data)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
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

  const handleFavorite = () => {
    toggleFavorite(anime.id)
    showAlert(isFavorite(anime.id) ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد')
  }

  return (
    <div className="space-y-6">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64">
        <img
          src={anime.image}
          alt={anime.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 right-4 text-white">
          <h1 className="text-2xl font-bold">{anime.title}</h1>
          <p className="text-sm mt-1">{anime.status}</p>
        </div>
        <button
          onClick={handleFavorite}
          className="absolute top-4 left-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          aria-label={isFavorite(anime.id) ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
        >
          <HeartIcon className={`w-6 h-6 ${isFavorite(anime.id) ? 'text-red-500 fill-current' : 'text-white'}`} />
        </button>
      </div>

      {/* Description */}
      <div className="card p-4">
        <h2 className="text-lg font-medium mb-2">خلاصه داستان</h2>
        <p className="text-sm text-gray-400">
          {anime.description}
        </p>
      </div>

      {/* Genres */}
      <div className="flex flex-wrap gap-2">
        {anime.genres.map((genre) => (
          <span
            key={genre}
            className="px-3 py-1 bg-gray-800 rounded-full text-sm"
          >
            {genre}
          </span>
        ))}
      </div>

      {/* Episodes */}
      <div className="card p-4">
        <h2 className="text-lg font-medium mb-4">قسمت‌ها</h2>
        <div className="space-y-3">
          {anime.episodes.map((episode) => (
            <div
              key={episode.id}
              className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
            >
              <div>
                <h3 className="font-medium">{episode.title}</h3>
              </div>
              <div className="flex space-x-2">
                <button 
                  className="btn btn-primary"
                  aria-label={`پخش ${episode.title}`}
                >
                  <PlayIcon className="w-5 h-5" />
                </button>
                <button 
                  className="btn btn-secondary"
                  aria-label={`دانلود ${episode.title}`}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnimeDetail 