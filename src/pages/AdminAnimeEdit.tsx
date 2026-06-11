import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight01Icon,
  Download01Icon,
  Link01Icon,
  RefreshIcon,
  StarIcon,
  UserIcon,
} from 'hugeicons-react'
import { ExternalLink, Pencil, Search, Bell, ChevronDown } from 'lucide-react'
import * as supa from '../services/supabaseAnime'
import * as filesSvc from '../services/supabaseFiles'
import * as packsSvc from '../services/supabasePacks'
import { syncAnimeExternalScores } from '../services/syncAnimeExternalScores'
import { notifyEpisodeReleaseAdmin } from '../services/supabaseNotificationsAdmin'
import {
  buildTelegramFileDownloadLink,
  buildTelegramFilePackLink,
  parseTelegramFileDownloadLink,
  parseTelegramFilePackLink,
} from '../utils/externalLinks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { format as formatDate } from 'date-fns'
import { invalidateAnimeQueries, invalidateAnimeDetailQuery } from '../hooks/queries/invalidate'
import { formatSupabaseError } from '../services/supabaseAnime'
import { cn } from '@/lib/utils'

type DraftAnime = {
  id?: number | string
  title: string
  title_romaji: string
  synopsis: string
  format: string
  airing_status: string
  season: string
  year: string
  anilist_id: string
  mal_id: string
  imdb_id: string
  mal_score: string
  imdb_score: string
  featured_image: string
  cover_image: string
  is_featured: boolean
  average_score: string
  episodes_count: string
  studio: string
  start_date: string
  end_date: string
}

type SeriesMemberDraft = {
  key: string
  anime_id: string
  sort_order: number
  label_fa: string
}

type EpisodeDraft = {
  episode_number: number
  download_link: string
}

type SubtitleDraft = {
  episode_number: number
  subtitle_link: string
}

type SubtitlePackDraft = {
  title: string
  subtitle_link: string
}

type EpisodePackDraft = {
  title: string
  download_link: string
}

type TranslatorLinkDraft = {
  translator_id: string
  role: string
}

type AdminTab = 'info' | 'relations' | 'media' | 'translators'
type MediaSubTab = 'episodes' | 'subtitles' | 'packs'

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'info', label: 'اطلاعات' },
  { id: 'relations', label: 'روابط' },
  { id: 'media', label: 'فایل‌ها' },
  { id: 'translators', label: 'مترجم' },
]

const MEDIA_SUB_TABS: { id: MediaSubTab; label: string }[] = [
  { id: 'episodes', label: 'قسمت‌ها' },
  { id: 'subtitles', label: 'زیرنویس' },
  { id: 'packs', label: 'پک' },
]

const SegmentedTabs = <T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
  className?: string
}) => (
  <div className={cn('relative flex rounded-xl border border-border bg-muted/20 p-0.5', className)}>
    {tabs.map((tab) => {
      const isActive = active === tab.id
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={isActive}
          className={cn(
            'relative flex-1 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200',
            isActive
              ? 'text-primary-400 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {isActive && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-lg bg-primary-400/15 border border-primary-400/35"
            />
          )}
          <span className="relative">{tab.label}</span>
        </button>
      )
    })}
  </div>
)

const AdminSection = ({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}) => (
  <section className="rounded-xl border border-border bg-card/60 overflow-hidden">
    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/80">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1 leading-5">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
    <div className="p-4 space-y-3">{children}</div>
  </section>
)

