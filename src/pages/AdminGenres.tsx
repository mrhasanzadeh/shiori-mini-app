import { useEffect, useMemo, useState } from 'react'
import * as supa from '../services/supabaseAnime'

type Draft = {
  id?: number
  slug: string
  name_en?: string
  name_fa?: string
}

const AdminGenres = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [list, setList] = useState<supa.GenreAdminItem[]>([])
  const [draft, setDraft] = useState<Draft>({ slug: '', name_en: '', name_fa: '' })

  const reload = async () => {
    const data = await supa.getAllGenres()
    setList(data)
  }

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        await reload()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در دریافت ژانرها'
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
    return list.filter((g) => {
      return (
        String(g.slug).toLowerCase().includes(term) ||
        String(g.name_fa ?? '')
          .toLowerCase()
          .includes(term) ||
        String(g.name_en ?? '')
          .toLowerCase()
          .includes(term)
      )
    })
  }, [q, list])

  const onSave = async () => {
    const slug = draft.slug.trim().toLowerCase()
    if (!slug) return

    try {
      setSaving(true)
      setError(null)
      await supa.upsertGenre({
        id: draft.id,
        slug,
        name_en: draft.name_en?.trim() || null,
        name_fa: draft.name_fa?.trim() || null,
      })
      setDraft({ slug: '', name_en: '', name_fa: '' })
      await reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ذخیره ژانر'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-white text-xl font-bold">ژانرها</h1>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white text-sm font-semibold mb-2">افزودن / ویرایش</div>
            <div className="grid grid-cols-1 gap-2">
              <input
                value={draft.slug}
                onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                placeholder="slug (مثال: action)"
                className="w-full px-3 py-2 rounded-xl bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500"
              />
              <input
                value={draft.name_en ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, name_en: e.target.value }))}
                placeholder="name_en"
                className="w-full px-3 py-2 rounded-xl bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500"
              />
              <input
                value={draft.name_fa ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, name_fa: e.target.value }))}
                placeholder="name_fa"
                className="w-full px-3 py-2 rounded-xl bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500"
              />
              <button
                type="button"
                disabled={saving}
                onClick={onSave}
                className="px-3 py-2 rounded-xl bg-primary-500 text-white text-sm disabled:opacity-60"
              >
                ذخیره
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-white text-sm font-semibold">لیست</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو"
              className="w-72 px-3 py-2 rounded-xl bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          {loading ? (
            <div className="mt-6 text-gray-400 text-sm">در حال بارگذاری...</div>
          ) : error ? (
            <div className="mt-6 text-red-400 text-sm">{error}</div>
          ) : (
            <div className="mt-4 space-y-2">
              {filtered.map((g) => (
                <button
                  key={String(g.id ?? g.slug)}
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: typeof g.id === 'number' ? g.id : undefined,
                      slug: g.slug,
                      name_en: g.name_en ?? '',
                      name_fa: g.name_fa ?? '',
                    })
                  }
                  className="w-full text-left p-3 rounded-2xl border border-white/10 bg-gray-950/20"
                >
                  <div className="text-white text-sm font-semibold">
                    {g.name_fa || g.name_en || g.slug}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">{g.slug}</div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-10">ژانری پیدا نشد</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminGenres
