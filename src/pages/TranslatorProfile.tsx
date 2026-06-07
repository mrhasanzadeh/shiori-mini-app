import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import AnimePrefetchLink from '../components/AnimePrefetchLink'
import { UserIcon } from 'hugeicons-react'
import * as supa from '../services/supabaseAnime'
import type { GenreItem } from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

const genreLabel = (g: GenreItem) => g.name_fa || g.name_en || g.slug

const ProfileSkeleton = () => (
  <div className="pb-24 animate-pulse">
    <div className="relative h-52">
      <div className="absolute inset-x-0 top-0 h-full bg-muted" />
      <div className="relative z-10 pt-24 flex flex-col items-center">
        <div className="w-24 h-24 rounded-2xl bg-muted border-4 border-background" />
        <div className="h-6 w-40 bg-muted rounded mt-4" />
      </div>
    </div>
    <div className="mx-4 mt-6 h-20 rounded-2xl bg-muted" />
    <div className="grid grid-cols-3 gap-3 p-4 mt-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-2xl bg-muted" />
      ))}
    </div>
  </div>
)

const AnimeGridCard = ({ anime }: { anime: supa.AnimeCard }) => {
  const genres = (anime.genres || []).slice(0, 2)

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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute left-0 bottom-0 p-2.5 pt-10">
          <h3 className="text-xs font-semibold text-white text-left line-clamp-2">{anime.title}</h3>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1 justify-end">
              {genres.map((g) => (
                <span
                  key={g.slug}
                  className="text-[8px] leading-none px-1 py-0.5 rounded-md bg-white/15 text-white/90 border border-white/10 truncate max-w-full"
                >
                  {genreLabel(g)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </AnimePrefetchLink>
  )
}

const TranslatorProfile = () => {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [translator, setTranslator] = useState<supa.TranslatorItem | null>(null)
  const [animeList, setAnimeList] = useState<supa.AnimeCard[]>([])

  const safeSlug = useMemo(() => String(slug || '').trim(), [slug])

  const animeCount = useMemo(() => {
    const ids = new Set(animeList.map((a) => String(a.id)))
    return ids.size
  }, [animeList])

  const totalEpisodes = useMemo(() => {
    return animeList.reduce(
      (sum, a) => sum + (typeof a.episodes_count === 'number' ? a.episodes_count : 0),
      0
    )
  }, [animeList])

  const coverImage = useMemo(() => {
    return (
      translator?.cover_url ||
      translator?.avatar_url ||
      animeList[0]?.featuredImage ||
      animeList[0]?.image ||
      null
    )
  }, [translator?.cover_url, translator?.avatar_url, animeList])

  const loadProfile = useCallback(async () => {
    if (!safeSlug) return
    try {
      setLoading(true)
      setError(null)
      const [t, list] = await Promise.all([
        supa.getTranslatorBySlug(safeSlug),
        supa.getAnimeCardsByTranslatorSlug(safeSlug),
      ])
      setTranslator(t)
      setAnimeList(list)
    } catch (err) {
      setError('خطا در بارگذاری پروفایل مترجم')
      console.error('Failed to load translator profile:', err)
    } finally {
      setLoading(false)
    }
  }, [safeSlug])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (!safeSlug) {
    return (
      <div className="px-4 py-16 text-center text-muted-foreground pb-24">مترجم یافت نشد.</div>
    )
  }

  if (loading) return <ProfileSkeleton />

  if (error || !translator) {
    return (
      <div className="px-4 py-16 text-center space-y-3 pb-24">
        <p className="text-sm text-red-500">{error || 'مترجم یافت نشد.'}</p>
        <Button type="button" variant="secondary" onClick={loadProfile}>
          تلاش مجدد
        </Button>
      </div>
    )
  }

  const experienceLabel =
    translator.experience && translator.experience.trim().length > 0
      ? translator.experience
      : '—'

  return (
    <div className="pb-24 bg-background text-foreground">
      {/* Cover + avatar — extends under transparent app header */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-52 overflow-hidden">
          {coverImage ? (
            <img src={coverImage} alt="" className="w-full h-full object-cover opacity-45" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/30 to-background" />
        </div>

        <div className="relative z-10 pt-24 px-4 pb-2 flex flex-col items-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-background bg-muted shadow-lg ring-2 ring-primary-400/25">
            {translator.avatar_url ? (
              <img
                src={translator.avatar_url}
                alt={translator.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <UserIcon className="w-10 h-10 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <h1 className="text-lg font-bold text-foreground mt-3 text-center line-clamp-2 px-2">
            {translator.name}
          </h1>
          {translator.bio ? (
          <p className="text-sm text-muted-foreground leading-7 text-center whitespace-pre-wrap">
            {translator.bio}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/70 text-center italic">بیوگرافی ثبت نشده</p>
        )}
        </div>
      </div>
      {/* Stats */}
      <div className="mx-4 mt-5 grid grid-cols-3 gap-2">
        {[
          { value: toPersianNumber(animeCount), label: 'انیمه' },
          { value: toPersianNumber(totalEpisodes), label: 'قسمت' },
          { value: experienceLabel, label: 'سابقه' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card/60 py-3 px-2 text-center"
          >
            <p className="text-base font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Works */}
      <div className="px-4 pt-6 pb-2 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">آثار</h2>
        <span className="text-xs text-muted-foreground">
          {animeCount > 0 ? `${toPersianNumber(animeCount)} عنوان` : 'خالی'}
        </span>
      </div>

      {animeList.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
          <p className="text-sm text-muted-foreground">اثری برای این مترجم ثبت نشده.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 px-4">
          {animeList.map((a) => (
            <AnimeGridCard key={String(a.id)} anime={a} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TranslatorProfile
