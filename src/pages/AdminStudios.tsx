import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
        <h1 className="text-foreground text-xl font-bold">استودیوها</h1>
        <Link to="/admin" className="text-sm text-muted-foreground">
          داشبورد
        </Link>
      </div>

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">افزودن / ویرایش</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-muted-foreground text-xs mb-1">Slug</div>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                placeholder="mappa"
              />
            </div>

            <div>
              <div className="text-muted-foreground text-xs mb-1">Name</div>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="MAPPA"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="bg-primary-500 text-foreground"
                size={'lg'}
                onClick={onSave}
                disabled={saving}
              >
                ذخیره
              </Button>
              <Button
                type="button"
                className="border border-input"
                size={'lg'}
                variant="secondary"
                onClick={onClear}
              >
                پاک کردن
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو..."
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="mt-6 text-muted-foreground text-sm">در حال بارگذاری...</div>
            ) : (
              <div className="space-y-2">
                {filtered.map((s) => (
                  <button
                    key={String(s.id ?? s.slug)}
                    type="button"
                    onClick={() => onSelect(s)}
                    className="flex items-center justify-between gap-2 w-full text-right px-3 py-2 rounded-md border border-border bg-muted"
                  >
                    <div className="text-foreground text-sm">{s.name}</div>
                    <div className="text-muted-foreground text-xs mt-1">{s.slug}</div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-muted-foreground text-sm mt-3">چیزی پیدا نشد</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminStudios
