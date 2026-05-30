import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import * as packs from '../services/supabasePacks'
import * as filesSvc from '../services/supabaseFiles'

type DraftPack = {
  id?: string
  slug: string
  title: string
  description: string
  is_active: boolean
}

const AdminFilePacks = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [items, setItems] = useState<packs.FilePack[]>([])

  const [draft, setDraft] = useState<DraftPack>({
    slug: '',
    title: '',
    description: '',
    is_active: true,
  })

  const [packItems, setPackItems] = useState<packs.FilePackItem[]>([])
  const [filesQuery, setFilesQuery] = useState('')
  const [filesLoading, setFilesLoading] = useState(false)
  const [fileResults, setFileResults] = useState<filesSvc.FilePickerItem[]>([])
  const [nextSortOrder, setNextSortOrder] = useState(1)

  const reloadPacks = async () => {
    const list = await packs.getAllFilePacks()
    setItems(list)
  }

  const reloadPackItems = async (packId: string) => {
    const list = await packs.getFilePackItems(packId)
    setPackItems(list)
    const maxOrder = list.reduce((m, x) => Math.max(m, x.sort_order || 0), 0)
    setNextSortOrder(maxOrder + 1)
  }

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        await reloadPacks()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در دریافت پک‌ها'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const filteredPacks = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((p) => {
      return (
        String(p.title ?? '')
          .toLowerCase()
          .includes(term) ||
        String(p.slug ?? '')
          .toLowerCase()
          .includes(term)
      )
    })
  }, [items, query])

  const selectedPackId = draft.id

  const packFileKeySet = useMemo(() => {
    return new Set(packItems.map((x) => x.file_key))
  }, [packItems])

  const deepLinkPreview = useMemo(() => {
    const slug = draft.slug.trim()
    if (!slug) return ''
    return `pack_${slug}`
  }, [draft.slug])

  const deepLinkUrl = useMemo(() => {
    const slug = draft.slug.trim()
    if (!slug) return ''
    const botUsername = String(
      import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'ShioriUploadBot'
    ).trim()
    if (!botUsername) return ''
    return `https://t.me/${botUsername}?start=pack_${encodeURIComponent(slug)}`
  }, [draft.slug])

  const onSelectPack = async (p: packs.FilePack) => {
    setDraft({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? '',
      is_active: p.is_active,
    })
    setFilesQuery('')
    setFileResults([])
    await reloadPackItems(p.id)
  }

  const onClearDraft = () => {
    setDraft({ slug: '', title: '', description: '', is_active: true })
    setPackItems([])
    setFilesQuery('')
    setFileResults([])
    setNextSortOrder(1)
  }

  const onSavePack = async () => {
    const slug = draft.slug.trim().toLowerCase()
    const title = draft.title.trim()
    if (!slug) return
    if (!title) return

    try {
      setSaving(true)
      setError(null)
      const saved = await packs.upsertFilePack({
        id: draft.id,
        slug,
        title,
        description: draft.description.trim() || null,
        is_active: Boolean(draft.is_active),
      })
      await reloadPacks()
      setDraft({
        id: saved.id,
        slug: saved.slug,
        title: saved.title,
        description: saved.description ?? '',
        is_active: saved.is_active,
      })
      await reloadPackItems(saved.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ذخیره پک'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onDeletePack = async () => {
    if (!draft.id) return
    if (!confirm('این پک حذف شود؟')) return

    try {
      setSaving(true)
      setError(null)
      await packs.deleteFilePack(draft.id)
      await reloadPacks()
      onClearDraft()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف پک'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onSearchFiles = async () => {
    const packId = draft.id
    if (!packId) return

    try {
      setFilesLoading(true)
      const list = await filesSvc.searchFilesForPicker({
        query: filesQuery,
        limit: 25,
        activeOnly: false,
      })
      setFileResults(list)
    } finally {
      setFilesLoading(false)
    }
  }

  const onAddFile = async (fileKey: string) => {
    const packId = draft.id
    if (!packId) return

    try {
      setSaving(true)
      setError(null)
      await packs.addFileToPack({ packId, fileKey, sortOrder: nextSortOrder })
      await reloadPackItems(packId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در افزودن فایل'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onRemoveFile = async (fileKey: string) => {
    const packId = draft.id
    if (!packId) return

    try {
      setSaving(true)
      setError(null)
      await packs.removeFileFromPack({ packId, fileKey })
      await reloadPackItems(packId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف فایل'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onMoveItem = async (it: packs.FilePackItem, dir: -1 | 1) => {
    const packId = draft.id
    if (!packId) return

    const idx = packItems.findIndex((x) => x.file_key === it.file_key)
    if (idx < 0) return
    const other = packItems[idx + dir]
    if (!other) return

    try {
      setSaving(true)
      setError(null)
      await packs.updatePackItemSortOrder({
        packId,
        fileKey: it.file_key,
        sortOrder: other.sort_order,
      })
      await packs.updatePackItemSortOrder({
        packId,
        fileKey: other.file_key,
        sortOrder: it.sort_order,
      })
      await reloadPackItems(packId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در تغییر ترتیب'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const isSelected = (p: packs.FilePack) => draft.id && p.id === draft.id

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-foreground text-xl font-bold">پک فایل‌ها</h1>
        <Link to="/admin" className="text-sm text-muted-foreground">
          داشبورد
        </Link>
      </div>

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">پک‌ها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو..."
            />

            {loading ? (
              <div className="text-muted-foreground text-sm">در حال بارگذاری...</div>
            ) : (
              <div className="overflow-hidden border rounded-md">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="text-right">عنوان</TableHead>
                      <TableHead className="text-right">slug</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPacks.map((p) => (
                      <TableRow
                        key={p.id}
                        data-state={isSelected(p) ? 'selected' : undefined}
                        className="cursor-pointer"
                        onClick={() => onSelectPack(p)}
                      >
                        <TableCell className="text-right">
                          <div className="text-foreground text-sm font-semibold line-clamp-1">
                            {p.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{p.slug}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredPacks.length === 0 && (
                  <div className="text-muted-foreground text-sm p-4">چیزی پیدا نشد</div>
                )}
              </div>
            )}

            <Button type="button" variant="secondary" onClick={onClearDraft} disabled={saving}>
              پک جدید
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">افزودن / ویرایش پک</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Slug</div>
                <Input
                  value={draft.slug}
                  onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="solo-leveling-s1-1080p"
                />
              </div>

              <div>
                <div className="text-muted-foreground text-xs mb-1">Title</div>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Solo Leveling - Season 1 (1080p)"
                />
              </div>

              <div>
                <div className="text-muted-foreground text-xs mb-1">Description (اختیاری)</div>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                  className="min-h-24"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-muted-foreground text-xs">Active</div>
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft((p) => ({ ...p, is_active: Boolean(v) }))}
                />
              </div>

              {selectedPackId ? (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Payload</div>
                  <Input value={deepLinkUrl || deepLinkPreview} readOnly />
                  <div className="text-muted-foreground text-[11px] mt-1">
                    این مقدار را در deep-link بات استفاده می‌کنیم (مثلاً start=pack_...).
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" onClick={onSavePack} disabled={saving}>
                  ذخیره
                </Button>
                <Button type="button" variant="secondary" onClick={onClearDraft} disabled={saving}>
                  پاک کردن
                </Button>
              </div>

              {selectedPackId ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDeletePack}
                  disabled={saving}
                >
                  حذف پک
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">فایل‌های داخل پک</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedPackId ? (
                <div className="text-muted-foreground text-sm">
                  برای مدیریت آیتم‌ها، یک پک انتخاب کنید.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={filesQuery}
                      onChange={(e) => setFilesQuery(e.target.value)}
                      placeholder="جستجوی فایل (key / name / caption)"
                    />
                    <Button type="button" onClick={onSearchFiles} disabled={filesLoading || saving}>
                      جستجو
                    </Button>
                  </div>

                  {filesLoading ? (
                    <div className="text-muted-foreground text-sm">در حال جستجو...</div>
                  ) : fileResults.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted">
                          <TableRow>
                            <TableHead className="text-right">file</TableHead>
                            <TableHead className="text-right">key</TableHead>
                            <TableHead className="text-left"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fileResults.map((f) => (
                            <TableRow key={f.key}>
                              <TableCell className="text-right">
                                <div className="text-foreground text-sm font-semibold line-clamp-1">
                                  {f.file_name || '—'}
                                </div>
                                {f.caption ? (
                                  <div className="text-muted-foreground text-xs line-clamp-1 mt-1">
                                    {f.caption}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {f.key}
                              </TableCell>
                              <TableCell className="text-left">
                                {packFileKeySet.has(f.key) ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => onRemoveFile(f.key)}
                                    disabled={saving}
                                  >
                                    حذف
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => onAddFile(f.key)}
                                    disabled={saving}
                                  >
                                    افزودن
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}

                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead className="text-right">#</TableHead>
                          <TableHead className="text-right">file</TableHead>
                          <TableHead className="text-right">key</TableHead>
                          <TableHead className="text-left"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packItems.map((it, idx) => (
                          <TableRow key={it.file_key}>
                            <TableCell className="text-right font-mono text-xs">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-foreground text-sm font-semibold line-clamp-1">
                                {it.file_name || '—'}
                              </div>
                              <div className="text-muted-foreground text-xs mt-1 font-mono">
                                order: {it.sort_order}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {it.file_key}
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={saving || idx === 0}
                                  onClick={() => onMoveItem(it, -1)}
                                >
                                  بالا
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={saving || idx === packItems.length - 1}
                                  onClick={() => onMoveItem(it, 1)}
                                >
                                  پایین
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  disabled={saving}
                                  onClick={() => onRemoveFile(it.file_key)}
                                >
                                  حذف
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {packItems.length === 0 && (
                      <div className="text-muted-foreground text-sm p-4">هنوز فایلی اضافه نشده</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AdminFilePacks
