import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FavouriteIcon, Search01Icon } from 'hugeicons-react'
import { useAnimeStore } from '../store/animeStore'
import { fetchAnimeById } from '../utils/api'
import { Button } from '@/components/ui/button'
import emptyListImage from '../assets/images/frieren-03.webp'
import type { GenreItem } from '../services/supabaseAnime'

type FavoriteAnime = {
  id: number | string
  title: string
  image: string
  episodeLabel: string
  genres: GenreItem[]
}

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

const SkeletonGrid = () => (
  <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="aspect-[2/3] rounded-xl bg-muted" />
        <div className="h-4 bg-muted rounded mt-3 w-full" />
        <div className="h-3 bg-muted rounded mt-2 w-2/3 mx-auto" />
      </div>
    ))}
  </div>
)

const MyList = () => {
  const { favoriteAnime } = useAnimeStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<FavoriteAnime[]>([])

  const loadFavorites = useCallback(async () => {
    if (favoriteAnime.length === 0) {
      setItems([])
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const results = await Promise.all(
        favoriteAnime.map(async (id) => {
          const details = await fetchAnimeById(id)
          const epCount = details.episodes.length
          return {
            id: details.id,
            title: details.title,
            image: details.image,
            episodeLabel:
              epCount > 0 ? `${toPersianNumber(epCount)} قسمت` : 'بدون قسمت',
            genres: details.genres ?? [],
          } satisfies FavoriteAnime
        })
      )
      setItems(results)
    } catch (err) {
      setError('خطا در بارگذاری علاقه‌مندی‌ها')
      console.error('Failed to load favorites:', err)
    } finally {
      setLoading(false)
    }
  }, [favoriteAnime])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  const isEmpty = !loading && !error && favoriteAnime.length === 0

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FavouriteIcon className="w-5 h-5 text-red-500" />
              علاقه‌مندی‌ها
            </h1>
            {!isEmpty && !loading && (
              <p className="text-xs text-muted-foreground mt-1">
                {toPersianNumber(items.length)} انیمه
              </p>
            )}
          </div>
          {!isEmpty && (
            <Button asChild type="button" variant="secondary" size="sm">
              <Link to="/search" className="gap-1.5">
                <Search01Icon className="w-4 h-4" />
                جستجو
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading && <SkeletonGrid />}

      {error && (
        <div className="px-4 py-12 text-center space-y-3">
          <p className="text-red-500 text-sm">{error}</p>
          <Button type="button" variant="secondary" onClick={loadFavorites}>
            تلاش مجدد
          </Button>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 text-center">
          <img src={emptyListImage} alt="" className="w-44 mb-5 opacity-90" />
          <h2 className="text-base font-semibold text-foreground mb-2">
لیست علاقه‌مندی‌هات خالیه <small className="text-xs">＞﹏＜</small>
          </h2>
          <p className="text-sm text-muted-foreground leading-7 max-w-xs mb-6">
            در صفحهٔ جزئیات هر انیمه، با زدن دکمهی<br/>قلب انیمه رو این‌جا ذخیره کن.
          </p>
          <Button asChild type="button" size="lg" className="bg-primary-500 text-white font-bold rounded-lg px-6 py-3 hover:bg-primary-500/90">
            <Link to="/search">مرور انیمه‌ها</Link>
          </Button>
     
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-4 pt-2">
          {items.map((anime) => {
            const genreLabel =
              anime.genres[0]?.name_fa || anime.genres[0]?.name_en || anime.genres[0]?.slug

            return (
              <Link
                key={anime.id}
                to={`/anime/${anime.id}`}
                className="group block"
                aria-label={`مشاهده ${anime.title}`}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-transform group-active:scale-[0.98]">
                  <img
                    src={anime.image}
                    alt={anime.title}
                    className="w-full h-full object-cover absolute inset-0"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                  <FavouriteIcon className="absolute top-2 right-2 w-5 h-5 text-red-500 drop-shadow-md fill-red-500" />
                </div>
                <h3 className="mt-2 text-xs font-medium text-foreground line-clamp-2 text-center leading-5">
                  {anime.title}
                </h3>
                <p className="text-[11px] text-muted-foreground text-center mt-0.5 line-clamp-1">
                  {genreLabel ? `${genreLabel} · ` : ''}
                  {anime.episodeLabel}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyList
