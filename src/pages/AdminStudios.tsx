import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'

type DraftStudio = {
  id?: number | string
  slug: string
  name: string
}

const AdminStudios = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<supa.StudioAdminItem[]>([])
  const [query, setQuery] = useState('')

  const [draft, setDraft] = useState<DraftStudio>({
    slug: '',
    name: '',
  })

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await supa.getAllStudiosAdmin()
      setItems(list)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در بارگذاری'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((s) => {
      const slug = String(s.slug ?? '').toLowerCase()
      const name = String(s.name ?? '').toLowerCase()
      return slug.includes(q) || name.includes(q)
    })
  }, [items, query])

  const onSelect = (s: supa.StudioAdminItem) => {
    setDraft({
      id: s.id,
      slug: String(s.slug ?? ''),
      name: String(s.name ?? ''),
    })
  }

  const onClear = () => {
    setDraft({ slug: '', name: '' })
  }

  const onSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const slug = draft.slug.trim().toLowerCase()
      const name = draft.name.trim()
      if (!slug) throw new Error('slug الزامی است')
      if (!name) throw new Error('name الزامی است')

      await supa.upsertStudioAdmin({
        id: draft.id,
        slug,
        name,
      })

      await reload()
      onClear()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ذخیره'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-white text-xl font-bold">استودیوها</h1>
        <Link to="/admin" className="text-sm text-gray-300">
          داشبورد
        </Link>
      </div>

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-white text-sm font-semibold">افزودن / ویرایش</div>

          <div>
            <div className="text-gray-300 text-xs mb-1">Slug</div>
            <input
              value={draft.slug}
              onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
              placeholder="mappa"
              className="w-full px-3 py-2 rounded-xl bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div>
            <div className="text-gray-300 text-xs mb-1">Name</div>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="MAPPA"
              className="w-full px-3 py-2 rounded-xl bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClear}
              className="w-full px-3 py-2 rounded-xl bg-white/10 text-white text-sm"
            >
              پاک کردن
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="w-full px-3 py-2 rounded-xl bg-primary-500 text-white text-sm disabled:opacity-60"
            >
              ذخیره
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-white text-sm font-semibold">لیست</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو..."
              className="w-72 px-3 py-2 rounded-xl bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          {loading ? (
            <div className="mt-6 text-gray-400 text-sm">در حال بارگذاری...</div>
          ) : (
            <div className="mt-4 space-y-2">
              {filtered.map((s) => (
                <button
                  key={String(s.id ?? s.slug)}
                  type="button"
                  onClick={() => onSelect(s)}
                  className="w-full text-right p-3 rounded-2xl border border-white/10 bg-gray-950/20"
                >
                  <div className="text-white text-sm">{s.name}</div>
                  <div className="text-gray-400 text-xs mt-1">{s.slug}</div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-gray-400 text-sm mt-3">چیزی پیدا نشد</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminStudios
