import { useEffect, useMemo, useState } from 'react'
import { Pencil, Tags, Trash2 } from 'lucide-react'
import * as supa from '../services/supabaseAnime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  const [sheetOpen, setSheetOpen] = useState(false)

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
      setSheetOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ذخیره ژانر'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onCreate = () => {
    setDraft({ slug: '', name_en: '', name_fa: '' })
    setSheetOpen(true)
  }

  const onEdit = (g: supa.GenreAdminItem) => {
    setDraft({
      id: typeof g.id === 'number' ? g.id : undefined,
      slug: g.slug,
      name_en: g.name_en ?? '',
      name_fa: g.name_fa ?? '',
    })
    setSheetOpen(true)
  }

  const onDelete = async (g: supa.GenreAdminItem) => {
    if (!confirm('این ژانر حذف شود؟')) return
    try {
      setSaving(true)
      setError(null)
      await supa.deleteGenre({ id: g.id, slug: g.slug })
      await reload()
      setDraft({ slug: '', name_en: '', name_fa: '' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف ژانر'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const displayTitle = (g: supa.GenreAdminItem) => g.name_fa || g.name_en || g.slug

  return (
    <AdminCrudPage>
      <AdminCrudHeader
        icon={Tags}
        title="ژانرها"
        description="مدیریت ژانرهای کاتالوگ انیمه"
        createLabel="ژانر جدید"
        onCreate={onCreate}
        createDisabled={saving}
      />

      {error ? <AdminCrudError message={error} /> : null}

      <AdminCrudSearch value={q} onChange={setQ} placeholder="جستجو در عنوان، اسلاگ یا نام انگلیسی..." />

      {loading ? (
        <p className="text-muted-foreground py-16 text-center text-sm">در حال بارگذاری...</p>
      ) : filtered.length === 0 ? (
        <AdminCrudEmpty
          title={list.length === 0 ? 'هنوز ژانری ثبت نشده' : 'نتیجه‌ای پیدا نشد'}
          description={
            list.length === 0
              ? 'اولین ژانر را اضافه کنید.'
              : 'عبارت جستجو را تغییر دهید.'
          }
          actionLabel={list.length === 0 ? 'افزودن ژانر' : q.trim() ? 'پاک کردن جستجو' : undefined}
          onAction={
            list.length === 0
              ? onCreate
              : q.trim()
                ? () => setQ('')
                : undefined
          }
        />
      ) : (
        <>
          <AdminCrudCount filtered={filtered.length} total={list.length} />
          <AdminCrudGrid>
            {filtered.map((g) => (
              <AdminCrudCard
                key={String(g.id ?? g.slug)}
                actions={
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => onEdit(g)}
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
                      onClick={() => void onDelete(g)}
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                }
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground text-sm font-semibold">{displayTitle(g)}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {g.slug}
                    </Badge>
                  </div>
                </div>
              </AdminCrudCard>
            ))}
          </AdminCrudGrid>
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent dir="rtl" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>{draft.id ? 'ویرایش ژانر' : 'ژانر جدید'}</SheetTitle>
            <SheetDescription>اسلاگ یکتا و نام‌های نمایشی را وارد کنید.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="genre-slug">اسلاگ</Label>
              <Input
                id="genre-slug"
                value={draft.slug}
                onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                placeholder="action"
                className="font-mono text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre-name-fa">نام فارسی</Label>
              <Input
                id="genre-name-fa"
                value={draft.name_fa ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, name_fa: e.target.value }))}
                placeholder="اکشن"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre-name-en">نام انگلیسی</Label>
              <Input
                id="genre-name-en"
                value={draft.name_en ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, name_en: e.target.value }))}
                placeholder="Action"
                dir="ltr"
              />
            </div>
          </div>

          <SheetFooter>
            <div className="flex w-full flex-col gap-2">
              <Button type="button" size="lg" disabled={saving || !draft.slug.trim()} onClick={() => void onSave()}>
                ذخیره
              </Button>
              <Button type="button" size="lg" variant="secondary" onClick={() => setSheetOpen(false)} disabled={saving}>
                انصراف
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminCrudPage>
  )
}

export default AdminGenres
