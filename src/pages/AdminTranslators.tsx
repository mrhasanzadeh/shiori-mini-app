import { useEffect, useMemo, useState } from 'react'
import { Languages, Pencil, Trash2, User } from 'lucide-react'
import * as supa from '../services/supabaseAnime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  AdminCrudRow,
  AdminCrudSearch,
} from '@/components/admin/AdminCrudUi'

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
  const [sheetOpen, setSheetOpen] = useState(false)

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

  const onEdit = (t: supa.TranslatorAdminItem) => {
    onSelect(t)
    setSheetOpen(true)
  }

  const onClear = () => {
    setDraft({ name: '', slug: '', avatar_url: '', cover_url: '', bio: '', experience: '' })
  }

  const onCreate = () => {
    onClear()
    setSheetOpen(true)
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

      if (!name) throw new Error('نام الزامی است')
      if (!slug) throw new Error('اسلاگ الزامی است')

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
      setSheetOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ذخیره'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (t: supa.TranslatorAdminItem) => {
    if (!t.id) return
    if (!confirm('این مترجم حذف شود؟')) return
    try {
      setSaving(true)
      setError(null)
      await supa.deleteTranslatorAdmin(t.id)
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
        icon={Languages}
        title="مترجم‌ها"
        description="مدیریت پروفایل مترجم‌ها و تیم‌های همکار"
        createLabel="مترجم جدید"
        onCreate={onCreate}
        createDisabled={saving}
      />

      {error ? <AdminCrudError message={error} /> : null}

      <AdminCrudSearch value={query} onChange={setQuery} placeholder="جستجو در نام یا اسلاگ..." />

      {loading ? (
        <p className="text-muted-foreground py-16 text-center text-sm">در حال بارگذاری...</p>
      ) : filtered.length === 0 ? (
        <AdminCrudEmpty
          title={items.length === 0 ? 'هنوز مترجمی ثبت نشده' : 'نتیجه‌ای پیدا نشد'}
          description={
            items.length === 0
              ? 'اولین مترجم را اضافه کنید.'
              : 'عبارت جستجو را تغییر دهید.'
          }
          actionLabel={items.length === 0 ? 'افزودن مترجم' : query.trim() ? 'پاک کردن جستجو' : undefined}
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
          <div className="space-y-2">
            {filtered.map((t) => (
              <AdminCrudRow
                key={String(t.id ?? t.slug)}
                actions={
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => onEdit(t)}
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
                      onClick={() => void onDelete(t)}
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                }
              >
                <div className="flex items-center gap-3">
                  <div className="bg-muted relative h-11 w-11 shrink-0 overflow-hidden rounded-full border">
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                        <User className="h-5 w-5 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-semibold">{t.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {t.slug}
                      </Badge>
                      {t.avatar_url ? (
                        <Badge variant="success">دارای آواتار</Badge>
                      ) : (
                        <Badge variant="secondary">بدون آواتار</Badge>
                      )}
                    </div>
                    {t.bio ? (
                      <p className="text-muted-foreground line-clamp-1 text-xs">{t.bio}</p>
                    ) : null}
                  </div>
                </div>
              </AdminCrudRow>
            ))}
          </div>
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent dir="rtl" className="flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{draft.id ? 'ویرایش مترجم' : 'مترجم جدید'}</SheetTitle>
            <SheetDescription>اطلاعات پروفایل مترجم را تکمیل کنید.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="translator-name">نام</Label>
              <Input
                id="translator-name"
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="نام مترجم"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="translator-slug">اسلاگ</Label>
              <Input
                id="translator-slug"
                value={draft.slug}
                onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                placeholder="hasan"
                className="font-mono text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="translator-avatar">آدرس آواتار (اختیاری)</Label>
              <Input
                id="translator-avatar"
                value={draft.avatar_url}
                onChange={(e) => setDraft((p) => ({ ...p, avatar_url: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="translator-cover">آدرس کاور (اختیاری)</Label>
              <Input
                id="translator-cover"
                value={draft.cover_url}
                onChange={(e) => setDraft((p) => ({ ...p, cover_url: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="translator-bio">بیو (اختیاری)</Label>
              <Textarea
                id="translator-bio"
                value={draft.bio}
                onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))}
                placeholder="توضیحات کوتاه..."
                className="min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="translator-exp">سابقه (اختیاری)</Label>
              <Textarea
                id="translator-exp"
                value={draft.experience}
                onChange={(e) => setDraft((p) => ({ ...p, experience: e.target.value }))}
                placeholder="مثلاً: ۳ سال فعالیت"
                className="min-h-20"
              />
            </div>
          </div>

          <SheetFooter>
            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                size="lg"
                disabled={saving || !draft.name.trim() || !draft.slug.trim()}
                onClick={() => void onSave()}
              >
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

export default AdminTranslators
