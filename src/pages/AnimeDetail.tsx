import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  FavouriteIcon, 
  Add01Icon,
  StarIcon,
  Clock01Icon,
  Video01Icon,
  Building01Icon,
  Calendar01Icon,
  Calendar02Icon,
} from 'hugeicons-react'
import { useAnime } from '../hooks/useAnime'
import { useTelegramApp } from '../hooks/useTelegramApp'
 
import { useListsStore } from '../store/listsStore'
import { fetchSimilar } from '../utils/api'
import malLogo from '../assets/images/mal-logo.png'
import alLogo from '../assets/images/anilist-logo.svg'

interface Episode {
  id: string | number
  number: number
  title: string
  download_link?: string
}

interface Anime {
  id: number
  title: string
  image: string
  description: string
  status: string
  genres: string[]
  episodes: Episode[]
  episodes_count: number
  animeListScore?: number
  averageScore?: number
  studios: string[]
  producers: string[]
  season: string
  startDate: string
  endDate: string
}

interface SimilarAnime {
  id: number;
  title: string;
  image: string;
  status: string;
  genres: string[];
  score?: number;
}

type TabType = 'info' | 'episodes' | 'similar'

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { loadAnimeById, toggleFavorite, isFavorite } = useAnime()
  const { showAlert } = useTelegramApp()
  const { lists, addItem } = useListsStore()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showListSelector, setShowListSelector] = useState(false)
  const [similarAnime, setSimilarAnime] = useState<SimilarAnime[] | null>(null)
  const [loadingSimilar, setLoadingSimilar] = useState(false)

  // Reset active tab when anime ID changes
  useEffect(() => {
    setActiveTab('info')
  }, [id])

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

  useEffect(() => {
    const fetchAnime = async () => {
      if (!id) return

      try {
        setLoading(true)
        const data = await loadAnimeById(id!)
        if (data) {
          setAnime(data as Anime)
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
      if (activeTab !== 'similar' || !anime) return
      
      try {
        setLoadingSimilar(true)
        const data = await fetchSimilar(anime.id);
        setSimilarAnime(data as SimilarAnime[]);
      } catch (err) {
        console.error('Failed to load similar anime:', err);
        setSimilarAnime([]);
      } finally {
        setLoadingSimilar(false)
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
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
        </div>
      );
    }
    
    if (!similarAnime || similarAnime.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-gray-400">
          <p className="text-sm">اثر مشابهی یافت نشد</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 gap-3">
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
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <h3 className="text-sm text-white font-medium line-clamp-1">{anime.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-300">{trangrayStatus(anime.status)}</span>
                    {anime.score && (
                      <div className="flex items-center gap-1">
                        <StarIcon className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-gray-300">{toPersianNumber((anime.score / 10).toFixed(1))}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
    <div className="bg-gray-950 min-h-screen pb-20">
      {/* Header */}
      <div className="relative">
        {/* Banner image */}
        <div className="h-64 overflow-hidden absolute top-0 w-full">
          <img 
            src={anime.image} 
            alt="" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950"></div>
        </div>
        
        {/* Anime info overlay */}
        <div className="container pt-32 mx-auto px-4">
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
                  <span className="text-xs text-gray-400 px-1">+{toPersianNumber(anime.genres.length - 3)}</span>
                )}
              </div>
              
              {/* Rating and action buttons in a single row */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-1 pe-4 py-1">
                    <img src={malLogo} className="w-6 h-6 rounded" alt="" />
                    <span className="text-sm text-white font-medium">
                      {typeof anime.animeListScore === 'number' ? toPersianNumber(anime.animeListScore.toFixed(1)) : '8.24'}
                    </span>
                  </div>
                <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-1 pe-4 py-1">
                    <img src={alLogo} className="w-6 h-6 rounded" alt="" />
                    <span className="text-sm text-white font-medium">
                      {typeof anime.animeListScore === 'number' ? toPersianNumber(anime.animeListScore.toFixed(1)) : '8.24'}
                    </span>
                  </div>
                </div>
                
                {/* Action buttons in a connected container */}
                <div className="flex bg-gray-800/60 rounded-full">
                  <button 
                    onClick={handleFavorite}
                    className="p-2 rounded-full hover:bg-gray-700/70"
                    aria-label={isFavorite(anime.id) ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                  >
                    {isFavorite(anime.id) ? (
                      <FavouriteIcon className="w-5 h-5 text-red-500" />
                    ) : (
                      <FavouriteIcon className="w-5 h-5 text-white" />
                    )}
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowListSelector(!showListSelector)}
                      className="p-2 rounded-full hover:bg-gray-700/70"
                      aria-label="افزودن به لیست"
                    >
                      <Add01Icon className="w-5 h-5 text-white" />
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
        <div className='mt-4'>
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex justify-between items-center pb-4 border-b border-b-gray-800">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Clock01Icon className="w-5 h-5 text-primary-400" />
                    وضعیت
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

                <div className="flex justify-between items-center py-4 border-b border-b-gray-800">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Calendar01Icon className="w-5 h-5 text-primary-400" />
                    فصل پخش
                  </span>
                  <span className="text-white text-sm">{anime.season || 'نامشخص'}</span>
                </div>

                <div className="flex justify-between items-center py-4 border-b border-b-gray-800">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Calendar01Icon className="w-5 h-5 text-primary-400" />
                    تاریخ شروع
                  </span>
                  <span className="text-white text-sm">{anime.startDate || 'نامشخص'}</span>
                </div>

                <div className="flex justify-between items-center py-4">
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <Calendar02Icon className="w-5 h-5 text-primary-400" />
                    تاریخ پایان
                  </span>
                  <span className="text-white text-sm">
                    {anime.status === 'RELEASING' ? 'در حال پخش' : anime.status === 'NOT_YET_RELEASED' ? 'هنوز پخش نشده' : anime.endDate || 'نامشخص'}
                  </span>
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
                  className="flex items-center justify-between p-3 bg-white/5 rounded-md"
                >
                  <div className='flex flex-col gap-1'>
                    <span className="text-sm text-white">قسمت {toPersianNumber(episode.number)}</span>
                    <span className="text-xs text-gray-400">زیرنویس چسبیده | 1080p x265</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                    className="py-2 px-3 rounded-lg bg-white/5"
                    aria-label={`دانلود قسمت ${toPersianNumber(episode.number)}`}
                    onClick={() => {
                      const deeplink = `${episode.download_link}`;
                      window.open(deeplink, '_blank');
                    }}
                  >
                    دانلود
                  </button>
                   <button 
                    className="py-2 px-3 rounded-lg bg-white/5"
                    aria-label={`دانلود قسمت ${toPersianNumber(episode.number)}`}
                    onClick={() => {
                      const deeplink = `${episode.download_link}`;
                      window.open(deeplink, '_blank');
                    }}
                  >
                    زیرنویس
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