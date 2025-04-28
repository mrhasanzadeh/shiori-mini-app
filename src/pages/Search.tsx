import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { searchAnime } from '../services/anilist'
import { Anime } from '../store/cacheStore'

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

  return (
    <div className="pb-24">
      {/* Search Input */}
      <div className="sticky top-0 p-4 z-10">
        <div className="relative w-full flex items-center gap-2 bg-gray-800 text-white rounded-lg pl-10 p-3">
          <MagnifyingGlassIcon className="w-6 h-6 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی انیمه..."
            className="bg-transparent w-full focus:outline-none"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
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

      {/* Results */}
      {!loading && !error && results.length > 0 && (
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
                  <h3 className="text-sm font-medium line-clamp-1 text-gray-100">
                    {anime.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && !error && searchTerm && results.length === 0 && (
        <div className="text-center text-gray-400 p-4">
          نتیجه‌ای یافت نشد
        </div>
      )}
    </div>
  )
}

export default Search 