import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as supa from '../services/supabaseAnime'
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
  featured_image: string
  cover_image: string
  is_featured: boolean
  average_score: string
  episodes_count: string
  studio: string
  start_date: string
  end_date: string
  has_special_season: boolean
  special_season_insert_after: string
}

type EpisodeDraft = {
  season_number: number
  episode_number: number
  download_link: string
}

type SubtitleDraft = {
  season_number: number
  episode_number: number
  subtitle_link: string
}

type SubtitlePackDraft = {
  season_number: number
  title: string
  subtitle_link: string
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
    featured_image: '',
    cover_image: '',
    is_featured: false,
    average_score: '',
    episodes_count: '',
    studio: '',
    start_date: '',
    end_date: '',
    has_special_season: false,
    special_season_insert_after: '',
  })

  const [episodes, setEpisodes] = useState<supa.EpisodeAdminRow[]>([])
  const [subtitles, setSubtitles] = useState<supa.SubtitleAdminRow[]>([])
  const [subtitlePacks, setSubtitlePacks] = useState<supa.SubtitlePackItem[]>([])

  const [editingEpisodeId, setEditingEpisodeId] = useState<string | number | null>(null)
  const [editingSubtitleId, setEditingSubtitleId] = useState<string | number | null>(null)
  const [editingSubtitlePackId, setEditingSubtitlePackId] = useState<string | number | null>(null)

  const [episodeDraft, setEpisodeDraft] = useState<EpisodeDraft>({
    season_number: 1,
    episode_number: 1,
    download_link: '',
  })

  const [subtitleDraft, setSubtitleDraft] = useState<SubtitleDraft>({
    season_number: 1,
    episode_number: 1,
    subtitle_link: '',
  })

  const [subtitlePackDraft, setSubtitlePackDraft] = useState<SubtitlePackDraft>({
    season_number: 1,
    title: '',
    subtitle_link: '',
  })

  const [seasonsCount, setSeasonsCount] = useState<string>('')

  const EMPTY_SELECT_VALUE = '__EMPTY__'

  const formatOptions = useMemo(() => ['TV', 'MOVIE', 'ONA', 'ONA (CHINESE)', 'OVA', 'SPECIAL'], [])
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

  const seasonNumberToSelectValue = (n: number): string =>
    n === 0 ? 'SPECIAL' : n === -1 ? 'OVA' : String(n)

  const parseSeasonSelectValue = (value: string): number => {
    const v = String(value || '')
      .trim()
      .toUpperCase()
    if (v === 'SPECIAL') return 0
    if (v === 'OVA') return -1
    const num = Number(v)
    if (Number.isNaN(num)) return 1
    return num
  }

  const seasonsCountNumber = useMemo(() => {
    const n = Number(String(seasonsCount || '').trim())
    if (Number.isNaN(n) || n <= 0) return 0
    return Math.floor(n)
  }, [seasonsCount])

  const seasonNumberLabel = (n: number): string =>
    n === 0 ? 'Special' : n === -1 ? 'OVA' : `فصل ${String(n)}`

  const orderedSeasonsForList = useMemo(() => {
    const inferredMaxSeason = Math.max(
      0,
      ...episodes
        .map((e) => (typeof e.season_number === 'number' ? e.season_number : 1))
        .filter((s) => s > 0)
    )
    const baseCount = Math.max(seasonsCountNumber, inferredMaxSeason)
    const base = Array.from({ length: baseCount }, (_, i) => i + 1)
    const hasSpecialInEpisodes = episodes.some(
      (e) => (typeof e.season_number === 'number' ? e.season_number : 1) === 0
    )
    const hasOvaInEpisodes = episodes.some(
      (e) => (typeof e.season_number === 'number' ? e.season_number : 1) === -1
    )

    const extras: number[] = []
    if (Boolean(draft.has_special_season) || hasSpecialInEpisodes) extras.push(0)
    if (hasOvaInEpisodes) extras.push(-1)

    if (extras.length === 0) return base

    const insertAfter = draft.special_season_insert_after.trim()
      ? Number(draft.special_season_insert_after)
      : null

    const order = base.slice()
    if (insertAfter === null || Number.isNaN(insertAfter)) {
      order.push(...extras)
      return order
    }
    const idx = order.indexOf(insertAfter)
    if (idx >= 0) order.splice(idx + 1, 0, ...extras)
    else order.push(...extras)
    return order
  }, [draft.has_special_season, draft.special_season_insert_after, episodes, seasonsCountNumber])

  const hasExtraSeasonForUi = useMemo(() => {
    const hasSpecialInEpisodes = episodes.some(
      (e) => (typeof e.season_number === 'number' ? e.season_number : 1) === 0
    )
    const hasOvaInEpisodes = episodes.some(
      (e) => (typeof e.season_number === 'number' ? e.season_number : 1) === -1
    )
    return Boolean(draft.has_special_season) || hasSpecialInEpisodes || hasOvaInEpisodes
  }, [draft.has_special_season, episodes])

  const seasonRankForList = useMemo(() => {
    const rank = new Map<number, number>()
    orderedSeasonsForList.forEach((s, idx) => rank.set(s, idx))
    return rank
  }, [orderedSeasonsForList])

  const episodesForList = useMemo(() => {
    return episodes.slice().sort((a, b) => {
      const sa = typeof a.season_number === 'number' ? a.season_number : 1
      const sb = typeof b.season_number === 'number' ? b.season_number : 1
      const ra = seasonRankForList.get(sa) ?? Number.MAX_SAFE_INTEGER
      const rb = seasonRankForList.get(sb) ?? Number.MAX_SAFE_INTEGER
      if (ra !== rb) return ra - rb
      const ea = typeof a.episode_number === 'number' ? a.episode_number : 0
      const eb = typeof b.episode_number === 'number' ? b.episode_number : 0
      if (ea !== eb) return ea - eb
      return String(a.id).localeCompare(String(b.id))
    })
  }, [episodes, seasonRankForList])

  const subtitlesForList = useMemo(() => {
    return subtitles.slice().sort((a, b) => {
      const sa = typeof a.season_number === 'number' ? a.season_number : 1
      const sb = typeof b.season_number === 'number' ? b.season_number : 1
      const ra = seasonRankForList.get(sa) ?? Number.MAX_SAFE_INTEGER
      const rb = seasonRankForList.get(sb) ?? Number.MAX_SAFE_INTEGER
      if (ra !== rb) return ra - rb
      const ea = typeof a.episode_number === 'number' ? a.episode_number : 0
      const eb = typeof b.episode_number === 'number' ? b.episode_number : 0
      if (ea !== eb) return ea - eb
      return String(a.id).localeCompare(String(b.id))
    })
  }, [seasonRankForList, subtitles])

  const nextEpisodeNumberBySeason = useMemo(() => {
    const map = new Map<number, number>()
    for (const e of episodes) {
      const s = typeof e.season_number === 'number' ? e.season_number : 1
      const ep = typeof e.episode_number === 'number' ? e.episode_number : 0
      const prev = map.get(s) ?? 0
      if (ep > prev) map.set(s, ep)
    }
    return map
  }, [episodes])

  const getNextEpisodeNumberForSeason = (seasonNumber: number): number => {
    const max = nextEpisodeNumberBySeason.get(seasonNumber) ?? 0
    return Math.max(1, max + 1)
  }

  const onEditEpisode = (row: supa.EpisodeAdminRow) => {
    setEditingEpisodeId(row.id)
    setEpisodeDraft({
      season_number: typeof row.season_number === 'number' ? row.season_number : 1,
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
        season_number: episodeDraft.season_number,
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
        const suggested = getNextEpisodeNumberForSeason(episodeDraft.season_number)
        showError(`شماره قسمت تکراری است. پیشنهاد: قسمت ${suggested}`)
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
      season_number: typeof row.season_number === 'number' ? row.season_number : 1,
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
        season_number: subtitlePackDraft.season_number,
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
      season_number: typeof row.season_number === 'number' ? row.season_number : 1,
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
        season_number: subtitleDraft.season_number,
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
        season_number: subtitlePackDraft.season_number,
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
    const [g, studios, a, eps, subs, packs, aGenres, aStudios] = await Promise.all([
      supa.getAllGenres(),
      supa.getAllStudiosAdmin(),
      supa.getAnimeAdminById(animeId),
      supa.getEpisodesAdminByAnimeId(animeId),
      supa.getSubtitlesAdminByAnimeId(animeId),
      supa.getSubtitlePacksByAnimeId(animeId),
      supa.getAnimeGenreSlugs(animeId),
      supa.getAnimeStudioSlugsAdmin(animeId),
    ])

    setAllGenres(g)
    setAllStudios(studios)
    setAnime(a)
    setEpisodes(eps)
    setSubtitles(subs)
    setSubtitlePacks(packs)
    setSelectedGenreSlugs(new Set(aGenres))
    setSelectedStudioSlugs(new Set(aStudios))

    const inferredSeasonsCount = Math.max(
      0,
      ...eps
        .map((x) => (typeof x.season_number === 'number' ? x.season_number : 1))
        .filter((x) => x > 0)
    )
    setSeasonsCount(inferredSeasonsCount ? String(inferredSeasonsCount) : '')

    setDraft({
      id: a.id,
      title: a.title ?? '',
      synopsis: a.synopsis ?? '',
      format: a.format ?? 'TV',
      airing_status: a.airing_status ?? '',
      season: a.season ?? '',
      year: typeof a.year === 'number' ? String(a.year) : '',
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
      has_special_season: Boolean(a.has_special_season),
      special_season_insert_after:
        typeof a.special_season_insert_after === 'number'
          ? String(a.special_season_insert_after)
          : '',
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

      const hasSpecialByData = episodes.some(
        (e) => (typeof e.season_number === 'number' ? e.season_number : 1) === 0
      )
      const hasOvaByData = episodes.some(
        (e) => (typeof e.season_number === 'number' ? e.season_number : 1) === -1
      )
      const hasExtraSeason = Boolean(draft.has_special_season) || hasSpecialByData || hasOvaByData

      const upserted = await supa.upsertAnimeAdmin({
        id: isNew ? undefined : draft.id,
        title: draft.title.trim(),
        synopsis: draft.synopsis.trim() || null,
        format: draft.format.trim() || null,
        season: draft.season.trim() || null,
        year: draft.year.trim() ? Number(draft.year) : null,
        featured_image: draft.featured_image.trim() || null,
        cover_image: draft.cover_image.trim() || null,
        is_featured: Boolean(draft.is_featured),
        airing_status: draft.airing_status.trim() || null,
        average_score: draft.average_score.trim() ? Number(draft.average_score) : null,
        episodes_count: draft.episodes_count.trim() ? Number(draft.episodes_count) : null,
        studio: draft.studio.trim() || null,
        start_date: draft.start_date.trim() || null,
        end_date: draft.end_date.trim() || null,
        has_special_season: hasExtraSeason,
        special_season_insert_after: hasExtraSeason
          ? draft.special_season_insert_after.trim()
            ? Number(draft.special_season_insert_after)
            : null
          : null,
      })

      const animeId = upserted.id
      await supa.replaceAnimeGenres(animeId, Array.from(selectedGenreSlugs))
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
        (typeof e.season_number === 'number' ? e.season_number : 1) ===
          episodeDraft.season_number &&
        (typeof e.episode_number === 'number' ? e.episode_number : 0) ===
          episodeDraft.episode_number
    )
    if (exists) {
      const suggested = getNextEpisodeNumberForSeason(episodeDraft.season_number)
      setEpisodeDraft((p) => ({ ...p, episode_number: suggested }))
      showError(`این شماره قسمت برای این فصل قبلاً ثبت شده. پیشنهاد: قسمت ${suggested}`)
      return
    }

    try {
      setSaving(true)
      setToast(null)
      await supa.insertEpisodeAdmin({
        anime_id: animeId,
        season_number: episodeDraft.season_number,
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
        const suggested = getNextEpisodeNumberForSeason(episodeDraft.season_number)
        setEpisodeDraft((p) => ({ ...p, episode_number: suggested }))
        showError(`این شماره قسمت برای این فصل قبلاً ثبت شده. پیشنهاد: قسمت ${suggested}`)
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
        season_number: subtitleDraft.season_number,
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
        <div className="fixed top-20 left-0 right-0 z-[60] px-4">
          <div className="max-w-xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 flex items-start justify-between gap-3">
            <div className="text-red-200 text-sm leading-6">{toast}</div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setToast(null)}>
              بستن
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-white text-lg font-bold">{isNew ? 'افزودن انیمه' : 'ویرایش انیمه'}</h1>
      </div>

      {loading ? (
        <div className="mt-6 text-gray-400 text-sm">در حال بارگذاری...</div>
      ) : (
        <>
          <Tabs defaultValue="main" dir="rtl" className="mt-6">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="main">اطلاعات</TabsTrigger>
              <TabsTrigger value="relations">روابط</TabsTrigger>
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
                    <div className="text-gray-300 text-xs mb-1">عنوان</div>
                    <Input
                      value={draft.title}
                      onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="مثلاً: Attack on Titan"
                    />
                  </div>

                  <div>
                    <div className="text-gray-300 text-xs mb-1">خلاصه داستان</div>
                    <Textarea
                      value={draft.synopsis}
                      onChange={(e) => setDraft((p) => ({ ...p, synopsis: e.target.value }))}
                      placeholder="خلاصه داستان..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-gray-300 text-xs mb-1">نوع انیمه</div>
                      <Select
                        value={draft.format}
                        onValueChange={(v) => setDraft((p) => ({ ...p, format: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب..." />
                        </SelectTrigger>
                        <SelectContent>
                          {formatOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-gray-300 text-xs mb-1">وضعیت پخش</div>
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
                      <div className="text-gray-300 text-xs mb-1">سال انتشار</div>
                      <Input
                        value={draft.year}
                        onChange={(e) => setDraft((p) => ({ ...p, year: e.target.value }))}
                        placeholder="مثلاً: 2023"
                      />
                    </div>
                    <div>
                      <div className="text-gray-300 text-xs mb-1">فصل انتشار</div>
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
                      <div className="text-gray-300 text-xs mb-1">تاریخ شروع</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {draft.start_date ? draft.start_date : 'انتخاب تاریخ...'}
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
                      <div className="text-gray-300 text-xs mb-1">تاریخ پایان</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {draft.end_date ? draft.end_date : 'انتخاب تاریخ...'}
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
                    <div className="text-gray-300 text-xs mb-1">کاور (URL)</div>
                    <Input
                      value={draft.cover_image}
                      onChange={(e) => setDraft((p) => ({ ...p, cover_image: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <div className="text-gray-300 text-xs mb-1">تصویر ویژه (URL)</div>
                    <Input
                      value={draft.featured_image}
                      onChange={(e) => setDraft((p) => ({ ...p, featured_image: e.target.value }))}
                      placeholder="https://..."
                    />
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
                    <div className="text-white text-sm font-semibold">استودیوها</div>
                    <div className="text-gray-400 text-xs mt-2">
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
                                ? 'h-8 bg-primary-500/30 border border-primary-400/40'
                                : 'h-8 text-gray-200'
                            }
                          >
                            {s.name || s.slug}
                          </Button>
                        )
                      })}
                      {allStudios.length === 0 && (
                        <div className="text-gray-400 text-sm">استودیویی ثبت نشده</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-white text-sm font-semibold">ژانرها</div>
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
                                ? 'h-8 bg-primary-500/30 border border-primary-400/40'
                                : 'h-8 text-gray-200'
                            }
                          >
                            {g.name_fa || g.name_en || g.slug}
                          </Button>
                        )
                      })}
                      {genreList.length === 0 && (
                        <div className="text-gray-400 text-sm">ژانری ثبت نشده</div>
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
                  <div>
                    <div className="text-gray-300 text-xs mb-1">تعداد فصل‌ها</div>
                    <Input
                      value={seasonsCount}
                      onChange={(e) => setSeasonsCount(e.target.value)}
                      placeholder="مثلاً: 3"
                    />
                  </div>
                  <div className="rounded-md border border-white/10 bg-gray-950/20 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-white text-sm">دارای Special/OVA</Label>
                      <Switch
                        checked={Boolean(draft.has_special_season)}
                        onCheckedChange={(v) =>
                          setDraft((p) => ({
                            ...p,
                            has_special_season: Boolean(v),
                            special_season_insert_after: p.special_season_insert_after,
                          }))
                        }
                      />
                    </div>

                    {hasExtraSeasonForUi && (
                      <div className="mt-3">
                        <div className="text-gray-300 text-xs mb-1">جایگاه تب Special/OVA</div>
                        <Select
                          value={draft.special_season_insert_after || EMPTY_SELECT_VALUE}
                          onValueChange={(v) =>
                            setDraft((p) => ({
                              ...p,
                              special_season_insert_after: v === EMPTY_SELECT_VALUE ? '' : v,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EMPTY_SELECT_VALUE}>آخر لیست</SelectItem>
                            {Array.from({ length: seasonsCountNumber }, (_, i) => i + 1).map(
                              (s) => (
                                <SelectItem key={String(s)} value={String(s)}>
                                  بعد از فصل {String(s)}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="text-white text-sm font-semibold">
                    {editingEpisodeId ? 'ویرایش قسمت' : 'افزودن قسمت'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-gray-300 text-xs mb-1">شماره فصل</div>
                      <Select
                        value={seasonNumberToSelectValue(episodeDraft.season_number)}
                        onValueChange={(v) =>
                          setEpisodeDraft((p) => {
                            const nextSeason = parseSeasonSelectValue(v)

                            if (nextSeason > 0) {
                              const currentCount = seasonsCountNumber
                              if (nextSeason > currentCount) setSeasonsCount(String(nextSeason))
                            }

                            const nextEpisodeNumber = editingEpisodeId
                              ? p.episode_number
                              : getNextEpisodeNumberForSeason(nextSeason)

                            return {
                              ...p,
                              season_number: nextSeason,
                              episode_number: nextEpisodeNumber,
                            }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: seasonsCountNumber }, (_, i) => i + 1).map((s) => (
                            <SelectItem key={String(s)} value={String(s)}>
                              فصل {String(s)}
                            </SelectItem>
                          ))}
                          <SelectItem value="SPECIAL">Special</SelectItem>
                          <SelectItem value="OVA">OVA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-gray-300 text-xs mb-1">شماره قسمت</div>
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
                  </div>
                  <div className="mt-2">
                    <div className="text-gray-300 text-xs mb-1">لینک دانلود (اختیاری)</div>
                    <Input
                      value={episodeDraft.download_link}
                      onChange={(e) =>
                        setEpisodeDraft((p) => ({ ...p, download_link: e.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {editingEpisodeId ? (
                      <>
                        <Button
                          type="button"
                          onClick={onCancelEditEpisode}
                          disabled={saving}
                          variant="secondary"
                          className="w-full"
                        >
                          انصراف
                        </Button>
                        <Button
                          type="button"
                          onClick={onSaveEpisodeEdit}
                          disabled={saving}
                          className="w-full"
                        >
                          ذخیره تغییرات
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={onAddEpisode}
                        disabled={saving}
                        variant="secondary"
                        className="w-full sm:col-span-2"
                      >
                        افزودن
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {episodesForList.map((e) => (
                      <div
                        key={String(e.id)}
                        className="p-3 rounded-xl border border-white/10 bg-gray-950/20 flex items-center justify-between"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="text-white text-sm">
                            {seasonNumberLabel(
                              typeof e.season_number === 'number' ? e.season_number : 1
                            )}{' '}
                            - قسمت {e.episode_number ?? 0}
                          </div>
                          <div className="text-gray-400 text-xs">{e.download_link || '---'}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-fit border border-white/20 bg-gray-800/20 text-white/80 hover:bg-gray-800/40"
                            onClick={() => onEditEpisode(e)}
                          >
                            ویرایش
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-fit bg-red-500/20 text-red-500 hover:bg-red-500/30"
                            onClick={() => onDeleteEpisode(e)}
                          >
                            حذف
                          </Button>
                        </div>
                      </div>
                    ))}
                    {episodes.length === 0 && (
                      <div className="text-gray-400 text-sm">قسمتی ثبت نشده</div>
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
                  <div className="text-white text-sm font-semibold">
                    {editingSubtitleId ? 'ویرایش زیرنویس' : 'افزودن زیرنویس'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    <div>
                      <div className="text-gray-300 text-xs mb-1">شماره فصل</div>
                      <Select
                        value={seasonNumberToSelectValue(subtitleDraft.season_number)}
                        onValueChange={(v) =>
                          setSubtitleDraft((p) => ({
                            ...p,
                            season_number: parseSeasonSelectValue(v),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: seasonsCountNumber }, (_, i) => i + 1).map((s) => (
                            <SelectItem key={String(s)} value={String(s)}>
                              فصل {String(s)}
                            </SelectItem>
                          ))}
                          <SelectItem value="SPECIAL">Special</SelectItem>
                          <SelectItem value="OVA">OVA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-gray-300 text-xs mb-1">شماره قسمت</div>
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
                  </div>
                  <div className="mt-2">
                    <div className="text-gray-300 text-xs mb-1">لینک زیرنویس</div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {editingSubtitleId ? (
                      <>
                        <Button
                          type="button"
                          onClick={onCancelEditSubtitle}
                          disabled={saving}
                          variant="secondary"
                        >
                          انصراف
                        </Button>
                        <Button type="button" onClick={onSaveSubtitleEdit} disabled={saving}>
                          ذخیره تغییرات
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={onAddSubtitle}
                        disabled={saving}
                        variant="secondary"
                        className="w-full sm:col-span-2"
                      >
                        افزودن
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    {subtitlesForList.map((s) => (
                      <div
                        key={String(s.id)}
                        className="p-3 rounded-2xl border border-white/10 bg-gray-950/20 flex items-center justify-between"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="text-white text-sm">
                            {seasonNumberLabel(
                              typeof s.season_number === 'number' ? s.season_number : 1
                            )}{' '}
                            - E{s.episode_number ?? 0}
                          </div>
                          <div className="text-gray-400 text-xs mt-1 line-clamp-1">
                            {s.subtitle_link || '---'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full border border-white/20 bg-gray-800/20 text-white/80 hover:bg-gray-800/40"
                            onClick={() => onEditSubtitle(s)}
                          >
                            ویرایش
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-full bg-red-500/20 text-red-500 hover:bg-red-500/30"
                            onClick={() => onDeleteSubtitle(s)}
                          >
                            حذف
                          </Button>
                        </div>
                      </div>
                    ))}
                    {subtitles.length === 0 && (
                      <div className="text-gray-400 text-sm">زیرنویسی ثبت نشده</div>
                    )}
                  </div>

                  <div className="mt-6 border-t border-white/10 pt-4">
                    <div className="text-white text-sm font-semibold">
                      {editingSubtitlePackId ? 'ویرایش پک زیرنویس' : 'افزودن پک زیرنویس'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <div>
                        <div className="text-gray-300 text-xs mb-1">شماره فصل</div>
                        <Select
                          value={seasonNumberToSelectValue(subtitlePackDraft.season_number)}
                          onValueChange={(v) =>
                            setSubtitlePackDraft((p) => ({
                              ...p,
                              season_number: parseSeasonSelectValue(v),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: seasonsCountNumber }, (_, i) => i + 1).map(
                              (s) => (
                                <SelectItem key={String(s)} value={String(s)}>
                                  فصل {String(s)}
                                </SelectItem>
                              )
                            )}
                            <SelectItem value="SPECIAL">Special</SelectItem>
                            <SelectItem value="OVA">OVA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="text-gray-300 text-xs mb-1">عنوان (اختیاری)</div>
                        <Input
                          value={subtitlePackDraft.title}
                          onChange={(e) =>
                            setSubtitlePackDraft((p) => ({ ...p, title: e.target.value }))
                          }
                          placeholder="مثلاً: پک فصل ۱"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-gray-300 text-xs mb-1">لینک پک</div>
                      <Input
                        value={subtitlePackDraft.subtitle_link}
                        onChange={(e) =>
                          setSubtitlePackDraft((p) => ({ ...p, subtitle_link: e.target.value }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {editingSubtitlePackId ? (
                        <>
                          <Button
                            type="button"
                            onClick={onCancelEditSubtitlePack}
                            disabled={saving}
                            variant="secondary"
                            className="w-full"
                          >
                            انصراف
                          </Button>
                          <Button
                            type="button"
                            onClick={onSaveSubtitlePackEdit}
                            disabled={saving}
                            className="w-full"
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
                          className="w-full sm:col-span-2"
                        >
                          افزودن پک
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      {subtitlePacks.map((p) => (
                        <div
                          key={String(p.id)}
                          className="p-3 rounded-2xl border border-white/10 bg-gray-950/20 flex items-center justify-between"
                        >
                          <div className="flex flex-col gap-2">
                            <div className="text-white text-sm">{p.title || '---'}</div>
                            <div className="text-gray-400 text-xs line-clamp-1">
                              {p.subtitle_link || '---'}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-full border border-white/20 bg-gray-800/20 text-white/80 hover:bg-gray-800/40"
                              onClick={() => onEditSubtitlePack(p)}
                            >
                              ویرایش
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="w-full bg-red-500/20 text-red-500 hover:bg-red-500/30"
                              onClick={() => onDeleteSubtitlePack(p)}
                            >
                              حذف
                            </Button>
                          </div>
                        </div>
                      ))}
                      {subtitlePacks.length === 0 && (
                        <div className="text-gray-400 text-sm">پکی ثبت نشده</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex gap-3">
              <Button type="button" onClick={onSaveAnime} disabled={saving} className="w-fit px-6">
                ذخیره
              </Button>
              <Button
                asChild
                variant="secondary"
                className="w-fit px-6 border border-white/20 bg-gray-800/20 hover:bg-gray-800/40"
              >
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
