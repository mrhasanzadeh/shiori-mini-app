import { shioriFetch } from '../lib/shioriApi'
import type {
  AnimeFavoriteCountMap,
  UserAnimeListRow,
} from '../utils/userListStats'

export const getUserAnimeList = async (
  _telegramUserId: number
): Promise<UserAnimeListRow[]> => {
  const result = await shioriFetch<{ items: UserAnimeListRow[] }>('/user-anime-list')
  return result.items ?? []
}

export const upsertUserAnimeListEntry = async (
  _telegramUserId: number,
  animeId: number | string,
  payload: {
    episodes_watched?: number
    user_rating?: number | null
  }
): Promise<void> => {
  await shioriFetch('/user-anime-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anime_id: String(animeId),
      episodes_watched: payload.episodes_watched,
      user_rating: payload.user_rating,
    }),
  })
}

export const removeUserAnimeListEntry = async (
  _telegramUserId: number,
  animeId: number | string
): Promise<void> => {
  await shioriFetch(`/user-anime-list/${encodeURIComponent(String(animeId))}`, {
    method: 'DELETE',
  })
}

export const getAnimeFavoriteCounts = async (): Promise<AnimeFavoriteCountMap> =>
  shioriFetch<AnimeFavoriteCountMap>('/anime-catalog/favorite-counts')

export const getAnimeFavoriteCount = async (animeId: number | string): Promise<number> => {
  const count = await shioriFetch<number>(
    `/anime-catalog/${encodeURIComponent(String(animeId))}/favorite-count`
  )
  return Number(count) || 0
}
