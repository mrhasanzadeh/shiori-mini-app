import { useEffect, useMemo, useState } from 'react'
import * as supa from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type Draft = {
  id?: number
  slug: string
  name_en?: string
  name_fa?: string
}

const AdminGenres = () => {
  const [, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [, setError] = useState<string | null>(null)
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

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-xl font-bold">ژانرها</h1>
          <p className="text-muted-foreground">لیستی از ژانرهای انیمه‌ها</p>
        </div>
        <Button size={'lg'} className="px-6" type="button" onClick={onCreate} disabled={saving}>
          ایجاد
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        <Input
          className="w-1/3"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو در ژانرها..."
        />

        <div className="overflow-hidden border rounded-md">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-right h-10 text-foreground">عنوان</TableHead>
                <TableHead className="text-right h-10 text-foreground">اسلاگ</TableHead>
                <TableHead className="text-right h-10 text-foreground">نام انگلیسی</TableHead>
                <TableHead className="text-right h-10 text-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => {
                return (
                  <TableRow key={String(g.id ?? g.slug)} className="h-10">
                    <TableCell className="text-right p-0 px-4">
                      <div className="text-foreground text-sm font-semibold">
                        {g.name_fa || g.name_en || g.slug}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-0 px-4">
                      {g.slug}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-0 px-4">
                      {g.name_en ?? '—'}
                    </TableCell>
                    <TableCell className="text-left p-0 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" disabled={saving}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onSelect={() => onEdit(g)}>ویرایش</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={async () => {
                              await onDelete(g)
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
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>{draft.id ? 'ویرایش ژانر' : 'ایجاد ژانر'}</SheetTitle>
            <SheetDescription>اطلاعات ژانر را وارد کنید و ذخیره کنید.</SheetDescription>
          </SheetHeader>

          <div className="p-4 flex-1 flex flex-col gap-4">
            <div>
              <div className="text-muted-foreground text-xs mb-1">اسلاگ</div>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                placeholder="action"
              />
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">نام انگلیسی</div>
              <Input
                value={draft.name_en ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, name_en: e.target.value }))}
                placeholder="Action"
              />
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">نام فارسی</div>
              <Input
                value={draft.name_fa ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, name_fa: e.target.value }))}
                placeholder="اکشن"
              />
            </div>
          </div>

          <SheetFooter>
            <div className="flex flex-col items-center justify-end gap-2 w-full">
              <Button
                type="button"
                size={'lg'}
                className="bg-primary-500 text-foreground w-full"
                disabled={saving}
                onClick={async () => {
                  await onSave()
                  setSheetOpen(false)
                }}
              >
                ذخیره تغییرات
              </Button>
              <Button
                type="button"
                size={'lg'}
                className="w-full"
                variant="secondary"
                onClick={() => setSheetOpen(false)}
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

export default AdminGenres
