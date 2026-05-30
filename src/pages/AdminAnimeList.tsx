import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

const AdminAnimeList = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [list, setList] = useState<supa.AnimeCard[]>([])
  const [animeIdsWithEpisodes, setAnimeIdsWithEpisodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await supa.getAllAnime()
        setList(data)
        const withEpisodes = await supa.getAnimeIdsWithAnyEpisodes(data.map((x) => x.id))
        setAnimeIdsWithEpisodes(withEpisodes)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در دریافت لیست انیمه‌ها'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return list
    return list.filter((a) =>
      String(a.title ?? '')
        .toLowerCase()
        .includes(term)
    )
  }, [q, list])

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-foreground text-xl font-bold">انیمه‌ها</h1>
        <Button size={'lg'} asChild type="button" className="bg-primary-500 text-foreground">
          <Link to="/admin/anime/new">افزودن</Link>
        </Button>
      </div>

      <div className="mt-5">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو بر اساس عنوان" />
      </div>

      {loading ? (
        <div className="mt-6 text-muted-foreground text-sm">در حال بارگذاری...</div>
      ) : error ? (
        <div className="mt-6 text-red-400 text-sm">{error}</div>
      ) : (
        <div className="mt-6 grid grid-cols-6 gap-3">
          {filtered.map((a) => (
            <Card key={String(a.id)} className="overflow-hidden">
              <Link
                to={`/admin/anime/${encodeURIComponent(String(a.id))}`}
                className="block hover:bg-muted/30 transition-colors"
              >
                <div className="aspect-[3/4] bg-muted relative">
                  <img
                    src={a.image}
                    alt={a.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {animeIdsWithEpisodes.has(String(a.id)) ? (
                    <div className="absolute top-2 left-2 text-xs rounded bg-muted border border-input px-1">
                      HAS-EP
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 font-mono text-xs rounded bg-red-800 px-1">
                      NO-EP
                    </div>
                  )}
                </div>
                <div className="p-2 text-left">
                  <div className="text-foreground text-sm font-semibold line-clamp-1">
                    {a.title}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    <span className="font-mono rounded bg-muted border border-input text-foreground px-1">
                      {a.format || '---'}
                    </span>
                    {a.isFeatured ? (
                      <span className="font-mono ml-1 rounded bg-primary-600/40 border border-primary-400/40 text-foreground px-1">
                        Featured
                      </span>
                    ) : (
                      ''
                    )}
                  </div>
                </div>
              </Link>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="text-muted-foreground text-sm text-center py-10 col-span-3">
              نتیجه‌ای پیدا نشد
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminAnimeList
