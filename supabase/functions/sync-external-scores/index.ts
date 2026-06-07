import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type AnimeRow = {
  id: string
  anilist_id: number | null
  mal_id: number | null
  imdb_id: string | null
}

type ExternalScores = {
  anilistScore: number | null
  malScore: number | null
  imdbScore: number | null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

  if (typeof media.averageScore === 'number' && media.averageScore > 0) return media.averageScore
  if (typeof media.meanScore === 'number' && media.meanScore > 0) return media.meanScore
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
  const res = await fetch(`https://api.imdbapi.dev/titles/${encodeURIComponent(imdbId.trim())}`)
  if (!res.ok) return null

  const json = (await res.json()) as { rating?: { aggregateRating?: number | null } }
  const score = json.rating?.aggregateRating
  return typeof score === 'number' && Number.isFinite(score) ? score : null
}

const fetchImdbScore = async (imdbId: string, omdbApiKey?: string): Promise<number | null> => {
  const cleanId = imdbId.trim()
  if (!cleanId) return null

  if (omdbApiKey?.trim()) {
    const fromOmdb = await fetchOmdbScore(cleanId, omdbApiKey)
    if (fromOmdb !== null) return fromOmdb
  }

  return fetchImdbApiDevScore(cleanId)
}

const fetchExternalScores = async (
  row: Pick<AnimeRow, 'anilist_id' | 'mal_id' | 'imdb_id'>,
  omdbApiKey?: string
): Promise<ExternalScores> => {
  const anilistId =
    typeof row.anilist_id === 'number' && row.anilist_id > 0 ? row.anilist_id : null
  const malId = typeof row.mal_id === 'number' && row.mal_id > 0 ? row.mal_id : null
  const imdbId =
    typeof row.imdb_id === 'string' && row.imdb_id.trim() ? row.imdb_id.trim() : null

  const [anilistResult, malResult, imdbResult] = await Promise.allSettled([
    anilistId ? fetchAnilistScorePercent(anilistId) : Promise.resolve(null),
    malId ? fetchMalScore(malId) : Promise.resolve(null),
    imdbId ? fetchImdbScore(imdbId, omdbApiKey) : Promise.resolve(null),
  ])

  const unwrap = (r: PromiseSettledResult<number | null>): number | null =>
    r.status === 'fulfilled' ? r.value : null

  return {
    anilistScore: unwrap(anilistResult),
    malScore: unwrap(malResult),
    imdbScore: unwrap(imdbResult),
  }
}

const isAuthorized = (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET')?.trim()
  if (!cronSecret) return true

  const headerSecret = req.headers.get('x-cron-secret')?.trim()
  if (headerSecret && headerSecret === cronSecret) return true

  const auth = req.headers.get('authorization')?.trim()
  if (auth === `Bearer ${cronSecret}`) return true

  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '25'), 1), 100)
  const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0)
  const delayMs = Math.min(Math.max(Number(url.searchParams.get('delay_ms') ?? '400'), 0), 2000)
  const omdbApiKey = Deno.env.get('OMDB_API_KEY') ?? undefined

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: rows, error: listError } = await supabase
    .from('anime')
    .select('id, anilist_id, mal_id, imdb_id')
    .or('anilist_id.not.is.null,mal_id.not.is.null,imdb_id.not.is.null')
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1)

  if (listError) {
    return new Response(JSON.stringify({ error: listError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const animeRows = (rows ?? []) as AnimeRow[]
  let updated = 0
  const errors: Array<{ id: string; message: string }> = []

  for (const row of animeRows) {
    try {
      const scores = await fetchExternalScores(row, omdbApiKey)

      const { error: rpcError } = await supabase.rpc('update_anime_external_scores', {
        p_anime_id: row.id,
        p_average_score: scores.anilistScore,
        p_mal_score: scores.malScore,
        p_imdb_score: scores.imdbScore,
      })

      if (rpcError) {
        errors.push({ id: row.id, message: rpcError.message })
      } else {
        updated += 1
      }
    } catch (e) {
      errors.push({ id: row.id, message: e instanceof Error ? e.message : 'Unknown error' })
    }

    if (delayMs > 0) await sleep(delayMs)
  }

  const hasMore = animeRows.length === limit
  const nextOffset = hasMore ? offset + limit : null

  return new Response(
    JSON.stringify({
      processed: animeRows.length,
      updated,
      offset,
      nextOffset,
      hasMore,
      errors,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
