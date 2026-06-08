import { useEffect, useMemo, useState } from 'react'
import { Building2, Pencil, Trash2 } from 'lucide-react'
import * as supa from '../services/supabaseAnime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminEditSheet, AdminEditSheetActions } from '@/components/admin/AdminEditSheet'
import {
  AdminCrudCount,
  AdminCrudEmpty,
  AdminCrudError,
  AdminCrudHeader,
  AdminCrudPage,
  AdminCrudCard,
  AdminCrudGrid,
  AdminCrudSearch,
} from '@/components/admin/AdminCrudUi'

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
  const [sheetOpen, setSheetOpen] = useState(false)

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

  const onEdit = (s: supa.StudioAdminItem) => {
    onSelect(s)
    setSheetOpen(true)
  }

  const onClear = () => {
    setDraft({ slug: '', name: '' })
  }

  const onCreate = () => {
    onClear()
    setSheetOpen(true)
  }

  const onSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const slug = draft.slug.trim().toLowerCase()
      const name = draft.name.trim()
      if (!slug) throw new Error('اسلاگ الزامی است')
      if (!name) throw new Error('نام الزامی است')

      await supa.upsertStudioAdmin({
        id: draft.id,
        slug,
        name,
      })

      await reload()
      onClear()
      setSheetOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ذخیره'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (s: supa.StudioAdminItem) => {
    if (!s.id) return
    if (!confirm('این استودیو حذف شود؟')) return
    try {
      setSaving(true)
      setError(null)
      await supa.deleteStudioAdmin(s.id)
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
    <AdminCrudPage>
      <AdminCrudHeader
        icon={Building2}
        title="استودیوها"
        description="مدیریت استودیوهای تولید انیمه"
        createLabel="استودیو جدید"
        onCreate={onCreate}
        createDisabled={saving}
      />

      {error ? <AdminCrudError message={error} /> : null}

      <AdminCrudSearch value={query} onChange={setQuery} placeholder="جستجو در نام یا اسلاگ..." />

      {loading ? (
        <p className="text-muted-foreground py-16 text-center text-sm">در حال بارگذاری...</p>
      ) : filtered.length === 0 ? (
        <AdminCrudEmpty
          title={items.length === 0 ? 'هنوز استودیویی ثبت نشده' : 'نتیجه‌ای پیدا نشد'}
          description={
            items.length === 0
              ? 'اولین استودیو را اضافه کنید.'
              : 'عبارت جستجو را تغییر دهید.'
          }
          actionLabel={items.length === 0 ? 'افزودن استودیو' : query.trim() ? 'پاک کردن جستجو' : undefined}
          onAction={
            items.length === 0
              ? onCreate
              : query.trim()
                ? () => setQuery('')
                : undefined
          }
        />
      ) : (
        <>
          <AdminCrudCount filtered={filtered.length} total={items.length} />
          <AdminCrudGrid>
            {filtered.map((s) => (
              <AdminCrudCard
                key={String(s.id ?? s.slug)}
                actions={
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => onEdit(s)}
                      title="ویرایش"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={saving}
                      onClick={() => void onDelete(s)}
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground text-sm font-semibold">{s.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {s.slug}
                  </Badge>
                </div>
              </AdminCrudCard>
            ))}
          </AdminCrudGrid>
        </>
      )}

      <AdminEditSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={draft.id ? 'ویرایش استودیو' : 'استودیو جدید'}
        description="نام نمایشی و اسلاگ یکتا را وارد کنید."
        footer={
          <AdminEditSheetActions
            saving={saving}
            saveDisabled={!draft.slug.trim() || !draft.name.trim()}
            onSave={() => void onSave()}
            onCancel={() => setSheetOpen(false)}
          />
        }
      >
        <div className="space-y-2">
          <Label htmlFor="studio-name">نام</Label>
          <Input
            id="studio-name"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="MAPPA"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studio-slug">اسلاگ</Label>
          <Input
            id="studio-slug"
            value={draft.slug}
            onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
            placeholder="mappa"
            className="font-mono text-sm"
            dir="ltr"
          />
        </div>
      </AdminEditSheet>
    </AdminCrudPage>
  )
}

export default AdminStudios
