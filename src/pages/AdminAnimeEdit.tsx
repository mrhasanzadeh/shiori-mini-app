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
import { ExternalLink } from 'lucide-react'
import * as supa from '../services/supabaseAnime'
import { syncAnimeExternalScores } from '../services/syncAnimeExternalScores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  disabled,
}: {
  title: string
  subtitle: string
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}) => (
  <div className="rounded-xl border border-border bg-card/40 p-3 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle || '—'}</p>
    </div>
    <div className="flex gap-1.5 shrink-0">
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
  const [activeTab, setActiveTab] = useState<AdminTab>('info')
  const [mediaSubTab, setMediaSubTab] = useState<MediaSubTab>('episodes')
  const [syncScoresLoading, setSyncScoresLoading] = useState(false)

  const [allGenres, setAllGenres] = useState<supa.GenreAdminItem[]>([])
  const [selectedGenreSlugs, setSelectedGenreSlugs] = useState<Set<string>>(new Set())

  const [allStudios, setAllStudios] = useState<supa.StudioAdminItem[]>([])
  const [selectedStudioSlugs, setSelectedStudioSlugs] = useState<Set<string>>(new Set())

  const [anime, setAnime] = useState<supa.AnimeAdminRow | null>(null)
  const [draft, setDraft] = useState<DraftAnime>({
    title: '',
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

  const [episodes, setEpisodes] = useState<supa.EpisodeAdminRow[]>([])
  const [subtitles, setSubtitles] = useState<supa.SubtitleAdminRow[]>([])
  const [subtitlePacks, setSubtitlePacks] = useState<supa.SubtitlePackItem[]>([])

  const [allTranslators, setAllTranslators] = useState<supa.TranslatorAdminItem[]>([])
  const [translatorLinks, setTranslatorLinks] = useState<supa.TranslatorAnimeAdminLink[]>([])
  const [translatorLinkDraft, setTranslatorLinkDraft] = useState<TranslatorLinkDraft>({
    translator_id: '',
    role: '',
  })

  const [editingEpisodeId, setEditingEpisodeId] = useState<string | number | null>(null)
  const [editingSubtitleId, setEditingSubtitleId] = useState<string | number | null>(null)
  const [editingSubtitlePackId, setEditingSubtitlePackId] = useState<string | number | null>(null)

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
        NOT_YET_RELEASED: 'هنوز پخش نشده',
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

      await supa.insertTranslatorAnimeLinkAdmin({
        anime_id: animeId,
        translator_id: translatorId,
        role: translatorLinkDraft.role.trim() || null,
      })

      setTranslatorLinkDraft((p) => ({ ...p, role: '' }))
      const links = await supa.getTranslatorAnimeLinksAdminByAnimeId(animeId)
      setTranslatorLinks(links)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در افزودن مترجم'
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

  const onDeleteSubtitle = async (row: supa.SubtitleAdminRow) => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!confirm('این زیرنویس حذف شود؟')) return
    const animeId = (anime?.id ?? draft.id) as string | number
    try {
      setSaving(true)
      setToast(null)
      await supa.deleteSubtitleAdmin(row.id)
      if (editingSubtitleId === row.id) onCancelEditSubtitle()
      const subs = await supa.getSubtitlesAdminByAnimeId(animeId)
      setSubtitles(subs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف زیرنویس'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onDeleteEpisode = async (row: supa.EpisodeAdminRow) => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }
    if (!confirm('این قسمت حذف شود؟')) return
    const animeId = (anime?.id ?? draft.id) as string | number
    try {
      setSaving(true)
      setToast(null)
      await supa.deleteEpisodeAdmin(row.id)
      if (editingEpisodeId === row.id) onCancelEditEpisode()
      const eps = await supa.getEpisodesAdminByAnimeId(animeId)
      setEpisodes(eps)
      invalidateAnimeQueries()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف قسمت'
      showError(msg)
    } finally {
      setSaving(false)
    }
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

  const onSaveEpisodePack = async () => {
    if (!draft.id && !anime?.id && isNew) {
      showError('اول انیمه را ذخیره کن')
      return
    }

    const animeId = (anime?.id ?? draft.id) as string | number

    try {
      setSaving(true)
      setToast(null)
      await supa.updateEpisodePackAdmin(animeId, {
        title: episodePackDraft.title.trim() || null,
        download_link: episodePackDraft.download_link.trim() || null,
      })
      setAnime((prev) =>
        prev
          ? {
              ...prev,
              episode_pack_title: episodePackDraft.title.trim() || null,
              episode_pack_link: episodePackDraft.download_link.trim() || null,
            }
          : prev
      )
      showSuccess('پک تمام قسمت‌ها ذخیره شد')
      invalidateAnimeQueries()
      invalidateAnimeDetailQuery(animeId)
    } catch (e) {
      showError(formatSupabaseError(e) || 'خطا در ذخیره پک قسمت‌ها')
    } finally {
      setSaving(false)
    }
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
    const [g, studios, translators, tLinks, a, eps, subs, packs, aGenres, aStudios] =
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
      ])

    setAllGenres(g)
    setAllStudios(studios)
    setAllTranslators(translators)
    setTranslatorLinks(tLinks)
    setAnime(a)
    setEpisodes(eps)
    setSubtitles(subs)
    setSubtitlePacks(packs)
    setEpisodePackDraft({
      title: a.episode_pack_title ?? '',
      download_link: a.episode_pack_link ?? '',
    })
    setSelectedGenreSlugs(new Set(aGenres))
    setSelectedStudioSlugs(new Set(aStudios))

    setDraft({
      id: a.id,
      title: a.title ?? '',
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

        const studios = await supa.getAllStudiosAdmin()
        setAllStudios(studios)

        const translators = await supa.getAllTranslatorsAdmin()
        setAllTranslators(translators)

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
                  <Field label="عنوان">
                    <Input
                      value={draft.title}
                      onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="عنوان انیمه"
                    />
                  </Field>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="تعداد قسمت‌ها">
                      <Input
                        value={draft.episodes_count}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, episodes_count: e.target.value }))
                        }
                        placeholder="مثلاً: 12"
                        inputMode="numeric"
                      />
                    </Field>
                    <Field label="استودیو (متن legacy)">
                      <Input
                        value={draft.studio}
                        onChange={(e) => setDraft((p) => ({ ...p, studio: e.target.value }))}
                        placeholder="نام استودیو"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </AdminSection>
              </>
            )}

            {activeTab === 'relations' && (
              <AdminSection
                title="استودیوها و ژانرها"
                description="روابط many-to-many — بعد از ذخیره انیمه اعمال می‌شوند"
              >
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
              </AdminSection>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="شماره قسمت">
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
                      <Field label="لینک دانلود">
                        <Input
                          value={episodeDraft.download_link}
                          onChange={(e) =>
                            setEpisodeDraft((p) => ({ ...p, download_link: e.target.value }))
                          }
                          placeholder="https://..."
                          className="font-mono text-xs"
                        />
                      </Field>
                    </div>
                    <div className="flex gap-2">
                      {editingEpisodeId ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={saving}
                            onClick={onCancelEditEpisode}
                          >
                            انصراف
                          </Button>
                          <Button type="button" disabled={saving} onClick={onSaveEpisodeEdit}>
                            ذخیره تغییرات
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={saving}
                          className="gap-1.5"
                          onClick={onAddEpisode}
                        >
                          <Download01Icon className="w-4 h-4" />
                          افزودن قسمت
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      {episodesForList.map((e) => (
                        <MediaListRow
                          key={String(e.id)}
                          title={`قسمت ${e.episode_number ?? 0}`}
                          subtitle={e.download_link ?? ''}
                          disabled={saving}
                          onEdit={() => onEditEpisode(e)}
                          onDelete={() => onDeleteEpisode(e)}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="شماره قسمت">
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
                      <Field label="لینک زیرنویس">
                        <Input
                          value={subtitleDraft.subtitle_link}
                          onChange={(e) =>
                            setSubtitleDraft((p) => ({ ...p, subtitle_link: e.target.value }))
                          }
                          placeholder="https://..."
                          className="font-mono text-xs"
                        />
                      </Field>
                    </div>
                    <div className="flex gap-2">
                      {editingSubtitleId ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={saving}
                            onClick={onCancelEditSubtitle}
                          >
                            انصراف
                          </Button>
                          <Button type="button" disabled={saving} onClick={onSaveSubtitleEdit}>
                            ذخیره تغییرات
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={saving}
                          className="gap-1.5"
                          onClick={onAddSubtitle}
                        >
                          <Link01Icon className="w-4 h-4" />
                          افزودن زیرنویس
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      {subtitlesForList.map((s) => (
                        <MediaListRow
                          key={String(s.id)}
                          title={`قسمت ${s.episode_number ?? 0}`}
                          subtitle={s.subtitle_link ?? ''}
                          disabled={saving}
                          onEdit={() => onEditSubtitle(s)}
                          onDelete={() => onDeleteSubtitle(s)}
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
                    title="پک تمام قسمت‌ها"
                    description="لینک دانلود یک‌جای همه قسمت‌های این انیمه"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="عنوان (اختیاری)">
                        <Input
                          value={episodePackDraft.title}
                          onChange={(e) =>
                            setEpisodePackDraft((p) => ({ ...p, title: e.target.value }))
                          }
                          placeholder="پک کامل فصل ۱"
                        />
                      </Field>
                      <Field label="لینک پک">
                        <Input
                          value={episodePackDraft.download_link}
                          onChange={(e) =>
                            setEpisodePackDraft((p) => ({ ...p, download_link: e.target.value }))
                          }
                          placeholder="https://..."
                          className="font-mono text-xs"
                        />
                      </Field>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" disabled={saving} onClick={onSaveEpisodePack}>
                        ذخیره پک قسمت‌ها
                      </Button>
                      {(episodePackDraft.download_link.trim() ||
                        anime?.episode_pack_link) && (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={saving}
                          onClick={onClearEpisodePack}
                        >
                          حذف پک
                        </Button>
                      )}
                    </div>
                  </AdminSection>

                  <AdminSection
                    title={editingSubtitlePackId ? 'ویرایش پک' : 'افزودن پک زیرنویس'}
                    description={`${subtitlePacks.length} پک ثبت شده`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="عنوان">
                        <Input
                          value={subtitlePackDraft.title}
                          onChange={(e) =>
                            setSubtitlePackDraft((p) => ({ ...p, title: e.target.value }))
                          }
                          placeholder="پک فصل ۱"
                        />
                      </Field>
                      <Field label="لینک پک">
                        <Input
                          value={subtitlePackDraft.subtitle_link}
                          onChange={(e) =>
                            setSubtitlePackDraft((p) => ({ ...p, subtitle_link: e.target.value }))
                          }
                          placeholder="https://..."
                          className="font-mono text-xs"
                        />
                      </Field>
                    </div>
                    <div className="flex gap-2">
                      {editingSubtitlePackId ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={saving}
                            onClick={onCancelEditSubtitlePack}
                          >
                            انصراف
                          </Button>
                          <Button
                            type="button"
                            disabled={saving}
                            onClick={onSaveSubtitlePackEdit}
                          >
                            ذخیره تغییرات
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={saving}
                          onClick={onAddSubtitlePack}
                        >
                          افزودن پک
                        </Button>
                      )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="مترجم">
                    <Select
                      value={translatorLinkDraft.translator_id || EMPTY_SELECT_VALUE}
                      onValueChange={(v) =>
                        setTranslatorLinkDraft((p) => ({
                          ...p,
                          translator_id: v === EMPTY_SELECT_VALUE ? '' : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>انتخاب...</SelectItem>
                        {allTranslators.map((t) => (
                          <SelectItem key={String(t.id ?? t.slug)} value={String(t.id ?? '')}>
                            {t.name} ({t.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="نقش (اختیاری)">
                    <Input
                      value={translatorLinkDraft.role}
                      onChange={(e) =>
                        setTranslatorLinkDraft((p) => ({ ...p, role: e.target.value }))
                      }
                      placeholder="مترجم / بازبین"
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  className="gap-1.5"
                  onClick={onAddTranslatorLink}
                >
                  <UserIcon className="w-4 h-4" />
                  افزودن مترجم
                </Button>
                <div className="space-y-2 pt-2 border-t border-border/60">
                  {translatorLinks.map((l) => (
                    <div
                      key={String(l.id)}
                      className="rounded-xl border border-border bg-card/40 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold line-clamp-1">{l.translator.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {l.role || '—'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={saving}
                        className="bg-red-500/15 text-red-400 hover:bg-red-500/25 shrink-0"
                        onClick={() => onDeleteTranslatorLink(l)}
                      >
                        حذف
                      </Button>
                    </div>
                  ))}
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
