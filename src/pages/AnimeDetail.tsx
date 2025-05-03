import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { 
  PlayIcon, 
  ArrowDownTrayIcon, 
  HeartIcon, 
  PlusIcon,
  ChevronDownIcon,
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
  const [scrollOpacity, setScrollOpacity] = useState(0)
  
  const imageOverlayRef = useRef<HTMLDivElement>(null)

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
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const imageHeight = 300; // should match the image height in CSS
      
      // Calculate opacity based on scroll position
      // Start adding overlay when scroll position is at 10% of the image height
      const startFade = imageHeight * 0.1;
      
      if (scrollY <= startFade) {
        setScrollOpacity(0);
      } else if (scrollY >= imageHeight) {
        setScrollOpacity(0.85); // Max opacity
      } else {
        // Linear interpolation between start and max
        const opacity = ((scrollY - startFade) / (imageHeight - startFade)) * 0.85;
        setScrollOpacity(opacity);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
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

  // Truncate description if needed
  const shouldTruncate = anime.description.length > 150
  const truncatedDescription = shouldTruncate && !showFullDescription
    ? `${anime.description.substring(0, 150)}...`
    : anime.description

  return (
    <div className="min-h-screen bg-black">
      {/* Fixed Background Header Image */}
      <div className="fixed top-0 left-0 w-full h-80 z-0 overflow-hidden">
        <img 
          src={anime.image} 
          alt="" 
          className="w-full h-full object-cover"
        />
        {/* Dynamic Overlay with opacity controlled by scroll */}
        <div 
          ref={imageOverlayRef}
          className="absolute inset-0 bg-black transition-opacity duration-200" 
          style={{ opacity: scrollOpacity }}
        ></div>
      </div>

      {/* Scrollable Content Container */}
      <div className="relative z-10">
        {/* Empty Space for Header */}
        <div className="h-80"></div>

        {/* Content */}
        <div className="bg-gradient-to-t- from-black to-transparent min-h-screen rounded-t-3xl -mt-10 pt-8 pb-24">
          {/* Title & Actions */}
          <div className="px-4 text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{anime.title}</h1>
            
            {/* Rating */}
            <div className="flex items-center justify-center mb-6">
              <StarIcon className="w-5 h-5 text-yellow-400 mr-1" />
              <span className="text-lg font-medium text-white">4.8</span>
              <span className="text-sm text-gray-400 ml-1">(88.5K)</span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button 
                onClick={handleFavorite}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                aria-label={isFavorite(anime.id) ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
              >
                {isFavorite(anime.id) ? (
                  <HeartIconSolid className="w-6 h-6 text-red-500" />
                ) : (
                  <HeartIcon className="w-6 h-6 text-white" />
                )}
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowListSelector(!showListSelector)}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                  aria-label="افزودن به لیست"
                >
                  <PlusIcon className="w-6 h-6 text-white" />
                </button>
                
                {/* List Selector Dropdown */}
                {showListSelector && (
                  <div className="absolute top-full mt-2 right-0 w-48 bg-gray-800 rounded-lg shadow-lg p-2 z-20">
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
          
          {/* Description Card */}
          <div className="mx-4 bg-gray-800 rounded-xl p-4 mb-6">
            <p className="text-gray-300 text-sm">
              {truncatedDescription}
            </p>
            {shouldTruncate && (
              <button 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-2 text-primary-500 text-sm flex items-center"
              >
                {showFullDescription ? 'نمایش کمتر' : 'نمایش بیشتر'}
                <ChevronDownIcon className={`w-4 h-4 mr-1 transition-transform ${showFullDescription ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          
          {/* Tabs */}
          <div className="px-4 mb-4">
            <div className="flex rounded-lg bg-gray-800 p-1">
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'info' ? 'bg-gray-700 text-white' : 'text-gray-400'
                }`}
                onClick={() => setActiveTab('info')}
              >
                اطلاعات
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'episodes' ? 'bg-gray-700 text-white' : 'text-gray-400'
                }`}
                onClick={() => setActiveTab('episodes')}
              >
                قسمت‌ها
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'similar' ? 'bg-gray-700 text-white' : 'text-gray-400'
                }`}
                onClick={() => setActiveTab('similar')}
              >
                آثار مشابه
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="px-4">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <h3 className="text-md font-medium mb-2 text-white">وضعیت</h3>
                  <p className="text-gray-300 text-sm">{anime.status}</p>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-4">
                  <h3 className="text-md font-medium mb-2 text-white">ژانرها</h3>
                  <div className="flex flex-wrap gap-2">
                    {anime.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-4">
                  <h3 className="text-md font-medium mb-2 text-white">تعداد قسمت‌ها</h3>
                  <p className="text-gray-300 text-sm">{anime.episodes.length} قسمت</p>
                </div>
              </div>
            )}
            
            {/* Episodes Tab */}
            {activeTab === 'episodes' && (
              <div className="space-y-3">
                {anime.episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-white">{episode.title}</h4>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 transition-colors"
                        aria-label={`پخش ${episode.title}`}
                      >
                        <PlayIcon className="w-5 h-5 text-white" />
                      </button>
                      <button 
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                        aria-label={`دانلود ${episode.title}`}
                      >
                        <ArrowDownTrayIcon className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Similar Tab */}
            {activeTab === 'similar' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center h-40 bg-gray-800 rounded-xl">
                  <div className="text-center text-gray-400">
                    <ArrowPathIcon className="w-8 h-8 mx-auto mb-2" />
                    <p>در حال بارگذاری آثار مشابه...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnimeDetail 