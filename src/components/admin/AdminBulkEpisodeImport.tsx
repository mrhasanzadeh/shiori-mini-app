import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download01Icon, Search01Icon } from 'hugeicons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import * as filesSvc from '../../services/supabaseFiles'
import * as supa from '../../services/supabaseAnime'
import { buildTelegramFileDownloadLink } from '../../utils/externalLinks'
import { parseEpisodeFileParts } from '../../utils/parseEpisodeFileName'

type RawFile = {
  key: string
  fileName: string
}

type BulkRow = {
  key: string
  fileName: string
  fileSeason: number
  fileEpisode: number | null
  episodeNumber: number | null
  selected: boolean
  isExisting: boolean
  isDuplicateInBatch: boolean
}

export type AdminBulkEpisodeImportProps = {
  animeId: string | number | null
  animeTitle: string
  titleRomaji: string
  existingEpisodes: supa.EpisodeAdminRow[]
  disabled?: boolean
  onError: (message: string) => void
  onSuccess: (message: string) => void
  onEpisodesUpdated: (episodes: supa.EpisodeAdminRow[]) => void
}

const buildInitialQuery = (title: string, romaji: string) => {
  const t = title.trim()
  if (t) return t
  return romaji.trim()
}

const buildRowsFromFiles = (
  files: RawFile[],
  targetSeason: number,
  episodeOffset: number,
  existingNumbers: Set<number>
): BulkRow[] => {
  const mapped = files
    .map((file) => {
      const { season: fileSeason, fileEpisode } = parseEpisodeFileParts(file.fileName)
      const episodeNumber =
        fileEpisode != null ? fileEpisode + Math.max(0, episodeOffset) : null
      const isExisting = episodeNumber != null && existingNumbers.has(episodeNumber)
      const matchesSeason = fileSeason === targetSeason
      return {
        key: file.key,
        fileName: file.fileName,
        fileSeason,
        fileEpisode,
        episodeNumber,
        selected: matchesSeason && episodeNumber != null && !isExisting,
        isExisting,
        isDuplicateInBatch: false,
      }
    })
    .filter((row) => row.fileSeason === targetSeason)

  const sorted = mapped.sort((a, b) => {
    if (a.fileEpisode == null && b.fileEpisode == null) {
      return a.fileName.localeCompare(b.fileName, 'fa')
    }
    if (a.fileEpisode == null) return 1
    if (b.fileEpisode == null) return -1
    return a.fileEpisode - b.fileEpisode
  })

  return markDuplicateInBatch(sorted)
}

const markDuplicateInBatch = (list: BulkRow[]): BulkRow[] => {
  const seen = new Set<number>()
  return list.map((row) => {
    if (row.episodeNumber == null) {
      return { ...row, isDuplicateInBatch: false }
    }
    const dup = seen.has(row.episodeNumber)
    if (!dup) seen.add(row.episodeNumber)
    return { ...row, isDuplicateInBatch: dup }
  })
}

