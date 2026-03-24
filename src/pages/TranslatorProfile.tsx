import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'
import { Badge } from '@/components/ui/badge'

const TranslatorProfile = () => {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [translator, setTranslator] = useState<supa.TranslatorItem | null>(null)
  const [animeList, setAnimeList] = useState<supa.AnimeCard[]>([])
  const [favoriteGenres, setFavoriteGenres] = useState<supa.TranslatorFavoriteGenre[]>([])

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
      animeList?.[0]?.featuredImage ||
      animeList?.[0]?.image ||
      null
    )
  }, [translator?.cover_url, translator?.avatar_url, animeList])

  useEffect(() => {
    const run = async () => {
      if (!safeSlug) return
      try {
        setLoading(true)
        const [t, list, fav] = await Promise.all([
          supa.getTranslatorBySlug(safeSlug),
          supa.getAnimeCardsByTranslatorSlug(safeSlug),
          supa.getTranslatorFavoriteGenresBySlug(safeSlug),
        ])
        setTranslator(t)
        setAnimeList(list)
        setFavoriteGenres(fav)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [safeSlug])

  if (!safeSlug) {
    return <div className="p-4 text-center text-muted-foreground">مترجم یافت نشد</div>
  }

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">در حال بارگذاری...</div>
  }

  if (!translator) {
    return <div className="p-4 text-center text-muted-foreground">مترجم یافت نشد</div>
  }

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      <div className="relative">
        <div className="h-64 overflow-hidden absolute top-0 w-full">
          {coverImage ? (
            <img src={coverImage} alt="" className="w-full h-full object-cover opacity-50" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
        </div>

        <div className="container pt-24 mx-auto px-4">
          <div className="flex flex-col items-center relative z-10">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-border shadow-inner bg-muted">
              {translator.avatar_url ? (
                <img
                  src={translator.avatar_url}
                  alt={translator.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>

            <div className="flex-1 mt-4 w-full max-w-2xl">
              <h1 className="text-xl text-center font-semibold text-foreground line-clamp-3">
                {translator.name}
              </h1>
              {translator.bio ? (
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap text-center">
                  {translator.bio}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center">بیوگرافی ثبت نشده</div>
              )}
              {favoriteGenres.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {favoriteGenres.map((g) => (
                    <Badge key={g.genre_slug} variant="secondary">
                      {g.name_fa || g.name_en || g.genre_slug}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-4 space-y-6">
        <div className="rounded-xl border border-border bg-muted overflow-hidden">
          <div className="grid grid-cols-3 text-center">
            <div className="py-3">
              <div className="text-lg font-semibold text-foreground">{animeCount}</div>
              <div className="text-xs text-muted-foreground">تعداد انیمه</div>
            </div>
            <div className="py-3 border-x border-border">
              <div className="text-lg font-semibold text-foreground">{totalEpisodes}</div>
              <div className="text-xs text-muted-foreground">تعداد قسمت‌ها</div>
            </div>
            <div className="py-3">
              <div className="text-lg font-semibold text-foreground">
                {translator.experience && translator.experience.trim().length > 0
                  ? translator.experience
                  : '—'}
              </div>
              <div className="text-xs text-muted-foreground">سال سابقه</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {animeList.length === 0 ? (
            <div className="text-sm text-muted-foreground">اثری برای این مترجم ثبت نشده</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {animeList.map((a) => (
                <Link
                  key={String(a.id)}
                  to={`/anime/${a.id}`}
                  className="block"
                  aria-label={`مشاهده ${a.title}`}
                >
                  <div className="card">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border-2 border-border">
                      <img
                        src={a.image}
                        alt={a.title}
                        className="w-full h-full object-cover absolute inset-0"
                        loading="lazy"
                      />
                    </div>
                    {/* <div className="mt-3">
                      <h3 className="text-sm text-center font-medium line-clamp-1 text-foreground">
                        {a.title}
                      </h3>
                    </div> */}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TranslatorProfile
