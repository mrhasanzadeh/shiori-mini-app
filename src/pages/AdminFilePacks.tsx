import { useEffect, useMemo, useState, type DragEvent } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  FileStack,
  GripVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import * as packs from '../services/supabasePacks'
import * as filesSvc from '../services/supabaseFiles'
import { animeMatchesSearchQuery } from '../services/supabaseAnime'
import { useAdminAnimeListQuery } from '../hooks/queries/useAnimeQueries'

type DraftPack = {
  id?: string
  slug: string
  title: string
  description: string
  is_active: boolean
}

type StatusFilter = 'all' | 'active' | 'inactive'
type SortKey = 'newest' | 'title' | 'slug' | 'files'

const reorderList = <T,>(list: T[], fromIndex: number, toIndex: number): T[] => {
  const next = [...list]
  const [removed] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, removed)
  return next
}

const formatNumber = (n: number) => n.toLocaleString('fa-IR')

const LIBRARY_SEARCH_INITIAL_LIMIT = 150
const LIBRARY_SEARCH_MORE_STEP = 100

const buildDeepLinkUrl = (slug: string): string => {
  const trimmed = slug.trim()
  if (!trimmed) return ''
  const botUsername = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'ShioriUploadBot').trim()
  if (!botUsername) return ''
  return `https://t.me/${botUsername}?start=pack_${encodeURIComponent(trimmed)}`
}

const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'success'
}) => (
  <div className="rounded-xl border bg-card px-4 py-3">
    <p className="text-muted-foreground text-xs">{label}</p>
    <p
      className={cn(
        'mt-1 text-2xl font-bold tabular-nums',
        accent === 'success' && 'text-green-300'
      )}
    >
      {formatNumber(value)}
    </p>
  </div>
)

