const stripExtension = (fileName: string) =>
  String(fileName ?? '')
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, '')

const inEpisodeRange = (n: number) => n >= 1 && n <= 999

/** فصل از نام فایل — بدون S2/S3 → فصل ۱؛ مثل Jujutsu Kaisen S2 - 01 → ۲ */
export const parseSeasonFromFileName = (fileName: string): number => {
  const name = stripExtension(fileName)

  const sxe = name.match(/\bS(\d{1,2})[\s._-]*E(\d{1,3})\b/i)
  if (sxe) {
    const season = Number(sxe[1])
    if (season >= 1 && season <= 99) return season
  }

  // S2 / S3 قبل از « - 01 » — الگوی رایج شما
  const beforeDash = name.match(/\bS(\d{1,2})\b(?=[\s._-]*-[\s._-]*\d)/i)
  if (beforeDash) {
    const season = Number(beforeDash[1])
    if (season >= 1 && season <= 99) return season
  }

  const loose = name.match(/\bS(\d{1,2})\b/i)
  if (loose) {
    const season = Number(loose[1])
    if (season >= 1 && season <= 20) return season
  }

  return 1
}

/** شماره قسمت داخل فصل (نه شماره نهایی دیتابیس) */
export const parseFileEpisodeNumber = (fileName: string): number | null => {
  const name = stripExtension(fileName)
  if (!name) return null

  const sxe = name.match(/\bS(\d{1,2})[\s._-]*E(\d{1,3})\b/i)
  if (sxe) {
    const n = Number(sxe[2])
    if (inEpisodeRange(n)) return n
  }

  // آخرین « - 01 » — Jujutsu Kaisen S3 - 01 → ۱ (نه ۳ از S3)
  const dashMatches = [...name.matchAll(/-[\s._-]*(\d{1,3})(?=(?:[\s._-]|\[|$))/gi)]
  const lastDash = dashMatches[dashMatches.length - 1]
  if (lastDash) {
    const n = Number(lastDash[1])
    if (inEpisodeRange(n)) return n
  }

  const epWord = name.match(/\b(?:ep|episode|قسمت)[\s._-]*(\d{1,3})\b/i)
  if (epWord) {
    const n = Number(epWord[1])
    if (inEpisodeRange(n)) return n
  }

  const eOnly = name.match(/\be(\d{1,3})\b/i)
  if (eOnly) {
    const n = Number(eOnly[1])
    if (inEpisodeRange(n)) return n
  }

  return null
}

export type ParsedEpisodeFile = {
  season: number
  fileEpisode: number | null
}

export const parseEpisodeFileParts = (fileName: string): ParsedEpisodeFile => ({
  season: parseSeasonFromFileName(fileName),
  fileEpisode: parseFileEpisodeNumber(fileName),
})

/** @deprecated از parseFileEpisodeNumber استفاده کن */
export const parseEpisodeNumberFromFileName = (fileName: string): number | null =>
  parseFileEpisodeNumber(fileName)
