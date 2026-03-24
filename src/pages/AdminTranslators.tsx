import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DraftTranslator = {
  id?: string | number
  name: string
  slug: string
  avatar_url: string
  cover_url: string
  bio: string
  experience: string
}

const AdminTranslators = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<supa.TranslatorAdminItem[]>([])
  const [query, setQuery] = useState('')

  const [draft, setDraft] = useState<DraftTranslator>({
    name: '',
    slug: '',
    avatar_url: '',
    cover_url: '',
    bio: '',
    experience: '',
  })

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await supa.getAllTranslatorsAdmin()
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
    return items.filter((t) => {
      const name = String(t.name ?? '').toLowerCase()
      const slug = String(t.slug ?? '').toLowerCase()
      return name.includes(q) || slug.includes(q)
    })
  }, [items, query])

  const onSelect = (t: supa.TranslatorAdminItem) => {
    setDraft({
      id: t.id,
      name: String(t.name ?? ''),
      slug: String(t.slug ?? ''),
      avatar_url: String(t.avatar_url ?? ''),
      cover_url: String(t.cover_url ?? ''),
      bio: String(t.bio ?? ''),
      experience: String(t.experience ?? ''),
    })
  }

  const onClear = () => {
    setDraft({ name: '', slug: '', avatar_url: '', cover_url: '', bio: '', experience: '' })
  }

  const onSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const name = draft.name.trim()
      const slug = draft.slug.trim().toLowerCase()
      const avatar = draft.avatar_url.trim()
      const cover = draft.cover_url.trim()
      const bio = draft.bio.trim()
      const experience = draft.experience.trim()

      if (!name) throw new Error('name الزامی است')
      if (!slug) throw new Error('slug الزامی است')

      await supa.upsertTranslatorAdmin({
        id: draft.id,
        name,
        slug,
        avatar_url: avatar.length > 0 ? avatar : null,
        cover_url: cover.length > 0 ? cover : null,
        bio: bio.length > 0 ? bio : null,
        experience: experience.length > 0 ? experience : null,
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

  const onDelete = async () => {
    if (!draft.id) return
    if (!confirm('این مترجم حذف شود؟')) return
    try {
      setSaving(true)
      setError(null)
      await supa.deleteTranslatorAdmin(draft.id)
      await reload()
      onClear()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-foreground text-xl font-bold">مترجم‌ها</h1>
        <Link to="/admin" className="text-sm text-muted-foreground">
          داشبورد
        </Link>
      </div>

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">افزودن / ویرایش</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-muted-foreground text-xs mb-1">Name</div>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="نام مترجم"
              />
            </div>

            <div>
              <div className="text-muted-foreground text-xs mb-1">Slug</div>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                placeholder="مثلاً: hasan"
              />
            </div>

            <div>
              <div className="text-muted-foreground text-xs mb-1">Avatar URL (اختیاری)</div>
              <Input
                value={draft.avatar_url}
                onChange={(e) => setDraft((p) => ({ ...p, avatar_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <div className="text-muted-foreground text-xs mb-1">Cover URL (اختیاری)</div>
              <Input
                value={draft.cover_url}
                onChange={(e) => setDraft((p) => ({ ...p, cover_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <div className="text-muted-foreground text-xs mb-1">Bio (اختیاری)</div>
              <Textarea
                value={draft.bio}
                onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))}
                placeholder="توضیحات مترجم..."
                className="min-h-28"
              />
            </div>

            <div>
              <div className="text-muted-foreground text-xs mb-1">Experience (اختیاری)</div>
              <Textarea
                value={draft.experience}
                onChange={(e) => setDraft((p) => ({ ...p, experience: e.target.value }))}
                placeholder="مثلاً: ۳ سال فعالیت / از ۱۳۹۹"
                className="min-h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={onSave} disabled={saving}>
                ذخیره
              </Button>
              <Button type="button" variant="secondary" onClick={onClear} disabled={saving}>
                پاک کردن
              </Button>
            </div>

            {draft.id && (
              <Button type="button" variant="destructive" onClick={onDelete} disabled={saving}>
                حذف
              </Button>
            )}
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
                {filtered.map((t) => (
                  <button
                    key={String(t.id ?? t.slug)}
                    type="button"
                    onClick={() => onSelect(t)}
                    className="flex items-center justify-between gap-2 w-full text-right px-3 py-2 rounded-md border border-border bg-muted"
                  >
                    <div className="text-foreground text-sm">{t.name}</div>
                    <div className="text-muted-foreground text-xs mt-1">{t.slug}</div>
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

export default AdminTranslators