const AdminFilePacks = () => {
  const { data: adminAnimeData } = useAdminAnimeListQuery()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedPackId, setCopiedPackId] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortKey>('newest')
  const [items, setItems] = useState<packs.FilePack[]>([])

  const [sheetOpen, setSheetOpen] = useState(false)
  const [workspaceTab, setWorkspaceTab] = useState<'settings' | 'files'>('settings')

  const [draft, setDraft] = useState<DraftPack>({
    slug: '',
    title: '',
    description: '',
    is_active: true,
  })

  const [packItems, setPackItems] = useState<packs.FilePackItem[]>([])
  const [packFilesQuery, setPackFilesQuery] = useState('')
  const [filesQuery, setFilesQuery] = useState('')
  const [librarySearchLimit, setLibrarySearchLimit] = useState(LIBRARY_SEARCH_INITIAL_LIMIT)
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

    void run()
  }, [])

  const overview = useMemo(
    () => ({
      total: items.length,
      active: items.filter((p) => p.is_active).length,
      files: items.reduce((sum, p) => sum + p.file_count, 0),
    }),
    [items]
  )

  const filteredPacks = useMemo(() => {
    const term = query.trim().toLowerCase()
    let list = items

    if (statusFilter === 'active') list = list.filter((p) => p.is_active)
    else if (statusFilter === 'inactive') list = list.filter((p) => !p.is_active)

    if (term) {
      list = list.filter(
        (p) =>
          String(p.title ?? '')
            .toLowerCase()
            .includes(term) ||
          String(p.slug ?? '')
            .toLowerCase()
            .includes(term)
      )
    }

    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'fa')
      if (sortBy === 'slug') return a.slug.localeCompare(b.slug)
      if (sortBy === 'files') return b.file_count - a.file_count
      const aTime = a.created_at ? Date.parse(a.created_at) : 0
      const bTime = b.created_at ? Date.parse(b.created_at) : 0
      return bTime - aTime
    })

    return sorted
  }, [items, query, statusFilter, sortBy])

  const selectedPackId = draft.id

  const packFileKeySet = useMemo(() => new Set(packItems.map((x) => x.file_key)), [packItems])

  const filteredPackItems = useMemo(() => {
    const term = packFilesQuery.trim().toLowerCase()
    if (!term) return packItems
    return packItems.filter(
      (it) =>
        String(it.file_name ?? '')
          .toLowerCase()
          .includes(term) ||
        String(it.file_key ?? '')
          .toLowerCase()
          .includes(term)
    )
  }, [packItems, packFilesQuery])

  const fileSearchExtraTerms = useMemo(() => {
    const term = filesQuery.trim()
    if (!term) return []
    const extras = new Set<string>()
    for (const a of adminAnimeData?.list ?? []) {
      if (animeMatchesSearchQuery(a, term)) {
        if (a.title?.trim()) extras.add(a.title.trim())
        if (a.title_romaji?.trim()) extras.add(a.title_romaji.trim())
      }
    }
    return [...extras]
  }, [filesQuery, adminAnimeData?.list])

  const deepLinkPreview = useMemo(() => {
    const slug = draft.slug.trim()
    return slug ? `pack_${slug}` : ''
  }, [draft.slug])

  const deepLinkUrl = useMemo(() => buildDeepLinkUrl(draft.slug), [draft.slug])

  const canSave = Boolean(draft.slug.trim() && draft.title.trim())

  const resetDraft = () => {
    setDraft({ slug: '', title: '', description: '', is_active: true })
    setPackItems([])
    setPackFilesQuery('')
    setFilesQuery('')
    setLibrarySearchLimit(LIBRARY_SEARCH_INITIAL_LIMIT)
    setFileResults([])
    setNextSortOrder(1)
    setWorkspaceTab('settings')
  }

  const onNewPack = () => {
    resetDraft()
    setSheetOpen(true)
  }

  const onSelectPack = async (p: packs.FilePack, tab: 'settings' | 'files' = 'files') => {
    setWorkspaceTab(tab)
    setDraft({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? '',
      is_active: p.is_active,
    })
    setPackFilesQuery('')
    setFilesQuery('')
    setLibrarySearchLimit(LIBRARY_SEARCH_INITIAL_LIMIT)
    setFileResults([])
    setSheetOpen(true)
    await reloadPackItems(p.id)
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
      if (!draft.id) setWorkspaceTab('files')
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
      setSheetOpen(false)
      resetDraft()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف پک'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onCopyDeepLink = async (value: string, packId?: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      if (packId) {
        setCopiedPackId(packId)
        window.setTimeout(() => setCopiedPackId(null), 2000)
      } else {
        setCopiedPackId('sheet')
        window.setTimeout(() => setCopiedPackId(null), 2000)
      }
    } catch {
      setError('کپی لینک ممکن نشد')
    }
  }

  useEffect(() => {
    setLibrarySearchLimit(LIBRARY_SEARCH_INITIAL_LIMIT)
  }, [filesQuery])

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
          matchAnyTerms: fileSearchExtraTerms,
          limit: librarySearchLimit,
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
  }, [filesQuery, fileSearchExtraTerms, draft.id, librarySearchLimit])

  const onAddFile = async (fileKey: string) => {
    const packId = draft.id
    if (!packId) return

    try {
      setSaving(true)
      setError(null)
      await packs.addFileToPack({ packId, fileKey, sortOrder: nextSortOrder })
      await reloadPackItems(packId)
      await reloadPacks()
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
      await reloadPacks()
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

  return (
    <AdminCrudPage>
      <AdminCrudHeader
        icon={Package}
        title="پک فایل‌ها"
        description="مدیریت پک‌های دانلود بات — جستجو، فیلتر و ویرایش در یک نگاه"
        createLabel="پک جدید"
        onCreate={onNewPack}
        createDisabled={saving}
      />

      {error ? <AdminCrudError message={error} /> : null}

      {!loading && items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="کل پک‌ها" value={overview.total} />
          <StatCard label="پک فعال" value={overview.active} accent="success" />
          <StatCard label="کل فایل‌ها در پک‌ها" value={overview.files} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <AdminCrudSearch
          value={query}
          onChange={setQuery}
          placeholder="جستجو در عنوان یا اسلاگ..."
        />
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="active">فقط فعال</SelectItem>
              <SelectItem value="inactive">فقط غیرفعال</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="مرتب‌سازی" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">جدیدترین</SelectItem>
              <SelectItem value="title">عنوان</SelectItem>
              <SelectItem value="slug">اسلاگ</SelectItem>
              <SelectItem value="files">بیشترین فایل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-16 text-center text-sm">در حال بارگذاری...</p>
      ) : filteredPacks.length === 0 ? (
        <AdminCrudEmpty
          title={items.length === 0 ? 'هنوز پکی ساخته نشده' : 'نتیجه‌ای پیدا نشد'}
          description={
            items.length === 0
              ? 'اولین پک فایل را بسازید و لینک deep-link بات را بگیرید.'
              : 'فیلتر یا جستجو را تغییر دهید.'
          }
          actionLabel={items.length === 0 ? 'ساخت پک جدید' : query.trim() ? 'پاک کردن جستجو' : undefined}
          onAction={
            items.length === 0
              ? onNewPack
              : query.trim()
                ? () => setQuery('')
                : undefined
          }
        />
      ) : (
        <>
          <AdminCrudCount filtered={filteredPacks.length} total={items.length} />

          <div className="space-y-2">
            {filteredPacks.map((p) => {
              const link = buildDeepLinkUrl(p.slug)
              return (
                <AdminCrudRow
                  key={p.id}
                  actions={
                    <>
                      {link ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          disabled={saving}
                          onClick={() => void onCopyDeepLink(link, p.id)}
                        >
                          {copiedPackId === p.id ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {copiedPackId === p.id ? 'کپی شد' : 'کپی لینک'}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        disabled={saving}
                        onClick={() => void onSelectPack(p, 'files')}
                      >
                        <Pencil className="h-3.5 w-3.5 shrink-0" />
                        ویرایش
                      </Button>
                    </>
                  }
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-start"
                    onClick={() => void onSelectPack(p, 'files')}
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-foreground line-clamp-1 text-sm font-semibold">
                        {p.title}
                      </span>
                      <Badge variant={p.is_active ? 'success' : 'secondary'} className="shrink-0">
                        {p.is_active ? 'فعال' : 'غیرفعال'}
                      </Badge>
                      <Badge variant="outline" className="shrink-0 tabular-nums">
                        {formatNumber(p.file_count)} فایل
                      </Badge>
                      {p.description ? (
                        <p className="text-muted-foreground w-full line-clamp-1 text-xs">{p.description}</p>
                      ) : null}
                    </div>
                  </button>
                </AdminCrudRow>
              )
            })}
          </div>
        </>
      )}

      <AdminEditSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) resetDraft()
        }}
        title={draft.id ? draft.title.trim() || 'ویرایش پک' : 'پک جدید'}
        description={
          draft.id
            ? `${formatNumber(packItems.length)} فایل · ${draft.is_active ? 'فعال' : 'غیرفعال'}`
            : 'عنوان و اسلاگ را وارد کنید، سپس فایل‌ها را اضافه کنید.'
        }
        className="w-full sm:max-w-2xl lg:max-w-5xl"
        bodyClassName="gap-0 p-0"
        footer={
          workspaceTab === 'settings' ? (
            <AdminEditSheetActions
              saving={saving}
              saveDisabled={!canSave}
              saveLabel="ذخیره پک"
              onSave={() => void onSavePack()}
              onCancel={() => setSheetOpen(false)}
            />
          ) : undefined
        }
      >
        <Tabs
          dir="rtl"
          value={workspaceTab}
          onValueChange={(v) => setWorkspaceTab(v as 'settings' | 'files')}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b px-4 pt-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="settings">تنظیمات</TabsTrigger>
              <TabsTrigger value="files" disabled={!selectedPackId}>
                فایل‌ها{selectedPackId ? ` (${packItems.length})` : ''}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="settings" className="mt-0 space-y-5 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pack-title">عنوان نمایشی</Label>
                <Input
                  id="pack-title"
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Solo Leveling - فصل ۱ (1080p)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack-slug">اسلاگ (یکتا)</Label>
                <Input
                  id="pack-slug"
                  value={draft.slug}
                  onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="solo-leveling-s1-1080p"
                  className="font-mono text-sm"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 sm:mt-7">
                <div>
                  <p className="text-sm font-medium">وضعیت انتشار</p>
                  <p className="text-muted-foreground text-xs">پک غیرفعال در بات نمایش داده نمی‌شود.</p>
                </div>
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft((prev) => ({ ...prev, is_active: Boolean(v) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack-desc">توضیحات (اختیاری)</Label>
              <Textarea
                id="pack-desc"
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-24"
                placeholder="یادداشت داخلی..."
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
                    onClick={() => void onCopyDeepLink(deepLinkUrl || deepLinkPreview)}
                    title="کپی"
                  >
                    {copiedPackId === 'sheet' ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  {deepLinkUrl ? (
                    <Button type="button" variant="secondary" size="icon" className="shrink-0" asChild>
                      <a href={deepLinkUrl} target="_blank" rel="noreferrer" title="باز کردن در تلگرام">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  پارامتر start: <code className="font-mono">{deepLinkPreview}</code>
                </p>
              </div>
            ) : null}

            {selectedPackId ? (
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-1.5"
                  disabled={saving}
                  onClick={() => void onDeletePack()}
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  حذف پک
                </Button>
              </div>
            ) : null}

            {!canSave ? (
              <p className="text-muted-foreground text-xs">برای ذخیره، عنوان و اسلاگ لازم است.</p>
            ) : null}
          </TabsContent>

          <TabsContent value="files" className="mt-0 flex min-h-0 flex-1 flex-col p-0">
            {!selectedPackId ? (
              <p className="text-muted-foreground p-4 text-sm">ابتدا در تب تنظیمات پک را ذخیره کنید.</p>
            ) : (
              <div className="grid min-h-[min(70vh,640px)] grid-cols-1 lg:grid-cols-2">
                <section className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-e">
                  <div className="sticky top-0 z-10 space-y-3 border-b bg-background/95 p-4 backdrop-blur-sm">
                    <div>
                      <h3 className="text-sm font-semibold">افزودن از کتابخانه</h3>
                      <p className="text-muted-foreground text-xs">
                        نام فایل را جستجو کنید؛ برای انیمه‌های چندفصلی «بارگذاری بیشتر» را بزنید.
                      </p>
                    </div>
                    <div className="relative">
                      <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                      <Input
                        value={filesQuery}
                        onChange={(e) => setFilesQuery(e.target.value)}
                        placeholder="جستجو نام فایل یا عنوان/Romaji انیمه..."
                        className="pe-9"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {filesLoading ? (
                      <p className="text-muted-foreground px-4 py-8 text-center text-sm">در حال جستجو...</p>
                    ) : !filesQuery.trim() ? (
                      <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                        چند حرف از نام فایل را بنویسید.
                      </p>
                    ) : fileResults.length === 0 ? (
                      <p className="text-muted-foreground px-4 py-8 text-center text-sm">فایلی پیدا نشد.</p>
                    ) : (
                      <>
                        <p className="text-muted-foreground px-2 pb-2 text-xs">
                          {formatNumber(fileResults.length)} نتیجه
                          {fileResults.length >= librarySearchLimit
                            ? ' · ممکن است فایل بیشتری وجود داشته باشد'
                            : ''}
                        </p>
                        <ul className="space-y-1.5">
                        {fileResults.map((f) => {
                          const inPack = packFileKeySet.has(f.key)
                          return (
                            <li
                              key={f.key}
                              className="hover:bg-muted/40 flex items-center gap-2 rounded-lg border bg-card/60 px-3 py-2"
                            >
                              <div className="min-w-0 flex-1 text-start">
                                <p className="text-foreground line-clamp-1 text-sm font-medium">
                                  {f.file_name || '—'}
                                </p>
                                <p
                                  className="text-muted-foreground line-clamp-1 font-mono text-[11px] text-end"
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
                        {fileResults.length >= librarySearchLimit && (
                          <div className="px-2 pt-3 pb-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={filesLoading || saving}
                              onClick={() =>
                                setLibrarySearchLimit((n) => n + LIBRARY_SEARCH_MORE_STEP)
                              }
                            >
                              {filesLoading
                                ? 'در حال بارگذاری…'
                                : `بارگذاری بیشتر (${formatNumber(librarySearchLimit + LIBRARY_SEARCH_MORE_STEP)} نتیجه)`}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>

                <section className="flex min-h-0 flex-col">
                  <div className="sticky top-0 z-10 space-y-3 border-b bg-background/95 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">فایل‌های پک</h3>
                        <p className="text-muted-foreground text-xs">
                          {formatNumber(packItems.length)} فایل · با ⋮⋮ مرتب کنید
                        </p>
                      </div>
                      <Badge variant="outline">{formatNumber(filteredPackItems.length)} نمایش</Badge>
                    </div>
                    <div className="relative">
                      <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                      <Input
                        value={packFilesQuery}
                        onChange={(e) => setPackFilesQuery(e.target.value)}
                        placeholder="فیلتر داخل پک..."
                        className="pe-9"
                      />
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {packItems.length === 0 ? (
                      <div className="text-muted-foreground flex flex-col items-center gap-3 px-4 py-12 text-center text-sm">
                        <FileStack className="h-10 w-10 opacity-40" />
                        <p>هنوز فایلی در این پک نیست.</p>
                        <p className="text-xs">از بخش افزودن از کتابخانه فایل اضافه کنید.</p>
                      </div>
                    ) : filteredPackItems.length === 0 ? (
                      <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                        فایلی با این فیلتر پیدا نشد.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {filteredPackItems.map((it) => {
                          const idx = packItems.findIndex((x) => x.file_key === it.file_key)
                          return (
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
                                draggable={!saving && !packFilesQuery.trim()}
                                onDragStart={(e) => onPackItemDragStart(e, it.file_key)}
                                className={cn(
                                  'text-muted-foreground shrink-0 rounded p-1',
                                  !saving &&
                                    !packFilesQuery.trim() &&
                                    'cursor-grab active:cursor-grabbing hover:bg-muted'
                                )}
                                title="کشیدن برای تغییر ترتیب"
                                aria-label="جابه‌جایی"
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                              <span className="text-muted-foreground w-6 shrink-0 text-center font-mono text-xs">
                                {idx >= 0 ? idx + 1 : '—'}
                              </span>
                              <div className="min-w-0 flex-1 text-start">
                                <p className="text-foreground line-clamp-1 text-sm font-medium">
                                  {it.file_name || '—'}
                                </p>
                                <p
                                  className="text-muted-foreground line-clamp-1 font-mono text-[11px] text-end"
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
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </AdminEditSheet>
    </AdminCrudPage>
  )
}

export default AdminFilePacks
