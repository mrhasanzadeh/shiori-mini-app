import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Copy,
  FileStack,
  GripVertical,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import * as packs from '../services/supabasePacks'
import * as filesSvc from '../services/supabaseFiles'

type DraftPack = {
  id?: string
  slug: string
  title: string
  description: string
  is_active: boolean
}

const reorderList = <T,>(list: T[], fromIndex: number, toIndex: number): T[] => {
  const next = [...list]
  const [removed] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, removed)
  return next
}

const AdminFilePacks = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [workspaceTab, setWorkspaceTab] = useState<'settings' | 'files'>('settings')
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

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
  const [dragFileKey, setDragFileKey] = useState<string | null>(null)
  const [dropFileKey, setDropFileKey] = useState<string | null>(null)

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

  const canSave = Boolean(draft.slug.trim() && draft.title.trim())

  const onNewPack = () => {
    setWorkspaceOpen(true)
    setWorkspaceTab('settings')
    setDraft({ slug: '', title: '', description: '', is_active: true })
    setPackItems([])
    setFilesQuery('')
    setFileResults([])
    setNextSortOrder(1)
  }

  const onSelectPack = async (p: packs.FilePack) => {
    setWorkspaceOpen(true)
    setWorkspaceTab('files')
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
    setWorkspaceOpen(false)
    setWorkspaceTab('settings')
    setDraft({ slug: '', title: '', description: '', is_active: true })
    setPackItems([])
    setFilesQuery('')
    setFileResults([])
    setNextSortOrder(1)
  }

  const onSavePack = async () => {
    const slug = draft.slug.trim().toLowerCase()
    const title = draft.title.trim()
    if (!slug || !title) return

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
    if (!confirm('این پک و تمام فایل‌های داخلش حذف شود؟')) return

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

  const onCopyDeepLink = async () => {
    const value = deepLinkUrl || deepLinkPreview
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('کپی لینک ممکن نشد')
    }
  }

  useEffect(() => {
    if (!draft.id) {
      setFileResults([])
      setFilesLoading(false)
      return
    }

    const term = filesQuery.trim()
    if (!term) {
      setFileResults([])
      setFilesLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        setFilesLoading(true)
        const list = await filesSvc.searchFilesForPicker({
          query: term,
          limit: 25,
          activeOnly: false,
        })
        if (!cancelled) setFileResults(list)
      } finally {
        if (!cancelled) setFilesLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [filesQuery, draft.id])

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

  const onReorderPackItems = async (fromIndex: number, toIndex: number) => {
    const packId = draft.id
    if (!packId || fromIndex === toIndex) return

    const previous = packItems
    const reordered = reorderList(packItems, fromIndex, toIndex)
    const withOrder = reordered.map((it, index) => ({ ...it, sort_order: index + 1 }))

    setPackItems(withOrder)

    try {
      setSaving(true)
      setError(null)
      await packs.reorderFilePackItems({
        packId,
        orderedFileKeys: reordered.map((it) => it.file_key),
      })
    } catch (e) {
      setPackItems(previous)
      const msg = e instanceof Error ? e.message : 'خطا در تغییر ترتیب'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onPackItemDragStart = (e: DragEvent<HTMLElement>, fileKey: string) => {
    if (saving) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', fileKey)
    setDragFileKey(fileKey)
  }

  const onPackItemDragOver = (e: DragEvent<HTMLElement>, fileKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragFileKey && dragFileKey !== fileKey) setDropFileKey(fileKey)
  }

  const onPackItemDrop = (e: DragEvent<HTMLElement>, targetKey: string) => {
    e.preventDefault()
    const sourceKey = e.dataTransfer.getData('text/plain') || dragFileKey
    setDragFileKey(null)
    setDropFileKey(null)
    if (!sourceKey || sourceKey === targetKey || saving) return

    const fromIndex = packItems.findIndex((x) => x.file_key === sourceKey)
    const toIndex = packItems.findIndex((x) => x.file_key === targetKey)
    if (fromIndex < 0 || toIndex < 0) return

    void onReorderPackItems(fromIndex, toIndex)
  }

  const onPackItemDragEnd = () => {
    setDragFileKey(null)
    setDropFileKey(null)
  }

  const isSelected = (p: packs.FilePack) => draft.id && p.id === draft.id

  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl space-y-6 text-start">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              <ArrowRight className="h-4 w-4 shrink-0" />
              داشبورد
            </Link>
          </div>
          <h1 className="text-foreground flex items-center gap-2 text-xl font-bold">
            <Package className="h-5 w-5 shrink-0 text-primary-400" />
            پک فایل‌ها
          </h1>
          <p className="text-muted-foreground text-sm">
            پک‌ها را بسازید، لینک deep-link بگیرید و فایل‌ها را مرتب کنید.
          </p>
        </div>
        {saving ? (
          <span className="text-muted-foreground text-xs">در حال ذخیره...</span>
        ) : null}
      </header>

      {error ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,300px)_1fr]">
        <aside className="space-y-3">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">لیست پک‌ها</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={onNewPack}
                  disabled={saving}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  جدید
                </Button>
              </div>
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو در عنوان یا اسلاگ..."
                  className="pe-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-muted-foreground px-4 pb-4 text-sm">در حال بارگذاری...</p>
              ) : filteredPacks.length === 0 ? (
                <p className="text-muted-foreground px-4 pb-4 text-sm">
                  {query.trim() ? 'پکی پیدا نشد.' : 'هنوز پکی ساخته نشده.'}
                </p>
              ) : (
                <ul className="max-h-[min(520px,60vh)] divide-y overflow-y-auto">
                  {filteredPacks.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => void onSelectPack(p)}
                        className={cn(
                          'hover:bg-muted/50 w-full px-4 py-3 text-start transition-colors',
                          isSelected(p) && 'border-s-2 border-primary-400 bg-primary-600/15'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-foreground line-clamp-2 text-sm font-semibold">
                            {p.title}
                          </span>
                          <Badge variant={p.is_active ? 'success' : 'secondary'}>
                            {p.is_active ? 'فعال' : 'غیرفعال'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 font-mono text-xs text-end" dir="ltr">
                          {p.slug}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0">
          {!workspaceOpen ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <FileStack className="text-muted-foreground h-12 w-12 opacity-60" />
                <div className="space-y-1">
                  <p className="text-foreground font-medium">پکی انتخاب نشده</p>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    از لیست سمت راست یک پک را انتخاب کنید، یا با «جدید» یک پک تازه بسازید.
                  </p>
                </div>
                <Button type="button" className="gap-1.5" onClick={onNewPack} disabled={saving}>
                  <Plus className="h-4 w-4 shrink-0" />
                  ساخت پک جدید
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {draft.title.trim() || 'پک بدون عنوان'}
                    </CardTitle>
                    <p className="text-muted-foreground font-mono text-xs text-end" dir="ltr">
                      {draft.slug.trim() || 'اسلاگ را وارد کنید'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {draft.id ? (
                      <Badge variant="outline">{packItems.length} فایل</Badge>
                    ) : (
                      <Badge variant="secondary">ذخیره نشده</Badge>
                    )}
                    <Badge variant={draft.is_active ? 'success' : 'secondary'}>
                      {draft.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs
                  dir="rtl"
                  value={workspaceTab}
                  onValueChange={(v) => setWorkspaceTab(v as 'settings' | 'files')}
                >
                  <TabsList className="w-full justify-end">
                    <TabsTrigger value="settings" className="flex-1 sm:flex-none">
                      تنظیمات
                    </TabsTrigger>
                    <TabsTrigger
                      value="files"
                      className="flex-1 sm:flex-none"
                      disabled={!selectedPackId}
                    >
                      فایل‌ها
                      {selectedPackId ? ` (${packItems.length})` : ''}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="settings" className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="pack-title">عنوان نمایشی</Label>
                        <Input
                          id="pack-title"
                          value={draft.title}
                          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                          placeholder="Solo Leveling - فصل ۱ (1080p)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pack-slug">اسلاگ (یکتا)</Label>
                        <Input
                          id="pack-slug"
                          value={draft.slug}
                          onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                          placeholder="solo-leveling-s1-1080p"
                          className="font-mono text-sm"
                          dir="ltr"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 sm:mt-7">
                        <div>
                          <p className="text-sm font-medium">وضعیت انتشار</p>
                          <p className="text-muted-foreground text-xs">
                            پک غیرفعال در بات نمایش داده نمی‌شود.
                          </p>
                        </div>
                        <Switch
                          checked={draft.is_active}
                          onCheckedChange={(v) =>
                            setDraft((p) => ({ ...p, is_active: Boolean(v) }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pack-desc">توضیحات (اختیاری)</Label>
                      <Textarea
                        id="pack-desc"
                        value={draft.description}
                        onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                        className="min-h-24"
                        placeholder="توضیح کوتاه برای تیم یا یادداشت داخلی..."
                      />
                    </div>

                    {selectedPackId && (deepLinkUrl || deepLinkPreview) ? (
                      <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                        <Label>لینک deep-link بات</Label>
                        <div className="flex flex-row-reverse gap-2">
                          <Input
                            value={deepLinkUrl || deepLinkPreview}
                            readOnly
                            className="font-mono text-xs text-end"
                            dir="ltr"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="shrink-0"
                            onClick={() => void onCopyDeepLink()}
                            title="کپی"
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          پارامتر start بات:{' '}
                          <code className="font-mono">{deepLinkPreview}</code>
                        </p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                      <Button type="button" onClick={() => void onSavePack()} disabled={saving || !canSave}>
                        ذخیره پک
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={onClearDraft}
                        disabled={saving}
                      >
                        انصراف
                      </Button>
                      {selectedPackId ? (
                        <Button
                          type="button"
                          variant="destructive"
                          className="ms-auto gap-1.5"
                          onClick={() => void onDeletePack()}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          حذف پک
                        </Button>
                      ) : null}
                    </div>
                    {!canSave ? (
                      <p className="text-muted-foreground text-xs">برای ذخیره، عنوان و اسلاگ لازم است.</p>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="files" className="space-y-6">
                    {!selectedPackId ? (
                      <p className="text-muted-foreground text-sm">
                        ابتدا پک را ذخیره کنید، سپس می‌توانید فایل اضافه کنید.
                      </p>
                    ) : (
                      <>
                        <section className="space-y-3">
                          <div>
                            <h3 className="text-sm font-semibold">افزودن فایل</h3>
                            <p className="text-muted-foreground text-xs">
                              در نام فایل جستجو کنید؛ هر کلمه جداگانه اعمال می‌شود.
                            </p>
                          </div>
                          <div className="relative">
                            <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                            <Input
                              value={filesQuery}
                              onChange={(e) => setFilesQuery(e.target.value)}
                              placeholder="مثلاً fate 13"
                              className="pe-9"
                            />
                          </div>

                          {filesLoading ? (
                            <p className="text-muted-foreground text-sm">در حال جستجو...</p>
                          ) : filesQuery.trim() && fileResults.length === 0 ? (
                            <p className="text-muted-foreground text-sm">فایلی پیدا نشد.</p>
                          ) : fileResults.length > 0 ? (
                            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
                              {fileResults.map((f) => {
                                const inPack = packFileKeySet.has(f.key)
                                return (
                                  <li
                                    key={f.key}
                                    className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2"
                                  >
                                    <div className="min-w-0 flex-1 text-start">
                                      <p className="text-foreground line-clamp-1 text-sm font-medium">
                                        {f.file_name || '—'}
                                      </p>
                                      <p
                                        className="text-muted-foreground font-mono text-[11px] line-clamp-1 text-end"
                                        dir="ltr"
                                      >
                                        {f.key}
                                      </p>
                                    </div>
                                    {inPack ? (
                                      <Badge variant="success" className="shrink-0">
                                        در پک
                                      </Badge>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        className="shrink-0 gap-1"
                                        disabled={saving}
                                        onClick={() => void onAddFile(f.key)}
                                      >
                                        <Plus className="h-3.5 w-3.5 shrink-0" />
                                        افزودن
                                      </Button>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-xs">
                              برای دیدن نتایج، چند حرف از نام فایل را بنویسید.
                            </p>
                          )}
                        </section>

                        <section className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-semibold">ترتیب فایل‌ها</h3>
                              <p className="text-muted-foreground text-xs">
                                با آیکون ⋮⋮ بکشید و رها کنید تا جابه‌جا شود.
                              </p>
                            </div>
                          </div>

                          {packItems.length === 0 ? (
                            <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
                              هنوز فایلی در این پک نیست. از جستجوی بالا اضافه کنید.
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {packItems.map((it, idx) => (
                                <li
                                  key={it.file_key}
                                  onDragOver={(e) => onPackItemDragOver(e, it.file_key)}
                                  onDrop={(e) => onPackItemDrop(e, it.file_key)}
                                  onDragEnd={onPackItemDragEnd}
                                  className={cn(
                                    'flex items-center gap-2 rounded-lg border bg-card px-2 py-2 transition-colors',
                                    dragFileKey === it.file_key && 'opacity-50',
                                    dropFileKey === it.file_key &&
                                      dragFileKey !== it.file_key &&
                                      'border-primary-400/50 bg-muted/60'
                                  )}
                                >
                                  <button
                                    type="button"
                                    draggable={!saving}
                                    onDragStart={(e) => onPackItemDragStart(e, it.file_key)}
                                    className={cn(
                                      'text-muted-foreground shrink-0 rounded p-1',
                                      !saving && 'cursor-grab active:cursor-grabbing hover:bg-muted'
                                    )}
                                    title="کشیدن برای تغییر ترتیب"
                                    aria-label="جابه‌جایی"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </button>
                                  <span className="text-muted-foreground w-6 shrink-0 text-center font-mono text-xs">
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1 text-start">
                                    <p className="text-foreground line-clamp-2 text-sm font-medium">
                                      {it.file_name || '—'}
                                    </p>
                                    <p
                                      className="text-muted-foreground font-mono text-[11px] line-clamp-1 text-end"
                                      dir="ltr"
                                    >
                                      {it.file_key}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive shrink-0"
                                    disabled={saving}
                                    onClick={() => void onRemoveFile(it.file_key)}
                                    title="حذف از پک"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminFilePacks
