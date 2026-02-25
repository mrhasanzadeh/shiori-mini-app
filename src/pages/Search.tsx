import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search01Icon } from 'hugeicons-react'
import { fetchAnimeCards } from '../utils/api'
type Anime = {
  id: number | string
  title: string
  image: string
  episode: string
  season?: string
  year?: number
  isNew?: boolean
  description?: string
  genres?: string[]
}
import shioriLogo from '../assets/images/shiori-logo.svg'

type EmptyStateProps = {
  image?: string
  title: string
  subtitle?: string
}

const EmptyState = ({ image, title, subtitle }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center text-center gap-3 py-12 px-6 h-[55vh]">
    {image && (
      <img src={image} alt="empty-list" className="w-48"/>
    )}
    <h2 className="text-base font-semibold text-gray-100">{title}</h2>
    {subtitle && (
      <p className="text-sm text-gray-400 max-w-xs">{subtitle}</p>
    )}
  </div>
)

const Search = () => {
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [allAnime, setAllAnime] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const yearParam = searchParams.get('year')
  const seasonParam = searchParams.get('season')
  const genreParam = searchParams.get('genre')
  const selectedYear = yearParam ? Number(yearParam) : null
  const selectedSeason = seasonParam ? seasonParam.trim().toUpperCase() : null
  const selectedGenre = genreParam ? genreParam.trim().toLowerCase() : null

  const toPersianNumber = (num: number | string): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
  }

  const translateSeason = (season: string): string => {
    switch (season) {
      case 'WINTER': return 'زمستان'
      case 'SPRING': return 'بهار'
      case 'SUMMER': return 'تابستان'
      case 'FALL': return 'پاییز'
      default: return season
    }
  }

  const pageTitle = (() => {
    if (selectedSeason && selectedYear !== null && Number.isFinite(selectedYear)) {
      return `فصل ${translateSeason(selectedSeason)} ${toPersianNumber(selectedYear)}`
    }
    if (selectedGenre) {
      return `بهترین انیمه‌ای ژانر ${genreParam}`
    }
    return null
  })()

  // Load all anime once on page mount
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchAnimeCards()
        setAllAnime(data as Anime[])
      } catch (err) {
        setError('خطا در بارگذاری لیست انیمه‌ها')
        console.error('Failed to load all anime:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const normalizedQuery = debouncedSearchTerm.trim().toLowerCase()
  const filteredBySeasonYear = allAnime.filter((anime) => {
    if (selectedYear !== null && (!Number.isFinite(selectedYear) || anime.year !== selectedYear)) return false
    if (selectedSeason && String(anime.season ?? '').toUpperCase() !== selectedSeason) return false
    if (selectedGenre) {
      const hasGenre = Array.isArray(anime.genres)
        ? anime.genres.some((g) => String(g).trim().toLowerCase() === selectedGenre)
        : false
      if (!hasGenre) return false
    }
    return true
  })

  const filteredResults = normalizedQuery
    ? filteredBySeasonYear.filter((anime) => anime.title.toLowerCase().includes(normalizedQuery))
    : filteredBySeasonYear

  return (
    <div className="pb-24">

      {pageTitle && (
        <div className="px-4 pt-4 pb-1">
          <h2 className="text-base font-semibold text-gray-100">{pageTitle}</h2>
        </div>
      )}

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
      {!loading && !error && filteredResults.length > 0 && (
        <div className="grid grid-cols-3 gap-3 p-4">
          {filteredResults.map((anime) => (
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

      {/* No Results */}
      {!loading && !error && filteredResults.length === 0 && (
        <EmptyState
          image={shioriLogo}
          title="چیزی پیدا نشد"
          subtitle="عبارت جستجوی خود را دقیق‌تر وارد کنید یا عبارت دیگری امتحان کنید."
        />
      )}
    </div>
  )
}

export default Search