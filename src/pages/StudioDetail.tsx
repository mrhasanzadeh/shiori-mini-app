import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'
import { fetchAnimeByStudioSlug } from '../utils/api'

const StudioDetail = () => {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studio, setStudio] = useState<supa.StudioPublicItem | null>(null)
  const [anime, setAnime] = useState<Array<{ id: string | number; title: string; image: string }>>(
    []
  )

  useEffect(() => {
    const run = async () => {
      if (!slug) return
      setLoading(true)
      setError(null)
      try {
        const s = await supa.getStudioBySlug(slug)
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

  const pageTitle = useMemo(() => {
    const name = studio?.name || slug
    return `انیمه‌های استودیو ${name}`
  }, [studio, slug])

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{pageTitle}</h2>
        <Link to="/search" className="text-sm text-muted-foreground">
          جستجو
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 p-4">{error}</div>
      ) : anime.length === 0 ? (
        <div className="text-center text-muted-foreground p-4 text-sm">انیمه‌ای پیدا نشد.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 p-4">
          {anime.map((a) => (
            <Link
              key={String(a.id)}
              to={`/anime/${encodeURIComponent(String(a.id))}`}
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
                <div className="mt-3">
                  <h3 className="text-sm font-medium line-clamp-1 text-foreground">{a.title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default StudioDetail
