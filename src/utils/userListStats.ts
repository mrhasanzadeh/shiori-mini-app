export type UserAnimeListRow = {
  anime_id: number | string
  episodes_watched: number
  user_rating: number | null
  updated_at?: string
}

export type UserAnimeListStats = {
  animeCount: number
  episodesWatched: number
  averageRating: number | null
}

export type AnimeFavoriteCountMap = Record<string, number>

export const userAnimeListEntryKey = (animeId: number | string) => String(animeId)

export const computeUserListStats = (rows: UserAnimeListRow[]): UserAnimeListStats => {
  const ratings = rows
    .map((r) => r.user_rating)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  return {
    animeCount: rows.length,
    episodesWatched: rows.reduce((sum, r) => sum + (r.episodes_watched || 0), 0),
    averageRating:
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null,
  }
}
