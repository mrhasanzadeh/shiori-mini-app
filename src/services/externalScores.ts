export type ExternalScoreIds = {
  anilist_id?: number | null
  mal_id?: number | null
  imdb_id?: string | null
}

export type ExternalScores = {
  /** امتیاز AniList به مقیاس ۰–۱۰۰ (درصد) */
  anilistScore: number | null
  malScore: number | null
  imdbScore: number | null
}

const fetchAnilistScorePercent = async (anilistId: number): Promise<number | null> => {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            meanScore
            averageScore
          }
        }
      `,
      variables: { id: anilistId },
    }),
  })

  if (!res.ok) return null

  const json = (await res.json()) as {
    data?: { Media?: { meanScore?: number | null; averageScore?: number | null } }
  }

  const media = json.data?.Media
  if (!media) return null

  if (typeof media.averageScore === 'number' && media.averageScore > 0) {
    return media.averageScore
  }
  if (typeof media.meanScore === 'number' && media.meanScore > 0) {
    return media.meanScore
  }

  return null
}

const fetchMalScore = async (malId: number): Promise<number | null> => {
  const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`)
  if (!res.ok) return null

  const json = (await res.json()) as { data?: { score?: number | null } }
  const score = json.data?.score
  return typeof score === 'number' && Number.isFinite(score) ? score : null
}

const fetchOmdbScore = async (imdbId: string, apiKey: string): Promise<number | null> => {
  const url = new URL('https://www.omdbapi.com/')
  url.searchParams.set('apikey', apiKey.trim())
  url.searchParams.set('i', imdbId.trim())

  const res = await fetch(url.toString())
  if (!res.ok) return null

  const json = (await res.json()) as { imdbRating?: string }
  if (!json.imdbRating || json.imdbRating === 'N/A') return null

  const score = Number(json.imdbRating)
  return Number.isFinite(score) ? score : null
}

const fetchImdbApiDevScore = async (imdbId: string): Promise<number | null> => {
  const res = await fetch(
    `https://api.imdbapi.dev/titles/${encodeURIComponent(imdbId.trim())}`
  )
  if (!res.ok) return null

  const json = (await res.json()) as { rating?: { aggregateRating?: number | null } }
  const score = json.rating?.aggregateRating
  return typeof score === 'number' && Number.isFinite(score) ? score : null
}

const fetchImdbScore = async (imdbId: string): Promise<number | null> => {
  const cleanId = imdbId.trim()
  if (!cleanId) return null

  const apiKey = import.meta.env.VITE_OMDB_API_KEY as string | undefined
  if (apiKey?.trim()) {
    const fromOmdb = await fetchOmdbScore(cleanId, apiKey)
    if (fromOmdb !== null) return fromOmdb
  }

  return fetchImdbApiDevScore(cleanId)
}

/** امتیاز زنده AniList / MAL / IMDb */
export const fetchExternalScores = async (ids: ExternalScoreIds): Promise<ExternalScores> => {
  const anilistId =
    typeof ids.anilist_id === 'number' && ids.anilist_id > 0 ? ids.anilist_id : null
  const malId = typeof ids.mal_id === 'number' && ids.mal_id > 0 ? ids.mal_id : null
  const imdbId =
    typeof ids.imdb_id === 'string' && ids.imdb_id.trim() ? ids.imdb_id.trim() : null

  const [anilistResult, malResult, imdbResult] = await Promise.allSettled([
    anilistId ? fetchAnilistScorePercent(anilistId) : Promise.resolve(null),
    malId ? fetchMalScore(malId) : Promise.resolve(null),
    imdbId ? fetchImdbScore(imdbId) : Promise.resolve(null),
  ])

  const unwrap = (r: PromiseSettledResult<number | null>): number | null =>
    r.status === 'fulfilled' ? r.value : null

  return {
    anilistScore: unwrap(anilistResult),
    malScore: unwrap(malResult),
    imdbScore: unwrap(imdbResult),
  }
}

/** تبدیل average_score دیتابیس به درصد AniList (مثلاً 8.4 → 84٪ یا 84 → 84٪) */
export const formatAnilistPercent = (
  score: number,
  toPersianNumber: (n: number | string) => string
): string => {
  const percent = score <= 10 ? score * 10 : score
  return `${toPersianNumber(Math.round(percent))}٪`
}
