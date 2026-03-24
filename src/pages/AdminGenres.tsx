import { useEffect, useMemo, useState } from 'react'
import * as supa from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
      <h1 className="text-foreground text-xl font-bold">ژانرها</h1>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">افزودن / ویرایش</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  value={draft.slug}
                  onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="slug (مثال: action)"
                />
                <Input
                  value={draft.name_en ?? ''}
                  onChange={(e) => setDraft((p) => ({ ...p, name_en: e.target.value }))}
                  placeholder="name_en"
                />
                <Input
                  value={draft.name_fa ?? ''}
                  onChange={(e) => setDraft((p) => ({ ...p, name_fa: e.target.value }))}
                  placeholder="name_fa"
                />
                <Button
                  type="button"
                  size={'lg'}
                  className="bg-primary-500 text-foreground"
                  disabled={saving}
                  onClick={onSave}
                >
                  ذخیره
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div />
            </div>

            {loading ? (
              <div className="mt-6 text-muted-foreground text-sm">در حال بارگذاری...</div>
            ) : error ? (
              <div className="mt-6 text-red-400 text-sm">{error}</div>
            ) : (
              <div className="space-y-2">
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
                    className="flex items-center justify-between gap-2 w-full text-right px-3 py-2 rounded-md border border-border bg-muted"
                  >
                    <div className="text-foreground text-sm font-semibold">
                      {g.name_fa || g.name_en || g.slug}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">{g.slug}</div>
                  </button>
                ))}

                {filtered.length === 0 && (
                  <div className="text-muted-foreground text-sm text-center py-10">
                    ژانری پیدا نشد
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminGenres
