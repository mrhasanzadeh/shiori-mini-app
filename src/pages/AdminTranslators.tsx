import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink, Languages, Pencil, Trash2, User } from 'lucide-react'
import * as supa from '../services/supabaseAnime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { AdminEditSheet, AdminEditSheetActions } from '@/components/admin/AdminEditSheet'
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
  is_active: boolean
}

const ImageUrlPreview = ({
  url,
  label,
  variant,
}: {
  url: string
  label: string
  variant: 'avatar' | 'cover'
}) => {
  const [failed, setFailed] = useState(false)
  const trimmed = url.trim()

  useEffect(() => {
    setFailed(false)
  }, [trimmed])

  if (!trimmed) return null

  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-muted-foreground mb-2 text-[11px]">{label}</p>
      {failed ? (
        <p className="text-destructive text-xs">بارگذاری تصویر ناموفق — آدرس را بررسی کنید.</p>
      ) : (
        <div
          className={
            variant === 'avatar'
              ? 'mx-auto h-20 w-20 overflow-hidden rounded-full border bg-muted'
              : 'aspect-[3/1] max-h-28 overflow-hidden rounded-lg border bg-muted'
          }
        >
          <img
            src={trimmed}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        </div>
      )}
    </div>
  )
}

const AdminTranslators = () => {
  const [searchParams, setSearchParams] = useSearchParams()
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
    is_active: true,
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
      is_active: t.is_active !== false,
    })
  }

  const onEdit = (t: supa.TranslatorAdminItem) => {
    onSelect(t)
    setSheetOpen(true)
  }

  useEffect(() => {
    if (loading) return
    const editSlug = searchParams.get('edit')?.trim()
    if (!editSlug) return

    const match = items.find((t) => t.slug === editSlug)
    if (match) {
      onSelect(match)
      setSheetOpen(true)
    }
    setSearchParams({}, { replace: true })
  }, [loading, items, searchParams, setSearchParams])

  const onClear = () => {
    setDraft({ name: '', slug: '', avatar_url: '', cover_url: '', bio: '', experience: '', is_active: true })
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
        is_active: draft.is_active,
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
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {t.slug ? (
                      <Button type="button" size="sm" variant="secondary" className="gap-1.5" asChild>
                        <Link to={`/translators/${encodeURIComponent(t.slug)}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          پروفایل
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      disabled={saving}
                      onClick={() => onEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      ویرایش
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={saving}
                      onClick={() => void onDelete(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      حذف
                    </Button>
                  </div>
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
                      <Badge
                        variant={t.is_active !== false ? 'success' : 'secondary'}
                        className={cn(
                          'shrink-0',
                          t.is_active === false && 'bg-red-500/15 text-red-400 border-red-500/25'
                        )}
                      >
                        {t.is_active !== false ? 'فعال' : 'غیرفعال'}
                      </Badge>
                      {t.avatar_url ? (
                        <Badge variant="premium" className="shrink-0">
                          دارای آواتار
                        </Badge>
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

      <AdminEditSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={draft.id ? 'ویرایش مترجم' : 'مترجم جدید'}
        description="اطلاعات پروفایل مترجم را تکمیل کنید."
        footer={
          <AdminEditSheetActions
            saving={saving}
            saveDisabled={!draft.name.trim() || !draft.slug.trim()}
            onSave={() => void onSave()}
            onCancel={() => setSheetOpen(false)}
          />
        }
      >
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
          <ImageUrlPreview url={draft.avatar_url} label="پیش‌نمایش آواتار" variant="avatar" />
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
          <ImageUrlPreview url={draft.cover_url} label="پیش‌نمایش کاور" variant="cover" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div>
            <Label htmlFor="translator-active" className="text-sm font-medium">
              وضعیت مترجم
            </Label>
          </div>
          <Switch
            id="translator-active"
            checked={draft.is_active}
            onCheckedChange={(v) => setDraft((p) => ({ ...p, is_active: Boolean(v) }))}
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
      </AdminEditSheet>
    </AdminCrudPage>
  )
}

export default AdminTranslators
