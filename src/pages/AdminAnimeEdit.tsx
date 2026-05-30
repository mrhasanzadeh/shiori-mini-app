import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ExternalLink } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { format as formatDate } from 'date-fns'

type DraftAnime = {
  id?: number | string
  title: string
  synopsis: string
  format: string
  airing_status: string
  season: string
  year: string
  anilist_id: string
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

type TranslatorLinkDraft = {
  translator_id: string
  role: string
}

const AdminAnimeEdit = () => {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در حذف قسمت'
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const showError = (msg: string) => {
    setToast(msg)
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
        navigate(`/admin/anime/${encodeURIComponent(String(animeId))}`, { replace: true })
        return
      }

      await reload(animeId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ذخیره'
      showError(msg)
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

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 left-0 right-0 z-[60] px-4">
          <div className="max-w-xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 flex items-start justify-between gap-3">
            <div className="text-red-200 text-sm leading-6">{toast}</div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setToast(null)}>
              بستن
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-foreground text-lg font-bold">
          {isNew ? 'افزودن انیمه' : 'ویرایش انیمه'}
        </h1>

        {(anime?.id ?? draft.id ?? (!isNew ? id : null)) ? (
          <Button
            type="button"
            variant="link"
            asChild
            className="text-muted-foreground hover:text-foreground gap-2 px-0 hover:no-underline"
          >
            <Link
              to={`/anime/${String(anime?.id ?? draft.id ?? id)}`}
              target="_blank"
              rel="noreferrer"
            >
              مشاهده انیمه
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="link"
            disabled
            className="text-muted-foreground gap-2 px-0"
          >
            مشاهده انیمه
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 text-muted-foreground text-sm">در حال بارگذاری...</div>
      ) : (
        <>
          <Tabs defaultValue="main" dir="rtl" className="mt-6">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="main">اطلاعات</TabsTrigger>
              <TabsTrigger value="relations">روابط</TabsTrigger>
              <TabsTrigger value="translators">مترجم‌ها</TabsTrigger>
              <TabsTrigger value="episodes">قسمت‌ها</TabsTrigger>
              <TabsTrigger value="subtitles">زیرنویس‌ها</TabsTrigger>
            </TabsList>

            <TabsContent value="main">
              <Card>
                <CardHeader>
                  <CardTitle>اطلاعات اصلی</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="mt-2">
                    <div className="text-muted-foreground text-xs mb-2">عنوان</div>
                    <Input
                      value={draft.title}
                      onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="عنوان"
                    />
                  </div>

                  <div>
                    <div className="text-muted-foreground text-xs mb-2">خلاصه داستان</div>
                    <Textarea
                      className="min-h-32"
                      value={draft.synopsis}
                      onChange={(e) => setDraft((p) => ({ ...p, synopsis: e.target.value }))}
                      placeholder="خلاصه داستان..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">نوع انیمه</div>
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
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">وضعیت پخش</div>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">تعداد قسمت‌ها</div>
                      <Input
                        value={draft.episodes_count}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            episodes_count: e.target.value,
                          }))
                        }
                        placeholder="مثلاً: 12"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">نمایش در اسلایدر</div>
                      <div className="rounded-md border border-border bg-background flex items-center justify-between h-10 px-3">
                        <Label className="text-foreground text-sm">
                          نمایش در اسلایدر (Featured)
                        </Label>
                        <Switch
                          checked={Boolean(draft.is_featured)}
                          onCheckedChange={(v: boolean) =>
                            setDraft((p) => ({ ...p, is_featured: Boolean(v) }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">سال انتشار</div>
                      <Input
                        value={draft.year}
                        onChange={(e) => setDraft((p) => ({ ...p, year: e.target.value }))}
                        placeholder="مثلاً: 2024"
                      />
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">AniList ID</div>
                      <Input
                        value={draft.anilist_id}
                        onChange={(e) => setDraft((p) => ({ ...p, anilist_id: e.target.value }))}
                        inputMode="numeric"
                        placeholder="مثلاً: 196935"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">فصل انتشار</div>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">تاریخ شروع</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            className="w-full justify-start text-left font-normal h-10 rounded-md bg-background border border-input text-muted-foreground"
                          >
                            {draft.start_date ? draft.start_date : 'انتخاب تاریخ'}
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
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-2">تاریخ پایان</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            className="w-full justify-start text-left font-normal h-10 rounded-md bg-background border border-input text-muted-foreground"
                          >
                            {draft.end_date ? draft.end_date : 'انتخاب تاریخ'}
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
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground text-xs mb-2">کاور (URL)</div>
                    <Input
                      value={draft.cover_image}
                      onChange={(e) => setDraft((p) => ({ ...p, cover_image: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-2">تصویر ویژه (URL)</div>
                    <Input
                      value={draft.featured_image}
                      onChange={(e) => setDraft((p) => ({ ...p, featured_image: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="translators">
              <Card>
                <CardHeader>
                  <CardTitle>مترجم‌ها</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-muted-foreground text-sm">
                    برای اتصال مترجم به این اثر، مترجم را انتخاب کن.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">مترجم</div>
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
                    </div>

                    <div>
                      <div className="text-muted-foreground text-xs mb-1">نقش (اختیاری)</div>
                      <Input
                        value={translatorLinkDraft.role}
                        onChange={(e) =>
                          setTranslatorLinkDraft((p) => ({
                            ...p,
                            role: e.target.value,
                          }))
                        }
                        placeholder="مثلاً: مترجم / بازبین"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onAddTranslatorLink}
                    disabled={saving}
                  >
                    افزودن
                  </Button>

                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {translatorLinks.map((l) => {
                        return (
                          <div
                            key={String(l.id)}
                            className="p-3 rounded-2xl border border-border bg-muted/30 flex items-center justify-between gap-2"
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="text-foreground text-sm font-semibold line-clamp-1">
                                {l.translator.name}
                              </div>
                              <div className="text-muted-foreground text-xs line-clamp-2">
                                {l.role ? l.role : '---'}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-md"
                              onClick={() => onDeleteTranslatorLink(l)}
                            >
                              حذف
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                    {translatorLinks.length === 0 && (
                      <div className="text-muted-foreground text-sm">
                        مترجمی برای این اثر ثبت نشده
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relations">
              <Card>
                <CardHeader>
                  <CardTitle>استودیوها و ژانرها</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-foreground text-sm font-semibold">استودیوها</div>
                    <div className="text-muted-foreground text-xs mt-2">
                      (چند انتخابی — نیازمند جدول studios/anime_studios در دیتابیس)
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {allStudios.map((s) => {
                        const slug = String(s.slug)
                        const on = selectedStudioSlugs.has(slug)
                        return (
                          <Button
                            key={slug}
                            type="button"
                            onClick={() => toggleStudio(slug)}
                            variant={on ? 'default' : 'outline'}
                            size="sm"
                            className={
                              on
                                ? 'h-8 bg-primary-500/30 border border-primary-400/40 text-foreground rounded-sm font-mono'
                                : 'h-8 text-foreground rounded-sm font-mono'
                            }
                          >
                            {s.name || s.slug}
                          </Button>
                        )
                      })}
                      {allStudios.length === 0 && (
                        <div className="text-muted-foreground text-sm">استودیویی ثبت نشده</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-foreground text-sm font-semibold">ژانرها</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {genreList.map((g) => {
                        const slug = String(g.slug)
                        const on = selectedGenreSlugs.has(slug)
                        return (
                          <Button
                            key={slug}
                            type="button"
                            onClick={() => toggleGenre(slug)}
                            variant={on ? 'default' : 'outline'}
                            size="sm"
                            className={
                              on
                                ? 'h-8 bg-primary-500/30 border border-primary-400/40 text-foreground rounded-sm'
                                : 'h-8 text-foreground rounded-sm'
                            }
                          >
                            {g.name_fa || g.name_en || g.slug}
                          </Button>
                        )
                      })}
                      {genreList.length === 0 && (
                        <div className="text-muted-foreground text-sm">ژانری ثبت نشده</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="episodes">
              <Card>
                <CardHeader>
                  <CardTitle>قسمت‌ها</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="text-foreground text-sm font-semibold">
                    {editingEpisodeId ? 'ویرایش قسمت' : 'افزودن قسمت'}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-muted-foreground text-xs mb-1">شماره قسمت</div>
                      <Input
                        value={String(episodeDraft.episode_number)}
                        onChange={(e) =>
                          setEpisodeDraft((p) => ({
                            ...p,
                            episode_number: Number(e.target.value || 1),
                          }))
                        }
                        placeholder="مثلاً: 1"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-muted-foreground text-xs mb-1">لینک دانلود</div>
                      <Input
                        value={episodeDraft.download_link}
                        onChange={(e) =>
                          setEpisodeDraft((p) => ({ ...p, download_link: e.target.value }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex gap-2 mt-5">
                      {editingEpisodeId ? (
                        <>
                          <Button
                            type="button"
                            onClick={onCancelEditEpisode}
                            disabled={saving}
                            variant="secondary"
                            className="h-10"
                          >
                            انصراف
                          </Button>
                          <Button
                            type="button"
                            onClick={onSaveEpisodeEdit}
                            disabled={saving}
                            className="h-10"
                          >
                            ذخیره تغییرات
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size={'lg'}
                          onClick={onAddEpisode}
                          disabled={saving}
                          variant="secondary"
                          className="h-10"
                        >
                          افزودن
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {episodesForList.map((e) => (
                      <div
                        key={String(e.id)}
                        className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="text-foreground text-sm">
                            قسمت {e.episode_number ?? 0}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {e.download_link || '---'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-fit rounded-sm border border-input"
                            onClick={() => onEditEpisode(e)}
                          >
                            ویرایش
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-fit bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-sm"
                            onClick={() => onDeleteEpisode(e)}
                          >
                            حذف
                          </Button>
                        </div>
                      </div>
                    ))}
                    {episodes.length === 0 && (
                      <div className="text-muted-foreground text-sm">قسمتی ثبت نشده</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subtitles">
              <Card>
                <CardHeader>
                  <CardTitle>زیرنویس‌ها</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-foreground text-sm font-semibold">
                    {editingSubtitleId ? 'ویرایش زیرنویس' : 'افزودن زیرنویس'}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1">
                      <div className="text-muted-foreground text-xs mb-1">شماره قسمت</div>
                      <Input
                        value={String(subtitleDraft.episode_number)}
                        onChange={(e) =>
                          setSubtitleDraft((p) => ({
                            ...p,
                            episode_number: Number(e.target.value || 1),
                          }))
                        }
                        placeholder="مثلاً: 1"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-muted-foreground text-xs mb-1">لینک زیرنویس</div>
                      <Input
                        value={subtitleDraft.subtitle_link}
                        onChange={(e) =>
                          setSubtitleDraft((p) => ({
                            ...p,
                            subtitle_link: e.target.value,
                          }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex mt-5 gap-2">
                      {editingSubtitleId ? (
                        <>
                          <Button
                            type="button"
                            onClick={onCancelEditSubtitle}
                            disabled={saving}
                            variant="secondary"
                            className="h-10"
                          >
                            انصراف
                          </Button>
                          <Button
                            type="button"
                            onClick={onSaveSubtitleEdit}
                            disabled={saving}
                            className="h-10"
                          >
                            ذخیره تغییرات
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={onAddSubtitle}
                          disabled={saving}
                          variant="secondary"
                          className="h-10"
                        >
                          افزودن
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {subtitlesForList.map((s) => (
                      <div
                        key={String(s.id)}
                        className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <div className="text-foreground text-sm">
                            قسمت {s.episode_number ?? 0}
                          </div>
                          <div className="text-muted-foreground text-xs mt-1 line-clamp-1">
                            {s.subtitle_link || '---'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-fit border border-input rounded-sm"
                            onClick={() => onEditSubtitle(s)}
                          >
                            ویرایش
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-fit bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-sm"
                            onClick={() => onDeleteSubtitle(s)}
                          >
                            حذف
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {subtitles.length === 0 && (
                    <div className="text-muted-foreground text-sm">زیرنویسی ثبت نشده</div>
                  )}

                  <div className="mt-6 border-t border-border pt-4">
                    <div className="text-foreground text-sm font-semibold">
                      {editingSubtitlePackId ? 'ویرایش پک زیرنویس' : 'افزودن پک زیرنویس'}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <div className="flex-1">
                        <div className="text-muted-foreground text-xs mb-1">عنوان (اختیاری)</div>
                        <Input
                          value={subtitlePackDraft.title}
                          onChange={(e) =>
                            setSubtitlePackDraft((p) => ({ ...p, title: e.target.value }))
                          }
                          placeholder="مثلاً: پک فصل ۱"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-muted-foreground text-xs mb-1">لینک پک</div>
                        <Input
                          value={subtitlePackDraft.subtitle_link}
                          onChange={(e) =>
                            setSubtitlePackDraft((p) => ({ ...p, subtitle_link: e.target.value }))
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex gap-2 mt-5">
                        {editingSubtitlePackId ? (
                          <>
                            <Button
                              type="button"
                              onClick={onCancelEditSubtitlePack}
                              disabled={saving}
                              variant="secondary"
                              className="h-10"
                            >
                              انصراف
                            </Button>
                            <Button
                              type="button"
                              onClick={onSaveSubtitlePackEdit}
                              disabled={saving}
                              className="h-10"
                            >
                              ذخیره تغییرات
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            onClick={onAddSubtitlePack}
                            disabled={saving}
                            variant="secondary"
                            className="h-10"
                          >
                            افزودن پک
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {subtitlePacks.map((p) => (
                        <div
                          key={String(p.id)}
                          className="p-3 rounded-2xl border border-border bg-muted/30 flex items-center justify-between"
                        >
                          <div className="flex flex-col gap-2">
                            <div className="text-foreground text-sm">{p.title || '---'}</div>
                            <div className="text-muted-foreground text-xs line-clamp-1">
                              {p.subtitle_link || '---'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-fit border border-input rounded-sm"
                              onClick={() => onEditSubtitlePack(p)}
                            >
                              ویرایش
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="w-fit bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-sm"
                              onClick={() => onDeleteSubtitlePack(p)}
                            >
                              حذف
                            </Button>
                          </div>
                        </div>
                      ))}
                      {subtitlePacks.length === 0 && (
                        <div className="text-muted-foreground text-sm">پکی ثبت نشده</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-4 rounded-xl border border-border bg-card p-3">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={onSaveAnime}
                disabled={saving}
                size={'lg'}
                className="px-4 bg-primary-500 text-foreground"
              >
                ذخیره
              </Button>
              <Button asChild variant="secondary" className="border border-input" size={'lg'}>
                <Link to="/admin/anime">بازگشت</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminAnimeEdit
