import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search01Icon } from 'hugeicons-react'
import { fetchSearch } from '../utils/api'
import { Anime } from '../store/cacheStore'
import shioriLogo from '../assets/images/shiori-logo.svg'
import emptyListImage from '../assets/images/frieren-03.webp'


type EmptyStateProps = {
  image?: string
  title: string
  subtitle?: string
}

const EmptyState = ({ image, title, subtitle }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center text-center gap-3 py-12 px-6 h-[55vh]">
    {image && (
       <img src={emptyListImage} alt="empty-list" className="w-48"/>
    )}
    <h2 className="text-base font-semibold text-gray-100">{title}</h2>
    {subtitle && (
      <p className="text-sm text-gray-400 max-w-xs">{subtitle}</p>
    )}
  </div>
)

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  

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
        const data = await fetchSearch(debouncedSearchTerm)
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

  

  return (
    <div className="pb-24">
      {/* Search Input */}
      <div className="p-4 pb-2">
        <div className="relative w-full flex items-center gap-2 border bg-gray-900 border-white/10 text-white rounded-xl pl-10 p-3">
          <Search01Icon className="w-6 h-6 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی انیمه..."
            className="bg-transparent w-full focus:outline-none"
          />
        </div>
      </div>

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
        <div className="grid grid-cols-3 gap-3 p-4">
          {results.map((anime) => (
            <Link
              key={anime.id}
              to={`/anime/${anime.id}`}
              className="block"
              aria-label={`مشاهده ${anime.title}`}
            >
              <div className="card">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg border-2 border-t-white/10 border-r-white/10 border-l-white/10 border-b-white/5">
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Results for Search */}
      {debouncedSearchTerm && !loading && !error && results.length === 0 && (
        <EmptyState
          image={shioriLogo}
          title="چیزی پیدا نشد"
          subtitle="عبارت جستجوی خود را دقیق‌تر وارد کنید یا عبارت دیگری امتحان کنید."
        />
      )}

      {/* Empty state when no search term */}
      {!debouncedSearchTerm && (
        <EmptyState
          image={shioriLogo}
          title="جستجوی انیمه"
          subtitle="برای شروع، نام یک انیمه را در کادر بالا وارد کنید."
        />
      )}
    </div>
  )
}

export default Search