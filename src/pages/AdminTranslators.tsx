import { useEffect, useMemo, useState } from 'react'
import * as supa from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-xl font-bold">مترجم‌ها</h1>
          <p className="text-muted-foreground">لیستی از مترجم‌های انیمه‌ها</p>
        </div>
        <Button size={'lg'} className="px-6" type="button" onClick={onCreate} disabled={saving}>
          ایجاد
        </Button>
      </div>

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

      <div className="flex flex-col gap-4">
        <Input
          className="w-1/3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو در مترجم‌ها..."
        />

        {loading ? (
          <div className="mt-6 text-muted-foreground text-sm">در حال بارگذاری...</div>
        ) : (
          <div>
            <div className="overflow-hidden border rounded-md">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="text-right h-10 text-foreground">عنوان</TableHead>
                    <TableHead className="text-right h-10 text-foreground">اسلاگ</TableHead>
                    <TableHead className="text-right h-10 text-foreground">avatar</TableHead>
                    <TableHead className="text-right h-10 text-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    return (
                      <TableRow key={String(t.id ?? t.slug)} className="h-10">
                        <TableCell className="text-right p-0 px-4">
                          <div className="text-foreground text-sm font-semibold">{t.name}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs p-0 px-4">
                          {t.slug}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs p-0 px-4">
                          {t.avatar_url ? 'yes' : 'no'}
                        </TableCell>
                        <TableCell className="text-left p-0 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" disabled={saving}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onSelect={() => onEdit(t)}>ویرایش</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={async () => {
                                  await onDelete(t)
                                }}
                              >
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {filtered.length === 0 && (
              <div className="text-muted-foreground text-sm mt-3">چیزی پیدا نشد</div>
            )}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{draft.id ? 'ویرایش مترجم' : 'ایجاد مترجم'}</SheetTitle>
            <SheetDescription>اطلاعات مترجم را وارد کنید و ذخیره کنید.</SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-3">
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
                className="min-h-28"
              />
            </div>
          </div>

          <SheetFooter>
            <div className="flex flex-col items-center justify-end gap-2 w-full">
              <Button
                type="button"
                size={'lg'}
                className="bg-primary-500 text-foreground w-full"
                onClick={async () => {
                  await onSave()
                  setSheetOpen(false)
                }}
                disabled={saving}
              >
                ذخیره تغییرات
              </Button>
              <Button
                type="button"
                size={'lg'}
                className="w-full"
                variant="secondary"
                onClick={() => setSheetOpen(false)}
                disabled={saving}
              >
                انصراف
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default AdminTranslators
