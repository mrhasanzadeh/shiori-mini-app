import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { searchAnime, getTop100Anime, getTrendingAnime, getTopMovies } from '../services/anilist'
import { Anime } from '../store/cacheStore'

type Tab = 'top100' | 'trending' | 'movies'

// Extend Anime interface for top100 items
interface Top100Anime extends Anime {
  averageScore?: number;
}

const ITEMS_PER_PAGE = 24

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('top100')
  const [tabData, setTabData] = useState<{
    top100: Top100Anime[];
    trending: Anime[];
    movies: Anime[];
  }>({
    top100: [],
    trending: [],
    movies: []
  })
  const [tabsLoading, setTabsLoading] = useState<{
    top100: boolean;
    trending: boolean;
    movies: boolean;
  }>({
    top100: true,
    trending: true,
    movies: true
  })
  const [tabsPage, setTabsPage] = useState<{
    top100: number;
    trending: number;
    movies: number;
  }>({
    top100: 1,
    trending: 1,
    movies: 1
  })
  const [hasMore, setHasMore] = useState<{
    top100: boolean;
    trending: boolean;
    movies: boolean;
  }>({
    top100: true,
    trending: true,
    movies: true
  })
  const [loadingMore, setLoadingMore] = useState<{
    top100: boolean;
    trending: boolean;
    movies: boolean;
  }>({
    top100: false,
    trending: false,
    movies: false
  })

  const observer = useRef<IntersectionObserver | null>(null)
  const lastItemRef = useCallback((node: HTMLElement | null) => {
    if (tabsLoading[activeTab] || loadingMore[activeTab]) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore[activeTab]) {
        loadMoreItems(activeTab)
      }
    })
    
    if (node) observer.current.observe(node)
  }, [activeTab, tabsLoading, hasMore, loadingMore])

  // Fetch initial tab data on mount
  useEffect(() => {
    const fetchTabData = async () => {
      try {
        // Fetch top 100 anime
        setTabsLoading(prev => ({ ...prev, top100: true }))
        const top100Data = await getTop100Anime(1, ITEMS_PER_PAGE)
        // Add episode property to match Anime interface
        const processedTop100 = top100Data.map(item => ({
          ...item,
          episode: item.episodes ? `${item.episodes} قسمت` : 'نامشخص'
        })) as Top100Anime[]
        setTabData(prev => ({ ...prev, top100: processedTop100 }))
        setTabsLoading(prev => ({ ...prev, top100: false }))
        // Check if there might be more items
        setHasMore(prev => ({ ...prev, top100: top100Data.length === ITEMS_PER_PAGE }))

        // Fetch trending anime
        setTabsLoading(prev => ({ ...prev, trending: true }))
        const trendingData = await getTrendingAnime(1, ITEMS_PER_PAGE)
        // Add episode property to match Anime interface
        const processedTrending = trendingData.map(item => ({
          ...item,
          episode: item.episodes ? `${item.episodes} قسمت` : 'نامشخص'
        })) as Anime[]
        setTabData(prev => ({ ...prev, trending: processedTrending }))
        setTabsLoading(prev => ({ ...prev, trending: false }))
        // Check if there might be more items
        setHasMore(prev => ({ ...prev, trending: trendingData.length === ITEMS_PER_PAGE }))

        // Fetch top movies
        setTabsLoading(prev => ({ ...prev, movies: true }))
        const moviesData = await getTopMovies(1, ITEMS_PER_PAGE)
        setTabData(prev => ({ ...prev, movies: moviesData }))
        setTabsLoading(prev => ({ ...prev, movies: false }))
        // Check if there might be more items
        setHasMore(prev => ({ ...prev, movies: moviesData.length === ITEMS_PER_PAGE }))
      } catch (err) {
        console.error('Failed to load tab data:', err)
      }
    }

    fetchTabData()
  }, [])

  // Function to load more items for a specific tab
  const loadMoreItems = async (tab: Tab) => {
    if (loadingMore[tab] || !hasMore[tab]) return
    
    try {
      setLoadingMore(prev => ({ ...prev, [tab]: true }))
      const nextPage = tabsPage[tab] + 1
      
      let newData: any[] = []
      
      switch (tab) {
        case 'top100':
          const top100Data = await getTop100Anime(nextPage, ITEMS_PER_PAGE)
          newData = top100Data.map(item => ({
            ...item,
            episode: item.episodes ? `${item.episodes} قسمت` : 'نامشخص'
          })) as Top100Anime[]
          break
          
        case 'trending':
          const trendingData = await getTrendingAnime(nextPage, ITEMS_PER_PAGE)
          newData = trendingData.map(item => ({
            ...item,
            episode: item.episodes ? `${item.episodes} قسمت` : 'نامشخص'
          })) as Anime[]
          break
          
        case 'movies':
          newData = await getTopMovies(nextPage, ITEMS_PER_PAGE)
          break
      }
      
      // Update state
      setTabData(prev => ({ 
        ...prev, 
        [tab]: [...prev[tab], ...newData]
      }))
      setTabsPage(prev => ({ ...prev, [tab]: nextPage }))
      setHasMore(prev => ({ ...prev, [tab]: newData.length === ITEMS_PER_PAGE }))
      
    } catch (err) {
      console.error(`Failed to load more ${tab} data:`, err)
    } finally {
      setLoadingMore(prev => ({ ...prev, [tab]: false }))
    }
  }

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Perform search when debounced search term changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchTerm) {
        setResults([])
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await searchAnime(debouncedSearchTerm)
        setResults(data)
      } catch (err) {
        setError('خطا در جستجوی انیمه')
        console.error('Failed to search anime:', err)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedSearchTerm])

  const renderTabContent = () => {
    const currentData = tabData[activeTab]
    const isTabLoading = tabsLoading[activeTab]
    const isLoadingMore = loadingMore[activeTab]

    if (isTabLoading && currentData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )
    }

    return (
      <>
        <div className="grid grid-cols-3 gap-4 p-4">
          {currentData.map((anime, index) => (
            <Link
              key={anime.id}
              to={`/anime/${anime.id}`}
              className="block"
              aria-label={`مشاهده ${anime.title}`}
              ref={index === currentData.length - 1 ? lastItemRef : null}
            >
              <div className="card">
                <div className="relative aspect-[2/3] overflow-hidden">
                  <img
                    src={anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover absolute inset-0"
                    loading="lazy"
                  />
                  
                  {/* Show rank and score labels only for top100 tab */}
                  {activeTab === 'top100' && (
                    <>
                      {/* Rank label - Only show for first 100 items */}
                      {index < 100 && (
                        <div className="absolute top-0 right-0 m-1 px-2 py-1 bg-primary-500 text-white text-xs font-bold rounded">
                          #{index + 1}
                        </div>
                      )}
                      
                      {/* Score label */}
                      <div className="absolute bottom-0 left-0 m-1 px-2 py-1 bg-slate-950/70 text-yellow-400 text-xs font-bold rounded flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                        {(anime as Top100Anime).averageScore !== undefined 
                          ? (((anime as Top100Anime).averageScore as number) / 10).toFixed(1) 
                          : "N/A"}
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-medium line-clamp-1 text-slate-100">
                    {anime.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          </div>
        )}
        
        {/* No more items indicator */}
        {!hasMore[activeTab] && currentData.length > 0 && (
          <div className="text-center text-slate-400 py-4 text-sm">
            پایان نتایج
          </div>
        )}
      </>
    )
  }

  return (
    <div className="pb-24">
      {/* Search Input */}
      <div className="sticky top-0 p-4 z-10">
        <div className="relative w-full flex items-center gap-2 bg-slate-900 text-white rounded-lg pl-10 p-3">
          <MagnifyingGlassIcon className="w-6 h-6 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی انیمه..."
            className="bg-transparent w-full focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs - Only show when no search is active */}
      {!debouncedSearchTerm && (
        <div className="mx-4 mb-2">
          <div className="flex rounded-lg bg-slate-900 p-1">
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'top100' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
              onClick={() => setActiveTab('top100')}
            >
              ۱۰۰ اثر برتر
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'trending' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
              onClick={() => setActiveTab('trending')}
            >
              ترندها
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'movies' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
              onClick={() => setActiveTab('movies')}
            >
              فیلم‌ها
            </button>
          </div>
        </div>
      )}

      {/* Loading State for Search */}
      {debouncedSearchTerm && loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center text-red-500 p-4">
          {error}
        </div>
      )}

      {/* Search Results */}
      {debouncedSearchTerm && !loading && !error && results.length > 0 && (
        <div className="grid grid-cols-3 gap-4 p-4">
          {results.map((anime) => (
            <Link
              key={anime.id}
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
                  <h3 className="text-sm font-medium line-clamp-1 text-slate-100">
                    {anime.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Results for Search */}
      {debouncedSearchTerm && !loading && !error && results.length === 0 && (
        <div className="text-center text-slate-400 p-4">
          نتیجه‌ای یافت نشد
        </div>
      )}

      {/* Tab Content - Only show when no search is active */}
      {!debouncedSearchTerm && renderTabContent()}
    </div>
  )
}

export default Search