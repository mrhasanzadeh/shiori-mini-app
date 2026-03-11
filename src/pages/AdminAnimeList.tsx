import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'

const AdminAnimeList = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [list, setList] = useState<supa.AnimeCard[]>([])

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await supa.getAllAnime()
        setList(data)
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
        <h1 className="text-white text-xl font-bold">انیمه‌ها</h1>
        <Link
          to="/admin/anime/new"
          className="px-3 py-2 rounded-lg bg-primary-500 text-white text-sm"
        >
          افزودن
        </Link>
      </div>

      <div className="mt-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو بر اساس عنوان"
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      {loading ? (
        <div className="mt-6 text-gray-400 text-sm">در حال بارگذاری...</div>
      ) : error ? (
        <div className="mt-6 text-red-400 text-sm">{error}</div>
      ) : (
        <div className="mt-6 grid grid-cols-6 gap-3">
          {filtered.map((a) => (
            <Link
              key={String(a.id)}
              to={`/admin/anime/${encodeURIComponent(String(a.id))}`}
              className="block rounded-xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/10 transition-colors"
            >
              <div className="aspect-[3/4] bg-gray-900">
                <img
                  src={a.image}
                  alt={a.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3 text-left">
                <div className="text-white text-sm font-semibold line-clamp-1">{a.title}</div>
                <div className="text-gray-400 text-xs mt-1 line-clamp-1">
                  {a.format || '---'}
                  {a.isFeatured ? ' • Featured' : ''}
                </div>
              </div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-10 col-span-3">
              نتیجه‌ای پیدا نشد
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminAnimeList
