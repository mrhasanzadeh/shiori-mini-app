import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import AnimePrefetchLink from '../components/AnimePrefetchLink'
import { BidiText } from '../components/BidiText'
import * as catalog from '../services/catalogSource'
import type { GenreItem, StudioPublicItem } from '../services/catalogSource'
import { animeDetailPath } from '../lib/animePaths'
import { fetchAnimeByStudioSlug, type UiAnimeCard } from '../utils/api'

const genreLabel = (g: GenreItem) => g.name_fa || g.name_en || g.slug

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
      to={animeDetailPath(anime)}
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
          <BidiText as="h3" className="text-xs text-left font-semibold text-white line-clamp-2 leading-2">
            {anime.title}
          </BidiText>
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

const StudioDetail = () => {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const nameParam = searchParams.get('name')?.trim() || null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studio, setStudio] = useState<StudioPublicItem | null>(null)
  const [anime, setAnime] = useState<UiAnimeCard[]>([])

  useEffect(() => {
    const run = async () => {
      if (!slug) return
      setLoading(true)
      setError(null)
      try {
        const s = await catalog.getStudioBySlug(slug)
        setStudio(s)
        const list = await fetchAnimeByStudioSlug(slug)
        setAnime(list)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در بارگذاری'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [slug])

  const studioDisplayName = nameParam || studio?.name || null
  const showTitleSkeleton = loading && !nameParam

  const pageTitle = useMemo(() => {
    if (!studioDisplayName) return null
    return `انیمه‌های استودیو ${studioDisplayName}`
  }, [studioDisplayName])

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        {showTitleSkeleton ? (
          <div className="h-6 w-56 max-w-full bg-muted animate-pulse rounded" aria-hidden />
        ) : (
          <h2 className="text-base font-semibold text-foreground">
            {pageTitle ?? `انیمه‌های استودیو ${slug}`}
          </h2>
        )}
        <Link to="/search" className="text-sm text-muted-foreground shrink-0">
          جستجو
        </Link>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="text-center text-red-500 p-4">{error}</div>
      ) : anime.length === 0 ? (
        <div className="text-center text-muted-foreground p-4 text-sm">انیمه‌ای پیدا نشد.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 px-4 pt-2">
          {anime.map((a) => (
            <AnimeGridCard key={String(a.id)} anime={a} />
          ))}
        </div>
      )}
    </div>
  )
}

export default StudioDetail
