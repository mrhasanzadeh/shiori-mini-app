export type HardsubLanguage = 'fa' | 'en'

type SubtitleSource = {
  subtitle_link?: string | null
}

/**
 * If any soft subtitle was uploaded (per-episode, subtitles table, or pack),
 * treat hardsubs as Persian. Otherwise default to English-only releases.
 */
export function resolveHardsubLanguage(input: {
  episodes?: SubtitleSource[]
  subtitle_packs?: SubtitleSource[]
  subtitles?: SubtitleSource[]
}): HardsubLanguage {
  const hasLink = (rows: SubtitleSource[] | undefined) =>
    (rows ?? []).some((row) => String(row.subtitle_link ?? '').trim())

  return hasLink(input.subtitle_packs) ||
    hasLink(input.episodes) ||
    hasLink(input.subtitles)
    ? 'fa'
    : 'en'
}

export function hardsubLanguageLabel(language: HardsubLanguage): string {
  return language === 'fa' ? 'زیرنویس چسبیده فارسی' : 'زیرنویس چسبیده انگلیسی'
}
