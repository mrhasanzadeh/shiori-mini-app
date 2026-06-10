import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search01Icon } from 'hugeicons-react'
import type { UiAnimeCard } from '../utils/api'
import * as supa from '../services/supabaseAnime'
import type { GenreItem } from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import AnimePrefetchLink from '../components/AnimePrefetchLink'
import { useInfiniteAnimeSearchQuery } from '../hooks/queries/useAnimeQueries'
import frieren from '../assets/images/frieren-03.webp'

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

const genreLabel = (g: GenreItem) => g.name_fa || g.name_en || g.slug

type EmptyStateProps = {
  image?: string
  title: string
  subtitle?: string
}

const EmptyState = ({ image, title, subtitle }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center text-center gap-3 py-12 px-6 h-[55vh]">
    {image && <img src={image} alt="empty-list" className="w-48" />}
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    {subtitle && <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>}
  </div>
)

const SkeletonGrid = () => (
  <div className="grid grid-cols-3 gap-3 px-4 pt-2">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="aspect-[2/3] rounded-xl bg-muted" />
      </div>
    ))}
  </div>
)

const AnimeGridCard = ({ anime }: { anime: UiAnimeCard }) => {
  const genres = (anime.genres || []).slice(0, 3)

  return (
    <AnimePrefetchLink
      animeId={anime.id}
      to={`/anime/${anime.id}`}
      className="group block active:scale-[0.98] transition-transform"
      aria-label={`مشاهده ${anime.title}`}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
        <img
          src={anime.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        {anime.isNew && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold bg-primary-400 text-white px-1.5 py-0.5 rounded-md">
            جدید
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2.5 pt-10">
          <h3 className="text-xs text-left font-semibold text-white line-clamp-2 leading-2">{anime.title}</h3>
          {genres.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1 justify-end">
              {genres.map((g) => (
                <span
                  key={g.slug}
                  className="text-[9px] leading-none px-1 py-0.5 rounded-md bg-white/15 text-white/90 border border-white/10 max-w-full truncate"
                >
                  {genreLabel(g)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/60 mt-1">{anime.episode || 'شیوری'}</p>
          )}
        </div>
      </div>
    </AnimePrefetchLink>
  )
}

const Search = () => {
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const yearParam = searchParams.get('year')
  const seasonParam = searchParams.get('season')
  const genreParam = searchParams.get('genre')
  const labelParam = searchParams.get('label')?.trim() || null
  const selectedYear = yearParam ? Number(yearParam) : null
  const selectedSeason = seasonParam ? seasonParam.trim().toUpperCase() : null
  const selectedGenre = genreParam ? genreParam.trim().toLowerCase() : null
  const [genreDisplayName, setGenreDisplayName] = useState<string | null>(labelParam)
  const [genreNameLoading, setGenreNameLoading] = useState(Boolean(selectedGenre && !labelParam))

  useEffect(() => {
    if (!selectedGenre) {
      setGenreDisplayName(null)
      setGenreNameLoading(false)
      return
    }

    if (labelParam) {
      setGenreDisplayName(labelParam)
      setGenreNameLoading(false)
      return
    }

    setGenreNameLoading(true)
    let cancelled = false
    void supa.getGenreBySlug(selectedGenre).then((genre) => {
      if (cancelled) return
      setGenreDisplayName(genre ? genre.name_fa || genre.name_en || genre.slug : selectedGenre)
      setGenreNameLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [selectedGenre, labelParam])

  const translateSeason = (season: string): string => {
    switch (season) {
      case 'WINTER':
        return 'زمستان'
      case 'SPRING':
        return 'بهار'
      case 'SUMMER':
        return 'تابستان'
      case 'FALL':
        return 'پاییز'
      default:
        return season
    }
  }

  const resolvedGenreName = labelParam || genreDisplayName

  const pageTitle = (() => {
    if (selectedSeason && selectedYear !== null && Number.isFinite(selectedYear)) {
      return `فصل ${translateSeason(selectedSeason)} ${toPersianNumber(selectedYear)}`
    }
    if (selectedGenre && resolvedGenreName) {
      return `بهترین انیمه‌های ژانر ${resolvedGenreName}`
    }
    return null
  })()

  const showGenreTitleSkeleton = Boolean(selectedGenre && !resolvedGenreName && genreNameLoading)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const searchFilters = useMemo(
    () => ({
      query: debouncedSearchTerm.trim() || undefined,
      year: selectedYear !== null && Number.isFinite(selectedYear) ? selectedYear : null,
      season: selectedSeason,
      genreSlug: selectedGenre,
    }),
    [debouncedSearchTerm, selectedYear, selectedSeason, selectedGenre]
  )

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteAnimeSearchQuery(searchFilters)

  const results = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])
  const total = data?.pages[0]?.total ?? 0
  const hasMore = Boolean(hasNextPage)

  return (
    <div className="pb-24">
      {(pageTitle || showGenreTitleSkeleton) && (
        <div className="px-4 pt-4 pb-1">
          {showGenreTitleSkeleton ? (
            <div className="h-6 w-56 max-w-full bg-muted animate-pulse rounded" aria-hidden />
          ) : (
            <h2 className="text-base font-semibold text-foreground">{pageTitle}</h2>
          )}
        </div>
      )}

      <div className="p-4 pb-2">
        <div className="relative w-full flex items-center gap-2 border bg-card border-border text-foreground rounded-xl pl-10 p-3">
          <Search01Icon className="w-6 h-6 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی انیمه..."
            className="bg-transparent w-full focus:outline-none"
          />
        </div>
      </div>

      {!isLoading && !isError && total > 0 && (
        <p className="px-4 pb-1 text-xs text-muted-foreground">
          {toPersianNumber(total)} نتیجه
          {results.length < total ? ` · ${toPersianNumber(results.length)} نمایش داده شده` : ''}
        </p>
      )}

      {isLoading && <SkeletonGrid />}

      {isError && (
        <div className="px-4 py-8 text-center space-y-3">
          <p className="text-red-500">خطا در بارگذاری لیست انیمه‌ها</p>
          <Button type="button" variant="secondary" onClick={() => refetch()}>
            تلاش مجدد
          </Button>
        </div>
      )}

      {!isLoading && !isError && results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 px-4 pt-2">
            {results.map((anime) => (
              <AnimeGridCard key={anime.id} anime={anime} />
            ))}
          </div>

          {hasMore && (
            <div className="px-4 pb-6 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? 'در حال بارگذاری…' : 'بارگذاری بیشتر'}
              </Button>
            </div>
          )}
        </>
      )}

      {!isLoading && !isError && results.length === 0 && (
        <EmptyState
          image={frieren}
          title="چیزی پیدا نشد"
          subtitle="عبارت جستجوی خود را دقیق‌تر وارد کنید یا عبارت دیگری امتحان کنید."
        />
      )}
    </div>
  )
}

export default Search
