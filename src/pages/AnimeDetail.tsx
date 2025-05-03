import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  PlayIcon, 
  ArrowDownTrayIcon, 
  HeartIcon, 
  PlusIcon,
  StarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useAnime } from '../hooks/useAnime'
import { useTelegramApp } from '../hooks/useTelegramApp'
import { useCacheStore } from '../store/cacheStore'
import { useListsStore } from './MyList'

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

interface SimilarAnime {
  id: number;
  title: string;
  image: string;
}

type TabType = 'info' | 'episodes' | 'similar'

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { loadAnimeById, toggleFavorite, isFavorite } = useAnime()
  const { showAlert } = useTelegramApp()
  const { getAnimeDetails, setAnimeDetails } = useCacheStore()
  const { lists, addItem } = useListsStore()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showListSelector, setShowListSelector] = useState(false)
  const [similarAnime, setSimilarAnime] = useState<SimilarAnime[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)

  useEffect(() => {
    const fetchAnime = async () => {
      if (!id) return

      // Check cache first
      const cachedAnime = getAnimeDetails(parseInt(id))
      if (cachedAnime) {
        setAnime(cachedAnime)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await loadAnimeById(parseInt(id))
        if (data) {
          setAnime(data)
          // Cache the data
          setAnimeDetails(data.id, data)
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

  // Effect for loading similar anime when tab changes to 'similar'
  useEffect(() => {
    const fetchSimilarAnime = async () => {
      if (activeTab !== 'similar' || !anime || similarAnime.length > 0) return
      
      try {
        setLoadingSimilar(true)
        // این داده‌ها به صورت موقت هستند
        // در حالت واقعی باید از API گرفته شوند
        const mockSimilarAnime: SimilarAnime[] = [
          {
            id: 1,
            title: 'Demon Slayer',
            image: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg'
          },
          {
            id: 2,
            title: 'Jujutsu Kaisen',
            image: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg'
          },
          {
            id: 3,
            title: 'Attack on Titan',
            image: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg'
          },
          {
            id: 4,
            title: 'My Hero Academia',
            image: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg'
          },
          {
            id: 5,
            title: 'One Punch Man',
            image: 'https://cdn.myanimelist.net/images/anime/12/76049l.jpg'
          },
          {
            id: 6,
            title: 'Chainsaw Man',
            image: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg'
          }
        ];
        
        // شبیه‌سازی تأخیر شبکه
        setTimeout(() => {
          setSimilarAnime(mockSimilarAnime);
          setLoadingSimilar(false);
        }, 800);
        
      } catch (err) {
        console.error('Failed to load similar anime:', err);
        setLoadingSimilar(false);
      }
    };

    fetchSimilarAnime();
  }, [activeTab, anime]);

  const handleFavorite = () => {
    if (!anime) return
    toggleFavorite(anime.id)
    showAlert(isFavorite(anime.id) ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد')
  }

  const handleAddToList = (listId: string) => {
    if (!anime) return
    addItem(listId, anime.title)
    showAlert('به لیست اضافه شد')
    setShowListSelector(false)
  }

  // تابع رندر آثار مشابه
  const renderSimilarTab = () => {
    if (loadingSimilar) {
      return (
        <div className="flex items-center justify-center h-32 text-gray-400">
          <div className="text-center">
            <ArrowPathIcon className="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p className="text-sm">در حال بارگذاری آثار مشابه...</p>
          </div>
        </div>
      );
    }
    
    if (similarAnime.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-gray-400">
          <p className="text-sm">اثر مشابهی یافت نشد</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-3 gap-3">
        {similarAnime.map((anime) => (
          <Link 
            key={anime.id} 
            to={`/anime/${anime.id}`}
            className="block"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
              <img 
                src={anime.image} 
                alt={anime.title} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <h3 className="mt-1 text-sm text-white line-clamp-1">{anime.title}</h3>
          </Link>
        ))}
      </div>
    );
  };

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

  return (
    <div className="bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="relative">
        {/* Banner image */}
        <div className="h-64 overflow-hidden absolute top-0 w-full">
          <img 
            src={anime.image} 
            alt="" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black"></div>
        </div>
        
        {/* Anime info overlay */}
        <div className="container pt-32 mx-auto px-4">
          <div className="flex relative z-10">
            {/* Anime poster */}
            <div className="w-32 h-48 rounded-xl overflow-hidden border border-gray-700">
              <img 
                src={anime.image} 
                alt={anime.title} 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Basic info */}
            <div className="flex-1 ms-4">
              <h1 className="text-xl font-bold text-white line-clamp-4">{anime.title}</h1>
              
              {/* Genres pills */}
              <div className="flex flex-wrap gap-1 mt-2">
                {anime.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-0.5 bg-gray-800/80 rounded-full text-xs text-gray-300"
                  >
                    {genre}
                  </span>
                ))}
                {anime.genres.length > 3 && (
                  <span className="text-xs text-gray-400 px-1">+{anime.genres.length - 3}</span>
                )}
              </div>
              
              {/* Rating and action buttons in a single row */}
              <div className="flex items-center justify-between mt-3">
                {/* Rating with badge style */}
                <div className="flex items-center bg-gray-800/60 rounded-full px-3 py-1">
                  <StarIcon className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-white ms-1 font-medium">4.8</span>
                  <span className="text-xs text-gray-400 ms-1">(88.5K)</span>
                </div>
                
                {/* Action buttons in a connected container */}
                <div className="flex bg-gray-800/60 rounded-full">
                  <button 
                    onClick={handleFavorite}
                    className="p-2 rounded-full hover:bg-gray-700/70"
                    aria-label={isFavorite(anime.id) ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                  >
                    {isFavorite(anime.id) ? (
                      <HeartIconSolid className="w-5 h-5 text-red-500" />
                    ) : (
                      <HeartIcon className="w-5 h-5 text-white" />
                    )}
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowListSelector(!showListSelector)}
                      className="p-2 rounded-full hover:bg-gray-700/70"
                      aria-label="افزودن به لیست"
                    >
                      <PlusIcon className="w-5 h-5 text-white" />
                    </button>
                    
                    {/* List Selector Dropdown */}
                    {showListSelector && (
                      <div className="absolute top-full mt-2 left-0 w-48 bg-gray-800 rounded-lg shadow-lg p-2 z-20">
                        {lists.length > 0 ? (
                          lists.map(list => (
                            <button 
                              key={list.id}
                              onClick={() => handleAddToList(list.id)}
                              className="w-full text-right px-3 py-2 text-sm text-white hover:bg-gray-700 rounded"
                            >
                              {list.title}
                            </button>
                          ))
                        ) : (
                          <div className="text-center text-gray-400 py-2 text-sm">
                            لیستی موجود نیست
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Description */}
      <div className="container mx-auto px-4 mt-6">
          <p className="text-gray-300 text-sm">
            {truncatedDescription}
          </p>
          {shouldTruncate && (
            <button 
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="mt-1 text-primary-500 text-xs"
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
                activeTab === 'info' ? 'text-primary-500 border-b border-primary-500' : 'text-gray-400'
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
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'similar' ? 'text-primary-500 border-b border-primary-500' : 'text-gray-400'
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
              <div className="flex flex-col gap-3">
                <div className="flex items-start">
                  <span className="text-gray-400 text-sm w-20">وضعیت:</span>
                  <span className="text-white text-sm">{anime.status}</span>
                </div>
                
                <div className="flex items-start">
                  <span className="text-gray-400 text-sm w-20">تعداد قسمت‌ها:</span>
                  <span className="text-white text-sm">{anime.episodes.length} قسمت</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Episodes Tab */}
          {activeTab === 'episodes' && (
            <div className="space-y-2">
              {anime.episodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center justify-between p-2 bg-gray-800 rounded-md"
                >
                  <span className="text-sm text-white">{episode.title}</span>
                  <div className="flex space-x-1">
                    <button 
                      className="p-1.5 rounded-full bg-primary-500 hover:bg-primary-600"
                      aria-label={`پخش ${episode.title}`}
                    >
                      <PlayIcon className="w-4 h-4 text-white" />
                    </button>
                    <button 
                      className="p-1.5 rounded-full bg-gray-700 hover:bg-gray-600"
                      aria-label={`دانلود ${episode.title}`}
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Similar Tab */}
          {activeTab === 'similar' && (
            renderSimilarTab()
          )}
        </div>
      </div>
    </div>
  )
}

export default AnimeDetail 