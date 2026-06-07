export const queryKeys = {
  animeCards: ['anime', 'cards'] as const,
  animeDetail: (id: string | number) => ['anime', 'detail', String(id)] as const,
  animeList: ['anime', 'list'] as const,
  schedule: ['schedule'] as const,
  animeSearch: (filters: Record<string, unknown>) => ['anime', 'search', filters] as const,
  similarAnime: (id: string | number, slugs: string[]) =>
    ['anime', 'similar', String(id), slugs.join(',')] as const,
  translatorLinks: (animeId: string | number) =>
    ['anime', 'translators', String(animeId)] as const,
  adminAnimeList: ['admin', 'anime', 'list'] as const,
}