export const AdminBulkEpisodeImport = ({
  animeId,
  animeTitle,
  titleRomaji,
  existingEpisodes,
  disabled,
  onError,
  onSuccess,
  onEpisodesUpdated,
}: AdminBulkEpisodeImportProps) => {
  const [query, setQuery] = useState(() => buildInitialQuery(animeTitle, titleRomaji))
  const [targetSeason, setTargetSeason] = useState(1)
  const [episodeOffset, setEpisodeOffset] = useState(0)
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [rawFiles, setRawFiles] = useState<RawFile[]>([])
  const [rows, setRows] = useState<BulkRow[]>([])

  const existingNumbers = useMemo(
    () =>
      new Set(
        existingEpisodes
          .map((e) => (typeof e.episode_number === 'number' ? e.episode_number : null))
          .filter((n): n is number => n != null && n > 0)
      ),
    [existingEpisodes]
  )

  const maxExistingEpisode = useMemo(() => {
    if (existingNumbers.size === 0) return 0
    return Math.max(...existingNumbers)
  }, [existingNumbers])

  const rebuildRows = useCallback(
    (files: RawFile[], season: number, offset: number) => {
      setRows(buildRowsFromFiles(files, season, offset, existingNumbers))
    },
    [existingNumbers]
  )

  useEffect(() => {
    if (rawFiles.length > 0) {
      rebuildRows(rawFiles, targetSeason, episodeOffset)
    }
  }, [rawFiles, targetSeason, episodeOffset, rebuildRows])

  const onSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      onError('عبارت جستجو را وارد کن')
      return
    }

    const extraTerms = [animeTitle.trim(), titleRomaji.trim()].filter(
      (term, idx, arr) => term && term !== q && arr.indexOf(term) === idx
    )

    try {
      setSearching(true)
      const files = await filesSvc.searchFilesForPicker({
        query: q,
        matchAnyTerms: extraTerms,
        limit: 150,
        activeOnly: true,
        fileExtension: 'mkv',
      })

      const mapped: RawFile[] = files.map((file) => ({
        key: file.key,
        fileName: String(file.file_name ?? file.key ?? '').trim() || file.key,
      }))

      setRawFiles(mapped)
      rebuildRows(mapped, targetSeason, episodeOffset)

      const visible = buildRowsFromFiles(mapped, targetSeason, episodeOffset, existingNumbers)
      if (visible.length === 0) {
        if (mapped.length === 0) {
          onError('فایلی پیدا نشد. عبارت جستجو را عوض کن یا مطمئن شو فایل MKV در جدول files ثبت شده.')
        } else {
          onError(
            `برای فصل ${targetSeason.toLocaleString('fa-IR')} فایلی پیدا نشد. ` +
              (targetSeason === 1
                ? 'فصل ۱ معمولاً بدون S2/S3 در نام است.'
                : `فایل‌ها باید S${targetSeason} در نام داشته باشند.`)
          )
        }
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'خطا در جستجوی فایل‌ها')
    } finally {
      setSearching(false)
    }
  }, [
    animeTitle,
    episodeOffset,
    existingNumbers,
    onError,
    query,
    rebuildRows,
    targetSeason,
    titleRomaji,
  ])

  const applySeason = (season: number) => {
    setTargetSeason(season)
    if (rawFiles.length > 0) {
      rebuildRows(rawFiles, season, episodeOffset)
    }
  }

  const applyOffset = (offset: number) => {
    const safe = Math.max(0, Math.floor(offset))
    setEpisodeOffset(safe)
    if (rawFiles.length > 0) {
      rebuildRows(rawFiles, targetSeason, safe)
    }
  }

  const selectedRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.selected &&
          row.episodeNumber != null &&
          row.episodeNumber > 0 &&
          !row.isExisting &&
          !row.isDuplicateInBatch
      ),
    [rows]
  )

  const toggleRow = (key: string, selected: boolean) => {
    setRows((prev) =>
      markDuplicateInBatch(
        prev.map((row) => (row.key === key ? { ...row, selected } : row))
      )
    )
  }

  const setEpisodeNumber = (key: string, value: string) => {
    const n = Number(value)
    const episodeNumber = Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    setRows((prev) =>
      markDuplicateInBatch(
        prev.map((row) => {
          if (row.key !== key) return row
          const isExisting = episodeNumber != null && existingNumbers.has(episodeNumber)
          return {
            ...row,
            episodeNumber,
            isExisting,
            selected: row.selected && episodeNumber != null && !isExisting,
          }
        })
      )
    )
  }

  const selectAllDetected = () => {
    setRows((prev) => {
      const next = prev.map((row) => ({
        ...row,
        selected: row.episodeNumber != null && !row.isExisting,
      }))
      const marked = markDuplicateInBatch(next)
      return marked.map((row) => ({
        ...row,
        selected: row.selected && !row.isDuplicateInBatch,
      }))
    })
  }

  const deselectAll = () => {
    setRows((prev) => prev.map((row) => ({ ...row, selected: false })))
  }

  const onImport = async () => {
    if (!animeId) {
      onError('اول انیمه را ذخیره کن')
      return
    }
    if (selectedRows.length === 0) {
      onError('حداقل یک قسمت با شماره معتبر انتخاب کن')
      return
    }

    const payload = selectedRows
      .map((row) => {
        const download_link = buildTelegramFileDownloadLink(row.key)
        if (!download_link || row.episodeNumber == null) return null
        return { episode_number: row.episodeNumber, download_link, title: row.fileName.trim() || null }
      })
      .filter(
        (row): row is { episode_number: number; download_link: string; title: string | null } =>
          row != null
      )

    if (payload.length === 0) {
      onError('لینک دانلود برای فایل‌های انتخاب‌شده ساخته نشد')
      return
    }

    try {
      setImporting(true)
      const result = await supa.insertEpisodesAdminBatch(animeId, payload)
      const eps = await supa.getEpisodesAdminByAnimeId(animeId)
      onEpisodesUpdated(eps)

      const parts: string[] = []
      if (result.inserted > 0) {
        parts.push(`${result.inserted.toLocaleString('fa-IR')} قسمت اضافه شد`)
      }
      if (result.skipped > 0) {
        parts.push(`${result.skipped.toLocaleString('fa-IR')} تکراری رد شد`)
      }
      if (result.errors.length > 0) {
        onError(result.errors.slice(0, 3).join(' · ') + (result.errors.length > 3 ? ' …' : ''))
      }
      if (parts.length > 0) {
        onSuccess(parts.join(' · '))
      }

      setRows((prev) =>
        markDuplicateInBatch(
          prev.map((row) => {
            const added = payload.some((p) => p.episode_number === row.episodeNumber)
            if (!added) return row
            return { ...row, selected: false, isExisting: true }
          })
        )
      )
    } catch (e) {
      onError(e instanceof Error ? e.message : 'خطا در افزودن گروهی')
    } finally {
      setImporting(false)
    }
  }

  const busy = disabled || searching || importing

  return (
    <section className="rounded-xl border border-border bg-card/60 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/80">
        <div>
          <h2 className="text-sm font-semibold text-foreground">افزودن گروهی قسمت‌ها</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-5">
            فصل ۱ بدون S2/S3 در نام؛ فصل‌های بعدی مثل{' '}
            <span dir="ltr" className="font-mono text-[11px]">
              Anime S2 - 01
            </span>
            . فقط فایل‌های فصل انتخاب‌شده نشان داده می‌شوند.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">فصل</label>
            <Input
              value={String(targetSeason)}
              onChange={(e) => {
                const n = Number(e.target.value)
                applySeason(Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1)
              }}
              inputMode="numeric"
              disabled={busy}
              className="h-10"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">آفست شماره قسمت</label>
            <div className="flex gap-2">
              <Input
                value={String(episodeOffset)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  applyOffset(Number.isFinite(n) ? n : 0)
                }}
                inputMode="numeric"
                disabled={busy}
                className="h-10"
              />
              {maxExistingEpisode > 0 && targetSeason > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 text-xs px-2"
                  disabled={busy}
                  onClick={() => applyOffset(maxExistingEpisode)}
                  title={`آخرین قسمت ثبت‌شده: ${maxExistingEpisode}`}
                >
                  از {maxExistingEpisode.toLocaleString('fa-IR')}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-4">
              {targetSeason === 1
                ? 'فصل ۱: آفست ۰ — « - 01 » همان قسمت ۱ می‌شود.'
                : 'فصل ۲+: آفست = آخرین قسمت فصل قبل. مثلاً فصل ۱ تا ۲۴ → آفست ۲۴ → S2 - 01 = قسمت ۲۵.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">جستجو در فایل‌ها</label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="نام انیمه (همه فصل‌ها برمی‌گردند؛ فیلتر با فیلد بالا)"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onSearch()
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-10 gap-1.5 shrink-0"
            disabled={busy}
            onClick={() => void onSearch()}
          >
            <Search01Icon className="w-4 h-4" />
            {searching ? 'در حال جستجو…' : 'جستجو'}
          </Button>
        </div>

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                فصل {targetSeason.toLocaleString('fa-IR')} · {rows.length.toLocaleString('fa-IR')}{' '}
                فایل · {selectedRows.length.toLocaleString('fa-IR')} انتخاب‌شده
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                disabled={busy}
                onClick={selectAllDetected}
              >
                انتخاب همهٔ شناسایی‌شده
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                disabled={busy}
                onClick={deselectAll}
              >
                لغو انتخاب
              </Button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-border/80 divide-y divide-border/60">
              {rows.map((row) => {
                const canSelect =
                  row.episodeNumber != null && !row.isExisting && !row.isDuplicateInBatch
                return (
                  <label
                    key={row.key}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2.5 text-start cursor-pointer hover:bg-muted/30',
                      !canSelect && 'opacity-70'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
                      checked={row.selected && canSelect}
                      disabled={busy || !canSelect}
                      onChange={(e) => toggleRow(row.key, e.target.checked)}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm text-foreground truncate" title={row.fileName}>
                        {row.fileName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {row.fileEpisode != null && (
                          <span className="text-muted-foreground">
                            فایل: {row.fileEpisode.toLocaleString('fa-IR')}
                            {episodeOffset > 0 && (
                              <>
                                {' '}
                                → ثبت: {row.episodeNumber?.toLocaleString('fa-IR')}
                              </>
                            )}
                          </span>
                        )}
                        <span className="text-muted-foreground">شماره ثبت:</span>
                        <Input
                          value={row.episodeNumber != null ? String(row.episodeNumber) : ''}
                          onChange={(e) => setEpisodeNumber(row.key, e.target.value)}
                          placeholder="?"
                          inputMode="numeric"
                          disabled={busy}
                          className="h-7 w-16 px-2 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {row.isExisting && (
                          <span className="text-amber-400/90">قبلاً ثبت شده</span>
                        )}
                        {row.isDuplicateInBatch && (
                          <span className="text-amber-400/90">شماره تکراری در لیست</span>
                        )}
                        {row.fileEpisode == null && (
                          <span className="text-muted-foreground">شماره تشخیص داده نشد — دستی وارد کن</span>
                        )}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>

            <Button
              type="button"
              className="gap-1.5"
              disabled={busy || selectedRows.length === 0}
              onClick={() => void onImport()}
            >
              <Download01Icon className="w-4 h-4" />
              {importing
                ? 'در حال افزودن…'
                : `افزودن ${selectedRows.length.toLocaleString('fa-IR')} قسمت`}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