const Field = ({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) => (
  <div className={className}>
    <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
    {children}
  </div>
)

/** دکمه‌های هم‌ردیف فیلد — ارتفاع و تراز با Input/Select */
const FieldActions = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => (
  <div className={className}>
    <span
      className="text-xs text-transparent mb-1.5 block select-none pointer-events-none"
      aria-hidden="true"
    >
      .
    </span>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)

const formActionButtonClass = 'h-10 px-4'

const AnimeSearchSelect = ({
  value,
  onChange,
  options,
  placeholder = 'انتخاب انیمه',
}: {
  value: string
  onChange: (value: string) => void
  options: supa.AnimeCard[]
  placeholder?: string
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find((item) => String(item.id) === value)

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? options.filter((item) => item.title.toLowerCase().includes(q))
      : options
    return list.slice(0, 80)
  }, [options, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between gap-2 font-normal h-10 px-3"
        >
          <span className={cn('truncate text-right flex-1', !selected && 'text-muted-foreground')}>
            {selected?.title || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(100vw-2rem,24rem)] p-0">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی عنوان انیمه..."
              className="pr-9 h-9"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          <button
            type="button"
            className="w-full text-right px-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60"
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
          >
            —
          </button>
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-4 text-sm text-center text-muted-foreground">نتیجه‌ای یافت نشد</p>
          ) : (
            filteredOptions.map((item) => {
              const isSelected = String(item.id) === value
              return (
                <button
                  key={String(item.id)}
                  type="button"
                  className={cn(
                    'w-full text-right px-2 py-2 rounded-lg text-sm transition-colors',
                    isSelected
                      ? 'bg-primary-500/15 text-primary-300'
                      : 'hover:bg-muted/60 text-foreground'
                  )}
                  onClick={() => {
                    onChange(String(item.id))
                    setOpen(false)
                  }}
                >
                  {item.title}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const TelegramFileSearchSelect = ({
  value,
  onChange,
  disabled,
  fileExtension,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  fileExtension: string
  placeholder?: string
}) => {
  const ext = String(fileExtension ?? '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()
  const selectPlaceholder = placeholder ?? `انتخاب فایل ${ext.toUpperCase()}...`

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<filesSvc.FilePickerItem[]>([])
  const [selectedFile, setSelectedFile] = useState<filesSvc.FilePickerItem | null>(null)

  const selectedKey = useMemo(() => parseTelegramFileDownloadLink(value), [value])

  useEffect(() => {
    if (!selectedKey) {
      setSelectedFile(null)
      return
    }
    if (selectedFile?.key === selectedKey) return

    let cancelled = false
    void filesSvc.getFilePickerItemByKey(selectedKey).then((file) => {
      if (!cancelled) setSelectedFile(file)
    })

    return () => {
      cancelled = true
    }
  }, [selectedKey, selectedFile?.key])

  useEffect(() => {
    if (!open || !ext) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const term = search.trim()
        const list = term
          ? await filesSvc.searchFilesForPicker({
              query: term,
              limit: 30,
              activeOnly: true,
              fileExtension: ext,
            })
          : await filesSvc.getRecentFilesForPicker({
              fileExtension: ext,
              limit: 30,
              activeOnly: true,
            })
        if (!cancelled) setResults(list)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, search.trim() ? 300 : 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, search, ext])

  const pickFile = (file: filesSvc.FilePickerItem | null) => {
    if (!file) {
      onChange('')
      setSelectedFile(null)
      setOpen(false)
      setSearch('')
      return
    }

    const link = buildTelegramFileDownloadLink(file.key)
    if (!link) return
    onChange(link)
    setSelectedFile(file)
    setOpen(false)
    setSearch('')
  }

  const displayLabel = selectedFile
    ? selectedFile.file_name || selectedFile.key
    : selectedKey
      ? selectedKey
      : null

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between gap-2 font-normal',
            !displayLabel && 'text-muted-foreground'
          )}
        >
          <span className="truncate text-right flex-1">
            {displayLabel || selectPlaceholder}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`جستجو فایل ${ext.toUpperCase()}...`}
              className="pe-9"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          <button
            type="button"
            className="w-full text-right px-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60"
            onClick={() => pickFile(null)}
          >
            —
          </button>
          {loading ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">در حال جستجو…</p>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">نتیجه‌ای پیدا نشد</p>
          ) : (
            results.map((file) => {
              const isSelected = file.key === selectedKey
              return (
                <button
                  key={file.key}
                  type="button"
                  className={cn(
                    'hover:bg-muted/60 w-full rounded-md px-2 py-2 text-start text-sm transition-colors',
                    isSelected && 'bg-primary-600/15'
                  )}
                  onClick={() => pickFile(file)}
                >
                  <p
                    className={cn(
                      'font-medium line-clamp-2',
                      isSelected ? 'text-primary-200' : 'text-foreground'
                    )}
                  >
                    {file.file_name || file.key}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5" dir="ltr">
                    {file.key}
                  </p>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const FilePackSearchSelect = ({
  packs,
  value,
  onChange,
  disabled,
  onPickPack,
}: {
  packs: packsSvc.FilePack[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  onPickPack?: (pack: packsSvc.FilePack) => void
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedSlug = useMemo(() => parseTelegramFilePackLink(value), [value])
  const selected = useMemo(
    () => packs.find((pack) => pack.slug === selectedSlug) ?? null,
    [packs, selectedSlug]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? packs.filter(
          (pack) =>
            pack.title.toLowerCase().includes(q) ||
            pack.slug.toLowerCase().includes(q) ||
            String(pack.description ?? '')
              .toLowerCase()
              .includes(q)
        )
      : packs
    return list.slice().sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
      return a.title.localeCompare(b.title, 'fa')
    })
  }, [packs, search])

  const pickPack = (pack: packsSvc.FilePack | null) => {
    if (!pack) {
      onChange('')
      setOpen(false)
      setSearch('')
      return
    }

    const link = buildTelegramFilePackLink(pack.slug)
    if (!link) return
    onChange(link)
    onPickPack?.(pack)
    setOpen(false)
    setSearch('')
  }

  const displayLabel = selected
    ? selected.title || selected.slug
    : selectedSlug
      ? selectedSlug
      : null

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between gap-2 font-normal',
            !displayLabel && 'text-muted-foreground'
          )}
        >
          <span className="truncate text-right flex-1">
            {displayLabel || 'انتخاب پک فایل...'}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو عنوان یا slug..."
              className="pe-9"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          <button
            type="button"
            className="w-full text-right px-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60"
            onClick={() => pickPack(null)}
          >
            —
          </button>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">پکی پیدا نشد</p>
          ) : (
            filtered.map((pack) => {
              const isSelected = pack.slug === selectedSlug
              return (
                <button
                  key={pack.id || pack.slug}
                  type="button"
                  className={cn(
                    'hover:bg-muted/60 w-full rounded-md px-2 py-2 text-start text-sm transition-colors',
                    isSelected && 'bg-primary-600/15',
                    !pack.is_active && 'opacity-70'
                  )}
                  onClick={() => pickPack(pack)}
                >
                  <p
                    className={cn(
                      'font-medium line-clamp-2',
                      isSelected ? 'text-primary-200' : 'text-foreground'
                    )}
                  >
                    {pack.title || pack.slug}
                    {!pack.is_active ? ' (غیرفعال)' : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5" dir="ltr">
                    {pack.slug} · {pack.file_count} فایل
                  </p>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const TRANSLATOR_LINK_ROLES = ['مترجم', 'ویراستار'] as const
const DEFAULT_TRANSLATOR_LINK_ROLE = 'مترجم'

const normalizeTranslatorLinkRole = (role: string | null | undefined): string => {
  const v = String(role ?? '').trim()
  if ((TRANSLATOR_LINK_ROLES as readonly string[]).includes(v)) return v
  return DEFAULT_TRANSLATOR_LINK_ROLE
}

const TranslatorPickerFace = ({
  translator,
  nameClassName,
}: {
  translator: supa.TranslatorAdminItem
  nameClassName?: string
}) => {
  const isActive = translator.is_active !== false
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
        {translator.avatar_url ? (
          <img
            src={translator.avatar_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            {String(translator.name ?? '?').charAt(0)}
          </span>
        )}
      </span>
      <span className={cn('truncate font-medium', nameClassName)}>{translator.name}</span>
      <Badge variant={isActive ? 'success' : 'secondary'} className="shrink-0 text-[10px] px-1.5 py-0">
        {isActive ? 'فعال' : 'غیرفعال'}
      </Badge>
    </span>
  )
}

const TranslatorSearchSelect = ({
  translators,
  value,
  onChange,
  disabled,
}: {
  translators: supa.TranslatorAdminItem[]
  value: string
  onChange: (translatorId: string) => void
  disabled?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = useMemo(
    () => translators.find((t) => String(t.id ?? '') === value) ?? null,
    [translators, value]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return translators
    return translators.filter(
      (t) =>
        String(t.name ?? '')
          .toLowerCase()
          .includes(q) ||
        String(t.slug ?? '')
          .toLowerCase()
          .includes(q)
    )
  }, [translators, search])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between gap-2 font-normal',
            !selected && 'text-muted-foreground'
          )}
        >
          {selected ? (
            <TranslatorPickerFace translator={selected} />
          ) : (
            <span className="truncate">انتخاب مترجم...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو نام..."
              className="pe-9"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">نتیجه‌ای پیدا نشد</p>
          ) : (
            filtered.map((t) => {
              const id = String(t.id ?? '')
              const isSelected = id === value
              return (
                <button
                  key={String(t.id ?? t.slug)}
                  type="button"
                  className={cn(
                    'hover:bg-muted/60 w-full rounded-md px-2 py-2 text-start text-sm transition-colors',
                    isSelected && 'bg-primary-600/15'
                  )}
                  onClick={() => {
                    onChange(id)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <TranslatorPickerFace
                    translator={t}
                    nameClassName={isSelected ? 'text-primary-200' : undefined}
                  />
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const formatAdminDateTime = (iso: string | null | undefined) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
}

const formatAnimeEditorName = (editor: supa.AnimeAdminEditor | null | undefined) => {
  if (!editor) return null
  const parts = [editor.first_name, editor.last_name].filter(Boolean)
  const full = parts.join(' ').trim()
  if (full) return full
  if (editor.email?.trim()) return editor.email.trim()
  if (editor.username?.trim()) return `@${editor.username.trim()}`
  return null
}

const AdminEditSkeleton = () => (
  <div className="pb-32 animate-pulse">
    <div className="h-44 bg-muted/50" />
    <div className="mx-4 -mt-16 flex gap-4">
      <div className="w-24 aspect-[2/3] rounded-xl bg-muted border-4 border-background" />
      <div className="flex-1 pt-14 space-y-2">
        <div className="h-6 w-3/4 bg-muted rounded" />
        <div className="h-4 w-1/2 bg-muted rounded" />
      </div>
    </div>
    <div className="mx-4 mt-6 h-10 bg-muted rounded-xl" />
    <div className="mx-4 mt-4 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-xl" />
      ))}
    </div>
  </div>
)

const ChipToggle = ({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'text-xs px-2.5 py-1 rounded-lg border transition-colors',
      active
        ? 'border-primary-400/35 bg-primary-500/20 text-primary-300 font-medium'
        : 'border-border bg-card/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
    )}
  >
    {children}
  </button>
)

const MediaListRow = ({
  title,
  subtitle,
  onEdit,
  onDelete,
  onNotify,
  disabled,
  notifyLoading,
}: {
  title: string
  subtitle: string
  onEdit: () => void
  onDelete: () => void
  onNotify?: () => void
  disabled?: boolean
  notifyLoading?: boolean
}) => (
  <div className="rounded-xl border border-border bg-card/40 p-3 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle || '—'}</p>
    </div>
    <div className="flex gap-1.5 shrink-0">
      {onNotify && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || notifyLoading}
          className="gap-1"
          onClick={onNotify}
        >
          <Bell className={`w-3.5 h-3.5 ${notifyLoading ? 'animate-pulse' : ''}`} />
          اعلان
        </Button>
      )}
      <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={onEdit}>
        ویرایش
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={disabled}
        className="bg-red-500/15 text-red-400 hover:bg-red-500/25"
        onClick={onDelete}
      >
        حذف
      </Button>
    </div>
  </div>
)

const AdminAnimeEdit = () => {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastKind, setToastKind] = useState<'error' | 'success'>('error')
  const [mediaDeleteConfirm, setMediaDeleteConfirm] = useState<
    | { type: 'episode'; row: supa.EpisodeAdminRow }
    | { type: 'subtitle'; row: supa.SubtitleAdminRow }
    | null
  >(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('info')
  const [mediaSubTab, setMediaSubTab] = useState<MediaSubTab>('episodes')
  const [syncScoresLoading, setSyncScoresLoading] = useState(false)
  const [notifyEpisodeNumber, setNotifyEpisodeNumber] = useState<number | null>(null)

  const [allGenres, setAllGenres] = useState<supa.GenreAdminItem[]>([])
  const [selectedGenreSlugs, setSelectedGenreSlugs] = useState<Set<string>>(new Set())

  const [allStudios, setAllStudios] = useState<supa.StudioAdminItem[]>([])
  const [allFilePacks, setAllFilePacks] = useState<packsSvc.FilePack[]>([])
  const [selectedStudioSlugs, setSelectedStudioSlugs] = useState<Set<string>>(new Set())
  const [allAnimeOptions, setAllAnimeOptions] = useState<supa.AnimeCard[]>([])

  const [anime, setAnime] = useState<supa.AnimeAdminRow | null>(null)
  const [draft, setDraft] = useState<DraftAnime>({
    title: '',
    title_romaji: '',
    synopsis: '',
    format: 'TV',
    airing_status: '',
    season: '',
    year: '',
    anilist_id: '',
    mal_id: '',
    imdb_id: '',
    mal_score: '',
    imdb_score: '',
    featured_image: '',
    cover_image: '',
    is_featured: false,
    average_score: '',
    episodes_count: '',
    studio: '',
    start_date: '',
    end_date: '',
  })

  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [seriesTitle, setSeriesTitle] = useState('')
  const [seriesMembers, setSeriesMembers] = useState<SeriesMemberDraft[]>([])

  const [episodes, setEpisodes] = useState<supa.EpisodeAdminRow[]>([])
  const [subtitles, setSubtitles] = useState<supa.SubtitleAdminRow[]>([])
  const [subtitlePacks, setSubtitlePacks] = useState<supa.SubtitlePackItem[]>([])

  const [allTranslators, setAllTranslators] = useState<supa.TranslatorAdminItem[]>([])
  const [translatorLinks, setTranslatorLinks] = useState<supa.TranslatorAnimeAdminLink[]>([])
  const [translatorLinkDraft, setTranslatorLinkDraft] = useState<TranslatorLinkDraft>({
    translator_id: '',
    role: DEFAULT_TRANSLATOR_LINK_ROLE,
  })
  const [editingTranslatorLinkId, setEditingTranslatorLinkId] = useState<string | number | null>(
    null
  )
  const [editingTranslatorLinkDraft, setEditingTranslatorLinkDraft] = useState<TranslatorLinkDraft>({
    translator_id: '',
    role: DEFAULT_TRANSLATOR_LINK_ROLE,
  })

  const [editingEpisodeId, setEditingEpisodeId] = useState<string | number | null>(null)
  const [editingSubtitleId, setEditingSubtitleId] = useState<string | number | null>(null)
  const [editingSubtitlePackId, setEditingSubtitlePackId] = useState<string | number | null>(null)
  const [editingEpisodePack, setEditingEpisodePack] = useState(false)

  const [episodeDraft, setEpisodeDraft] = useState<EpisodeDraft>({
    episode_number: 1,
    download_link: '',
  })

  const [subtitleDraft, setSubtitleDraft] = useState<SubtitleDraft>({
    episode_number: 1,
    subtitle_link: '',
  })

  const [subtitlePackDraft, setSubtitlePackDraft] = useState<SubtitlePackDraft>({
    title: '',
    subtitle_link: '',
  })

  const [episodePackDraft, setEpisodePackDraft] = useState<EpisodePackDraft>({
    title: '',
    download_link: '',
  })

  const EMPTY_SELECT_VALUE = '__EMPTY__'

  const formatOptions = useMemo(
    () => [
      { value: 'TV', label: 'سریالی' },
      { value: 'MOVIE', label: 'سینمایی' },
      { value: 'ONA', label: 'ONA' },
      { value: 'ONA (CHINESE)', label: 'ONA (CHINESE)' },
      { value: 'OVA', label: 'OVA' },
      { value: 'SPECIAL', label: 'قسمت ویژه' },
    ],
    []
  )
  const seasonOptions = useMemo(() => ['', 'WINTER', 'SPRING', 'SUMMER', 'FALL'], [])
  const airingStatusOptions = useMemo(() => ['', 'RELEASING', 'FINISHED', 'NOT_YET_RELEASED'], [])

  const seasonLabel = (v: string) =>
    (
      ({
        WINTER: 'زمستان',
        SPRING: 'بهار',
        SUMMER: 'تابستان',
        FALL: 'پاییز',
      }) as Record<string, string>
    )[String(v || '').toUpperCase()] || v

  const airingStatusLabel = (v: string) =>
    (
      ({
        RELEASING: 'در حال پخش',
        FINISHED: 'پایان یافته',
        NOT_YET_RELEASED: 'منتشر نشده',
      }) as Record<string, string>
    )[String(v || '').toUpperCase()] || v

  const parseYmd = (value: string): Date | undefined => {
    const v = String(value || '').trim()
    if (!v) return undefined
    const parts = v.split('-')
    if (parts.length !== 3) return undefined
    const y = Number(parts[0])
    const m = Number(parts[1])
    const d = Number(parts[2])
    if (!y || !m || !d) return undefined
    const dt = new Date(y, m - 1, d)
    if (Number.isNaN(dt.getTime())) return undefined
    return dt
  }

  const onAddTranslatorLink = async () => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number
    const translatorId = String(translatorLinkDraft.translator_id || '').trim()
    if (!translatorId) {
      showError('مترجم را انتخاب کن')
      return
    }

    try {
      setSaving(true)
      setToast(null)

      const inserted = await supa.insertTranslatorAnimeLinkAdmin({
        anime_id: animeId,
        translator_id: translatorId,
        role: normalizeTranslatorLinkRole(translatorLinkDraft.role),
      })

      setTranslatorLinkDraft({ translator_id: '', role: DEFAULT_TRANSLATOR_LINK_ROLE })
      let links = await supa.getTranslatorAnimeLinksAdminByAnimeId(animeId)
      if (!links.some((l) => String(l.id) === String(inserted.id))) {
        const translator = allTranslators.find((t) => String(t.id ?? '') === translatorId)
        if (translator) {
          links = [
            ...links,
            {
              id: inserted.id,
              anime_id: inserted.anime_id,
              translator_id: inserted.translator_id,
              role: inserted.role,
              translator,
            },
          ]
        }
      }
      setTranslatorLinks(links)
      showSuccess('مترجم اضافه شد')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در افزودن مترجم'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onEditTranslatorLink = (row: supa.TranslatorAnimeAdminLink) => {
    setEditingTranslatorLinkId(row.id)
    setEditingTranslatorLinkDraft({
      translator_id: String(row.translator_id ?? row.translator.id ?? ''),
      role: normalizeTranslatorLinkRole(row.role),
    })
  }

  const onCancelEditTranslatorLink = () => {
    setEditingTranslatorLinkId(null)
  }

  const onSaveTranslatorLinkEdit = async () => {
    if (!editingTranslatorLinkId) return
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number
    const translatorId = String(editingTranslatorLinkDraft.translator_id || '').trim()
    if (!translatorId) {
      showError('مترجم را انتخاب کن')
      return
    }

    try {
      setSaving(true)
      setToast(null)
      await supa.updateTranslatorAnimeLinkAdmin({
        id: editingTranslatorLinkId,
        translator_id: translatorId,
        role: normalizeTranslatorLinkRole(editingTranslatorLinkDraft.role),
      })
      setEditingTranslatorLinkId(null)
      const links = await supa.getTranslatorAnimeLinksAdminByAnimeId(animeId)
      setTranslatorLinks(links)
      showSuccess('ارتباط مترجم ذخیره شد')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ذخیره'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onDeleteTranslatorLink = async (row: supa.TranslatorAnimeAdminLink) => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!confirm('این ارتباط حذف شود؟')) return
    const animeId = (anime?.id ?? draft.id) as string | number
    try {
      setSaving(true)
      setToast(null)
      await supa.deleteTranslatorAnimeLinkAdmin(row.id)
      if (editingTranslatorLinkId === row.id) setEditingTranslatorLinkId(null)
      const links = await supa.getTranslatorAnimeLinksAdminByAnimeId(animeId)
      setTranslatorLinks(links)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const episodesForList = useMemo(() => {
    return episodes.slice().sort((a, b) => {
      const ea = typeof a.episode_number === 'number' ? a.episode_number : 0
      const eb = typeof b.episode_number === 'number' ? b.episode_number : 0
      if (ea !== eb) return ea - eb
      return String(a.id).localeCompare(String(b.id))
    })
  }, [episodes])

  const subtitlesForList = useMemo(() => {
    return subtitles.slice().sort((a, b) => {
      const ea = typeof a.episode_number === 'number' ? a.episode_number : 0
      const eb = typeof b.episode_number === 'number' ? b.episode_number : 0
      if (ea !== eb) return ea - eb
      return String(a.id).localeCompare(String(b.id))
    })
  }, [subtitles])

  const nextEpisodeNumber = useMemo(() => {
    let max = 0
    for (const e of episodes) {
      const ep = typeof e.episode_number === 'number' ? e.episode_number : 0
      if (ep > max) max = ep
    }
    return Math.max(1, max + 1)
  }, [episodes])

  const onEditEpisode = (row: supa.EpisodeAdminRow) => {
    setEditingEpisodeId(row.id)
    setEpisodeDraft({
      episode_number: typeof row.episode_number === 'number' ? row.episode_number : 1,
      download_link: row.download_link ?? '',
    })
  }

  const onCancelEditEpisode = () => {
    setEditingEpisodeId(null)
    setEpisodeDraft((p) => ({ ...p, download_link: '' }))
  }

  const onSaveEpisodeEdit = async () => {
    if (!editingEpisodeId) return
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!episodeDraft.download_link.trim()) {
      showError('فایلی انتخاب نشده')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number

    try {
      setSaving(true)
      setToast(null)
      await supa.updateEpisodeAdmin({
        id: editingEpisodeId,
        episode_number: episodeDraft.episode_number,
        title: null,
        download_link: episodeDraft.download_link.trim() || null,
      })
      setEditingEpisodeId(null)
      setEpisodeDraft((p) => ({ ...p, download_link: '' }))
      const eps = await supa.getEpisodesAdminByAnimeId(animeId)
      setEpisodes(eps)
    } catch (e) {
      const code = typeof (e as any)?.code === 'string' ? (e as any).code : null
      if (code === '23505') {
        showError(`شماره قسمت تکراری است. پیشنهاد: قسمت ${nextEpisodeNumber}`)
      } else {
        const msg = e instanceof Error ? e.message : 'خطا در ویرایش قسمت'
        showError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const onEditSubtitlePack = (row: supa.SubtitlePackItem) => {
    setEditingSubtitlePackId(row.id)
    setSubtitlePackDraft({
      title: row.title ?? '',
      subtitle_link: row.subtitle_link ?? '',
    })
  }

  const onCancelEditSubtitlePack = () => {
    setEditingSubtitlePackId(null)
    setSubtitlePackDraft((p) => ({ ...p, title: '', subtitle_link: '' }))
  }

  const onSaveSubtitlePackEdit = async () => {
    if (!editingSubtitlePackId) return
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!subtitlePackDraft.subtitle_link.trim()) {
      showError('فایلی انتخاب نشده')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number

    try {
      setSaving(true)
      setToast(null)
      await supa.updateSubtitlePackAdmin({
        id: editingSubtitlePackId,
        title: subtitlePackDraft.title.trim() || null,
        subtitle_link: subtitlePackDraft.subtitle_link.trim() || null,
      })
      setEditingSubtitlePackId(null)
      setSubtitlePackDraft((p) => ({ ...p, title: '', subtitle_link: '' }))
      const packs = await supa.getSubtitlePacksByAnimeId(animeId)
      setSubtitlePacks(packs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ویرایش پک زیرنویس'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onDeleteSubtitlePack = async (row: supa.SubtitlePackItem) => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!confirm('این پک زیرنویس حذف شود؟')) return
    const animeId = (anime?.id ?? draft.id) as string | number
    try {
      setSaving(true)
      setToast(null)
      await supa.deleteSubtitlePackAdmin(row.id)
      if (editingSubtitlePackId === row.id) onCancelEditSubtitlePack()
      const packs = await supa.getSubtitlePacksByAnimeId(animeId)
      setSubtitlePacks(packs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف پک زیرنویس'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onEditSubtitle = (row: supa.SubtitleAdminRow) => {
    setEditingSubtitleId(row.id)
    setSubtitleDraft({
      episode_number: typeof row.episode_number === 'number' ? row.episode_number : 1,
      subtitle_link: row.subtitle_link ?? '',
    })
  }

  const onCancelEditSubtitle = () => {
    setEditingSubtitleId(null)
    setSubtitleDraft((p) => ({ ...p, subtitle_link: '' }))
  }

  const onSaveSubtitleEdit = async () => {
    if (!editingSubtitleId) return
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!subtitleDraft.subtitle_link.trim()) {
      showError('فایلی انتخاب نشده')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number

    try {
      setSaving(true)
      setToast(null)
      await supa.updateSubtitleAdmin({
        id: editingSubtitleId,
        episode_number: subtitleDraft.episode_number,
        subtitle_link: subtitleDraft.subtitle_link.trim() || null,
      })
      setEditingSubtitleId(null)
      setSubtitleDraft((p) => ({ ...p, subtitle_link: '' }))
      const subs = await supa.getSubtitlesAdminByAnimeId(animeId)
      setSubtitles(subs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ویرایش زیرنویس'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onRequestDeleteSubtitle = (row: supa.SubtitleAdminRow) => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    setMediaDeleteConfirm({ type: 'subtitle', row })
  }

  const onConfirmMediaDelete = async () => {
    if (!mediaDeleteConfirm) return
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      setMediaDeleteConfirm(null)
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number
    const target = mediaDeleteConfirm
    setMediaDeleteConfirm(null)

    try {
      setSaving(true)
      setToast(null)
      if (target.type === 'episode') {
        await supa.deleteEpisodeAdmin(target.row.id)
        if (editingEpisodeId === target.row.id) onCancelEditEpisode()
        const eps = await supa.getEpisodesAdminByAnimeId(animeId)
        setEpisodes(eps)
        invalidateAnimeQueries()
      } else {
        await supa.deleteSubtitleAdmin(target.row.id)
        if (editingSubtitleId === target.row.id) onCancelEditSubtitle()
        const subs = await supa.getSubtitlesAdminByAnimeId(animeId)
        setSubtitles(subs)
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : target.type === 'episode'
            ? 'خطا در حذف قسمت'
            : 'خطا در حذف زیرنویس'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onNotifyEpisodeRelease = async (episodeNumber: number) => {
    const animeId = (anime?.id ?? draft.id) as string | number | undefined
    if (!animeId) {
      showError('اول انیمه را ذخیره کن')
      return
    }

    const epNum = typeof episodeNumber === 'number' ? episodeNumber : Number(episodeNumber)
    if (!Number.isFinite(epNum) || epNum < 1) return

    const favoritesHint =
      'کاربرانی که این انیمه را در لیست دارند اعلان inbox (+ Telegram در صورت فعال بودن) می‌گیرند.'
    if (!confirm(`اعلان انتشار قسمت ${epNum} ارسال شود؟\n\n${favoritesHint}`)) return

    try {
      setNotifyEpisodeNumber(epNum)
      setToast(null)
      const result = await notifyEpisodeReleaseAdmin({
        animeId: String(animeId),
        episodeNumber: epNum,
        sendTelegram: true,
      })
      const inbox = result.inbox_created ?? 0
      const tg = result.telegram_sent ?? 0
      if (inbox === 0) {
        showSuccess('هیچ کاربری این انیمه را در لیست ندارد — اعلانی ساخته نشد')
      } else {
        showSuccess(`اعلان ارسال شد — inbox: ${inbox} نفر · Telegram: ${tg} نفر`)
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'خطا در ارسال اعلان')
    } finally {
      setNotifyEpisodeNumber(null)
    }
  }

  const onRequestDeleteEpisode = (row: supa.EpisodeAdminRow) => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    setMediaDeleteConfirm({ type: 'episode', row })
  }

  const showError = (msg: string) => {
    setToastKind('error')
    setToast(msg)
  }

  const showSuccess = (msg: string) => {
    setToastKind('success')
    setToast(msg)
  }

  const previewAnimeId = anime?.id ?? draft.id ?? (!isNew ? id : null)

  const canSyncExternalScores =
    Boolean(draft.anilist_id.trim()) ||
    Boolean(draft.mal_id.trim()) ||
    Boolean(draft.imdb_id.trim())

  const handleSyncExternalScores = async () => {
    if (!previewAnimeId) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!canSyncExternalScores) {
      showError('حداقل یک شناسه خارجی وارد کن')
      return
    }

    setSyncScoresLoading(true)
    try {
      await syncAnimeExternalScores(previewAnimeId, {
        anilist_id: draft.anilist_id.trim() ? Number(draft.anilist_id) : undefined,
        mal_id: draft.mal_id.trim() ? Number(draft.mal_id) : undefined,
        imdb_id: draft.imdb_id.trim() || undefined,
      })
      if (previewAnimeId) await reload(previewAnimeId)
      invalidateAnimeQueries()
      showSuccess('امتیازهای خارجی به‌روز شد')
    } catch (e) {
      showError(e instanceof Error ? e.message : 'خطا در سینک امتیاز')
    } finally {
      setSyncScoresLoading(false)
    }
  }

  const onSaveEpisodePackFromDraft = async () => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!episodePackDraft.download_link.trim()) {
      showError('پکی انتخاب نشده')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number
    const title = episodePackDraft.title.trim() || null
    const download_link = episodePackDraft.download_link.trim() || null
    const wasEditing = editingEpisodePack

    try {
      setSaving(true)
      setToast(null)
      await supa.updateEpisodePackAdmin(animeId, { title, download_link })
      setAnime((prev) =>
        prev
          ? {
              ...prev,
              episode_pack_title: title,
              episode_pack_link: download_link,
            }
          : prev
      )
      setEditingEpisodePack(false)
      setEpisodePackDraft({ title: '', download_link: '' })
      showSuccess(wasEditing ? 'پک قسمت‌ها ذخیره شد' : 'پک قسمت‌ها اضافه شد')
      invalidateAnimeQueries()
      invalidateAnimeDetailQuery(animeId)
    } catch (e) {
      showError(formatSupabaseError(e) || 'خطا در ذخیره پک قسمت‌ها')
    } finally {
      setSaving(false)
    }
  }

  const onAddEpisodePack = async () => {
    if (hasEpisodePack) return
    await onSaveEpisodePackFromDraft()
  }

  const onEditEpisodePack = () => {
    setEditingEpisodePack(true)
    setEpisodePackDraft({
      title: anime?.episode_pack_title ?? '',
      download_link: anime?.episode_pack_link ?? '',
    })
  }

  const onCancelEditEpisodePack = () => {
    setEditingEpisodePack(false)
    setEpisodePackDraft({ title: '', download_link: '' })
  }

  const onSaveEpisodePackEdit = async () => {
    if (!editingEpisodePack) return
    await onSaveEpisodePackFromDraft()
  }

  const onClearEpisodePack = async () => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number

    try {
      setSaving(true)
      setToast(null)
      await supa.updateEpisodePackAdmin(animeId, { title: null, download_link: null })
      setEditingEpisodePack(false)
      setEpisodePackDraft({ title: '', download_link: '' })
      setAnime((prev) =>
        prev ? { ...prev, episode_pack_title: null, episode_pack_link: null } : prev
      )
      showSuccess('پک تمام قسمت‌ها حذف شد')
      invalidateAnimeQueries()
      invalidateAnimeDetailQuery(animeId)
    } catch (e) {
      showError(formatSupabaseError(e) || 'خطا در حذف پک قسمت‌ها')
    } finally {
      setSaving(false)
    }
  }

  const onAddSubtitlePack = async () => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (hasSubtitlePack) return
    if (!subtitlePackDraft.subtitle_link.trim()) {
      showError('فایلی انتخاب نشده')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number

    try {
      setSaving(true)
      setToast(null)
      await supa.insertSubtitlePackAdmin({
        anime_id: animeId,
        title: subtitlePackDraft.title.trim() || null,
        subtitle_link: subtitlePackDraft.subtitle_link.trim() || null,
      })
      setSubtitlePackDraft((p) => ({ ...p, title: '', subtitle_link: '' }))
      const packs = await supa.getSubtitlePacksByAnimeId(animeId)
      setSubtitlePacks(packs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در افزودن پک زیرنویس'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const toggleStudio = (slug: string) => {
    setSelectedStudioSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const reload = async (animeId: string | number) => {
    const [g, studios, translators, tLinks, a, eps, subs, packs, aGenres, aStudios, animeCards, seriesDraft] =
      await Promise.all([
        supa.getAllGenres(),
        supa.getAllStudiosAdmin(),
        supa.getAllTranslatorsAdmin(),
        supa.getTranslatorAnimeLinksAdminByAnimeId(animeId),
        supa.getAnimeAdminById(animeId),
        supa.getEpisodesAdminByAnimeId(animeId),
        supa.getSubtitlesAdminByAnimeId(animeId),
        supa.getSubtitlePacksByAnimeId(animeId),
        supa.getAnimeGenreSlugs(animeId),
        supa.getAnimeStudioSlugsAdmin(animeId),
        supa.getAllAnime(),
        supa.getAnimeSeriesDraftForAdmin(animeId),
      ])

    setAllGenres(g)
    setAllStudios(studios)
    setAllTranslators(translators)
    setAllAnimeOptions(animeCards)
    setTranslatorLinks(tLinks)
    setAnime(a)
    setEpisodes(eps)
    setSubtitles(subs)
    setSubtitlePacks(packs)
    setEditingEpisodePack(false)
    setEpisodePackDraft({ title: '', download_link: '' })
    setSelectedGenreSlugs(new Set(aGenres))
    setSelectedStudioSlugs(new Set(aStudios))

    if (seriesDraft) {
      setSeriesId(seriesDraft.series_id)
      setSeriesTitle(seriesDraft.title)
      setSeriesMembers(
        seriesDraft.members.map((member, index) => ({
          key: `series-${String(member.anime_id)}-${index}`,
          anime_id: String(member.anime_id),
          sort_order: member.sort_order,
          label_fa: member.label_fa ?? '',
        }))
      )
    } else {
      setSeriesId(null)
      setSeriesTitle('')
      setSeriesMembers([])
    }

    setDraft({
      id: a.id,
      title: a.title ?? '',
      title_romaji: a.title_romaji ?? '',
      synopsis: a.synopsis ?? '',
      format: a.format ?? 'TV',
      airing_status: a.airing_status ?? '',
      season: a.season ?? '',
      year: typeof a.year === 'number' ? String(a.year) : '',
      anilist_id: typeof a.anilist_id === 'number' ? String(a.anilist_id) : '',
      mal_id: typeof a.mal_id === 'number' ? String(a.mal_id) : '',
      imdb_id: a.imdb_id ?? '',
      mal_score:
        typeof a.mal_score === 'number'
          ? String(a.mal_score)
          : a.mal_score
            ? String(a.mal_score)
            : '',
      imdb_score:
        typeof a.imdb_score === 'number'
          ? String(a.imdb_score)
          : a.imdb_score
            ? String(a.imdb_score)
            : '',
      featured_image: a.featured_image ?? '',
      cover_image: a.cover_image ?? '',
      is_featured: Boolean(a.is_featured),
      average_score:
        typeof a.average_score === 'number'
          ? String(a.average_score)
          : a.average_score
            ? String(a.average_score)
            : '',
      episodes_count:
        typeof a.episodes_count === 'number'
          ? String(a.episodes_count)
          : a.episodes_count
            ? String(a.episodes_count)
            : '',
      studio: a.studio ?? '',
      start_date: a.start_date ?? '',
      end_date: a.end_date ?? '',
    })
  }

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setToast(null)

        const g = await supa.getAllGenres()
        setAllGenres(g)

        const animeCards = await supa.getAllAnime()
        setAllAnimeOptions(animeCards)

        const studios = await supa.getAllStudiosAdmin()
        setAllStudios(studios)

        const translators = await supa.getAllTranslatorsAdmin()
        setAllTranslators(translators)

        const filePacks = await packsSvc.getAllFilePacks()
        setAllFilePacks(filePacks)

        if (!isNew && id) {
          await reload(id)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در بارگذاری'
        showError(msg)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [id, isNew])

  const genreList = useMemo(() => {
    return allGenres
      .slice()
      .sort((a, b) =>
        String(a.name_fa || a.name_en || a.slug).localeCompare(
          String(b.name_fa || b.name_en || b.slug)
        )
      )
  }, [allGenres])

  const animeLinkOptions = useMemo(() => {
    return allAnimeOptions.slice().sort((a, b) => a.title.localeCompare(b.title, 'fa'))
  }, [allAnimeOptions])

  const hasEpisodePack = useMemo(
    () => Boolean(String(anime?.episode_pack_link ?? '').trim()),
    [anime?.episode_pack_link]
  )

  const hasSubtitlePack = useMemo(() => subtitlePacks.length > 0, [subtitlePacks])

  const addSeriesMember = () => {
    const nextOrder =
      seriesMembers.length > 0
        ? Math.max(...seriesMembers.map((member) => member.sort_order)) + 1
        : 1
    setSeriesMembers((prev) => [
      ...prev,
      {
        key: `series-new-${Date.now()}`,
        anime_id: '',
        sort_order: nextOrder,
        label_fa: `فصل ${nextOrder}`,
      },
    ])
  }

  const startSeriesWithCurrentAnime = () => {
    const currentId = draft.id ?? anime?.id
    if (currentId == null) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    setSeriesMembers([
      {
        key: `series-${String(currentId)}-1`,
        anime_id: String(currentId),
        sort_order: 1,
        label_fa: 'فصل ۱',
      },
    ])
    if (!seriesTitle.trim()) setSeriesTitle(draft.title.trim())
  }

  const updateSeriesMember = (
    key: string,
    patch: Partial<Pick<SeriesMemberDraft, 'anime_id' | 'sort_order' | 'label_fa'>>
  ) => {
    setSeriesMembers((prev) =>
      prev.map((member) => (member.key === key ? { ...member, ...patch } : member))
    )
  }

  const removeSeriesMember = (key: string) => {
    setSeriesMembers((prev) => prev.filter((member) => member.key !== key))
  }

  const clearSeries = () => {
    setSeriesId(null)
    setSeriesTitle('')
    setSeriesMembers([])
  }

  const toggleGenre = (slug: string) => {
    setSelectedGenreSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const onSaveAnime = async () => {
    try {
      setSaving(true)
      setToast(null)

      const upserted = await supa.upsertAnimeAdmin({
        id: isNew ? undefined : draft.id,
        title: draft.title.trim(),
        title_romaji: draft.title_romaji.trim() || null,
        synopsis: draft.synopsis.trim() || null,
        format: draft.format.trim() || null,
        season: draft.season.trim() || null,
        year: draft.year.trim() ? Number(draft.year) : null,
        anilist_id: draft.anilist_id.trim() ? Number(draft.anilist_id) : null,
        mal_id: draft.mal_id.trim() ? Number(draft.mal_id) : null,
        imdb_id: draft.imdb_id.trim() || null,
        mal_score: draft.mal_score.trim() ? Number(draft.mal_score) : null,
        imdb_score: draft.imdb_score.trim() ? Number(draft.imdb_score) : null,
        genre_slugs: Array.from(selectedGenreSlugs),
        featured_image: draft.featured_image.trim() || null,
        cover_image: draft.cover_image.trim() || null,
        is_featured: Boolean(draft.is_featured),
        airing_status: draft.airing_status.trim() || null,
        average_score: draft.average_score.trim() ? Number(draft.average_score) : null,
        episodes_count: draft.episodes_count.trim() ? Number(draft.episodes_count) : null,
        studio: draft.studio.trim() || null,
        start_date: draft.start_date.trim() || null,
        end_date: draft.end_date.trim() || null,
      })

      const animeId = upserted.id
      await supa.replaceAnimeStudiosAdmin(animeId, Array.from(selectedStudioSlugs))
      await supa.saveAnimeSeriesAdmin(animeId, {
        series_id: seriesId,
        title: seriesTitle.trim() || draft.title.trim(),
        members: seriesMembers
          .filter((member) => member.anime_id.trim())
          .map((member) => ({
            anime_id: member.anime_id,
            sort_order: member.sort_order,
            label_fa: member.label_fa.trim() || null,
          })),
      }).then((result) => {
        setSeriesId(result.series_id)
      })

      if (isNew) {
        invalidateAnimeQueries()
        navigate(`/admin/anime/${encodeURIComponent(String(animeId))}`, { replace: true })
        return
      }

      await reload(animeId)
      invalidateAnimeQueries()
      showSuccess('انیمه ذخیره شد')
    } catch (e) {
      showError(formatSupabaseError(e) || 'خطا در ذخیره')
    } finally {
      setSaving(false)
    }
  }

  const onAddEpisode = async () => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!episodeDraft.download_link.trim()) {
      showError('فایلی انتخاب نشده')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number

    const exists = episodes.some(
      (e) =>
        (typeof e.episode_number === 'number' ? e.episode_number : 0) ===
        episodeDraft.episode_number
    )
    if (exists) {
      setEpisodeDraft((p) => ({ ...p, episode_number: nextEpisodeNumber }))
      showError(`این شماره قسمت قبلاً ثبت شده. پیشنهاد: قسمت ${nextEpisodeNumber}`)
      return
    }

    try {
      setSaving(true)
      setToast(null)
      await supa.insertEpisodeAdmin({
        anime_id: animeId,
        episode_number: episodeDraft.episode_number,
        title: null,
        download_link: episodeDraft.download_link.trim() || null,
      })
      setEpisodeDraft((p) => ({ ...p, download_link: '' }))
      const eps = await supa.getEpisodesAdminByAnimeId(animeId)
      setEpisodes(eps)
      invalidateAnimeQueries()
    } catch (e) {
      const code = typeof (e as any)?.code === 'string' ? (e as any).code : null
      if (code === '23505') {
        setEpisodeDraft((p) => ({ ...p, episode_number: nextEpisodeNumber }))
        showError(`این شماره قسمت قبلاً ثبت شده. پیشنهاد: قسمت ${nextEpisodeNumber}`)
      } else {
        const msg = e instanceof Error ? e.message : 'خطا در افزودن قسمت'
        showError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const onAddSubtitle = async () => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!subtitleDraft.subtitle_link.trim()) {
      showError('فایلی انتخاب نشده')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number

    try {
      setSaving(true)
      setToast(null)
      await supa.insertSubtitleAdmin({
        anime_id: animeId,
        episode_number: subtitleDraft.episode_number,
        subtitle_link: subtitleDraft.subtitle_link.trim() || null,
      })
      setSubtitleDraft((p) => ({ ...p, subtitle_link: '' }))
      const subs = await supa.getSubtitlesAdminByAnimeId(animeId)
      setSubtitles(subs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در افزودن زیرنویس'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const heroImage = draft.cover_image.trim() || draft.featured_image.trim()
  const formatLabel =
    formatOptions.find((o) => o.value === draft.format)?.label ?? draft.format

  return (
    <div className="pb-32 bg-background text-foreground">
      {toast && (
        <div className="fixed top-16 inset-x-0 z-[70] px-4 pointer-events-none">
          <div
            className={cn(
              'max-w-xl mx-auto rounded-2xl border px-3 py-2.5 flex items-start justify-between gap-3 pointer-events-auto shadow-lg backdrop-blur-md',
              toastKind === 'success'
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-red-500/30 bg-red-500/10'
            )}
          >
            <p
              className={cn(
                'text-sm leading-6',
                toastKind === 'success' ? 'text-green-200' : 'text-red-200'
              )}
            >
              {toast}
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => setToast(null)}>
              بستن
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={mediaDeleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setMediaDeleteConfirm(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {mediaDeleteConfirm?.type === 'episode' ? 'حذف قسمت' : 'حذف زیرنویس'}
            </DialogTitle>
            <DialogDescription>
              {mediaDeleteConfirm?.type === 'episode' ? (
                <>
                  قسمت{' '}
                  <span className="text-foreground">
                    {mediaDeleteConfirm.row.episode_number ?? 0}
                  </span>{' '}
                  حذف شود؟ این کار قابل بازگشت نیست.
                </>
              ) : (
                <>
                  زیرنویس قسمت{' '}
                  <span className="text-foreground">
                    {mediaDeleteConfirm?.row.episode_number ?? 0}
                  </span>{' '}
                  حذف شود؟ این کار قابل بازگشت نیست.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMediaDeleteConfirm(null)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void onConfirmMediaDelete()}
              disabled={saving}
            >
              {saving ? 'در حال حذف…' : 'بله، حذف شود'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative mx-4 mt-3 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-muted/60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/40 to-background" />
        </div>

        <div className="relative z-10 px-5 pt-3.5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <Button asChild type="button" variant="ghost" size="sm" className="gap-1.5">
              <Link to="/admin/anime">
                <ArrowRight01Icon className="w-4 h-4" />
                لیست انیمه
              </Link>
            </Button>
            {previewAnimeId ? (
              <Button asChild type="button" variant="outline" size="sm" className="gap-1.5">
                <Link
                  to={`/anime/${String(previewAnimeId)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  پیش‌نمایش
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="flex gap-4 items-start mt-5 px-0.5">
            <div className="w-24 aspect-[2/3] rounded-xl overflow-hidden border-4 border-background bg-muted shadow-lg shrink-0 ring-2 ring-primary-400/20">
              {heroImage ? (
                <img src={heroImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  بدون تصویر
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-lg font-bold leading-7 line-clamp-3">
                {isNew ? 'افزودن انیمه' : draft.title.trim() || 'ویرایش انیمه'}
              </h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {draft.format ? (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {formatLabel}
                  </Badge>
                ) : null}
                {draft.airing_status ? (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {airingStatusLabel(draft.airing_status)}
                  </Badge>
                ) : null}
                {draft.is_featured ? (
                  <Badge className="text-[10px] gap-1 border-primary-400/30 bg-primary-600/25">
                    <StarIcon className="w-3 h-3" />
                    ویژه
                  </Badge>
                ) : null}
              </div>
              {!isNew && previewAnimeId ? (
                <p className="text-[11px] text-muted-foreground mt-2 font-mono truncate dir-ltr">
                  {String(previewAnimeId)}
                </p>
              ) : null}
              {!isNew && anime?.updated_at ? (
                <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
                  آخرین ویرایش اطلاعات انیمه
                  {formatAnimeEditorName(anime.last_editor)
                    ? ` توسط ${formatAnimeEditorName(anime.last_editor)}`
                    : ''}
                 <span className="text-muted-foreground"> در تاریخ {formatAdminDateTime(anime.updated_at)
                    ? ` · ${formatAdminDateTime(anime.updated_at)}`
                    : ''}</span>
                </p>
              ) : null}
            </div>
          </div>

          {!loading && (
            <div className="grid grid-cols-3 gap-2 mt-4 px-0.5">
              <div className="rounded-xl border border-border bg-card/60 py-3 px-2 text-center">
                <p className="text-base font-bold tabular-nums">{episodes.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">قسمت ثبت‌شده</p>
              </div>
              <div className="rounded-xl border border-border bg-card/60 py-3 px-2 text-center">
                <p className="text-base font-bold tabular-nums">{selectedGenreSlugs.size}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">ژانر</p>
              </div>
              <div className="rounded-xl border border-border bg-card/60 py-3 px-2 text-center">
                <p className="text-base font-bold tabular-nums">{translatorLinks.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">مترجم</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <AdminEditSkeleton />
      ) : (
        <>
          <div className="sticky top-14 z-30 px-4 pt-4 pb-2 bg-background/90 backdrop-blur-md border-b border-border/50">
            <SegmentedTabs tabs={ADMIN_TABS} active={activeTab} onChange={setActiveTab} />
          </div>

          <div className="px-4 pt-4 space-y-4">
            {activeTab === 'info' && (
              <>
                <AdminSection title="اطلاعات اصلی" description="عنوان، خلاصه و متادیتای پخش">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="عنوان">
                      <Input
                        value={draft.title}
                        onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                        placeholder="عنوان انیمه"
                      />
                    </Field>
                    <Field label="عنوان Romaji">
                      <Input
                        value={draft.title_romaji}
                        onChange={(e) => setDraft((p) => ({ ...p, title_romaji: e.target.value }))}
                        placeholder="مثلاً Shingeki no Kyojin"
                        dir="ltr"
                        className="text-left"
                      />
                    </Field>
                  </div>
                  <Field label="خلاصه داستان">
                    <Textarea
                      className="min-h-28 leading-6"
                      value={draft.synopsis}
                      onChange={(e) => setDraft((p) => ({ ...p, synopsis: e.target.value }))}
                      placeholder="خلاصه داستان..."
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="نوع">
                      <Select
                        value={draft.format}
                        onValueChange={(v) => setDraft((p) => ({ ...p, format: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب..." />
                        </SelectTrigger>
                        <SelectContent>
                          {formatOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="وضعیت پخش">
                      <Select
                        value={draft.airing_status || EMPTY_SELECT_VALUE}
                        onValueChange={(v) =>
                          setDraft((p) => ({
                            ...p,
                            airing_status: v === EMPTY_SELECT_VALUE ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="---" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_SELECT_VALUE}>---</SelectItem>
                          {airingStatusOptions
                            .filter((x) => x)
                            .map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {airingStatusLabel(opt)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="تعداد قسمت‌ها">
                      <Input
                        value={draft.episodes_count}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, episodes_count: e.target.value }))
                        }
                        placeholder="12"
                        inputMode="numeric"
                      />
                    </Field>
                    <Field label="سال">
                      <Input
                        value={draft.year}
                        onChange={(e) => setDraft((p) => ({ ...p, year: e.target.value }))}
                        placeholder="2024"
                        inputMode="numeric"
                      />
                    </Field>
                    <Field label="فصل">
                      <Select
                        value={draft.season || EMPTY_SELECT_VALUE}
                        onValueChange={(v) =>
                          setDraft((p) => ({
                            ...p,
                            season: v === EMPTY_SELECT_VALUE ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="---" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_SELECT_VALUE}>---</SelectItem>
                          {seasonOptions
                            .filter((x) => x)
                            .map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {seasonLabel(opt)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="تاریخ شروع">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start font-normal h-10"
                          >
                            {draft.start_date || 'انتخاب تاریخ'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          <Calendar
                            mode="single"
                            selected={parseYmd(draft.start_date)}
                            onSelect={(d: Date | undefined) =>
                              setDraft((p) => ({
                                ...p,
                                start_date: d ? formatDate(d, 'yyyy-MM-dd') : '',
                              }))
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                    <Field label="تاریخ پایان">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start font-normal h-10"
                          >
                            {draft.end_date || 'انتخاب تاریخ'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          <Calendar
                            mode="single"
                            selected={parseYmd(draft.end_date)}
                            onSelect={(d: Date | undefined) =>
                              setDraft((p) => ({
                                ...p,
                                end_date: d ? formatDate(d, 'yyyy-MM-dd') : '',
                              }))
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                    <Label className="text-sm">نمایش در اسلایدر Home</Label>
                    <Switch
                      checked={Boolean(draft.is_featured)}
                      onCheckedChange={(v: boolean) =>
                        setDraft((p) => ({ ...p, is_featured: Boolean(v) }))
                      }
                    />
                  </div>
                </AdminSection>

                <AdminSection
                  title="شناسه‌ها و امتیازهای خارجی"
                  description="AniList از DB؛ MAL/IMDb با fetch زنده. فیلدهای دستی fallback هستند."
                  action={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0"
                      disabled={!previewAnimeId || !canSyncExternalScores || syncScoresLoading}
                      onClick={() => void handleSyncExternalScores()}
                    >
                      <RefreshIcon
                        className={cn('w-3.5 h-3.5', syncScoresLoading && 'animate-spin')}
                      />
                      سینک
                    </Button>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="AniList ID">
                      <Input
                        value={draft.anilist_id}
                        onChange={(e) => setDraft((p) => ({ ...p, anilist_id: e.target.value }))}
                        inputMode="numeric"
                        placeholder="15125"
                      />
                    </Field>
                    <Field label="امتیاز AniList (٪)">
                      <Input
                        value={draft.average_score}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, average_score: e.target.value }))
                        }
                        inputMode="decimal"
                        placeholder="84"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="MAL ID">
                      <Input
                        value={draft.mal_id}
                        onChange={(e) => setDraft((p) => ({ ...p, mal_id: e.target.value }))}
                        inputMode="numeric"
                        placeholder="5114"
                      />
                    </Field>
                    <Field label="امتیاز MAL">
                      <Input
                        value={draft.mal_score}
                        onChange={(e) => setDraft((p) => ({ ...p, mal_score: e.target.value }))}
                        inputMode="decimal"
                        placeholder="8.6"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="IMDb ID">
                      <Input
                        value={draft.imdb_id}
                        onChange={(e) => setDraft((p) => ({ ...p, imdb_id: e.target.value }))}
                        placeholder="tt0213338"
                        className="font-mono text-sm"
                      />
                    </Field>
                    <Field label="امتیاز IMDb">
                      <Input
                        value={draft.imdb_score}
                        onChange={(e) => setDraft((p) => ({ ...p, imdb_score: e.target.value }))}
                        inputMode="decimal"
                        placeholder="8.2"
                      />
                    </Field>
                  </div>
                </AdminSection>

                <AdminSection title="تصاویر" description="URL پoster و تصویر hero">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="کاور (poster)">
                      <Input
                        value={draft.cover_image}
                        onChange={(e) => setDraft((p) => ({ ...p, cover_image: e.target.value }))}
                        placeholder="https://..."
                        className="font-mono text-xs"
                      />
                    </Field>
                    <Field label="تصویر ویژه (hero)">
                      <Input
                        value={draft.featured_image}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, featured_image: e.target.value }))
                        }
                        placeholder="https://..."
                        className="font-mono text-xs"
                      />
                    </Field>
                  </div>
                </AdminSection>
              </>
            )}

            {activeTab === 'relations' && (
              <>
                <AdminSection
                  title="سری فصل‌ها"
                  description="هر فصل یک انیمه جدا است — همه فصل‌ها را اینجا لیست کن"
                >
                  <Field label="عنوان سری (اختیاری)">
                    <Input
                      value={seriesTitle}
                      onChange={(e) => setSeriesTitle(e.target.value)}
                      placeholder="مثلاً Solo Leveling"
                    />
                  </Field>

                  {seriesMembers.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        هنوز سری فصل تعریف نشده. هر ردیف = یک انیمه در کاتالوگ.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={startSeriesWithCurrentAnime}>
                          شروع با این انیمه
                        </Button>
                        <Button type="button" variant="outline" onClick={addSeriesMember}>
                          افزودن فصل
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {seriesMembers
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((member) => (
                          <div
                            key={member.key}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded-xl border border-border p-3"
                          >
                            <Field label="شماره" className="sm:col-span-2">
                              <Input
                                inputMode="numeric"
                                value={String(member.sort_order)}
                                onChange={(e) =>
                                  updateSeriesMember(member.key, {
                                    sort_order: Number(e.target.value || 1),
                                  })
                                }
                              />
                            </Field>
                            <Field label="برچسب" className="sm:col-span-3">
                              <Input
                                value={member.label_fa}
                                onChange={(e) =>
                                  updateSeriesMember(member.key, { label_fa: e.target.value })
                                }
                                placeholder="فصل ۱"
                              />
                            </Field>
                            <Field label="انیمه" className="sm:col-span-6">
                              <AnimeSearchSelect
                                value={member.anime_id}
                                onChange={(animeId) =>
                                  updateSeriesMember(member.key, { anime_id: animeId })
                                }
                                options={animeLinkOptions}
                              />
                            </Field>
                            <Button
                              type="button"
                              variant="ghost"
                              className="sm:col-span-1 text-destructive"
                              onClick={() => removeSeriesMember(member.key)}
                            >
                              حذف
                            </Button>
                          </div>
                        ))}

                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={addSeriesMember}>
                          افزودن فصل
                        </Button>
                        <Button type="button" variant="outline" onClick={clearSeries}>
                          پاک کردن سری
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        برای نمایش سوییچر در اپ حداقل ۲ فصل با انیمه انتخاب‌شده لازم است.
                      </p>
                    </div>
                  )}
                </AdminSection>

                <AdminSection
                  title="استودیوها و ژانرها"
                  description="روابط many-to-many — بعد از ذخیره انیمه اعمال می‌شوند"
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">استودیوها</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allStudios.map((s) => {
                          const slug = String(s.slug)
                          return (
                            <ChipToggle
                              key={slug}
                              active={selectedStudioSlugs.has(slug)}
                              onClick={() => toggleStudio(slug)}
                            >
                              {s.name || s.slug}
                            </ChipToggle>
                          )
                        })}
                        {allStudios.length === 0 && (
                          <p className="text-sm text-muted-foreground">استودیویی ثبت نشده</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">ژانرها</p>
                      <div className="flex flex-wrap gap-1.5">
                        {genreList.map((g) => {
                          const slug = String(g.slug)
                          return (
                            <ChipToggle
                              key={slug}
                              active={selectedGenreSlugs.has(slug)}
                              onClick={() => toggleGenre(slug)}
                            >
                              {g.name_fa || g.name_en || g.slug}
                            </ChipToggle>
                          )
                        })}
                        {genreList.length === 0 && (
                          <p className="text-sm text-muted-foreground">ژانری ثبت نشده</p>
                        )}
                      </div>
                    </div>
                  </div>
                </AdminSection>
              </>
            )}

            {activeTab === 'media' && (
              <div className="space-y-4">
                <SegmentedTabs
                  tabs={MEDIA_SUB_TABS}
                  active={mediaSubTab}
                  onChange={setMediaSubTab}
                />

                {mediaSubTab === 'episodes' && (
                  <AdminSection
                    title={editingEpisodeId ? 'ویرایش قسمت' : 'افزودن قسمت'}
                    description={`${episodes.length} قسمت ثبت شده`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[7rem_minmax(0,1fr)_auto] gap-3 items-end">
                      <Field label="شماره">
                        <Input
                          value={String(episodeDraft.episode_number)}
                          onChange={(e) =>
                            setEpisodeDraft((p) => ({
                              ...p,
                              episode_number: Number(e.target.value || 1),
                            }))
                          }
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label="فایل MKV">
                        <TelegramFileSearchSelect
                          fileExtension="mkv"
                          value={episodeDraft.download_link}
                          onChange={(download_link) =>
                            setEpisodeDraft((p) => ({ ...p, download_link }))
                          }
                          disabled={saving}
                        />
                      </Field>
                      <FieldActions>
                        {editingEpisodeId ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={saving}
                              className={formActionButtonClass}
                              onClick={onCancelEditEpisode}
                            >
                              انصراف
                            </Button>
                            <Button
                              type="button"
                              disabled={saving}
                              className={formActionButtonClass}
                              onClick={onSaveEpisodeEdit}
                            >
                              ذخیره
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={saving}
                            className={cn('gap-1.5', formActionButtonClass)}
                            onClick={onAddEpisode}
                          >
                            <Download01Icon className="w-4 h-4" />
                            افزودن
                          </Button>
                        )}
                      </FieldActions>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      {episodesForList.map((e) => (
                        <MediaListRow
                          key={String(e.id)}
                          title={`قسمت ${e.episode_number ?? 0}`}
                          subtitle={e.download_link ?? ''}
                          disabled={saving}
                          notifyLoading={notifyEpisodeNumber === (e.episode_number ?? 0)}
                          onNotify={() => onNotifyEpisodeRelease(e.episode_number ?? 0)}
                          onEdit={() => onEditEpisode(e)}
                          onDelete={() => onRequestDeleteEpisode(e)}
                        />
                      ))}
                      {episodes.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          قسمتی ثبت نشده
                        </p>
                      )}
                    </div>
                  </AdminSection>
                )}

                {mediaSubTab === 'subtitles' && (
                  <AdminSection
                    title={editingSubtitleId ? 'ویرایش زیرنویس' : 'افزودن زیرنویس'}
                    description={`${subtitles.length} زیرنویس ثبت شده`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[7rem_minmax(0,1fr)_auto] gap-3 items-end">
                      <Field label="شماره">
                        <Input
                          value={String(subtitleDraft.episode_number)}
                          onChange={(e) =>
                            setSubtitleDraft((p) => ({
                              ...p,
                              episode_number: Number(e.target.value || 1),
                            }))
                          }
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label="فایل ZIP">
                        <TelegramFileSearchSelect
                          fileExtension="zip"
                          value={subtitleDraft.subtitle_link}
                          onChange={(subtitle_link) =>
                            setSubtitleDraft((p) => ({ ...p, subtitle_link }))
                          }
                          disabled={saving}
                        />
                      </Field>
                      <FieldActions>
                        {editingSubtitleId ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={saving}
                              className={formActionButtonClass}
                              onClick={onCancelEditSubtitle}
                            >
                              انصراف
                            </Button>
                            <Button
                              type="button"
                              disabled={saving}
                              className={formActionButtonClass}
                              onClick={onSaveSubtitleEdit}
                            >
                              ذخیره
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={saving}
                            className={cn('gap-1.5', formActionButtonClass)}
                            onClick={onAddSubtitle}
                          >
                            <Link01Icon className="w-4 h-4" />
                            افزودن
                          </Button>
                        )}
                      </FieldActions>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      {subtitlesForList.map((s) => (
                        <MediaListRow
                          key={String(s.id)}
                          title={`قسمت ${s.episode_number ?? 0}`}
                          subtitle={s.subtitle_link ?? ''}
                          disabled={saving}
                          onEdit={() => onEditSubtitle(s)}
                          onDelete={() => onRequestDeleteSubtitle(s)}
                        />
                      ))}
                      {subtitles.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          زیرنویسی ثبت نشده
                        </p>
                      )}
                    </div>
                  </AdminSection>
                )}

                {mediaSubTab === 'packs' && (
                  <div className="space-y-4">
                    <AdminSection
                      title={editingEpisodePack ? 'ویرایش پک' : 'افزودن پک قسمت‌ها'}
                      description={`${hasEpisodePack ? 1 : 0} پک ثبت شده`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] gap-3 items-end">
                        <Field label="عنوان">
                          <Input
                            value={episodePackDraft.title}
                            onChange={(e) =>
                              setEpisodePackDraft((p) => ({ ...p, title: e.target.value }))
                            }
                            placeholder="پک کامل فصل ۱"
                          />
                        </Field>
                        <Field label="پک فایل">
                          <FilePackSearchSelect
                            packs={allFilePacks}
                            value={episodePackDraft.download_link}
                            onChange={(download_link) =>
                              setEpisodePackDraft((p) => ({ ...p, download_link }))
                            }
                            onPickPack={(pack) => {
                              setEpisodePackDraft((p) => ({
                                ...p,
                                title: p.title.trim() ? p.title : pack.title,
                              }))
                            }}
                            disabled={saving}
                          />
                        </Field>
                        <FieldActions>
                          {editingEpisodePack ? (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={saving}
                                className={formActionButtonClass}
                                onClick={onCancelEditEpisodePack}
                              >
                                انصراف
                              </Button>
                              <Button
                                type="button"
                                disabled={saving}
                                className={formActionButtonClass}
                                onClick={onSaveEpisodePackEdit}
                              >
                                ذخیره
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={saving || hasEpisodePack}
                              className={formActionButtonClass}
                              onClick={onAddEpisodePack}
                            >
                              افزودن
                            </Button>
                          )}
                        </FieldActions>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        {hasEpisodePack ? (
                          <MediaListRow
                            title={anime?.episode_pack_title?.trim() || 'پک قسمت‌ها'}
                            subtitle={anime?.episode_pack_link ?? ''}
                            disabled={saving}
                            onEdit={onEditEpisodePack}
                            onDelete={onClearEpisodePack}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            پکی ثبت نشده
                          </p>
                        )}
                      </div>
                    </AdminSection>

                    <AdminSection
                      title={editingSubtitlePackId ? 'ویرایش پک' : 'افزودن پک زیرنویس'}
                      description={`${subtitlePacks.length} پک ثبت شده`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] gap-3 items-end">
                        <Field label="عنوان">
                          <Input
                            value={subtitlePackDraft.title}
                            onChange={(e) =>
                              setSubtitlePackDraft((p) => ({ ...p, title: e.target.value }))
                            }
                            placeholder="پک فصل ۱"
                          />
                        </Field>
                        <Field label="فایل ZIP">
                          <TelegramFileSearchSelect
                            fileExtension="zip"
                            value={subtitlePackDraft.subtitle_link}
                            onChange={(subtitle_link) =>
                              setSubtitlePackDraft((p) => ({ ...p, subtitle_link }))
                            }
                            disabled={saving}
                          />
                        </Field>
                        <FieldActions>
                          {editingSubtitlePackId ? (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={saving}
                                className={formActionButtonClass}
                                onClick={onCancelEditSubtitlePack}
                              >
                                انصراف
                              </Button>
                              <Button
                                type="button"
                                disabled={saving}
                                className={formActionButtonClass}
                                onClick={onSaveSubtitlePackEdit}
                              >
                                ذخیره
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={saving || hasSubtitlePack}
                              className={formActionButtonClass}
                              onClick={onAddSubtitlePack}
                            >
                              افزودن
                            </Button>
                          )}
                        </FieldActions>
                      </div>
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      {subtitlePacks.map((p) => (
                        <MediaListRow
                          key={String(p.id)}
                          title={p.title || 'پک زیرنویس'}
                          subtitle={p.subtitle_link ?? ''}
                          disabled={saving}
                          onEdit={() => onEditSubtitlePack(p)}
                          onDelete={() => onDeleteSubtitlePack(p)}
                        />
                      ))}
                      {subtitlePacks.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          پکی ثبت نشده
                        </p>
                      )}
                    </div>
                  </AdminSection>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'translators' && (
              <AdminSection title="مترجم‌های این اثر" description="اتصال مترجم به انیمه">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_8rem_auto] gap-3 items-end">
                  <Field label="مترجم">
                    <TranslatorSearchSelect
                      translators={allTranslators}
                      value={translatorLinkDraft.translator_id}
                      onChange={(translator_id) =>
                        setTranslatorLinkDraft((p) => ({ ...p, translator_id }))
                      }
                      disabled={saving}
                    />
                  </Field>
                  <Field label="نقش">
                    <Select
                      value={normalizeTranslatorLinkRole(translatorLinkDraft.role)}
                      onValueChange={(role) =>
                        setTranslatorLinkDraft((p) => ({ ...p, role }))
                      }
                      disabled={saving}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSLATOR_LINK_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <FieldActions>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={saving}
                      className={cn('gap-1.5', formActionButtonClass)}
                      onClick={onAddTranslatorLink}
                    >
                      <UserIcon className="w-4 h-4" />
                      افزودن
                    </Button>
                  </FieldActions>
                </div>
                <div className="space-y-2 pt-2 border-t border-border/60">
                  {translatorLinks.map((l) => {
                    const isEditing = editingTranslatorLinkId === l.id
                    return (
                      <div
                        key={String(l.id)}
                        className="rounded-xl border border-border bg-card/40 p-3 space-y-3"
                      >
                        {isEditing ? (
                          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_8rem_auto] gap-3 items-end">
                            <Field label="مترجم">
                              <TranslatorSearchSelect
                                translators={allTranslators}
                                value={editingTranslatorLinkDraft.translator_id}
                                onChange={(translator_id) =>
                                  setEditingTranslatorLinkDraft((p) => ({
                                    ...p,
                                    translator_id,
                                  }))
                                }
                                disabled={saving}
                              />
                            </Field>
                            <Field label="نقش">
                              <Select
                                value={normalizeTranslatorLinkRole(editingTranslatorLinkDraft.role)}
                                onValueChange={(role) =>
                                  setEditingTranslatorLinkDraft((p) => ({ ...p, role }))
                                }
                                disabled={saving}
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRANSLATOR_LINK_ROLES.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <FieldActions>
                              <Button
                                type="button"
                                disabled={saving}
                                className={formActionButtonClass}
                                onClick={onSaveTranslatorLinkEdit}
                              >
                                ذخیره
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={saving}
                                className={formActionButtonClass}
                                onClick={onCancelEditTranslatorLink}
                              >
                                انصراف
                              </Button>
                            </FieldActions>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <TranslatorPickerFace translator={l.translator} />
                              <p className="text-[11px] text-muted-foreground ps-8">
                                نقش: {normalizeTranslatorLinkRole(l.role)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                              {l.translator.slug ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="gap-1.5"
                                  asChild
                                >
                                  <Link
                                    to={`/translators/${encodeURIComponent(l.translator.slug)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
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
                                onClick={() => onEditTranslatorLink(l)}
                              >
                                <Pencil className="h-3.5 w-3.5 shrink-0" />
                                ویرایش
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={saving}
                                className="bg-red-500/15 text-red-400 hover:bg-red-500/25"
                                onClick={() => onDeleteTranslatorLink(l)}
                              >
                                حذف
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {translatorLinks.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      مترجمی ثبت نشده
                    </p>
                  )}
                </div>
              </AdminSection>
            )}
          </div>
        </>
      )}

      <div className="fixed bottom-0 inset-x-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] pt-3 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="flex justify-center gap-2 pointer-events-auto">
          <Button
            type="button"
            className="font-semibold px-8 min-w-[9.5rem]"
            disabled={saving}
            onClick={onSaveAnime}
          >
            {saving ? 'در حال ذخیره…' : 'ذخیره انیمه'}
          </Button>
          <Button asChild type="button" variant="secondary" className="px-5">
            <Link to="/admin/anime">انصراف</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminAnimeEdit
