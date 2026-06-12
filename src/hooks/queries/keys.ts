export const queryKeys = {
  animeCards: ['anime', 'cards'] as const,
  animeDetail: (id: string | number) => ['anime', 'detail', 'v2', String(id)] as const,
  animeList: ['anime', 'list'] as const,
  schedule: ['schedule'] as const,
  animeSearch: (filters: Record<string, unknown>) => ['anime', 'search', filters] as const,
  similarAnime: (id: string | number, slugs: string[]) =>
    ['anime', 'similar', String(id), slugs.join(',')] as const,
  translatorLinks: (animeId: string | number) => ['anime', 'translators', String(animeId)] as const,
  adminAnimeList: ['admin', 'anime', 'list'] as const,
  externalScores: (ids: {
    anilist_id?: number | null
    mal_id?: number | null
    imdb_id?: string | null
  }) =>
    [
      'anime',
      'external-scores',
      ids.anilist_id ?? '',
      ids.mal_id ?? '',
      ids.imdb_id ?? '',
    ] as const,
  userAnimeList: (telegramUserId: number) => ['user', 'anime-list', telegramUserId] as const,
  notifications: (telegramUserId: number) => ['notifications', telegramUserId] as const,
  notificationPreferences: (telegramUserId: number) =>
    ['notification-preferences', telegramUserId] as const,
  animeFavoriteCounts: ['anime', 'favorite-counts'] as const,
  animeFavoriteCount: (animeId: string | number) =>
    ['anime', 'favorite-count', String(animeId)] as const,
}
