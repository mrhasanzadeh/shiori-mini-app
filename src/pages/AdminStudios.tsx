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
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-xl font-bold">استودیوها</h1>
          <p className="text-muted-foreground">لیستی از استودیوهای انیمه‌ها</p>
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
          placeholder="جستجو در استودیوها..."
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
                    <TableHead className="text-right h-10 text-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    return (
                      <TableRow key={String(s.id ?? s.slug)} className="h-10">
                        <TableCell className="text-right p-0 px-4">
                          <div className="text-foreground text-sm font-semibold">{s.name}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs p-0 px-4">
                          {s.slug}
                        </TableCell>
                        <TableCell className="text-left p-0 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" disabled={saving}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onSelect={() => onEdit(s)}>ویرایش</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={async () => {
                                  await onDelete(s)
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
            <SheetTitle>{draft.id ? 'ویرایش استودیو' : 'ایجاد استودیو'}</SheetTitle>
            <SheetDescription>اطلاعات استودیو را وارد کنید و ذخیره کنید.</SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-3">
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

export default AdminStudios
